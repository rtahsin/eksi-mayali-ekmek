import { OrderItem } from "./index";
import type { Role, OrderStatus, PaymentMethod } from "@/lib/kernel/enums";
export type { OrderItem, Role };

export type AdminRole = Extract<Role, "superadmin" | "admin" | "staff">;

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  isActive: boolean;
}

export type AdminOrderStatus = OrderStatus;
export type AdminPaymentMethod = PaymentMethod;

export type OrderSource = "web" | "whatsapp" | "phone" | "in_store";

export interface AdminOrder {
  id: string;
  orderNumber?: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  neighborhood?: string; // Beylikdüzü Mahallesi
  deliveryMethod: "courier" | "pickup";
  deliveryDate: string; // YYYY-MM-DD
  deliveryTimeWindow?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: AdminOrderStatus;
  paymentMethod: AdminPaymentMethod;
  paymentStatus: "paid" | "pending" | "on_delivery";
  source: OrderSource;
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
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  estimatedDelivery?: string | null;
  userId?: string | null;
  idempotencyKey?: string | null;
  cariId?: string;
  orderNotes?: string;
  courierNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CariAccount {
  id: string;
  businessName: string; // Restoran / Kafe / Firma Adı
  contactPerson: string;
  phone: string;
  address: string;
  neighborhood: string;
  taxNumber?: string;
  taxOffice?: string;
  customPrices?: Record<string, number>; // productId -> ikili anlaşma toptan fiyatı (₺)
  balance: number; // Müşterinin bize olan borcu (Pozitif = alacağımız var)
  accountType?: "musteri" | "gider"; // musteri: Şarküteri/Kafe/Restoran, gider: Dükkan Giderleri/Tedarikçi
  notes?: string;
  archivedAt?: string | null; // arşivli cari: listede görünmez, yeni hareket alamaz
  createdAt: string;
  updatedAt?: string;
}

/**
 * Cari defter türü (016 sonrası kanonik):
 * satis: teslimat fişi (borç +), tahsilat: ödeme alındı (borç −),
 * devir: açılış / bakiye düzeltme (±), storno: bir hareketin ters kaydı (iptal).
 */
export type LedgerType = "satis" | "tahsilat" | "devir" | "storno";

export type LedgerPaymentMethod = "nakit" | "pos" | "banka_havale" | "kredi_karti" | "diger";

export interface LedgerItem {
  name: string;
  quantity: number;
  unitPrice: number;
  productId?: string;
}

export interface CariTransaction {
  id: string;
  cariId: string;
  date: string; // YYYY-MM-DD (İstanbul)
  type: LedgerType;
  /** Her zaman pozitif tutar (gösterim için) */
  amount: number;
  /** Bakiyeye etkisi: + borç artar, − borç azalır. Bakiye = Σ delta */
  delta: number;
  description: string;
  paymentMethod?: LedgerPaymentMethod | string;
  orderId?: string;
  relatedOrderId?: string;
  slipNumber?: string; // FİŞ-2609-001
  balanceAfter?: number; // İşlem anındaki yürüyen bakiye
  items?: LedgerItem[];
  /** Bu kayıt bir storno ise iptal ettiği hareket */
  reversesId?: string | null;
  /** Bu hareket iptal edildiyse storno kaydının id'si */
  reversedById?: string | null;
  createdAt?: string;
}

export const BEYLIKDUZU_NEIGHBORHOODS = [
  "Adnan Kahveci",
  "Barış",
  "Büyükşehir",
  "Cumhuriyet",
  "Dereağzı",
  "Gürpınar",
  "Kavaklı",
  "Marmara",
  "Sahil",
  "Yakuplu",
  "Beykent",
] as const;
