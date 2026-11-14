import type { AdminOrder } from "@/types/admin";

export interface DaySummary {
  /** İptal hariç tüm siparişler (geriye uyumlu) */
  total: number;
  /** İptal edilmemiş toplam aktif sipariş adedi */
  activeOrderCount: number;
  /** İptal edilmemiş siparişlerin toplam brüt cirosu */
  grossRevenue: number;
  unconfirmed: number;
  delivered: number;
  toDeliver: number;
  /** Henüz teslim edilmemiş kurye sipariş sayısı (/kurye ile tutarlı) */
  courierToDeliver: number;
  /** Henüz teslim edilmemiş Gel-Al (pickup) sipariş sayısı */
  pickupToDeliver: number;
  /** Kasaya giren nakit tahsilat (paid + nakit) */
  collectedCash: number;
  /** Kasaya giren POS / kart tahsilatı (paid + pos/kart) */
  collectedPos: number;
  /** Kasaya giren havale/EFT tahsilatı (paid + transfer) */
  collectedTransfer: number;
  /** Teslim edilmiş ve cariye borç yazılmış tutar */
  bookedCari: number;
  /** Henüz teslim edilmemiş cari siparişlerin tutarı */
  pendingCari: number;
  /** Teslim edilmiş ancak henüz tahsil edilmemiş cari-dışı açık tutar */
  uncollectedDelivered: number;
  /** Henüz teslim edilmemiş ve ödenmemiş siparişlerde kapıda alınacak tutarlar */
  collectCash: number;
  collectPos: number;
  collectTransfer: number;
  /** Cariye işlenecek (henüz teslim edilmemiş cari, geriye uyumlu) */
  onAccount: number;
}

function isCardLikeMethod(method: string): boolean {
  return (
    method === "pos_at_door" ||
    method === "pos" ||
    method === "online" ||
    method === "card" ||
    method === "credit_card"
  );
}

/** Bir teslim gününün Z-mutabakat ve operasyon özeti (Bugün paneli). Saf fonksiyon. */
export function summarizeDay(orders: AdminOrder[], date: string): DaySummary {
  const s: DaySummary = {
    total: 0,
    activeOrderCount: 0,
    grossRevenue: 0,
    unconfirmed: 0,
    delivered: 0,
    toDeliver: 0,
    courierToDeliver: 0,
    pickupToDeliver: 0,
    collectedCash: 0,
    collectedPos: 0,
    collectedTransfer: 0,
    bookedCari: 0,
    pendingCari: 0,
    uncollectedDelivered: 0,
    collectCash: 0,
    collectPos: 0,
    collectTransfer: 0,
    onAccount: 0,
  };

  for (const o of orders) {
    if (o.deliveryDate !== date || o.status === "iptal") continue;

    const amount = Number(o.totalAmount) || 0;
    const isCari = Boolean(o.cariId || o.paymentMethod === "cari");
    const method = String(o.paymentMethod || "cash_on_delivery");

    s.total++;
    s.activeOrderCount++;
    s.grossRevenue += amount;

    if (o.status === "bekliyor") s.unconfirmed++;

    if (isCari) {
      if (o.status === "teslim_edildi") {
        s.bookedCari += amount;
      } else {
        s.pendingCari += amount;
        s.onAccount += amount;
      }
    } else if (o.paymentStatus === "paid") {
      if (isCardLikeMethod(method)) s.collectedPos += amount;
      else if (method === "transfer") s.collectedTransfer += amount;
      else s.collectedCash += amount;
    } else if (o.status === "teslim_edildi") {
      s.uncollectedDelivered += amount;
    } else {
      if (method === "pos_at_door" || method === "pos") s.collectPos += amount;
      else if (method === "transfer") s.collectTransfer += amount;
      else s.collectCash += amount;
    }

    if (o.status === "teslim_edildi") {
      s.delivered++;
    } else {
      s.toDeliver++;
      if (o.deliveryMethod === "pickup") {
        s.pickupToDeliver++;
      } else {
        s.courierToDeliver++;
      }
    }
  }

  return s;
}
