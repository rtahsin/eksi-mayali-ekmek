import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { istanbulToday, isIsoDate } from "@/lib/time/istanbul";
import { logError } from "@/lib/kernel/log";
import { getErrorMessage } from "@/lib/utils/error";

export const runtime = "nodejs";

const StartRouteSchema = z.object({
  orderIds: z
    .array(z.string().trim().min(1).max(80))
    .max(100, "Tek seferde en fazla 100 durak başlatılabilir.")
    .optional(),
  courierId: z.string().uuid("Geçerli bir kurye kimliği seçin.").optional(),
  date: z.string().trim().optional(),
});

interface StartRouteOrderRow {
  id: string;
  order_number: string | null;
  status: string;
  courier_id: string | null;
  delivery_method: string | null;
}

export async function POST(req: Request) {
  try {
    const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
    if (!guard.ok) return guard.response;

    const rawBody: unknown = await req.json().catch(() => ({}));
    const parsed = StartRouteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Geçersiz sefer başlatma isteği.",
          code: "INVALID_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const canManageDispatch = guard.auth.isAdmin || guard.auth.role === "staff";
    const { orderIds, courierId: requestedCourierId, date } = parsed.data;
    const targetDate = date && isIsoDate(date) ? date : istanbulToday();

    if (requestedCourierId && !canManageDispatch && requestedCourierId !== guard.courierDbId) {
      return NextResponse.json(
        { error: "Başka bir kuryenin seferini başlatamazsınız.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const targetCourierId = canManageDispatch
      ? requestedCourierId || guard.courierDbId || null
      : guard.courierDbId;

    if (!canManageDispatch && !targetCourierId) {
      return NextResponse.json(
        { error: "Kurye kaydınız bulunamadı.", code: "COURIER_NOT_FOUND" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı.", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    let query = supabase
      .from("orders")
      .select("id, order_number, status, courier_id, delivery_method")
      .in("status", ["hazirlaniyor", "firinda"])
      .neq("delivery_method", "pickup")
      .not("courier_id", "is", null);

    if (orderIds && orderIds.length > 0) {
      query = query.in("id", Array.from(new Set(orderIds)));
    } else {
      query = query.eq("delivery_date", targetDate);
    }

    if (targetCourierId) {
      query = query.eq("courier_id", targetCourierId);
    } else if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Sefer başlatılacak kurye veya durak belirtilmedi.", code: "COURIER_REQUIRED" },
        { status: 400 }
      );
    }

    const { data: candidateRows, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const candidates = (candidateRows ?? []) as StartRouteOrderRow[];
    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        updatedCount: 0,
        updatedIds: [],
        message: "Yola çıkarılacak planlı paket bulunamadı.",
      });
    }

    const nowIso = new Date().toISOString();
    const actorRole =
      guard.auth.role === "staff"
        ? "staff"
        : guard.auth.role === "courier"
          ? "courier"
          : "admin";

    const updatedIds: string[] = [];
    const affectedCourierIds = new Set<string>();
    const historyRows: Array<{
      order_id: string;
      from_status: string;
      to_status: string;
      changed_by_role: string;
      changed_by_id: string | null;
      note: string;
    }> = [];

    for (const order of candidates) {
      const { data: updatedRow, error: updErr } = await supabase
        .from("orders")
        .update({
          status: "kuryede",
          updated_at: nowIso,
        })
        .eq("id", order.id)
        .eq("status", order.status)
        .select("id")
        .maybeSingle();

      if (updErr) throw updErr;
      if (!updatedRow) continue;

      updatedIds.push(order.id);
      if (order.courier_id) affectedCourierIds.add(order.courier_id);
      historyRows.push({
        order_id: order.id,
        from_status: order.status,
        to_status: "kuryede",
        changed_by_role: actorRole,
        changed_by_id: guard.auth.userId,
        note: "Sefer başlatıldı (Dağıtıma çıktı)",
      });
    }

    if (historyRows.length > 0) {
      await supabase.from("order_status_history").insert(historyRows);
    }

    if (affectedCourierIds.size > 0) {
      await supabase
        .from("couriers")
        .update({ is_on_shift: true, updated_at: nowIso })
        .in("id", Array.from(affectedCourierIds));
    }

    if (updatedIds.length > 0) {
      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "unknown",
        action: "courier.start_route",
        entityType: "courier",
        entityId: targetCourierId,
        summary: `${updatedIds.length} planlı paket yola çıkarıldı (kuryede)`,
        metadata: {
          courierId: targetCourierId,
          updatedIds,
          date: targetDate,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      updatedCount: updatedIds.length,
      updatedIds,
      message: `${updatedIds.length} paket dağıtıma (kuryede) çıkarıldı.`,
    });
  } catch (err: unknown) {
    logError("POST /api/courier/start-route error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Sefer başlatılamadı.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
