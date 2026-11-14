/** Üretim ekranı: bir gün için ne pişirilecek / paketlenecek. */
export interface ProductionLine {
  productId: string;
  name: string;
  category: string | null;
  quantity: number;
  /** Günlük ekmek kapasitesinden düşen birim (eşlikçi 0) */
  capacityUnits: number;
  /** Mandıra / şarküteri / eşlikçi ürünü mü? */
  isAccompaniment: boolean;
  /** Ürün birim ağırlığı (varsa) */
  weight: number | null;
  /** Ağırlık birimi ("g", "kg", "ml" vb.) */
  weightUnit: string | null;
  /** Hamur hidrasyon yüzdesi (ör. 72) */
  hydration: number | null;
}

export interface ProductionDay {
  date: string;
  orderCount: number;
  lines: ProductionLine[];
  wholesaleLoaves: number;
  capacity: { limit: number | null; used: number; isOverride: boolean; note: string | null };
}
