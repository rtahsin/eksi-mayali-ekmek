import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { INITIAL_PRODUCTS } from "@/hooks/useProducts";
import { Order, OrderItem } from "@/types";
import { checkRateLimit, sanitizeInput } from "@/lib/security/rateLimiter";

// 1. Zod Schema for Request Validation
const OrderItemSchema = z.object({
  productId: z.string().min(1, "Ürün ID gereklidir"),
  quantity: z.number().int().positive("Miktar 1 veya daha fazla olmalıdır").max(100, "Maksimum 100 adet sipariş edilebilir"),
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
});

const CreateOrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1, "Sepetinizde en az 1 ürün olmalıdır").max(30, "Sepette en fazla 30 kalem ürün olabilir"),
  customerInfo: CustomerInfoSchema,
  deliveryMethod: z.enum(["courier", "pickup"]),
  paymentMethod: z.enum(["whatsapp", "cash_on_delivery", "pos_at_door"]),
  idempotencyKey: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  try {
    // 0. Rate Limiting Check by IP
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";

    const ipLimit = checkRateLimit(`order_ip_${clientIp}`, 5, 600000); // Max 5 orders per 10 mins
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok fazla sipariş denemesi yapıldı. Güvenlik gereği lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyiniz.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        }
      );
    }

    const rawBody = await req.json();

    // Validate request schema with Zod
    const validationResult = CreateOrderRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: `Doğrulama hatası: ${errorMsg}` },
        { status: 400 }
      );
    }

    const { items, customerInfo, deliveryMethod, paymentMethod, idempotencyKey } = validationResult.data;

    // Rate Limiting Check by Phone Number
    const cleanPhone = customerInfo.phone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      const phoneLimit = checkRateLimit(`order_phone_${cleanPhone}`, 4, 600000); // Max 4 orders per 10 mins per phone
      if (!phoneLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Bu telefon numarası ile kısa sürede çok fazla sipariş verildi. Lütfen ${phoneLimit.retryAfterSeconds} saniye bekleyiniz.`,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(phoneLimit.retryAfterSeconds),
            },
          }
        );
      }
    }

    // Sanitize user inputs against XSS & injection
    const sanitizedName = sanitizeInput(customerInfo.name, 80);
    const sanitizedAddressDetail = sanitizeInput(customerInfo.addressDetail, 250);
    const sanitizedNeighborhood = sanitizeInput(customerInfo.neighborhood, 100);
    const sanitizedDistrict = sanitizeInput(customerInfo.district, 50) || "Beylikdüzü";
    const sanitizedNote = sanitizeInput(customerInfo.note || "", 300);


    // 2. Server-side product price & inventory resolution
    const verifiedOrderItems: OrderItem[] = [];
    let serverSubtotal = 0;

    for (const item of items) {
      let productData: any = null;

      try {
        // Try looking up in 'urunler' collection (Flutter backend) first
        const prodDoc = await adminDb.collection("urunler").doc(item.productId).get();
        if (prodDoc.exists) {
          productData = prodDoc.data();
        }
      } catch {
        // Fallback
      }

      if (!productData) {
        productData = INITIAL_PRODUCTS.find((p) => p.id === item.productId);
      }

      if (!productData) {
        return NextResponse.json(
          { success: false, error: `Ürün bulunamadı (ID: ${item.productId})` },
          { status: 404 }
        );
      }

      const unitPrice = Number(productData.price) || 135;
      const lineTotal = unitPrice * item.quantity;
      serverSubtotal += lineTotal;

      verifiedOrderItems.push({
        productId: item.productId,
        productName: productData.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice: lineTotal,
        imageUrl: productData.imageUrl,
        weight: productData.weight,
        madeToOrder: productData.madeToOrder,
      });
    }

    // 3. Server-side shipping fee & total amount calculation
    const shippingFee = deliveryMethod === "pickup" ? 0 : serverSubtotal >= 1000 ? 0 : 150;
    const totalAmount = serverSubtotal + shippingFee;

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const fullAddress =
      deliveryMethod === "pickup"
        ? "İmalathaneden Gel-Al (Beylikdüzü Atölye)"
        : `${sanitizedNeighborhood}, ${sanitizedAddressDetail} / ${sanitizedDistrict}`;

    const deliveryDateFormatted = customerInfo.deliveryDate || "today";

    const orderPayload = {
      id: orderId,
      customerName: sanitizedName,
      phone: cleanPhone,
      deliveryAddress: fullAddress,
      structuredAddress: {
        district: sanitizedDistrict,
        neighborhood: sanitizedNeighborhood,
        street: sanitizedAddressDetail,
        buildingNo: "",
        directions: sanitizedNote,
      },
      items: verifiedOrderItems,
      subtotal: serverSubtotal,
      shippingFee,
      totalAmount,
      status: "pending",
      paymentMethod,
      deliveryDate: deliveryDateFormatted,
      idempotencyKey: idempotencyKey || null,
      orderNotes: sanitizedNote,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 4. Save to Firestore 'siparisler' (Flutter Admin compatible) and 'orders'
    await adminDb.collection("siparisler").doc(orderId).set(orderPayload);

    const completedOrder: Order = {
      id: orderId,
      customerName: sanitizedName,
      phone: cleanPhone,
      deliveryAddress: fullAddress,
      items: verifiedOrderItems,
      totalAmount,
      shippingFee,
      status: "pending",
      paymentMethod,
      deliveryDate: deliveryDateFormatted,
      orderNotes: sanitizedNote,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      order: completedOrder,
    });
  } catch (error: any) {
    console.error("Order creation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Sipariş işlenirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
