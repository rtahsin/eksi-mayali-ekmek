/** Fırının işletme ayarları (`bakery_settings.operational_settings`). Hepsi admin panelinden değiştirilebilir. */
export interface StoreSettings {
  /** Teslimat ücreti (₺), ücretsiz eşiğin altındaki siparişlere eklenir. */
  shippingFee: number;
  /** Bu ara toplam ve üzerinde teslimat ücretsiz (₺). 0 = her zaman ücretsiz. */
  freeShippingThreshold: number;
  /** Minimum sepet tutarı (₺). 0 = sınır yok. */
  minBasketAmount: number;
  /** Müşteriye gösterilen teslimat saat aralığı, ör. "14:00 - 18:00". */
  deliveryWindow: string;
  /** İşletme WhatsApp hattı (görünen biçim, ör. "0501 012 66 53"). */
  whatsappPhone: string;
  /** Kapalıysa yeni sipariş alınmaz. */
  orderAcceptanceOpen: boolean;
  /** Vitrinde gösterilen duyuru (boş = yok). */
  announcementText: string;
  /** Aynı gün teslimat için son sipariş saati ("HH:mm", İstanbul). */
  orderCutoffTime: string;
  /** Teslimat yapılan mahalleler. */
  neighborhoods: string[];
  /** Teslimat yapılan haftanın günleri (0 = Pazar … 6 = Cumartesi). */
  openWeekdays: number[];
  /** Kapalı tarihler (`YYYY-MM-DD`). */
  closedDates: string[];
  /** Bugünden itibaren kaç gün ileriye sipariş alınır. */
  maxDaysAhead: number;
  /** Günlük perakende ekmek kapasitesi (Faz 2). null = sınırsız. */
  dailyBreadCapacity: number | null;
  /** Şarküterilere günlük toptan ekmek adedi (üretim planı için, Faz 2). */
  wholesaleDailyLoaves: number;
}

/** Herkese açık alt küme (`/api/settings`). */
export type PublicStoreSettings = Omit<StoreSettings, "dailyBreadCapacity" | "wholesaleDailyLoaves">;

export interface DeliveryDateOption {
  /** `YYYY-MM-DD` */
  date: string;
  /** "Bugün", "Yarın", "Pzt 6 Eki" */
  label: string;
}

/** Sepete göre bir günün durumu (`/api/availability`). */
export interface CartDateOption extends DeliveryDateOption {
  available: boolean;
  reason: string | null;
  remainingCapacity: number | null;
}
