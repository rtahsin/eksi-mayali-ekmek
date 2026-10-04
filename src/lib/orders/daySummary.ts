import type { AdminOrder } from "@/types/admin";

export interface DaySummary {
  /** İptal hariç tüm siparişler */
  total: number;
  unconfirmed: number;
  delivered: number;
  toDeliver: number;
  /** Henüz teslim edilmemiş ve ödenmemiş siparişlerde kapıda alınacak tutarlar */
  collectCash: number;
  collectPos: number;
  collectTransfer: number;
  /** Cariye işlenecek (tahsilat yok) */
  onAccount: number;
}

/** Bir teslim gününün özeti (Bugün paneli). Saf fonksiyon. */
export function summarizeDay(orders: AdminOrder[], date: string): DaySummary {
  const s: DaySummary = { total: 0, unconfirmed: 0, delivered: 0, toDeliver: 0, collectCash: 0, collectPos: 0, collectTransfer: 0, onAccount: 0 };
  for (const o of orders) {
    if (o.deliveryDate !== date || o.status === "iptal") continue;
    s.total++;
    if (o.status === "bekliyor") s.unconfirmed++;
    if (o.status === "teslim_edildi") {
      s.delivered++;
      continue;
    }
    s.toDeliver++;
    const amount = Number(o.totalAmount) || 0;
    if (o.cariId || o.paymentMethod === "cari") s.onAccount += amount;
    else if (o.paymentStatus === "paid") continue;
    else if (o.paymentMethod === "pos_at_door") s.collectPos += amount;
    else if (o.paymentMethod === "transfer") s.collectTransfer += amount;
    else s.collectCash += amount;
  }
  return s;
}
