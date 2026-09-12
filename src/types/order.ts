export type OrderStatus = "pending" | "processing" | "ready" | "delivered" | "cancelled";
export type PaymentMethod = "whatsapp" | "cash_on_delivery" | "credit_card" | "pos_at_door";

export interface OrderItem {
  productId: string;
  productName: string;
  batchId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface StructuredAddress {
  district?: string; // e.g. "Beylikdüzü"
  neighborhood: string; // e.g. "Adnan Kahveci Mah."
  street: string; // e.g. "Anadolu Caddesi"
  buildingNo: string;
  apartmentNo?: string;
  directions?: string;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  deliveryAddress: string;
  structuredAddress?: StructuredAddress;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  items: OrderItem[];
  totalAmount: number;
  shippingFee?: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string;
  orderNotes?: string;
  preferredDeliveryWindow?: string;
  createdAt: {
    seconds?: number;
    nanoseconds?: number;
    toDate?: () => Date;
  } | string | number | Date;
  updatedAt?: {
    seconds?: number;
    nanoseconds?: number;
    toDate?: () => Date;
  } | string | number | Date;
}

export interface CreateOrderPayload {
  customerName: string;
  phone: string;
  email?: string;
  deliveryAddress: string;
  structuredAddress?: StructuredAddress;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  orderNotes?: string;
  idempotencyKey: string;
}
