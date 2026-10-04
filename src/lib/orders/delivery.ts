import type { AdminPaymentMethod } from "@/types/admin";

/** Teslimde ödeme: nakit / POS / havale alındı ya da alınmadı (cari siparişte "cariye işlendi"). */
export type DeliveryPayment = "cash" | "pos" | "transfer" | "unpaid";

export const DELIVERY_PAYMENT_LABELS: Record<DeliveryPayment, string> = {
  cash: "Nakit alındı",
  pos: "Kartla (POS) alındı",
  transfer: "Havale ile ödendi",
  unpaid: "Ödenmedi",
};

/**
 * Admin "teslim edildi"ye hızlı geçerken varsayılan ödeme: siparişin ödeme yöntemi tahsil edilmiş sayılır.
 * Cari siparişte (veya "cariye yaz") ödeme alınmaz → borç cariye işlenir.
 */
export function defaultDeliveryPayment(method: AdminPaymentMethod | string | null | undefined, hasCari: boolean): DeliveryPayment {
  if (method === "cari") return "unpaid";
  if (method === "cash_on_delivery") return "cash";
  if (method === "pos_at_door") return "pos";
  if (method === "transfer") return "transfer";
  return hasCari ? "unpaid" : "cash";
}

export interface DeliverResult {
  ok: boolean;
  already?: boolean;
  error?: string;
  /** Ağ hatası: çevrimdışı kuyrukta tutulup yeniden denenmeli */
  retryable?: boolean;
}

/** POST /api/orders/[id]/deliver — sunucuda tek atomik işlem; tekrar çağrı güvenli. */
export async function deliverOrder(orderId: string, payment: DeliveryPayment, note?: string): Promise<DeliverResult> {
  let res: Response;
  try {
    res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment, ...(note ? { note } : {}) }),
    });
  } catch {
    return { ok: false, retryable: true, error: "Bağlantı yok" };
  }
  const data: unknown = await res.json().catch(() => null);
  const rec = (data && typeof data === "object" ? data : {}) as { already?: boolean; error?: string };
  if (!res.ok) {
    // 5xx geçici olabilir (sunucu/ağ geçidi); 4xx kalıcıdır (iptal edilmiş, yetki yok…)
    return { ok: false, retryable: res.status >= 500, error: rec.error || `Teslim kaydedilemedi (${res.status})` };
  }
  return { ok: true, already: Boolean(rec.already) };
}
