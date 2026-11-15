import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const CLAIMABLE_STATUSES = ["hazirlaniyor", "firinda", "kuryede"] as const;

const ClaimBodySchema = z
  .object({
    courierId: z.string().uuid("Geçersiz kurye kimliği.").optional(),
  })
  .optional();

/**
 * Hibrit zimmet: Hazır tezgahtaki (`courier_id IS NULL` ve onaylanmış/fırında/kuryede)
 * paketi aktif ve vardiyadaki kuryeye iyimser kilitle zimmetler (`409 Conflict` yarış koruması).
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveCourierOrAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) {
      return NextResponse.json({ error: "Geçersiz sipariş numarası." }, { status: 400 });
    }

    const rawBody: unknown = await req.json().catch(() => ({}));
    const parsedBody = ClaimBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const isCourierRole = guard.auth.role === "courier";
    if (isCourierRole) {
      if (!guard.isActive || !guard.isOnShift || !guard.courierDbId) {
        return NextResponse.json(
          { error: "Mesainiz kapalı veya kurye hesabınız aktif değil; paket zimmetleyemezsiniz." },
          { status: 403 }
        );
      }
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
    }

    const targetCourierId = isCourierRole
      ? guard.courierDbId!
      : parsedBody.data?.courierId ?? guard.courierDbId;

    if (!targetCourierId) {
      return NextResponse.json(
        { error: "Zimmetlenecek aktif bir kurye seçmelisiniz." },
        { status: 400 }
      );
    }

    const { data: courierRow, error: courErr } = await supabase
      .from("couriers")
      .select("id, display_name, is_active, is_on_shift")
      .eq("id", targetCourierId)
      .maybeSingle();
    if (courErr) throw courErr;

    if (!courierRow) {
      return NextResponse.json({ error: "Kurye bulunamadı." }, { status: 404 });
    }
    const courier = courierRow as {
      id: string;
      display_name: string;
      is_active: boolean | null;
      is_on_shift: boolean | null;
    };
    if (courier.is_active !== true) {
      return NextResponse.json({ error: "Pasif kuryeye paket zimmetlenemez." }, { status: 409 });
    }

    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, status, courier_id, delivery_method")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (orderErr) throw orderErr;

    if (!orderRow) {
      return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }
    const existing = orderRow as {
      id: string;
      order_number: string | null;
      status: string;
      courier_id: string | null;
      delivery_method: string | null;
    };

    if (existing.delivery_method === "pickup") {
      return NextResponse.json(
        { error: "Fırından gel-al siparişi kuryeye zimmetlenemez." },
        { status: 400 }
      );
    }

    if (existing.courier_id) {
      return NextResponse.json(
        { error: "Bu paket başka bir kurye tarafından zimmetlenmiş." },
        { status: 409 }
      );
    }

    if (!CLAIMABLE_STATUSES.includes(existing.status as (typeof CLAIMABLE_STATUSES)[number])) {
      const msg =
        existing.status === "bekliyor"
          ? "Sipariş henüz onaylanmadığı için tezgaha alınamaz."
          : `'${existing.status}' durumundaki sipariş zimmetlenemez.`;
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedRows, error: updErr } = await supabase
      .from("orders")
      .update({
        courier_id: targetCourierId,
        assigned_at: nowIso,
        status: "kuryede",
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .is("courier_id", null)
      .in("status", [...CLAIMABLE_STATUSES])
      .select("id, order_number, status, courier_id");

    if (updErr) throw updErr;

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "Paket az önce başka bir kurye veya yönetici tarafından alındı." },
        { status: 409 }
      );
    }

    const actorRole = isCourierRole ? "courier" : "admin";

    const { error: histErr } = await supabase.from("order_status_history").insert({
      order_id: existing.id,
      from_status: existing.status,
      to_status: "kuryede",
      changed_by_role: actorRole,
      changed_by_id: guard.auth.userId,
      note: `Kurye zimmet aldı: ${courier.display_name}`,
    });
    if (histErr) logError("order_status_history claim insert:", histErr);

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole,
      action: "order.courier_claim",
      entityType: "order",
      entityId: existing.id,
      summary: `Paket zimmetlendi (${existing.order_number ?? existing.id} → ${courier.display_name})`,
      metadata: {
        orderNumber: existing.order_number ?? null,
        courierId: targetCourierId,
        courierName: courier.display_name,
        fromStatus: existing.status,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: existing.id,
      orderNumber: existing.order_number ?? existing.id,
      courierId: targetCourierId,
      courierName: courier.display_name,
      status: "kuryede",
    });
  } catch (err: unknown) {
    logError("POST /api/orders/[id]/claim:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Paket zimmetlenemedi." },
      { status: 500 }
    );
  }
}
