import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminOrderStatus } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";

// Allowed normal state transitions
const ALLOWED_TRANSITIONS: Record<AdminOrderStatus, AdminOrderStatus[]> = {
  onay_bekliyor: ["bekliyor", "iptal"],
  bekliyor: ["hazirlaniyor", "iptal"],
  hazirlaniyor: ["firinda", "iptal"],
  firinda: ["kuryede", "iptal"],
  kuryede: ["teslim_edildi", "iptal"],
  teslim_edildi: [], // final state
  iptal: [], // final state
};

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Yetki Doğrulama: Sadece admin/superadmin veya atanmış kurye statü değiştirebilir
    const auth = await verifyApiAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { error: "Yetkilendirme başarısız. Geçerli bir token gereklidir.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const params = await props.params;
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş ID parametresi zorunludur", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = body.status as AdminOrderStatus | undefined;
    const note = typeof body.note === "string" ? body.note.trim() : undefined;
    const changedByRole =
      auth.isCourier ? "courier" : auth.isAdmin ? "admin" : "customer";
    const changedById = auth.userId;
    const forceAdminOverride = Boolean(body.forceAdminOverride);

    if (!newStatus) {
      return NextResponse.json(
        { error: "Yeni durum (status) belirtilmelidir", code: "MISSING_STATUS" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    // 1. Current status check
    const { data: currentOrder, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status, courier_id, user_id")
      .eq("id", orderId)
      .single();

    if (fetchErr || !currentOrder) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const currentStatus = (currentOrder.status as AdminOrderStatus) || "bekliyor";

    // RBAC: Kurye sadece kendisine atanmış siparişin durumunu değiştirebilir
    if (auth.isCourier) {
      if (!auth.courierDbId || currentOrder.courier_id !== auth.courierDbId) {
        return NextResponse.json(
          { error: "Bu siparişi güncelleme yetkiniz bulunmamaktadır.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    } else if (!auth.isAdmin) {
      return NextResponse.json(
        { error: "Sipariş durumu yalnızca admin veya atanmış kurye tarafından güncellenebilir.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // 2. Terminal State Check: Cannot modify or reverse delivered or cancelled orders
    if (currentStatus === "teslim_edildi" || currentStatus === "iptal") {
      return NextResponse.json(
        {
          error: `'${currentStatus}' durumundaki bir sipariş nihai durumdadır ve değiştirilemez.`,
          code: "TERMINAL_STATE_REACHED",
          currentStatus,
        },
        { status: 400 }
      );
    }

    // 3. Validate state machine transition
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `'${currentStatus}' durumundaki bir sipariş doğrudan '${newStatus}' durumuna geçirilemez.`,
          code: "INVALID_STATUS_TRANSITION",
          currentStatus,
          allowedNext,
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: nowIso,
    };

    if (newStatus === "teslim_edildi") {
      updatePayload.delivered_at = nowIso;
      updatePayload.payment_status = "paid";
    } else if (newStatus === "iptal") {
      updatePayload.cancelled_at = nowIso;
      updatePayload.cancelled_by = changedByRole;
      if (note) updatePayload.cancel_reason = note;
    }

    // 3. Update orders table with optimistic lock on currentStatus
    const { data: updatedOrders, error: updateErr } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("status", currentStatus)
      .select("id");

    if (updateErr) {
      throw updateErr;
    }

    if (!updatedOrders || updatedOrders.length === 0) {
      return NextResponse.json(
        {
          error: "Sipariş durumu başka bir işlem tarafından güncellenmiş. Lütfen sayfayı yenileyip tekrar deneyiniz.",
          code: "CONCURRENT_MODIFICATION_CONFLICT",
        },
        { status: 409 }
      );
    }

    // 4. Insert into order_status_history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: currentStatus,
      to_status: newStatus,
      changed_by_role: changedByRole,
      changed_by_id: changedById,
      note: note || null,
    });

    return NextResponse.json({
      success: true,
      message: `Sipariş durumu '${newStatus}' olarak güncellendi.`,
      orderId,
      status: newStatus,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/orders/[id]/status error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Sipariş durumu güncellenirken hata oluştu", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
