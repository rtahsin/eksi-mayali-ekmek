/** Admin sipariş listesi birkaç sorgudan toplanır (son N, açıklar, tahsil edilmeyenler, arama/detay). */

/** Aynı sipariş birden çok sorgudan gelebilir: kimliğe göre tekilleştirir, sonraki liste öncekini ezer; en yeni önce. */
export function mergeOrders<T extends { id: string; createdAt: string }>(...lists: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const o of list) byId.set(o.id, o);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Açık (iş bekleyen) durumlar: yaşı ne olursa olsun yüklenir. */
export const OPEN_STATUSES = ["bekliyor", "hazirlaniyor", "firinda", "kuryede"] as const;

/**
 * Sunucu araması için PostgREST `or` filtresi: ad, sipariş no ve telefon.
 * Filtre sözdizimini bozabilecek karakterler (virgül, parantez, nokta, yüzde) atılır.
 * Çok kısa sorguda null (gereksiz istek yok).
 */
export function orderSearchFilter(query: string): string | null {
  const text = query.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const digits = query.replace(/\D/g, "");
  const parts: string[] = [];
  if (text.length >= 3) {
    parts.push(`customer_name.ilike."*${text}*"`, `order_number.ilike."*${text}*"`);
  }
  if (digits.length >= 4) parts.push(`phone.ilike."*${digits.slice(-10)}*"`);
  return parts.length ? parts.join(",") : null;
}
