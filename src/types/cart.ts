import type { Order } from "@/types";

export interface ReorderRequestItem {
  productId?: string | null;
  name: string;
  quantity: number;
}

export interface ApplyReorderResult {
  addedCount: number;
  unavailableNames: string[];
  needsConfirmation?: boolean;
}

export interface CartItem {
  productId: string;
  batchId?: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
  imageUrl: string;
  weight: number;
  weightUnit?: string;
  flourTypes?: string[];
  hydration?: number;
}

export type DeliveryMethod = "courier";
export type ReorderMode = "append" | "replace";

export interface PendingReorder {
  items: CartItem[];
  unavailableNames: string[];
}

export interface CartNotice {
  sequence: number;
  name: string;
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  neighborhood: string;
  addressDetail: string;
  /** İstanbul tarihi; yalnız uygunluk yanıtından seçilir. */
  deliveryDate: string;
  note?: string;
  customerLat?: number | null;
  customerLng?: number | null;
  locationConsentAt?: string | null;
}

export interface CompletedOrder {
  order: Order;
  trackingToken: string | null;
}
