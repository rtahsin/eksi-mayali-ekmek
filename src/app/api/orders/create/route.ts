import { NextResponse, after } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { Order, OrderItem } from "@/types";
import { checkRateLimit, sanitizeInput } from "@/lib/security/rateLimiter";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { getStoreSettings } from "@/lib/settings/server";
import { computeShippingFee } from "@/lib/settings/schema";
import { getCartAvailability } from "@/lib/ordering/loadAvailability";
import { isIsoDate } from "@/lib/time/istanbul";
import { signOrderToken } from "@/lib/security/linkToken";
import { notifyNewOrder } from "@/lib/notify/telegram";
import { TERMS_VERSION } from "@/lib/legal";
import { normalizePhone, stripMah } from "@/lib/order/validate";

const OrderItemSchema = z.object({
  productId: z.string().min(1, "Ürün ID gereklidir").max(100),
  quantity: z
    .number()
    .int()
    .positive("Miktar 1 veya daha fazla olmalıdır")
    .max(100, "Maksimum 100 adet sipariş edilebilir"),
});

const CustomerInfoSchema = z.object({
  name: z.string().trim().min(2, "Geçerli bir ad ve soyad giriniz").max(80, "Ad soyad çok uzun"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz").max(20, "Telefon numarası çok uzun"),
  neighborhood: z.string().trim().min(2, "Mahalle bilgisi gereklidir").max(100),
  addressDetail: z.string().trim().min(5, "Açık adres bilgisi gereklidir").max(250),
  deliveryDate: z.string().refine(isIsoDate, "Teslim tarihi geçersiz"),
  note: z.string().max(300).optional(),
  customerLat: z.number().min(-90).max(90).nullable().optional(),
  customerLng: z.number().min(-180).max(180).nullable().optional(),
  locationConsentAt: z.string().max(40).nullable().optional(),
});

const CreateOrderRequestSchema = z.object({
  items: z
    .array(OrderItemSchema)
    .min(1, "Sepetinizde en az 1 ürün olmalıdır")
    .max(30, "Sepette en fazla 30 kalem ürün olabilir"),
  customerInfo: CustomerInfoSchema,
  deliveryMethod: z.literal("courier"),
  paymentMethod: z.enum(["whatsapp", "cash_on_delivery", "pos_at_door"]),
  idempotencyKey: z.string().min(8).max(100),
  termsAccepted: z.literal(true, { message: "Mesafeli satış sözleşmesi ve KVKK metni onaylanmalıdır" }),
});

interface DBOrderRow {
  id: string;
  order_number?: string | null;
  customer_name: string;
  phone: string;
  delivery_address: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  status: string;
  payment_method: string;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  order_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  order_items?: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    image_url?: string | null;
    weight?: number | null;
    made_to_order?: boolean;
  }[];
}

interface DBProductItem {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
  weight?: number | null;
  made_to_order?: boolean;
  is_available?: boolean;
  is_active?: boolean;
}

const fail = (status: number, error: string, code?: string) =>
  NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status });

/** "Barış Mah." / "barış" → "barış" (karşılaştırma için) */
const normalizeNeighborhood = (value: string) => stripMah(value).toLocaleLowerCase("tr-TR");

function mapExistingOrder(row: DBOrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number || row.id,
    customerName: row.customer_name,
    phone: row.phone,
    deliveryAddress: row.delivery_address,
    items: (row.order_items || []).map((it) => ({
      productId: it.product_id,
      productName: it.product_name,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      totalPrice: Number(it.total_price) || 0,
      imageUrl: it.image_url || undefined,
      weight: it.weight || undefined,
      madeToOrder: it.made_to_order,
    })),
    subtotal: Number(row.subtotal) || 0,
    shippingFee: Number(row.shipping_fee) || 0,
    totalAmount: Number(row.total_amount) || 0,
    status: row.status as Order["status"],
    paymentMethod: row.payment_method as Order["paymentMethod"],
    deliveryDate: row.delivery_date || undefined,
    deliveryTimeWindow: row.delivery_time_window || undefined,
    orderNotes: row.order_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

/** RPC'nin fırlattığı bilinen hataları müşteriye Türkçe 409 olarak döndürür. */
function mapRpcError(message: string): { status: number; error: string; code: string } | null {
  const known: Record<string, string> = {
    INVALID_DELIVERY_DATE: "Seçilen teslim tarihi artık geçerli değil. Lütfen yeni bir tarih seçin.",
    PRODUCT_UNAVAILABLE: "Sepetinizdeki bir ürün şu an satışta değil. Lütfen sepetinizi güncelleyin.",
    NOT_ON_SALE_THIS_DAY: "Sepetinizdeki bir ürün seçtiğiniz gün satışta değil. Lütfen başka bir gün seçin.",
    LEAD_TIME_NOT_MET: "Sepetinizdeki bir ürün daha önceden sipariş edilmeli. Lütfen ileri bir gün seçin.",
    PRODUCT_LIMIT_REACHED: "Seçtiğiniz gün için bir ürünün adedi doldu. Lütfen adedi azaltın ya da başka bir gün seçin.",
    DAILY_CAPACITY_FULL: "Seçtiğiniz gün fırın kapasitemiz doldu. Lütfen başka bir gün seçin.",
  };
  for (const [code, error] of Object.entries(known)) {
    if (message.includes(code)) return { status: 409, error, code };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // 0. IP bazlı istek sınırı
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";

    const ipLimit = await checkRateLimit(`order_ip_${clientIp}`, 10, 600000);
    if (!ipLimit.allowed) {
      return fail(429, `Geçici olarak engellendiniz. Lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyiniz.`);
    }

    const validation = CreateOrderRequestSchema.safeParse(await req.json().catch(() => null));
    if (!validation.success) {
      const errorMsg = validation.error.issues.map((e) => e.message).join(", ");
      return fail(400, `Doğrulama hatası: ${errorMsg}`);
    }
    const { items, customerInfo, paymentMethod, idempotencyKey } = validation.data;

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      Sentry.captureMessage("Supabase admin client unavailable in /api/orders/create", "error");
      return fail(500, "Sunucu veritabanı bağlantısı kurulamadı.");
    }

    // 1. İdempotency: aynı ödeme denemesi tekrar gelirse mevcut siparişi döndür
    const { data: existingData } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingData) {
      const existing = mapExistingOrder(existingData as unknown as DBOrderRow);
      return NextResponse.json({
        success: true,
        order: existing,
        trackingToken: signOrderToken(existing.id),
        isExisting: true,
      });
    }

    // 2. İşletme kuralları (tek kaynak: admin ayarları)
    const settings = await getStoreSettings(supabaseAdmin, { failClosed: true });
    if (!settings.orderAcceptanceOpen) {
      return fail(409, "Şu an sipariş almıyoruz. Lütfen daha sonra tekrar deneyin.", "ORDERS_CLOSED");
    }

    const neighborhoodMatch = settings.neighborhoods.find(
      (n) => normalizeNeighborhood(n) === normalizeNeighborhood(customerInfo.neighborhood)
    );
    if (!neighborhoodMatch) {
      return fail(400, "Seçilen mahalleye henüz teslimat yapmıyoruz.", "NEIGHBORHOOD_NOT_SERVED");
    }

    // Gün + sepet kuralları (satış günü, hazırlık süresi, ürün limiti, kapasite) — sepetle aynı hesap.
    // Kesin kontrol RPC içinde kilit altında tekrar yapılır.
    const cartDates = await getCartAvailability(supabaseAdmin, settings, items);
    const chosen = cartDates.find((d) => d.date === customerInfo.deliveryDate);
    if (!chosen) {
      return fail(409, "Seçilen teslim tarihi artık geçerli değil. Lütfen sepetten yeni bir tarih seçin.", "INVALID_DELIVERY_DATE");
    }
    if (!chosen.available) {
      return fail(409, `${chosen.reason ?? "Sepetiniz seçilen gün için uygun değil"}. Lütfen sepetten başka bir gün seçin.`, "DATE_NOT_AVAILABLE");
    }

    const cleanPhone = normalizePhone(customerInfo.phone);
    if (!cleanPhone) {
      return fail(400, "Lütfen geçerli bir cep telefonu numarası giriniz (05XX XXX XX XX).");
    }

    // 3. Telefon bazlı istek sınırı
    const phoneLimit = await checkRateLimit(`order_phone_${cleanPhone}`, 5, 600000);
    if (!phoneLimit.allowed) {
      return fail(429, `Bu telefon numarası ile çok fazla sipariş denemesi yapıldı. Lütfen ${phoneLimit.retryAfterSeconds} saniye sonra tekrar deneyiniz.`);
    }

    // 4. Fiyatlar ve ürün durumu yalnızca veritabanından
    const productIds = Array.from(new Set(items.map((it) => it.productId)));
    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price, image_url, weight, made_to_order, is_available, is_active")
      .in("id", productIds);

    if (prodErr || !dbProducts) {
      Sentry.captureException(prodErr || new Error("Products query error in /api/orders/create"), {
        tags: { endpoint: "/api/orders/create", type: "products_query_error" },
      });
      return fail(500, "Ürün bilgileri doğrulanamadı.");
    }

    const productMap = new Map<string, DBProductItem>((dbProducts as DBProductItem[]).map((p) => [p.id, p]));
    const verifiedOrderItems: OrderItem[] = [];
    let serverSubtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || product.is_active === false) {
        return fail(409, "Sepetinizdeki bir ürün artık satışta değil. Lütfen sepetinizi güncelleyin.", "PRODUCT_UNAVAILABLE");
      }
      if (product.is_available === false) {
        return fail(409, `${product.name} şu an tükendi. Lütfen sepetinizden çıkarın.`, "PRODUCT_UNAVAILABLE");
      }
      const unitPrice = Number(product.price);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return fail(409, `Ürün fiyatı geçersiz (${product.name}).`, "PRODUCT_UNAVAILABLE");
      }

      const lineTotal = unitPrice * item.quantity;
      serverSubtotal += lineTotal;
      verifiedOrderItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice: lineTotal,
        imageUrl: product.image_url || undefined,
        weight: product.weight || undefined,
        madeToOrder: product.made_to_order,
      });
    }

    // 5. Minimum sepet, teslimat ücreti (ayarlardan)
    if (settings.minBasketAmount > 0 && serverSubtotal < settings.minBasketAmount) {
      return fail(
        409,
        `Minimum sipariş tutarı ${settings.minBasketAmount.toLocaleString("tr-TR")} ₺'dir.`,
        "MIN_BASKET_NOT_MET"
      );
    }
    const shippingFee = computeShippingFee(serverSubtotal, settings);
    const totalAmount = serverSubtotal + shippingFee;

    // İlk sipariş mi? (Tahsin teyit etsin; telefon doğrulanmıyor). Sorgu hatası siparişi bozmaz.
    let isFirstOrder = false;
    try {
      const { count } = await supabaseAdmin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("phone", cleanPhone)
        .neq("status", "iptal");
      isFirstOrder = count === 0;
    } catch {
      isFirstOrder = false;
    }

    // 6. Kayıt
    const auth = await verifyApiAuth(req);
    const sessionUserId = auth.isAuthenticated ? auth.userId : null;

    const sanitizedName = sanitizeInput(customerInfo.name, 80);
    const sanitizedAddressDetail = sanitizeInput(customerInfo.addressDetail, 250);
    const sanitizedNote = sanitizeInput(customerInfo.note || "", 300);
    const neighborhood = neighborhoodMatch;
    const district = "Beylikdüzü";
    const fullAddress = `${neighborhood} Mah., ${sanitizedAddressDetail} / ${district}`;

    const hasLocation =
      typeof customerInfo.customerLat === "number" && typeof customerInfo.customerLng === "number";
    const nowIso = new Date().toISOString();
    const orderId = `ORD-${crypto.randomUUID().split("-")[0].toUpperCase()}`;

    const orderPayload = {
      id: orderId,
      customer_name: sanitizedName,
      phone: cleanPhone,
      delivery_method: "courier",
      delivery_address: fullAddress,
      district,
      neighborhood,
      address_detail: sanitizedAddressDetail,
      delivery_date: customerInfo.deliveryDate,
      delivery_time_window: settings.deliveryWindow,
      status: "bekliyor",
      payment_method: paymentMethod,
      payment_status: "pending",
      source: "web",
      subtotal: serverSubtotal,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      order_notes: sanitizedNote || null,
      idempotency_key: idempotencyKey,
      location_shared: hasLocation,
      customer_lat: hasLocation ? customerInfo.customerLat : null,
      customer_lng: hasLocation ? customerInfo.customerLng : null,
      location_consent_at: hasLocation ? customerInfo.locationConsentAt || nowIso : null,
      terms_accepted_at: nowIso,
      terms_version: TERMS_VERSION,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const itemsPayload = verifiedOrderItems.map((it) => ({
      product_id: it.productId,
      product_name: it.productName,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total_price: it.totalPrice,
      image_url: it.imageUrl || null,
      weight: it.weight || null,
      made_to_order: Boolean(it.madeToOrder),
    }));

    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("create_order_atomic", {
      p_order: orderPayload,
      p_items: itemsPayload,
      p_user_id: sessionUserId,
    });

    if (rpcErr || !rpcRes || !rpcRes.success) {
      const mapped = rpcErr ? mapRpcError(rpcErr.message) : null;
      if (mapped) return fail(mapped.status, mapped.error, mapped.code);

      Sentry.captureException(rpcErr || new Error("create_order_atomic returned success: false"), {
        tags: { endpoint: "/api/orders/create", type: "rpc_error" },
        extra: { orderId, rpcRes },
      });
      return fail(500, "Sipariş kaydedilemedi. Lütfen tekrar deneyiniz.");
    }

    const finalOrderId: string = typeof rpcRes.order_id === "string" ? rpcRes.order_id : orderId;
    const finalOrderNumber: string = rpcRes.order_number || finalOrderId;

    // RPC v3: aynı idempotency anahtarıyla eşzamanlı gelen istek kazanan siparişe yönlendirilir.
    // Bu durumda kayıtlı siparişi döndür ve ikinci "yeni sipariş" bildirimi GÖNDERME.
    if (rpcRes.is_existing === true) {
      const { data: persisted } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", finalOrderId)
        .maybeSingle();
      if (persisted) {
        return NextResponse.json({
          success: true,
          order: mapExistingOrder(persisted as unknown as DBOrderRow),
          trackingToken: signOrderToken(finalOrderId),
          isExisting: true,
        });
      }
    }

    const completedOrder: Order = {
      id: finalOrderId,
      orderNumber: finalOrderNumber,
      customerName: sanitizedName,
      phone: cleanPhone,
      deliveryAddress: fullAddress,
      items: verifiedOrderItems,
      subtotal: serverSubtotal,
      shippingFee,
      totalAmount,
      status: "bekliyor",
      paymentMethod,
      deliveryDate: customerInfo.deliveryDate,
      deliveryTimeWindow: settings.deliveryWindow,
      orderNotes: sanitizedNote || undefined,
      userId: sessionUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 7. Fırıncıya bildirim (yanıtı bekletmez, hata siparişi bozmaz)
    after(() =>
      notifyNewOrder({
        orderNumber: finalOrderNumber,
        orderId: finalOrderId,
        deliveryDate: customerInfo.deliveryDate,
        neighborhood,
        items: verifiedOrderItems.map((it) => ({ name: it.productName, quantity: it.quantity })),
        totalAmount,
        paymentMethod,
        isFirstOrder,
      })
    );

    return NextResponse.json({
      success: true,
      order: completedOrder,
      trackingToken: signOrderToken(finalOrderId),
    });
  } catch (error: unknown) {
    console.error("Order creation API error:", error);
    Sentry.captureException(error, { tags: { endpoint: "/api/orders/create", type: "unhandled_500" } });
    return fail(500, "Sipariş şu an kaydedilemedi. Lütfen birkaç saniye sonra tekrar deneyin; aynı sipariş iki kez oluşmaz.");
  }
}
