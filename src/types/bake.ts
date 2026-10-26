/** "Fırından çıktı" kaydı: bir fırın çıkışı (bake_logs satırı). */
export interface BakeLogItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface BakeLog {
  id: string;
  /** ISO zaman damgası */
  bakedAt: string;
  /** İstanbul günü, `YYYY-MM-DD` */
  day: string;
  items: BakeLogItem[];
  /** Herkese açık fotoğraf adresi (yoksa null) */
  photoUrl: string | null;
  note: string | null;
  hidden: boolean;
}

/** Kayıt formunda seçilebilen ürün (fırına giren ürünler). */
export interface BakeProduct {
  id: string;
  name: string;
}

export interface BakeLogDay {
  day: string;
  logs: BakeLog[];
  products: BakeProduct[];
}
