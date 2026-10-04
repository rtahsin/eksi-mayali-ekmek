import type { CariTransaction, LedgerItem, LedgerType } from "@/types/admin";
import { toIstanbulDate } from "@/lib/time/istanbul";

/** `account_transactions` satırı (016 sonrası). */
export interface LedgerRow {
  id: string;
  account_id: string;
  type: string;
  amount: number | string;
  delta: number | string | null;
  description: string | null;
  payment_method: string | null;
  date: string | null;
  created_at: string | null;
  slip_number: string | null;
  order_id: string | null;
  balance_after: number | string | null;
  items: unknown;
  reverses_id: string | null;
}

export const LEDGER_TYPE_LABELS: Record<LedgerType, string> = {
  satis: "Teslimat fişi",
  tahsilat: "Tahsilat",
  devir: "Devir / düzeltme",
  storno: "İptal (ters kayıt)",
};

/** Belge başlığı (fiş / makbuz) — AGENTS.md §4 */
export const LEDGER_DOCUMENT_TITLES: Record<LedgerType, string> = {
  satis: "TESLİMAT FİŞİ",
  tahsilat: "TAHSİLAT MAKBUZU",
  devir: "DEVİR / DÜZELTME MAKBUZU",
  storno: "İPTAL (STORNO) MAKBUZU",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  nakit: "Nakit",
  pos: "Kart (POS)",
  kredi_karti: "Kart (POS)",
  banka_havale: "Havale / EFT",
  diger: "Diğer",
};

const LEDGER_TYPES: ReadonlySet<string> = new Set(["satis", "tahsilat", "devir", "storno"]);

export function parseLedgerItems(v: unknown): LedgerItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x !== "object" || x === null) return null;
      const r = x as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name : null;
      const quantity = Number(r.quantity);
      const unitPrice = Number(r.unitPrice ?? r.unit_price);
      if (!name || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null;
      const item: LedgerItem = { name, quantity, unitPrice };
      if (typeof r.productId === "string") item.productId = r.productId;
      return item;
    })
    .filter((x): x is LedgerItem => x !== null);
}

/** Eski açıklama biçiminden ("10x Köy Ekmeği (110₺), 5x …") kalem çıkarır — 016 öncesi fişler için. */
export function parseLegacyItems(description: string | null): LedgerItem[] {
  if (!description) return [];
  const clean = description.replace(/\[FİŞ-[^\]]+\]\s*/gi, "").split("| Not:")[0];
  const out: LedgerItem[] = [];
  for (const part of clean.split(/,\s*(?=\d+x)/)) {
    const m = part.trim().match(/^(\d+)x\s+(.*?)\s*\(([\d.,]+)\s*(?:₺|TL)?\)\s*$/i);
    if (m) out.push({ name: m[2].trim(), quantity: Number(m[1]), unitPrice: Number(m[3].replace(",", ".")) });
  }
  return out;
}

export function mapLedgerRow(row: LedgerRow, reversedById: string | null = null): CariTransaction {
  const delta = Number(row.delta ?? 0);
  const type = (LEDGER_TYPES.has(row.type) ? row.type : delta < 0 ? "tahsilat" : "satis") as LedgerType;
  const items = parseLedgerItems(row.items);
  return {
    id: row.id,
    cariId: row.account_id,
    date: toIstanbulDate(row.date || row.created_at || new Date().toISOString()),
    type,
    amount: Math.abs(Number(row.amount) || delta),
    delta,
    description: (row.description || "").replace(/^\[FİŞ-[^\]]+\]\s*/i, ""),
    paymentMethod: row.payment_method || undefined,
    orderId: row.order_id || undefined,
    slipNumber: row.slip_number || undefined,
    balanceAfter: row.balance_after === null ? undefined : Number(row.balance_after),
    items: items.length ? items : type === "satis" ? parseLegacyItems(row.description) : [],
    reversesId: row.reverses_id,
    reversedById,
    createdAt: row.created_at || undefined,
  };
}

/** Bir hesabın satırlarını eşler; iptal edilmiş hareketlere storno kaydının id'sini bağlar. */
export function mapLedger(rows: LedgerRow[]): CariTransaction[] {
  const reversedBy = new Map<string, string>();
  for (const r of rows) if (r.reverses_id) reversedBy.set(r.reverses_id, r.id);
  return rows.map((r) => mapLedgerRow(r, reversedBy.get(r.id) ?? null));
}

export const LEDGER_SELECT =
  "id, account_id, type, amount, delta, description, payment_method, date, created_at, slip_number, order_id, balance_after, items, reverses_id";
