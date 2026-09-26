import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Yetki Doğrulama: Sadece admin/superadmin kurye atayabilir
    const auth = await verifyApiAuth(req);
    if (!auth.isAuthenticated || !auth.isAdmin) {
      return NextResponse.json(
        { error: "Kurye atama yetkisi yalnızca admin kullanıcılara aittir.", code: "FORBIDDEN" },
        { status: auth.isAuthenticated ? 403 : 401 }
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
    const courierId = typeof body.courierId === "string" ? body.courierId.trim() : null;
    const adminId = auth.userId; // Token'dan alınır, client'a güvenilmez

    if (!courierId) {
      return NextResponse.json(
        { error: "Atanacak kurye ID'si gereklidir", code: "MISSING_COURIER_ID" },
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

    // 1. Verify courier exists
    const { data: courier, error: courierErr } = await supabase
      .from("couriers")
      .select("id, display_name")
      .eq("id", courierId)
      .single();

    if (courierErr || !courier) {
      return NextResponse.json(
        { error: "Belirtilen kurye bulunamadı", code: "COURIER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2. Verify order exists
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı", code: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (order.status === "teslim_edildi" || order.status === "iptal") {
      return NextResponse.json(
        {
          error: `'${order.status}' durumundaki bir sipariş nihai durumdadır, kurye atanamaz.`,
          code: "TERMINAL_STATE_REACHED",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const targetStatus = typeof body.status === "string" && body.status ? body.status : "kuryede";

    // 3. Update orders table with optimistic lock on order.status
    const { data: updatedOrders, error: updateErr } = await supabase
      .from("orders")
      .update({
        courier_id: courierId,
        assigned_at: nowIso,
        status: targetStatus,
        updated_at: nowIso,
      })
      .eq("id", orderId)
      .eq("status", order.status)
      .select("id");

    if (updateErr) {
      throw updateErr;
    }

    if (!updatedOrders || updatedOrders.length === 0) {
      return NextResponse.json(
        {
          error: "Sipariş durumu başka bir işlem tarafından güncellenmiş. Lütfen sayfayı yenileyiniz.",
          code: "CONCURRENT_MODIFICATION_CONFLICT",
        },
        { status: 409 }
      );
    }

    // 4. Record in order_status_history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: order.status || null,
      to_status: targetStatus,
      changed_by_role: "admin",
      changed_by_id: adminId,
      note: `Kuryeye atandı: ${courier.display_name}`,
    });

    return NextResponse.json({
      success: true,
      message: `Sipariş başarıyla ${courier.display_name} kuryesine atandı ve 'kuryede' durumuna alındı.`,
      orderId,
      courierId,
      courierName: courier.display_name,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/orders/[id]/assign-courier error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Kurye ataması yapılırken hata oluştu", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
