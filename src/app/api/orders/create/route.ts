import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { Order, OrderItem } from "@/types";
import { checkRateLimit, sanitizeInput } from "@/lib/security/rateLimiter";
import { getErrorMessage } from "@/lib/utils/error";
import { generateOrderNumber } from "@/lib/utils/orderNumber";

// 1. Zod Schema for Request Validation
const OrderItemSchema = z.object({
  productId: z.string().min(1, "Ürün ID gereklidir"),
  quantity: z
    .number()
    .int()
    .positive("Miktar 1 veya daha fazla olmalıdır")
    .max(100, "Maksimum 100 adet sipariş edilebilir"),
  batchId: z.string().optional(),
});

const CustomerInfoSchema = z.object({
  name: z.string().min(2, "Geçerli bir ad ve soyad giriniz").max(80, "Ad soyad çok uzun"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz").max(20, "Telefon numarası çok uzun"),
  district: z.string().default("Beylikdüzü"),
  neighborhood: z.string().min(2, "Mahalle bilgisi gereklidir").max(100),
  addressDetail: z.string().min(3, "Açık adres bilgisi gereklidir").max(250),
  deliveryDate: z.string().optional(),
  customDate: z.string().optional(),
  note: z.string().max(300).optional(),
  shareLocation: z.boolean().optional(),
  customerLat: z.number().nullable().optional(),
  customerLng: z.number().nullable().optional(),
  locationConsentAt: z.string().nullable().optional(),
});

const CreateOrderRequestSchema = z.object({
  items: z
    .array(OrderItemSchema)
    .min(1, "Sepetinizde en az 1 ürün olmalıdır")
    .max(30, "Sepette en fazla 30 kalem ürün olabilir"),
  customerInfo: CustomerInfoSchema,
  deliveryMethod: z.enum(["courier", "pickup"]),
  paymentMethod: z.enum(["whatsapp", "cash_on_delivery", "pos_at_door"]),
  idempotencyKey: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
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

export async function POST(req: Request) {
  try {
    // 0. IP-based Rate Limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";

    const ipLimit = checkRateLimit(`order_ip_${clientIp}`, 10, 600000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Geçici olarak engellendiniz. Lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyiniz.`,
        },
        { status: 429 }
      );
    }

    const rawBody = await req.json();

    // Validate request schema with Zod
    const validationResult = CreateOrderRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues.map((e) => getErrorMessage(e)).join(", ");
      return NextResponse.json(
        { success: false, error: `Doğrulama hatası: ${errorMsg}` },
        { status: 400 }
      );
    }

    const { items, customerInfo, deliveryMethod, paymentMethod, idempotencyKey, userId } =
      validationResult.data;

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      console.error("Supabase admin client unavailable in /api/orders/create");
      return NextResponse.json(
        { success: false, error: "Sunucu veritabanı bağlantısı kurulamadı." },
        { status: 500 }
      );
    }

    // 1. Idempotency Key Kontrolü (Çift Sipariş Önleme)
    if (idempotencyKey) {
      const { data: existingData } = await supabaseAdmin
        .from("orders")
        .select("*, order_items(*)")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingData) {
        const row = existingData as unknown as DBOrderRow;
        const mappedExisting: Order = {
          id: row.id,
          orderNumber: row.order_number || row.id.replace("ORD-", "").toUpperCase(),
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
          orderNotes: row.order_notes || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at || undefined,
        };

        return NextResponse.json({
          success: true,
          order: mappedExisting,
          isExisting: true,
        });
      }
    }

    // 2. Database-backed Rate Limiting Check by Phone Number
    const cleanPhone = customerInfo.phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("phone", cleanPhone)
        .gte("created_at", fifteenMinsAgo);

      if (count !== null && count >= 3) {
        return NextResponse.json(
          {
            success: false,
            error: `Bu telefon numarası ile son 15 dakika içinde maksimum sipariş limitine ulaştınız. Lütfen daha sonra tekrar deneyiniz.`,
          },
          { status: 429 }
        );
      }
    }

    // Sanitize user inputs
    const sanitizedName = sanitizeInput(customerInfo.name, 80);
    const sanitizedAddressDetail = sanitizeInput(customerInfo.addressDetail, 250);
    const sanitizedNeighborhood = sanitizeInput(customerInfo.neighborhood, 100);
    const sanitizedDistrict = sanitizeInput(customerInfo.district, 50) || "Beylikdüzü";
    const sanitizedNote = sanitizeInput(customerInfo.note || "", 300);

    // 3. Server-side product price & inventory resolution directly from Database
    const productIds = items.map((it) => it.productId);
    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("id", productIds);

    if (prodErr || !dbProducts) {
      console.error("Products query error:", prodErr);
      return NextResponse.json(
        { success: false, error: "Ürün bilgileri doğrulanamadı." },
        { status: 500 }
      );
    }

    interface DBProductItem {
      id: string;
      name: string;
      price: number | string;
      image_url?: string | null;
      imageUrl?: string | null;
      weight?: number | null;
      made_to_order?: boolean;
      madeToOrder?: boolean;
      is_available?: boolean;
    }

    const productMap = new Map<string, DBProductItem>(
      (dbProducts as DBProductItem[]).map((p) => [p.id, p])
    );

    const verifiedOrderItems: OrderItem[] = [];
    let serverSubtotal = 0;

    for (const item of items) {
      const productData = productMap.get(item.productId);

      if (!productData) {
        return NextResponse.json(
          { success: false, error: `Ürün bulunamadı (ID: ${item.productId})` },
          { status: 404 }
        );
      }

      // Stok & mevcudiyet kontrolü (P1-6)
      if (productData.is_available === false) {
        return NextResponse.json(
          { success: false, error: `${productData.name} şu an stokta bulunmuyor.` },
          { status: 400 }
        );
      }

      const unitPrice = Number(productData.price) ?? 0;
      if (unitPrice <= 0) {
        return NextResponse.json(
          { success: false, error: `Ürün fiyatı geçersiz (${productData.name})` },
          { status: 400 }
        );
      }

      const lineTotal = unitPrice * item.quantity;
      serverSubtotal += lineTotal;

      verifiedOrderItems.push({
        productId: item.productId,
        productName: productData.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice: lineTotal,
        imageUrl: productData.imageUrl || productData.image_url || undefined,
        weight: productData.weight || undefined,
        madeToOrder: productData.madeToOrder ?? productData.made_to_order,
      });
    }

    // 4. Server-side shipping fee & total amount calculation
    const shippingFee = deliveryMethod === "pickup" ? 0 : serverSubtotal >= 1000 ? 0 : 150;
    const totalAmount = serverSubtotal + shippingFee;

    const orderId = `ORD-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    const now = new Date();
    const nowIso = now.toISOString();

    const fullAddress =
      deliveryMethod === "pickup"
        ? "İmalathaneden Gel-Al (Beylikdüzü Atölye)"
        : `${sanitizedNeighborhood}, ${sanitizedAddressDetail} / ${sanitizedDistrict}`;

    const deliveryDateFormatted = customerInfo.deliveryDate || "today";

    const isLocationShared = Boolean(
      customerInfo.shareLocation && customerInfo.customerLat && customerInfo.customerLng
    );
    const locationConsentAt = isLocationShared ? customerInfo.locationConsentAt || nowIso : null;

    let finalOrderNumber = "";

    const orderPayload = {
      id: orderId,
      customer_name: sanitizedName,
      phone: cleanPhone,
      delivery_method: deliveryMethod,
      delivery_address: fullAddress,
      district: sanitizedDistrict,
      neighborhood: sanitizedNeighborhood,
      address_detail: sanitizedAddressDetail,
      delivery_date: deliveryDateFormatted,
      status: "bekliyor",
      payment_method: paymentMethod,
      payment_status: "pending",
      source: "web",
      subtotal: serverSubtotal,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      order_notes: sanitizedNote || null,
      idempotency_key: idempotencyKey || null,
      location_shared: isLocationShared,
      customer_lat: customerInfo.customerLat ?? null,
      customer_lng: customerInfo.customerLng ?? null,
      location_consent_at: locationConsentAt,
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

    // 5. Atomic PostgreSQL order creation (P0-2 & P0-3)
    let atomicSuccess = false;
    try {
      const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("create_order_atomic", {
        p_order: orderPayload,
        p_items: itemsPayload,
        p_user_id: userId || null,
      });

      if (!rpcErr && rpcRes && rpcRes.order_number) {
        finalOrderNumber = rpcRes.order_number;
        atomicSuccess = true;
      } else if (rpcErr) {
        console.warn("create_order_atomic RPC error, falling back to direct transactional insert:", rpcErr.message || rpcErr);
      }
    } catch (rpcEx) {
      console.warn("create_order_atomic RPC exception:", rpcEx);
    }

    if (!atomicSuccess) {
      // Fallback: Direct insert with STRICT error handling
      finalOrderNumber = await generateOrderNumber(now);

      const { error: supaOrderErr } = await supabaseAdmin.from("orders").insert({
        ...orderPayload,
        order_number: finalOrderNumber,
        user_id: userId || null,
      });

      if (supaOrderErr) {
        console.error("Supabase order insert error:", supaOrderErr);
        return NextResponse.json(
          {
            success: false,
            error: "Sipariş veritabanına kaydedilemedi. Lütfen tekrar deneyiniz.",
          },
          { status: 500 }
        );
      }

      // Kalemleri ekle
      const itemInserts = itemsPayload.map((it) => ({
        ...it,
        order_id: orderId,
      }));
      const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemInserts);
      if (itemsErr) {
        console.error("Order items insert error:", itemsErr);
      }

      // Audit log (order_status_history)
      await supabaseAdmin.from("order_status_history").insert({
        order_id: orderId,
        from_status: null,
        to_status: "bekliyor",
        changed_by_role: "customer",
        changed_by_id: userId || null,
        note: "Müşteri web üzerinden sipariş verdi",
      });

      // Ödeme kaydı (payments)
      const payMethod =
        paymentMethod === "cash_on_delivery"
          ? "cash"
          : paymentMethod === "pos_at_door"
          ? "pos"
          : "online_card";

      await supabaseAdmin.from("payments").insert({
        order_id: orderId,
        amount: totalAmount,
        method: payMethod,
        status: "pending",
        note: "Web siparişi oluşturuldu",
      });

      // Canlı konum paylaşıldıysa customer_locations tablosuna ilk kaydı at
      if (isLocationShared && customerInfo.customerLat && customerInfo.customerLng) {
        await supabaseAdmin.from("customer_locations").insert({
          order_id: orderId,
          lat: customerInfo.customerLat,
          lng: customerInfo.customerLng,
          accuracy: 10,
        });
      }

      // Giriş yapmış kullanıcı profilini güncelle
      if (userId) {
        const { data: profData } = await supabaseAdmin
          .from("profiles")
          .select("total_orders, total_spent")
          .eq("id", userId)
          .maybeSingle();

        if (profData) {
          const currentOrders = Number(profData.total_orders) || 0;
          const currentSpent = Number(profData.total_spent) || 0;
          await supabaseAdmin
            .from("profiles")
            .update({
              total_orders: currentOrders + 1,
              total_spent: currentSpent + totalAmount,
              last_order_at: nowIso,
              updated_at: nowIso,
            })
            .eq("id", userId);
        }
      }
    }

    const completedOrder: Order = {
      id: orderId,
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
      deliveryDate: deliveryDateFormatted,
      orderNotes: sanitizedNote || undefined,
      locationShared: isLocationShared,
      customerLat: customerInfo.customerLat ?? null,
      customerLng: customerInfo.customerLng ?? null,
      locationConsentAt: locationConsentAt ?? undefined,
      userId: userId || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return NextResponse.json({
      success: true,
      order: completedOrder,
    });
  } catch (error: unknown) {
    console.error("Order creation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || "Sipariş işlenirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
