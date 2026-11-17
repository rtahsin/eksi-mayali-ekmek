import { isIsoDate, toIstanbulDate } from "@/lib/time/istanbul";
import type {
  CfoPeriodSummary,
  ComputeCfoSummaryInput,
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  FinancialRecordType,
  RawFinancialRecordRow,
  RawSupplierRow,
  RawSupplierTransactionRow,
  Supplier,
  SupplierTransaction,
  SupplierTransactionType,
} from "./types";

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "hammadde_un",
  "mandira_sarkuteri",
  "ambalaj_etiket",
  "enerji_firin",
  "kurye_akit",
  "ekipman_bakim",
  "kira_sabit",
  "diger",
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  hammadde_un: "Un, Tahıl & Maya",
  mandira_sarkuteri: "Mandıra & Şarküteri Tedariği",
  ambalaj_etiket: "Kraft Torba, Kutu & QR Etiket",
  enerji_firin: "Taş Fırın Enerji (Elektrik/Doğalgaz)",
  kurye_akit: "Kurye, Yakıt & Dağıtım",
  ekipman_bakim: "Fırın Ekipman & Bakım",
  kira_sabit: "Kira, Vergi & Sabit Giderler",
  diger: "Diğer İşletme Gideri",
};

export const FINANCIAL_PAYMENT_METHOD_LABELS: Record<FinancialPaymentMethod, string> = {
  nakit: "Nakit",
  kredi_karti: "Kredi Kartı",
  havale: "Havale / EFT",
  pos: "POS / Banka Kartı",
};

const STORNO_TAG_RE = /^\[?STORNO:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]?/i;

export function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getExpenseCategoryLabel(category: string | null | undefined): string {
  if (!category) return EXPENSE_CATEGORY_LABELS.diger;
  if (Object.prototype.hasOwnProperty.call(EXPENSE_CATEGORY_LABELS, category)) {
    return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory];
  }
  return category;
}

/**
 * Tarih ya da timestamptz değerini Europe/Istanbul takvim gününe (`YYYY-MM-DD`) çevirir.
 * Saf 10 karakterli `YYYY-MM-DD` tarihleri doğrudan korunur; timestamp değerleri UTC'ye düşmeden İstanbul saatine çevrilir.
 */
export function toIstanbulDateStr(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (isIsoDate(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return toIstanbulDate(parsed);
}

/**
 * Storno kayıtlarının `description` (`[STORNO:<uuid>] ...`) veya `invoice_no` (`STORNO:<uuid>`)
 * alanından hedef kayıt UUID'sini çıkarır.
 */
export function extractStornoTargetId(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = STORNO_TAG_RE.exec(text.trim());
  return match ? match[1] : null;
}

export function computeFinancialSignedEffect(type: string, amount: number): number {
  const absAmount = round2(Math.abs(Number(amount) || 0));
  if (absAmount === 0) return 0;
  if (type === "gelir" || type === "storno_gider") {
    return absAmount;
  }
  return -absAmount;
}

export function computeSupplierTxDelta(type: string, amount: number): number {
  const absAmount = round2(Math.abs(Number(amount) || 0));
  if (absAmount === 0) return 0;
  if (type === "alis" || type === "storno_odeme") {
    return absAmount;
  }
  return -absAmount;
}

function toFinancialRecordType(raw: string): FinancialRecordType {
  if (raw === "gelir" || raw === "storno_gider" || raw === "storno_gelir") {
    return raw;
  }
  return "gider";
}

function toSupplierTxType(raw: string): SupplierTransactionType {
  if (raw === "odeme" || raw === "storno_alis" || raw === "storno_odeme") {
    return raw;
  }
  return "alis";
}

export function normalizeFinancialRecords(rows: readonly RawFinancialRecordRow[]): FinancialRecord[] {
  const reversedTargets = new Set<string>();
  const intermediate = rows.map((row) => {
    const type = toFinancialRecordType(row.type);
    const amount = round2(Math.abs(Number(row.amount) || 0));
    const description = row.description ?? "";
    const reversesRecordId =
      type === "storno_gider" || type === "storno_gelir" ? extractStornoTargetId(description) : null;

    if (reversesRecordId) {
      reversedTargets.add(reversesRecordId);
    }

    const fallbackDate = row.created_at ? toIstanbulDateStr(row.created_at, "") : "";
    const date = toIstanbulDateStr(row.date, fallbackDate);

    return {
      id: row.id,
      type,
      category: row.category || "diger",
      amount,
      signedEffect: computeFinancialSignedEffect(type, amount),
      description,
      paymentMethod: row.payment_method || "nakit",
      date,
      createdAt: row.created_at ?? row.date ?? "",
      reversesRecordId,
    };
  });

  return intermediate.map((item) => ({
    ...item,
    isReversed: reversedTargets.has(item.id),
  }));
}

export function mapSupplierRow(row: RawSupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? "Genel Tedarik",
    contactPerson: row.contact_person ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    balance: round2(Number(row.balance) || 0),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  };
}

export function normalizeSupplierTransactions(
  rows: readonly RawSupplierTransactionRow[]
): SupplierTransaction[] {
  const reversedTargets = new Set<string>();
  const intermediate = rows.map((row) => {
    const type = toSupplierTxType(row.type);
    const amount = round2(Math.abs(Number(row.amount) || 0));
    const description = row.description ?? "";
    const isStorno = type === "storno_alis" || type === "storno_odeme";
    const reversesTransactionId = isStorno
      ? extractStornoTargetId(row.invoice_no) ?? extractStornoTargetId(description)
      : null;

    if (reversesTransactionId) {
      reversedTargets.add(reversesTransactionId);
    }

    const fallbackDate = row.created_at ? toIstanbulDateStr(row.created_at, "") : "";
    const date = toIstanbulDateStr(row.date, fallbackDate);

    return {
      id: row.id,
      supplierId: row.supplier_id,
      type,
      amount,
      delta: computeSupplierTxDelta(type, amount),
      invoiceNo: row.invoice_no ?? null,
      description,
      date,
      createdAt: row.created_at ?? row.date ?? "",
      reversesTransactionId,
    };
  });

  return intermediate.map((item) => ({
    ...item,
    isReversed: reversedTargets.has(item.id),
  }));
}

export function computeSupplierSymmetricBalance(
  rows: ReadonlyArray<{ type: string; amount: number | string }>
): number {
  const total = rows.reduce((sum, row) => sum + computeSupplierTxDelta(row.type, Number(row.amount) || 0), 0);
  return round2(total);
}

/**
 * Perakende + B2B Cari + Gider Defteri + Tedarikçi verilerini çifte sayım olmadan birleştirir.
 */
export function computeCfoSummary(input: ComputeCfoSummaryInput): CfoPeriodSummary {
  const { periodFrom, periodTo } = input;
  const inRange = (dateStr: string): boolean => Boolean(dateStr && dateStr >= periodFrom && dateStr <= periodTo);

  // 1. Perakende teslim edilmiş siparişler (`cari_id` null olanlar; cari siparişler account_transactions üzerinden sayılır)
  let retailDeliveredSales = 0;
  for (const order of input.orders) {
    if (order.status !== "teslim_edildi" || order.cari_id) continue;
    const orderDate = toIstanbulDateStr(order.delivery_date, "");
    if (!inRange(orderDate)) continue;
    retailDeliveredSales += Number(order.total_amount) || 0;
  }

  // 2. Perakende nakit/kart tahsilatları (`cari_transaction_id` null olanlar; cari tahsilatları account_transactions üzerinden sayılır)
  let retailCollectedCash = 0;
  for (const payment of input.payments) {
    if (payment.status !== "completed" || payment.cari_transaction_id) continue;
    const paidDate = toIstanbulDateStr(payment.paid_at ?? payment.created_at, "");
    if (!inRange(paidDate)) continue;
    retailCollectedCash += Number(payment.amount) || 0;
  }

  // 3. Cari hesaplar (B2B müşteri alacakları vs dahili `gider` tipi cariler)
  const giderAccountIds = new Set<string>();
  let totalB2BReceivables = 0;
  for (const account of input.cariAccounts) {
    if (account.account_type === "gider") {
      giderAccountIds.add(account.id);
      continue;
    }
    if (!account.archived_at) {
      const bal = Number(account.balance) || 0;
      if (bal > 0) {
        totalB2BReceivables += bal;
      }
    }
  }

  // 4. B2B cari satış ve tahsilatları (storno edilmiş kayıtlar hariç)
  const reversedB2bIds = new Set<string>();
  for (const tx of input.cariTransactions) {
    if (tx.type === "storno" && tx.reverses_id) {
      reversedB2bIds.add(tx.reverses_id);
    }
  }

  let b2bNetSales = 0;
  let b2bCollectedCash = 0;
  for (const tx of input.cariTransactions) {
    if (giderAccountIds.has(tx.account_id)) continue;
    if (tx.type === "storno" || reversedB2bIds.has(tx.id)) continue;
    const txDate = toIstanbulDateStr(tx.date, "");
    if (!inRange(txDate)) continue;

    if (tx.type === "satis") {
      b2bNetSales += Number(tx.delta ?? tx.amount) || 0;
    } else if (tx.type === "tahsilat") {
      b2bCollectedCash += Math.abs(Number(tx.delta ?? tx.amount) || 0);
    }
  }

  // 5. Gider defteri ve diğer gelirler (storno ile eşleşen hedef kayıtlar ve onların storno kayıtları dışlanır; hedefsiz eski storno varsa simetrik düşülür)
  const normalizedRecords = normalizeFinancialRecords(input.financialRecords);
  const recordIds = new Set(normalizedRecords.map((r) => r.id));

  let totalOperatingExpenses = 0;
  let otherIncome = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const rec of normalizedRecords) {
    if (!inRange(rec.date)) continue;
    if (rec.isReversed) continue;

    if (rec.type === "gider") {
      totalOperatingExpenses += rec.amount;
      expensesByCategory[rec.category] = round2((expensesByCategory[rec.category] ?? 0) + rec.amount);
    } else if (rec.type === "gelir") {
      otherIncome += rec.amount;
    } else if (rec.type === "storno_gider") {
      // Bağlı asıl gider kaydı mevcutsa o kayıt zaten `isReversed` ile hariç tutuldu;
      // yalnızca hedefi bulunmayan eski/manuel storno giderleri tutardan düş.
      if (!rec.reversesRecordId || !recordIds.has(rec.reversesRecordId)) {
        totalOperatingExpenses -= rec.amount;
        expensesByCategory[rec.category] = round2((expensesByCategory[rec.category] ?? 0) - rec.amount);
      }
    } else if (rec.type === "storno_gelir") {
      if (!rec.reversesRecordId || !recordIds.has(rec.reversesRecordId)) {
        otherIncome -= rec.amount;
      }
    }
  }

  for (const [cat, val] of Object.entries(expensesByCategory)) {
    if (val === 0) {
      delete expensesByCategory[cat];
    }
  }

  // 6. Tedarikçi borç bakiyeleri toplamı
  let totalSupplierPayables = 0;
  for (const supplier of input.suppliers) {
    totalSupplierPayables += Number(supplier.balance) || 0;
  }

  const roundedRetailSales = round2(retailDeliveredSales);
  const roundedRetailCash = round2(retailCollectedCash);
  const roundedB2bSales = round2(b2bNetSales);
  const roundedB2bCash = round2(b2bCollectedCash);
  const roundedOtherIncome = round2(otherIncome);
  const roundedExpenses = round2(totalOperatingExpenses);
  const roundedReceivables = round2(totalB2BReceivables);
  const roundedPayables = round2(totalSupplierPayables);

  const totalGrossSales = round2(roundedRetailSales + roundedB2bSales + roundedOtherIncome);
  const totalCashIn = round2(roundedRetailCash + roundedB2bCash + roundedOtherIncome);
  const netOperatingProfit = round2(totalGrossSales - roundedExpenses);
  const netOperatingMarginPct =
    totalGrossSales > 0 ? Math.round((netOperatingProfit / totalGrossSales) * 1000) / 10 : 0;
  const netCashFlow = round2(totalCashIn - roundedExpenses);
  const netWorkingCapital = round2(roundedReceivables - roundedPayables);

  return {
    periodFrom,
    periodTo,
    retailDeliveredSales: roundedRetailSales,
    retailCollectedCash: roundedRetailCash,
    b2bNetSales: roundedB2bSales,
    b2bCollectedCash: roundedB2bCash,
    otherIncome: roundedOtherIncome,
    totalGrossSales,
    totalCashIn,
    totalOperatingExpenses: roundedExpenses,
    expensesByCategory,
    netOperatingProfit,
    netOperatingMarginPct,
    netCashFlow,
    totalB2BReceivables: roundedReceivables,
    totalSupplierPayables: roundedPayables,
    netWorkingCapital,
  };
}
