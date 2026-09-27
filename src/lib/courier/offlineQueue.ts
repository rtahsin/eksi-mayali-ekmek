import { PaymentMethodType, PaymentStatusType, PaymentCollectedBy } from "@/types/payment";
import { AdminOrderStatus } from "@/types/admin";

export const COURIER_OFFLINE_QUEUE_KEY = "ekmeklab_courier_offline_queue";

export interface OfflinePaymentPayload {
  orderId: string;
  amount: number;
  method: PaymentMethodType;
  status?: PaymentStatusType;
  collectedBy?: PaymentCollectedBy;
  courierId?: string | null;
  note?: string | null;
  cariId?: string | null;
}

export interface OfflineStatusPayload {
  orderId: string;
  newStatus: AdminOrderStatus;
  courierNotes?: string;
  changedByRole: "courier" | "admin" | "system";
  changedById?: string;
  note?: string;
}

export interface OfflineQueueItem {
  id: string;
  timestamp: number;
  orderId: string;
  paymentPayload?: OfflinePaymentPayload;
  statusPayload: OfflineStatusPayload;
}

/**
 * Reads offline queue from localStorage safely.
 */
export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COURIER_OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading courier offline queue:", err);
    return [];
  }
}

/**
 * Saves entire queue to localStorage.
 */
export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COURIER_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Error saving courier offline queue:", err);
  }
}

/**
 * Adds an item to the courier offline queue.
 */
export function addToOfflineQueue(
  item: Omit<OfflineQueueItem, "id" | "timestamp">
): OfflineQueueItem {
  const currentQueue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  const updated = [...currentQueue, newItem];
  saveOfflineQueue(updated);
  return newItem;
}

/**
 * Removes an item from the courier offline queue by id.
 */
export function removeFromOfflineQueue(id: string): void {
  const currentQueue = getOfflineQueue();
  const updated = currentQueue.filter((item) => item.id !== id);
  saveOfflineQueue(updated);
}

/**
 * Clears the offline queue.
 */
export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COURIER_OFFLINE_QUEUE_KEY);
  } catch (err) {
    console.error("Error clearing courier offline queue:", err);
  }
}
