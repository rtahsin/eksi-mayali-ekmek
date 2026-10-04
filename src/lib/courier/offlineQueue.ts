import type { DeliveryPayment } from "@/lib/orders/delivery";

export const COURIER_OFFLINE_QUEUE_KEY = "ekmeklab_courier_offline_queue";

/** Çevrimdışıyken yapılan teslim; bağlantı gelince /api/orders/[id]/deliver ile gönderilir (tekrar güvenli). */
export interface OfflineQueueItem {
  id: string;
  timestamp: number;
  orderId: string;
  payment: DeliveryPayment;
  note?: string;
}

const PAYMENTS: ReadonlySet<string> = new Set(["cash", "pos", "transfer", "unpaid"]);

/** Eski biçimdeki kayıtları (paymentPayload + statusPayload) yeni biçime çevirir. */
function normalizeItem(raw: unknown): OfflineQueueItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.orderId !== "string") return null;
  const timestamp = typeof r.timestamp === "number" ? r.timestamp : Date.now();

  if (typeof r.payment === "string" && PAYMENTS.has(r.payment)) {
    return { id: r.id, timestamp, orderId: r.orderId, payment: r.payment as DeliveryPayment, note: typeof r.note === "string" ? r.note : undefined };
  }
  const pp = (r.paymentPayload ?? null) as { method?: unknown; status?: unknown } | null;
  const payment: DeliveryPayment =
    pp && pp.status === "completed"
      ? pp.method === "cash"
        ? "cash"
        : pp.method === "pos" || pp.method === "online_card"
        ? "pos"
        : pp.method === "transfer"
        ? "transfer"
        : "unpaid"
      : "unpaid";
  return { id: r.id, timestamp, orderId: r.orderId, payment, note: "Çevrimdışı teslim" };
}

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COURIER_OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeItem).filter((x): x is OfflineQueueItem => x !== null) : [];
  } catch (err) {
    console.error("Error reading courier offline queue:", err);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COURIER_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Error saving courier offline queue:", err);
  }
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, "id" | "timestamp">): OfflineQueueItem {
  // Aynı sipariş için tek kayıt: son seçim geçerli
  const currentQueue = getOfflineQueue().filter((q) => q.orderId !== item.orderId);
  const newItem: OfflineQueueItem = { ...item, id: `queue_${crypto.randomUUID()}`, timestamp: Date.now() };
  saveOfflineQueue([...currentQueue, newItem]);
  return newItem;
}

export function removeFromOfflineQueue(id: string): void {
  saveOfflineQueue(getOfflineQueue().filter((item) => item.id !== id));
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COURIER_OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.error("Error clearing courier offline queue:", err);
  }
}
