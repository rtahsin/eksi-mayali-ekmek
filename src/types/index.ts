export interface AtelierPlacement {
  sceneId: "counter" | "bread_shelf" | "pantry" | string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
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
  // ── Faz 2: esnek satış kuralları (admin'den yönetilir) ──
  /** Kampanya: üstü çizili eski fiyat */
  compareAtPrice?: number | null;
  /** "daily" = her gün, "dates" = sadece seçilen günlerde */
  availability?: ProductAvailability;
  /** availability = "dates" için yaklaşan satış günleri */
  saleDates?: ProductSaleDate[];
  /** Ürün başına günlük adet sınırı (yok = sınırsız) */
  dailyLimit?: number | null;
  /** En az kaç gün önceden sipariş */
  leadTimeDays?: number;
  /** Günlük ekmek kapasitesinden düşen birim (ekmek 1, eşlikçi 0, paket = içindeki ekmek) */
  capacityUnits?: number;
  /** Paket içeriği */
  bundleItems?: BundleItem[];
  /** "Birlikte iyi gider" önerileri (ürün id'leri) */
  crossSell?: string[];
  displayOrder?: number;
  /** Faz I-06: haftalık satış günleri (1=Pzt..7=Paz, null = her gün) */
  saleWeekdays?: number[] | null;
}

export interface MasterclassDetail {
  flourHeritage?: string;
  technique?: string;
  healthBenefit?: string;
  pairingStorage?: string;
  videoUrl?: string;
}

export interface ExtendedProduct extends Product {
  masterclass?: MasterclassDetail;
}

export type ProductAvailability = "daily" | "dates";

export interface ProductSaleDate {
  /** `YYYY-MM-DD` */
  date: string;
  /** O gün için adet sınırı (yok = ürünün günlük sınırı / sınırsız) */
  limit: number | null;
}

export interface BundleItem {
  productId: string;
  quantity: number;
}

export interface ProductCategoryInfo {
  id: string;
  name: string;
  description: string;
  displayOrder: number;
  isVisible: boolean;
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

import type { OrderStatus, PaymentMethod } from "@/lib/kernel/enums";
export type { OrderStatus, PaymentMethod };

export interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal?: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  /** `YYYY-MM-DD` (İstanbul) */
  deliveryDate?: string;
  deliveryTimeWindow?: string;
  orderNotes?: string;
  courierId?: string | null;
  assignedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: "customer" | "admin" | "system" | null;
  customerLat?: number | null;
  customerLng?: number | null;
  locationShared?: boolean;
  locationConsentAt?: string | null;
  userId?: string | null;
  cariId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export * from "./courier";
export * from "./payment";
export * from "./orderStatusHistory";

// Backward compatibility types
export type BatchStatus = "idle" | "fermentation" | "baking" | "ready" | "completed";

export interface ProductionBatch {
  batchId: string;
  productId: string;
  productName?: string;
  processTemplateId?: string;
  notes?: string;
  status: BatchStatus;
  startedAt?: string | Date;
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
