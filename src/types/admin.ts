import { OrderItem } from "./index";
export type { OrderItem };

export type AdminRole = "superadmin" | "admin" | "editor" | "support";

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  isActive: boolean;
}

export interface TrustedDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  lastUsedAt: string;
  userAgent?: string;
}

export type AdminOrderStatus =
  | "onay_bekliyor"   // WhatsApp onay bekleyen yeni sipariş
  | "bekliyor"        // Yeni sipariş, teyit bekliyor
  | "hazirlaniyor"     // Hamur / paket hazırlanıyor
  | "firinda"          // Fırında pişiyor
  | "kuryede"          // Kurye teslimata çıktı
  | "teslim_edildi"    // Başarıyla teslim edildi
  | "iptal";           // İptal edildi

export type AdminPaymentMethod =
  | "cash_on_delivery" // Kapıda Nakit
  | "pos_at_door"      // Kapıda Kredi Kartı (Mobil POS)
  | "online"           // Online Kredi Kartı
  | "transfer"         // Havale / EFT
  | "cari";            // Kurumsal Cari Hesaba Yaz

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
  createdAt: string;
  updatedAt?: string;
}

export interface CariTransaction {
  id: string;
  cariId: string;
  date: string; // YYYY-MM-DD
  type: "satis" | "tahsilat" | "odeme" | "devir" | "storno"; // satis: sipariş verildi (borç yazıldı), tahsilat: ödeme alındı (alacak düştü), odeme: para ödendi (gider/tedarikçi), devir: açılış/düzeltme devri, storno: ters kayıt
  amount: number;
  description: string;
  paymentMethod?: "nakit" | "banka_havale" | "kredi_karti" | "diger";
  orderId?: string;
  relatedOrderId?: string;
  slipNumber?: string; // FİŞ-2609-001 veya Belge No
  balanceAfter?: number; // İşlem sonrası yürüyen bakiye
  createdAt?: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  materialType: string; // Un, Süt, Maya, Koli vb.
  phone: string;
  contactPerson?: string;
  balance: number; // Bizim borcumuz (Pozitif = tedarikçiye borcumuz var)
  notes?: string;
  createdAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  date: string; // YYYY-MM-DD
  type: "alis" | "odeme"; // alis: hammadde aldık (borcumuz arttı), odeme: para ödedik (borcumuz azaldı)
  amount: number;
  description: string;
  paymentMethod?: "nakit" | "banka_havale" | "kredi_karti" | "diger";
  createdAt?: string;
}

export interface ExpenseRecord {
  id: string;
  category: "hammadde" | "yakit_kurye" | "ambalaj" | "fatura_kira" | "diger";
  title: string;
  amount: number;
  date: string;
  supplierId?: string;
  paymentMethod: "nakit" | "kredi_karti" | "banka_havale" | "cari_borc";
  notes?: string;
  createdAt: string;
}

export type CashAccountType = "nakit" | "banka_havale" | "pos";

export interface CashMovement {
  id: string;
  type: "in" | "out" | "transfer"; // in: Para Girişi, out: Para Çıkışı, transfer: Virman
  account: CashAccountType; // "nakit" (Çekmece) | "banka_havale" (Banka) | "pos" (Mobil POS)
  targetAccount?: CashAccountType; // Virman ise aktarılan hesap
  amount: number;
  title: string;
  category?: string;
  date: string;
  notes?: string;
  relatedSource?: "kurye_teslimat" | "cari_tahsilat" | "cari_odeme" | "gider" | "virman" | "manuel";
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
