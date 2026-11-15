import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const RouteOrderSchema = z.object({
  orderedIds: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "En az 1 durak kimliği gerekli.")
    .max(200, "En fazla 200 durak sıralanabilir."),
});

/**
 * Kuryenin kendi dağıtım listesindeki durak sırasını (`orders.stop_sequence`) günceller.
 */
export async function PATCH(req: Request) {
  const guard = await requireActiveCourierOrAdmin(req);
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = RouteOrderSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const uniqueIds = Array.from(new Set(parsed.data.orderedIds));
  const isCourierRole = guard.auth.role === "courier";

  if (isCourierRole && (!guard.isActive || !guard.courierDbId)) {
    return NextResponse.json(
      { error: "Kurye hesabınız aktif değil." },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  try {
    const { data: rows, error: readErr } = await supabase
      .from("orders")
      .select("id, courier_id")
      .in("id", uniqueIds);

    if (readErr) throw readErr;

    const foundRows = (rows ?? []) as { id: string; courier_id: string | null }[];
    const rowById = new Map(foundRows.map((r) => [r.id, r]));

    if (isCourierRole) {
      const unauthorized = foundRows.find((r) => r.courier_id !== guard.courierDbId);
      if (unauthorized) {
        return NextResponse.json(
          { error: "Yalnız kendi zimmetinizdeki durakları sıralayabilirsiniz." },
          { status: 403 }
        );
      }
    }

    const nowIso = new Date().toISOString();
    const eligibleIds = uniqueIds.filter((id) => {
      const row = rowById.get(id);
      if (!row) return false;
      return isCourierRole ? row.courier_id === guard.courierDbId : true;
    });

    const results = await Promise.all(
      eligibleIds.map((orderId, index) => {
        let q = supabase
          .from("orders")
          .update({ stop_sequence: index, updated_at: nowIso })
          .eq("id", orderId);
        if (isCourierRole && guard.courierDbId) {
          q = q.eq("courier_id", guard.courierDbId);
        }
        return q;
      })
    );

    const firstError = results.find((r) => r.error)?.error;
    if (firstError) throw firstError;

    return NextResponse.json({
      success: true,
      updatedCount: eligibleIds.length,
    });
  } catch (err: unknown) {
    logError("PATCH /api/courier/route-order:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Durak sırası kaydedilemedi." },
      { status: 500 }
    );
  }
}
