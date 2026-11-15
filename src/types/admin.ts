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

export type OrderSource = "web" | "whatsapp" | "phone" | "in_store" | "admin" | "standing_order";
export type ExtendedOrderSource = OrderSource;

export interface AdminOrder {
  id: string;
  orderNumber?: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  district?: string;
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
  stopSequence?: number | null;
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

export interface CariStandingOrder {
  enabled: boolean;
  /** ISO haftanın günü ("1"=Pzt .. "7"=Paz) -> { [productId]: quantity } */
  schedule: Record<string, Record<string, number>>;
  notes?: string;
}

export interface CariAccount {
  id: string;
  businessName: string; // Restoran / Kafe / Firma Adı
  contactPerson: string;
  phone: string;
  address: string;
  district?: string;
  neighborhood: string;
  companyTitle?: string;
  taxNumber?: string;
  taxOffice?: string;
  creditLimit?: number;
  shareTokenVersion?: number;
  defaultCourierId?: string | null;
  standingOrder?: CariStandingOrder;
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
  productName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
  unit?: string;
  isReturn?: boolean;
  productId?: string;
}

export type B2BHotSalePaymentMethod = "nakit" | "kredi_karti" | "havale";

export interface B2BHotSaleItem {
  productId: string | null;
  name: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unit: string;
  isReturn: boolean;
}

export interface B2BHotSaleTransactionSummary {
  transactionId: string;
  slipNumber: string;
  delta: number;
  balanceAfter: number;
}

export interface B2BHotSaleAccountSummary {
  id: string;
  businessName: string;
  companyTitle?: string;
  contactPerson: string;
  phone: string;
  address: string;
  district?: string;
  neighborhood: string;
  taxNumber?: string;
  taxOffice?: string;
  creditLimit: number;
  shareTokenVersion: number;
}

export interface B2BHotSaleResult {
  success: true;
  saleTransaction: B2BHotSaleTransactionSummary;
  paymentTransaction: B2BHotSaleTransactionSummary | null;
  balanceAfter: number;
  signedSlipUrl: string;
  account: B2BHotSaleAccountSummary;
  items: B2BHotSaleItem[];
  grossTotal: number;
  returnTotal: number;
  netAmount: number;
  collectedAmount: number;
  paymentMethod?: B2BHotSalePaymentMethod;
  date: string;
  description: string;
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

export const ISTANBUL_DISTRICTS = [
  "Beylikdüzü",
  "Büyükçekmece",
  "Esenyurt",
  "Avcılar",
  "Küçükçekmece",
  "Başakşehir",
  "Bakırköy",
  "Bahçelievler",
  "Beşiktaş",
  "Beyoğlu",
  "Şişli",
  "Kadıköy",
  "Üsküdar",
  "Sarıyer",
  "Fatih",
] as const;

export type ExpenseCategory =
  | "hammadde_un"
  | "mandira_sarkuteri"
  | "ambalaj_etiket"
  | "enerji_firin"
  | "kurye_akit"
  | "ekipman_bakim"
  | "kira_sabit"
  | "diger";

export type FinancialRecordType = "gider" | "gelir" | "storno_gider" | "storno_gelir";

export type FinancialPaymentMethod = "nakit" | "kredi_karti" | "havale" | "pos";

export interface FinancialRecord {
  id: string;
  type: FinancialRecordType;
  category: ExpenseCategory | string;
  amount: number; // her zaman pozitif tutar
  /** Net nakit/kâr etkisi: gelir / storno_gider => +amount, gider / storno_gelir => -amount */
  signedEffect: number;
  description: string;
  paymentMethod: FinancialPaymentMethod | string;
  date: string; // YYYY-MM-DD (Europe/Istanbul)
  createdAt: string;
  reversesRecordId: string | null;
  isReversed: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  /** Simetrik tedarikçi borç bakiyesi = Toplam Alım (alis) - Toplam Ödeme (odeme) */
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export type SupplierTransactionType = "alis" | "odeme" | "storno_alis" | "storno_odeme";

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: SupplierTransactionType;
  amount: number; // her zaman pozitif
  /** Borç bakiyesine etkisi: alis / storno_odeme => +amount, odeme / storno_alis => -amount */
  delta: number;
  invoiceNo: string | null;
  description: string;
  date: string; // YYYY-MM-DD (Europe/Istanbul)
  createdAt: string;
  reversesTransactionId: string | null;
  isReversed: boolean;
}

export interface CfoPeriodSummary {
  periodFrom: string;
  periodTo: string;
  retailDeliveredSales: number;
  retailCollectedCash: number;
  b2bNetSales: number;
  b2bCollectedCash: number;
  otherIncome: number;
  totalGrossSales: number;
  totalCashIn: number;
  totalOperatingExpenses: number;
  expensesByCategory: Record<string, number>;
  netOperatingProfit: number;
  netOperatingMarginPct: number;
  netCashFlow: number;
  totalB2BReceivables: number;
  totalSupplierPayables: number;
  netWorkingCapital: number;
}
