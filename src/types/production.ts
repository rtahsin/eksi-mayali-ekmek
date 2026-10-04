/** Üretim ekranı: bir gün için ne pişirilecek / paketlenecek. */
export interface ProductionLine {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  /** Günlük ekmek kapasitesinden düşen birim (eşlikçi 0) */
  capacityUnits: number;
}

export interface ProductionDay {
  date: string;
  orderCount: number;
  lines: ProductionLine[];
  wholesaleLoaves: number;
  capacity: { limit: number | null; used: number; isOverride: boolean; note: string | null };
}
