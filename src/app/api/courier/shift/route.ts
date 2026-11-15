import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { logError } from "@/lib/kernel/log";
import { getErrorMessage } from "@/lib/utils/error";

export const runtime = "nodejs";

const ShiftToggleSchema = z.object({
  isOnShift: z.boolean(),
  courierId: z.string().uuid("Geçerli bir kurye kimliği seçin.").optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireActiveCourierOrAdmin(req);
    if (!guard.ok) return guard.response;

    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = ShiftToggleSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Geçersiz vardiya isteği.",
          code: "INVALID_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const { isOnShift, courierId: requestedCourierId } = parsed.data;
    if (requestedCourierId && !guard.auth.isAdmin && requestedCourierId !== guard.courierDbId) {
      return NextResponse.json(
        { error: "Başka bir kuryenin vardiyasını değiştiremezsiniz.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const targetCourierId = guard.auth.isAdmin
      ? requestedCourierId || guard.courierDbId
      : guard.courierDbId;

    if (!targetCourierId) {
      return NextResponse.json(
        { error: "Hedef kurye kimliği belirlenemedi.", code: "COURIER_REQUIRED" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı.", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    const { data: courier, error: readErr } = await supabase
      .from("couriers")
      .select("id, display_name, is_active, is_on_shift")
      .eq("id", targetCourierId)
      .maybeSingle();

    if (readErr) throw readErr;
    if (!courier) {
      return NextResponse.json(
        { error: "Kurye kaydı bulunamadı.", code: "COURIER_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (!courier.is_active) {
      return NextResponse.json(
        { error: "Pasif durumdaki kuryenin vardiyası açılamaz.", code: "COURIER_INACTIVE" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("couriers")
      .update({
        is_on_shift: isOnShift,
        updated_at: nowIso,
      })
      .eq("id", courier.id);

    if (updErr) throw updErr;

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "unknown",
      action: "courier.shift_toggle",
      entityType: "courier",
      entityId: courier.id,
      summary: `${courier.display_name} vardiyası ${isOnShift ? "açıldı" : "kapatıldı"}`,
      metadata: {
        courierId: courier.id,
        courierName: courier.display_name,
        previousIsOnShift: Boolean(courier.is_on_shift),
        isOnShift,
      },
    });

    return NextResponse.json({
      ok: true,
      courierId: courier.id,
      displayName: courier.display_name,
      isOnShift,
    });
  } catch (err: unknown) {
    logError("POST /api/courier/shift error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Vardiya güncellenemedi.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
