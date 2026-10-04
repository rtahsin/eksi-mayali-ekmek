import type { CanonicalOrderStatus } from "@/lib/orders/normalize";

export interface TrackingItem {
  name: string;
  quantity: number;
  /** Maskeli görünümde yok */
  unitPrice: number | null;
  totalPrice: number | null;
}

export interface TrackingHistoryEntry {
  status: CanonicalOrderStatus;
  at: string;
}

/** `/api/orders/[id]` cevabı (camelCase). Maskeli görünümde kişisel ve finansal alanlar gizlidir. */
export interface TrackingOrder {
  id: string;
  orderNumber: string;
  status: CanonicalOrderStatus;
  /** `YYYY-MM-DD` */
  deliveryDate: string;
  deliveryTimeWindow: string | null;
  neighborhood: string | null;
  items: TrackingItem[];
  subtotal: number | null;
  shippingFee: number | null;
  totalAmount: number | null;
  paymentMethod: string | null;
  customerName: string;
  phone: string;
  addressDetail: string | null;
  orderNotes: string | null;
  createdAt: string;
  cancelReason: string | null;
  history: TrackingHistoryEntry[];
  /** Müşteri bu siparişi şu an iptal edebilir mi (durum + yetki) */
  canCancel: boolean;
  isMasked: boolean;
}
