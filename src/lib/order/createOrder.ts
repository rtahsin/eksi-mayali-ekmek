import { Order, PaymentMethod } from "@/types";
import { CartItem, CustomerInfo } from "@/lib/store/useCartStore";
import { formatTrDate } from "@/lib/time/istanbul";

export type CheckoutPaymentMethod = Extract<PaymentMethod, "whatsapp" | "cash_on_delivery" | "pos_at_door">;

export interface CreateOrderParams {
  items: CartItem[];
  customerInfo: CustomerInfo;
  paymentMethod: CheckoutPaymentMethod;
  /** Ödeme denemesi başına TEK anahtar: çift tıklama/yeniden deneme aynı siparişi döndürür. */
  idempotencyKey: string;
  termsAccepted: boolean;
}

export interface CreateOrderResult {
  order: Order;
  trackingToken: string | null;
}

export class OrderSubmitError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "OrderSubmitError";
  }
}

export async function submitOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const { items, customerInfo, paymentMethod, idempotencyKey, termsAccepted } = params;

  const response = await fetch("/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      customerInfo: {
        name: customerInfo.name,
        phone: customerInfo.phone,
        neighborhood: customerInfo.neighborhood,
        addressDetail: customerInfo.addressDetail,
        deliveryDate: customerInfo.deliveryDate,
        note: customerInfo.note || undefined,
        customerLat: customerInfo.customerLat ?? null,
        customerLng: customerInfo.customerLng ?? null,
        locationConsentAt: customerInfo.locationConsentAt ?? null,
      },
      deliveryMethod: "courier",
      paymentMethod,
      idempotencyKey,
      termsAccepted,
    }),
  });

  const data: { success?: boolean; error?: string; code?: string; order?: Order; trackingToken?: string | null } =
    await response.json().catch(() => ({}));

  if (!response.ok || !data.success || !data.order) {
    throw new OrderSubmitError(data.error || "Sipariş oluşturulamadı. Lütfen tekrar deneyin.", data.code);
  }

  return { order: data.order, trackingToken: data.trackingToken ?? null };
}

const PAYMENT_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp'ta konuşalım",
  cash_on_delivery: "Kapıda nakit",
  pos_at_door: "Kapıda kart (POS)",
};

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

/** Sipariş KAYDEDİLDİKTEN sonra WhatsApp'ta gönderilecek onay mesajı (kişisel veri tekrarlanmaz). */
export function buildWhatsAppConfirmText(order: Order, trackingLink: string): string {
  const lines = [
    `Merhaba, ${order.orderNumber || order.id} numaralı siparişimi onaylamak istiyorum.`,
    "",
    ...order.items.map((it) => `• ${it.quantity} × ${it.productName}`),
    `Toplam: ${order.totalAmount.toLocaleString("tr-TR")} ₺`,
  ];
  if (order.deliveryDate) {
    lines.push(`Teslim: ${formatTrDate(order.deliveryDate, "long")}${order.deliveryTimeWindow ? `, ${order.deliveryTimeWindow}` : ""}`);
  }
  lines.push(`Ödeme: ${paymentLabel(order.paymentMethod)}`, "", `Takip: ${trackingLink}`);
  return lines.join("\n");
}
