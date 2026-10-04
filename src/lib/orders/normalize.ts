/**
 * Sipariş durumlarının tek sözlüğü. Veritabanı enum'u: bekliyor, hazirlaniyor, firinda,
 * kuryede, teslim_edildi, iptal. Eski (Flutter/İngilizce) değerler buraya eşlenir.
 */
export type CanonicalOrderStatus = "bekliyor" | "hazirlaniyor" | "firinda" | "kuryede" | "teslim_edildi" | "iptal";

export const ORDER_STATUS_FLOW: CanonicalOrderStatus[] = ["bekliyor", "hazirlaniyor", "firinda", "kuryede", "teslim_edildi"];

const LEGACY_MAP: Record<string, CanonicalOrderStatus> = {
  bekliyor: "bekliyor",
  onay_bekliyor: "bekliyor",
  pending: "bekliyor",
  hazirlaniyor: "hazirlaniyor",
  processing: "hazirlaniyor",
  firinda: "firinda",
  ready: "firinda",
  kuryede: "kuryede",
  teslim_edildi: "teslim_edildi",
  completed: "teslim_edildi",
  delivered: "teslim_edildi",
  iptal: "iptal",
  cancelled: "iptal",
};

export function normalizeOrderStatus(raw: string | null | undefined): CanonicalOrderStatus {
  return (raw && LEGACY_MAP[raw]) || "bekliyor";
}

export const ORDER_STATUS_LABELS: Record<CanonicalOrderStatus, string> = {
  bekliyor: "Sipariş alındı",
  hazirlaniyor: "Hazırlanıyor",
  firinda: "Fırında",
  kuryede: "Yolda",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal edildi",
};

/** Müşterinin kendisinin iptal edebileceği durumlar. */
export const CUSTOMER_CANCELLABLE: ReadonlySet<CanonicalOrderStatus> = new Set(["bekliyor"]);

export function isFinalStatus(status: CanonicalOrderStatus): boolean {
  return status === "teslim_edildi" || status === "iptal";
}
