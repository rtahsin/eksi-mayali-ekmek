import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { verifyOrderToken } from "@/lib/security/linkToken";
import { CUSTOMER_CANCELLABLE, normalizeOrderStatus } from "@/lib/orders/normalize";
import { normalizeDeliveryDate } from "@/lib/time/istanbul";
import type { TrackingOrder } from "@/types/tracking";

interface OrderRow {
  id: string;
  order_number: string | null;
  user_id: string | null;
  courier_id: string | null;
  cari_id: string | null;
  customer_name: string | null;
  phone: string | null;
  neighborhood: string | null;
  address_detail: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  status: string;
  payment_method: string | null;
  subtotal: number | string | null;
  shipping_fee: number | string | null;
  total_amount: number | string | null;
  order_notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  order_items: { product_name: string | null; quantity: number | null; unit_price: number | string | null; total_price: number | string | null }[] | null;
}

const maskName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => (p.length > 1 ? p[0] + "*".repeat(p.length - 1) : p))
    .join(" ");

const maskPhone = (phone: string) => {
  const clean = phone.replace(/\D/g, "");
  return clean.length < 7 ? "***" : `${clean.slice(0, 3)} *** ** ${clean.slice(-2)}`;
};

const num = (v: number | string | null) => (v === null || v === undefined ? null : Number(v));


export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const lookup = parseOrderLookup((await props.params).id);
    if (!lookup) {
      return NextResponse.json({ error: "Geçersiz sipariş numarası", code: "INVALID_ID" }, { status: 400 });
    }

    const clientIp = getClientIp(req);
    const ipLimit = await checkRateLimit(`order_get_${clientIp}`, 30, 60000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: `Çok fazla istek yapıldı. Lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`, code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" }, { status: 500 });
    }

    const { data, error: orderErr } = await supabase
      .from("orders")
      .select(
        "id, order_number, user_id, courier_id, cari_id, customer_name, phone, neighborhood, address_detail, delivery_date, delivery_time_window, status, payment_method, subtotal, shipping_fee, total_amount, order_notes, cancel_reason, created_at, order_items(product_name, quantity, unit_price, total_price)"
      )
      .eq(lookup.column, lookup.value)
      .maybeSingle();

    if (orderErr || !data) {
      return NextResponse.json({ error: "Sipariş bulunamadı", code: "NOT_FOUND" }, { status: 404 });
    }
    const order = data as unknown as OrderRow;

    // Yetki: admin, atanmış kurye, sipariş sahibi, imzalı takip linki ya da telefonun son 4 hanesi
    const url = new URL(req.url);
    const auth = await verifyApiAuth(req);
    const isOwner = Boolean(auth.isAuthenticated && order.user_id && auth.userId === order.user_id);
    let isAuthorized =
      auth.isAdmin ||
      (auth.isCourier && Boolean(auth.courierDbId) && auth.courierDbId === order.courier_id) ||
      isOwner ||
      verifyOrderToken(order.id, url.searchParams.get("t"));

    const phoneParam = url.searchParams.get("phone");
    if (!isAuthorized && phoneParam) {
      const verifyLimit = await checkRateLimit(`phone_verify_${clientIp}_${order.id}`, 5, 600000);
      if (!verifyLimit.allowed) {
        return NextResponse.json(
          { error: "Çok fazla hatalı deneme yapıldı. Lütfen bir süre bekleyin.", code: "TOO_MANY_VERIFY_ATTEMPTS" },
          { status: 429 }
        );
      }
      const last4 = phoneParam.replace(/\D/g, "");
      const orderPhone = (order.phone || "").replace(/\D/g, "");
      if (last4.length === 4 && orderPhone.length >= 4 && orderPhone.endsWith(last4)) {
        isAuthorized = true;
      } else {
        return NextResponse.json({ error: "Telefon numarasının son 4 hanesi eşleşmedi.", code: "PHONE_MISMATCH" }, { status: 403 });
      }
    }

    const { data: historyRows } = await supabase
      .from("order_status_history")
      .select("to_status, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    const status = normalizeOrderStatus(order.status);
    const items = order.order_items ?? [];

    const result: TrackingOrder = {
      id: order.id,
      orderNumber: order.order_number || order.id,
      status,
      deliveryDate: normalizeDeliveryDate(order.delivery_date, order.created_at),
      deliveryTimeWindow: order.delivery_time_window,
      neighborhood: order.neighborhood,
      items: items.map((it) => ({
        name: it.product_name || "Ürün",
        quantity: Number(it.quantity) || 1,
        unitPrice: isAuthorized ? num(it.unit_price) : null,
        totalPrice: isAuthorized ? num(it.total_price) : null,
      })),
      subtotal: isAuthorized ? num(order.subtotal) : null,
      shippingFee: isAuthorized ? num(order.shipping_fee) : null,
      totalAmount: isAuthorized ? num(order.total_amount) : null,
      paymentMethod: isAuthorized ? order.payment_method : null,
      customerName: isAuthorized ? order.customer_name || "" : maskName(order.customer_name || ""),
      phone: maskPhone(order.phone || ""),
      addressDetail: isAuthorized ? order.address_detail : null,
      orderNotes: isAuthorized ? order.order_notes : null,
      createdAt: order.created_at,
      cancelReason: order.cancel_reason,
      history: (historyRows ?? []).map((h: { to_status: string; created_at: string }) => ({
        status: normalizeOrderStatus(h.to_status),
        at: h.created_at,
      })),
      canCancel: isAuthorized && !order.cari_id && CUSTOMER_CANCELLABLE.has(status),
      isMasked: !isAuthorized,
    };

    return NextResponse.json({ success: true, order: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    logError("GET /api/orders/[id] error:", err);
    return NextResponse.json(
      { error: "Sipariş bilgileri şu an alınamadı. Lütfen tekrar deneyin.", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
