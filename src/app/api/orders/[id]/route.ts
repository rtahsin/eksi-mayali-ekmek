import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit } from "@/lib/security/rateLimiter";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş ID parametresi zorunludur", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    // IP Rate Limiting (30 requests per minute)
    const forwardedFor = _req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const ipLimit = checkRateLimit(`order_get_${clientIp}`, 30, 60000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: `Çok fazla istek yapıldı. Lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`,
          code: "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    // 1. Fetch order details with items (supports UUID or SIP-YYMM-XXX order_number)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: "Sipariş bulunamadı", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2. Authorization check via JWT / Auth header
    const auth = await verifyApiAuth(_req);
    let isAuthorized = false;

    if (auth.isAuthenticated) {
      if (auth.isAdmin) {
        isAuthorized = true;
      } else if (auth.isCourier && auth.courierDbId === order.courier_id) {
        isAuthorized = true;
      } else if (order.user_id && auth.userId === order.user_id) {
        isAuthorized = true;
      }
    }

    // 3. Guest verification via phone number parameter
    const url = new URL(_req.url);
    const verifyPhone = url.searchParams.get("phone");
    if (!isAuthorized && verifyPhone) {
      // Brute-force protection for phone verification (5 attempts per 5 minutes per IP/Order)
      const phoneVerifyLimit = checkRateLimit(`phone_verify_${clientIp}_${order.id}`, 5, 300000);
      if (!phoneVerifyLimit.allowed) {
        return NextResponse.json(
          {
            error: "Çok fazla hatalı telefon doğrulama denemesi yapıldı. Lütfen bir süre bekleyin.",
            code: "TOO_MANY_VERIFY_ATTEMPTS",
          },
          { status: 429 }
        );
      }

      const cleanVerify = verifyPhone.replace(/\D/g, "");
      const cleanOrderPhone = (order.phone || "").replace(/\D/g, "");
      if (cleanVerify.length >= 4 && cleanOrderPhone.endsWith(cleanVerify)) {
        isAuthorized = true;
      }
    }

    // 4. Fetch courier info if assigned
    let courierInfo = null;
    if (order.courier_id) {
      const { data: courier } = await supabase
        .from("couriers")
        .select("id, display_name, phone, vehicle_type, is_on_shift, current_lat, current_lng, location_updated_at")
        .eq("id", order.courier_id)
        .single();
      courierInfo = courier || null;
    }

    // 5. Fetch latest customer location if shared
    let customerLatestLocation = null;
    if (order.location_shared) {
      const { data: loc } = await supabase
        .from("customer_locations")
        .select("lat, lng, accuracy, heading, speed, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      customerLatestLocation = loc || null;
    }

    // 6. Fetch status history
    const { data: history } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    // Helper to mask PII for unauthorized public tracking queries
    const maskName = (name: string) => {
      const parts = (name || "").trim().split(/\s+/);
      return parts.map((p) => (p.length > 1 ? p[0] + "*".repeat(p.length - 1) : p)).join(" ");
    };

    const maskPhone = (phone: string) => {
      const clean = (phone || "").replace(/\D/g, "");
      if (clean.length < 7) return "***";
      return clean.slice(0, 3) + " *** ** " + clean.slice(-2);
    };

    if (isAuthorized) {
      // 7. Fetch payments (only for authorized users)
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        success: true,
        order: {
          ...order,
          items: order.order_items || [],
          history: history || [],
          payments: payments || [],
          courier: courierInfo,
          customerLocation: customerLatestLocation,
          isAuthorized: true,
          isMasked: false,
        },
      });
    }

    // Unauthorized / Public tracking view (strictly masked - no financial details or raw PII)
    const safeOrder = {
      id: order.id,
      order_number: order.order_number,
      customer_name: maskName(order.customer_name),
      phone: maskPhone(order.phone),
      delivery_address: order.neighborhood ? `${order.neighborhood} Mah., Beylikdüzü` : "Beylikdüzü",
      neighborhood: order.neighborhood,
      delivery_method: order.delivery_method,
      delivery_date: order.delivery_date,
      delivery_time_window: order.delivery_time_window,
      status: order.status,
      // Mask financial totals for unauthenticated public viewers
      subtotal: null,
      shipping_fee: null,
      total_amount: null,
      // Strip unit prices from items for public tracking
      items: (order.order_items || []).map((it: { product_name?: string; quantity?: number }) => ({
        product_name: it.product_name,
        quantity: it.quantity,
      })),
      // Only return stage progression timestamps, no internal admin/courier notes
      history: (history || []).map((h: { from_status: string; to_status: string; created_at: string }) => ({
        from_status: h.from_status,
        to_status: h.to_status,
        created_at: h.created_at,
      })),
      courier: courierInfo
        ? {
            display_name: courierInfo.display_name,
            vehicle_type: courierInfo.vehicle_type,
            current_lat: courierInfo.current_lat,
            current_lng: courierInfo.current_lng,
            location_updated_at: courierInfo.location_updated_at,
          }
        : null,
      isMasked: true,
      isAuthorized: false,
    };

    return NextResponse.json({
      success: true,
      order: safeOrder,
    });
  } catch (err: unknown) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Sipariş bilgileri alınırken hata oluştu", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
