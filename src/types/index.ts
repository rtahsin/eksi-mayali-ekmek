export interface AtelierPlacement {
  sceneId: "counter" | "bread_shelf" | "pantry" | string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number;
  imageUrl: string;
  imageUrls?: string[];
  category: string;
  ingredients?: string[];
  stock: number;
  weight: number;
  weightUnit?: string;
  madeToOrder?: boolean; // Sipariş üzerine taze üretilir
  isPopular?: boolean;
  isNew?: boolean;
  isAvailable?: boolean;
  isActive?: boolean;
  atelierPlacement?: AtelierPlacement;
  storageInstructions?: string;
  flourTypes?: string[];
  hydration?: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
  weight?: number;
  madeToOrder?: boolean;
  batchId?: string;
}

export type OrderStatus = "pending" | "processing" | "ready" | "completed" | "cancelled";
export type PaymentMethod = "cash_on_delivery" | "pos_at_door" | "whatsapp";

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal?: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryDate?: string;
  orderNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Backward compatibility types
export type BatchStatus = "idle" | "fermentation" | "baking" | "ready" | "completed";

export interface ProductionBatch {
  batchId: string;
  productId: string;
  productName?: string;
  processTemplateId?: string;
  notes?: string;
  status: BatchStatus;
  startedAt?: any;
  durationHours?: number;
  estimatedDurationHours?: number;
  hydration?: number;
  flourMix?: string[];
  targetTemperature?: number;
  actualTemperature?: number;
  totalQuantity: number;
  availableStock: number;
  soldQuantity: number;
}

export interface BatchTelemetry {
  batchId: string;
  productName?: string;
  status: BatchStatus;
  statusLabel?: string;
  temperature?: number;
  actualTemp?: number;
  targetTemp?: number;
  humidity?: number;
  availableStock: number;
  totalQuantity?: number;
  progressPercentage?: number;
  elapsedSeconds?: number;
  totalDurationSeconds?: number;
  remainingSeconds?: number;
  formattedRemaining?: string;
  completionEstimatedAt?: Date;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  fermentationHours?: number;
  fermentationDurationHours?: number;
  bakingMinutes?: number;
}
