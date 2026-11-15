import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { parseOrderLookup } from "@/lib/orders/orderId";

const AssignCourierSchema = z.object({
  courierId: z.string().uuid("Geçerli bir kurye kimliği seçin.").nullable(),
  startRoute: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireCapability(req, "orders.ops");
    if (!guard.ok) return guard.response;

    const params = await props.params;
    const lookup = parseOrderLookup(params.id);
    if (!lookup) {
      return NextResponse.json(
        { error: "Geçerli bir sipariş kimliği gereklidir.", code: "INVALID_ORDER_ID" },
        { status: 400 }
      );
    }

    const rawBody: unknown = await req.json().catch(() => ({}));
    const parsed = AssignCourierSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "Geçersiz istek gövdesi.",
          code: "INVALID_PAYLOAD",
        },
        { status: 400 }
      );
    }

    const { courierId, startRoute = false } = parsed.data;
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, status, delivery_method, courier_id")
      .eq(lookup.column, lookup.value)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı", code: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (order.delivery_method === "pickup") {
      return NextResponse.json(
        { error: "Gel-Al (Fırın Teslim) siparişlere kurye atanamaz.", code: "PICKUP_CANNOT_ASSIGN" },
        { status: 400 }
      );
    }

    if (order.status === "teslim_edildi" || order.status === "iptal") {
      return NextResponse.json(
        {
          error: `'${order.status}' durumundaki bir sipariş nihai durumdadır, kurye değiştirilemez.`,
          code: "TERMINAL_STATE_REACHED",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const actorRole = guard.auth.role === "staff" ? "staff" : "admin";

    if (courierId === null) {
      const targetStatus = order.status === "kuryede" ? "firinda" : order.status;
      const { data: updatedOrders, error: updateErr } = await supabase
        .from("orders")
        .update({
          courier_id: null,
          assigned_at: null,
          stop_sequence: null,
          status: targetStatus,
          updated_at: nowIso,
        })
        .eq("id", order.id)
        .eq("status", order.status)
        .select("id");

      if (updateErr) throw updateErr;
      if (!updatedOrders || updatedOrders.length === 0) {
        return NextResponse.json(
          {
            error: "Sipariş durumu başka bir işlem tarafından güncellenmiş. Lütfen sayfayı yenileyiniz.",
            code: "CONCURRENT_MODIFICATION_CONFLICT",
          },
          { status: 409 }
        );
      }

      const { error: historyErr } = await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: order.status || null,
        to_status: targetStatus,
        changed_by_role: actorRole,
        changed_by_id: guard.auth.userId,
        note: "Kurye zimmeti kaldırıldı (Tezgaha bırakıldı)",
      });
      if (historyErr) throw historyErr;

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "unknown",
        action: "order.unassign_courier",
        entityType: "order",
        entityId: order.id,
        summary: `${order.order_number} siparişinin kurye ataması kaldırıldı`,
        metadata: {
          orderNumber: order.order_number,
          previousCourierId: order.courier_id,
          fromStatus: order.status,
          toStatus: targetStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Kurye ataması kaldırıldı, sipariş tezgaha bırakıldı.",
        orderId: order.id,
        courierId: null,
        courierName: null,
        status: targetStatus,
      });
    }

    const { data: courier, error: courierErr } = await supabase
      .from("couriers")
      .select("id, display_name, is_active, is_on_shift")
      .eq("id", courierId)
      .maybeSingle();

    if (courierErr) throw courierErr;
    if (!courier) {
      return NextResponse.json(
        { error: "Belirtilen kurye bulunamadı", code: "COURIER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!courier.is_active) {
      return NextResponse.json(
        { error: "Pasif kuryeye sipariş atanamaz.", code: "COURIER_INACTIVE" },
        { status: 409 }
      );
    }

    const targetStatus = startRoute
      ? "kuryede"
      : order.status === "bekliyor"
        ? "hazirlaniyor"
        : order.status;

    if (startRoute && !courier.is_on_shift) {
      const { error: shiftErr } = await supabase
        .from("couriers")
        .update({ is_on_shift: true })
        .eq("id", courier.id);
      if (shiftErr) throw shiftErr;
    }

    const { data: updatedOrders, error: updateErr } = await supabase
      .from("orders")
      .update({
        courier_id: courier.id,
        assigned_at: nowIso,
        stop_sequence: null,
        status: targetStatus,
        updated_at: nowIso,
      })
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id");

    if (updateErr) throw updateErr;
    if (!updatedOrders || updatedOrders.length === 0) {
      return NextResponse.json(
        {
          error: "Sipariş durumu başka bir işlem tarafından güncellenmiş. Lütfen sayfayı yenileyiniz.",
          code: "CONCURRENT_MODIFICATION_CONFLICT",
        },
        { status: 409 }
      );
    }

    const { error: historyErr } = await supabase.from("order_status_history").insert({
      order_id: order.id,
      from_status: order.status || null,
      to_status: targetStatus,
      changed_by_role: actorRole,
      changed_by_id: guard.auth.userId,
      note: startRoute
        ? `Kuryeye atandı ve yola çıkarıldı: ${courier.display_name}`
        : `Kuryeye planlandı (zimmet): ${courier.display_name}`,
    });
    if (historyErr) throw historyErr;

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "unknown",
      action: "order.assign_courier",
      entityType: "order",
      entityId: order.id,
      summary: startRoute
        ? `${order.order_number} siparişi ${courier.display_name} kuryesine atanıp yola çıkarıldı`
        : `${order.order_number} siparişi ${courier.display_name} kuryesine planlandı`,
      metadata: {
        orderNumber: order.order_number,
        courierId: courier.id,
        courierName: courier.display_name,
        startRoute,
        fromStatus: order.status,
        toStatus: targetStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: startRoute
        ? `Sipariş ${courier.display_name} kuryesine atandı ve 'kuryede' durumuna alındı.`
        : `Sipariş ${courier.display_name} kuryesine planlandı.`,
      orderId: order.id,
      courierId: courier.id,
      courierName: courier.display_name,
      status: targetStatus,
    });
  } catch (err: unknown) {
    logError("PATCH /api/orders/[id]/assign-courier error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Kurye ataması yapılırken hata oluştu", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
