import { Order, PaymentMethod } from "@/types";
import { CartItem, CustomerInfo, DeliveryMethod } from "@/lib/store/useCartStore";

export interface CreateOrderParams {
  items: CartItem[];
  customerInfo: CustomerInfo;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  idempotencyKey?: string;
  userId?: string;
}

export async function createOrderInSupabase(params: CreateOrderParams): Promise<Order> {
  const { items, customerInfo, deliveryMethod, paymentMethod, idempotencyKey, userId } = params;

  // Call Server-side Secure API Route (/api/orders/create)
  const response = await fetch("/api/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        batchId: item.batchId,
      })),
      customerInfo,
      deliveryMethod,
      paymentMethod,
      idempotencyKey: idempotencyKey || `IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: userId || undefined,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Sipariş sunucu tarafından onaylanamadı.");
  }

  return data.order as Order;
}

// Geriye dönük uyumluluk için alias
export const createOrderInFirestore = createOrderInSupabase;

/**
 * Builds a structured, readable WhatsApp message template and directs to wa.me/905436329243
 */
export function generateWhatsAppOrderUrl(params: CreateOrderParams): string {
  const { items, customerInfo, deliveryMethod, paymentMethod, subtotal, shippingFee, totalAmount } = params;

  const paymentLabel =
    paymentMethod === "pos_at_door"
      ? "Kapıda Kredi Kartı / POS"
      : paymentMethod === "cash_on_delivery"
      ? "Kapıda Nakit Ödeme"
      : "WhatsApp Üzerinden Teyitli";

  const deliveryLabel = "🛵 Beylikdüzü İçi Fırın Kuryesi";

  const curDate = customerInfo?.deliveryDate || "today";
  const deliveryDateLabel =
    curDate === "today"
      ? "Bugün (Aynı Gün Teslimat)"
      : curDate === "tomorrow"
      ? "Yarın Sabah Fırın Çıkışı"
      : curDate.replace("custom:", "") + " Tarihinde";

  const lines: string[] = [
    "🍞 *EKMEKLAB YENİ SİPARİŞ BİLDİRİMİ*",
    "──────────────────────────",
    "*Sipariş Kalemleri:*",
  ];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. *${item.name}*` +
      `\n   ↳ ${item.quantity} Adet x ${item.price} TL = ${item.quantity * item.price} TL`
    );
  });

  lines.push("──────────────────────────");
  lines.push(`💰 *Ara Toplam:* ${subtotal} TL`);
  if (shippingFee > 0) {
    lines.push(`🛵 *Kurye Ücreti:* ${shippingFee} TL`);
  } else {
    lines.push(`🛵 *Kargo/Kurye:* ÜCRETSİZ`);
  }
  lines.push(`🏷️ *GENEL TOPLAM:* ${totalAmount} TL`);
  lines.push("──────────────────────────");
  lines.push(`📅 *Teslimat Günü:* ${deliveryDateLabel}`);
  lines.push(`📍 *Teslimat Şekli:* ${deliveryLabel}`);
  lines.push(`💳 *Ödeme Tercihi:* ${paymentLabel}`);
  lines.push("");
  lines.push("*Müşteri Bilgileri:*");
  lines.push(`👤 *Ad Soyad:* ${customerInfo.name || "Belirtilmedi"}`);
  lines.push(`📞 *Telefon:* ${customerInfo.phone || "Belirtilmedi"}`);

  if (deliveryMethod === "courier") {
    lines.push(`🏘️ *Mahalle:* ${customerInfo.neighborhood}`);
    lines.push(`🏠 *Adres:* ${customerInfo.addressDetail || "Belirtilmedi"}`);
  }

  if (customerInfo.note && customerInfo.note.trim()) {
    lines.push(`📝 *Sipariş Notu:* ${customerInfo.note}`);
  }

  lines.push("──────────────────────────");
  lines.push("Lütfen siparişimi onaylayıp teslimat saatini iletir misiniz?");

  const text = lines.join("\n");
  const phone = "905010126653";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
