import { isIsoDate, toIstanbulDate } from "@/lib/time/istanbul";
import type {
  B2BReceivablesAgingSummary,
  CashFlowChannelKey,
  CashFlowChannelSummary,
  CfoPeriodSummary,
  ComputeCfoSummaryInput,
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  FinancialRecordType,
  RawCariAccountSummaryRow,
  RawCariTransactionSummaryRow,
  RawFinancialRecordRow,
  RawSupplierRow,
  RawSupplierTransactionRow,
  Supplier,
  SupplierDateBalanceSummary,
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
    const isStorno = type === "storno_gider" || type === "storno_gelir";
    const reversesRecordId = isStorno
      ? row.reverses_id?.trim() || extractStornoTargetId(description)
      : null;

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
      ? row.reverses_id?.trim() || extractStornoTargetId(row.invoice_no) || extractStornoTargetId(description)
      : null;

    if (reversesTransactionId) {
      reversedTargets.add(reversesTransactionId);
    }

    const fallbackDate = row.created_at ? toIstanbulDateStr(row.created_at, "") : "";
    const date = toIstanbulDateStr(row.date, fallbackDate);
    const rawBalanceAfter = row.balance_after;
    const balanceAfter =
      rawBalanceAfter === null || rawBalanceAfter === undefined || rawBalanceAfter === ""
        ? null
        : Number.isFinite(Number(rawBalanceAfter))
          ? round2(Number(rawBalanceAfter))
          : null;

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
      balanceAfter,
      paymentMethod: row.payment_method?.trim() || null,
      expenseCategory: row.expense_category?.trim() || null,
      linkedFinancialRecordId: row.linked_financial_record_id?.trim() || null,
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

export const CASH_FLOW_CHANNEL_ORDER: readonly CashFlowChannelKey[] = [
  "nakit",
  "kart",
  "havale",
  "diger",
] as const;

export const CASH_FLOW_CHANNEL_LABELS: Record<CashFlowChannelKey, string> = {
  nakit: "Nakit",
  kart: "POS / Kart",
  havale: "Havale / EFT",
  diger: "Diğer",
};

export function normalizeCashFlowChannel(raw: string | null | undefined): CashFlowChannelKey {
  if (!raw) return "diger";
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return "diger";
  if (
    normalized === "nakit" ||
    normalized === "cash" ||
    normalized === "cash_on_delivery" ||
    normalized === "kapida_nakit"
  ) {
    return "nakit";
  }
  if (
    normalized === "pos" ||
    normalized === "pos_at_door" ||
    normalized === "kredi_karti" ||
    normalized === "kart" ||
    normalized === "card" ||
    normalized === "kapida_pos" ||
    normalized === "kapida_kart" ||
    normalized === "credit_card" ||
    normalized === "debit_card" ||
    normalized === "online_card" ||
    normalized === "online"
  ) {
    return "kart";
  }
  if (
    normalized === "havale" ||
    normalized === "banka_havale" ||
    normalized === "eft" ||
    normalized === "havale_eft" ||
    normalized === "transfer" ||
    normalized === "bank_transfer" ||
    normalized === "wire"
  ) {
    return "havale";
  }
  return "diger";
}

function diffIsoDays(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(`${fromIso}T00:00:00Z`);
  const toMs = Date.parse(`${toIso}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.floor((toMs - fromMs) / 86_400_000);
}

function resolveCariTxDelta(tx: RawCariTransactionSummaryRow): number {
  if (tx.delta !== undefined && tx.delta !== null && tx.delta !== "") {
    const parsed = Number(tx.delta);
    if (Number.isFinite(parsed)) return round2(parsed);
  }
  const absAmount = round2(Math.abs(Number(tx.amount) || 0));
  if (tx.type === "tahsilat") return -absAmount;
  return absAmount;
}

/**
 * Arşivlenmemiş B2B müşteri carileri (`account_type !== "gider"`) için kronolojik FIFO alacak yaşlandırması.
 * Storno kayıtları ve hedefleri eşleştiğinde dışlanır; kalan açık borç lotları 0–7, 8–15, 16–30 ve 30+ gün kovalarına ayrılır.
 * DEĞİŞMEZ: `current0to7 + days8to15 + days16to30 + over30 === total`.
 */
export function computeB2BReceivablesAging(
  cariAccounts: readonly RawCariAccountSummaryRow[],
  cariTransactions: readonly RawCariTransactionSummaryRow[],
  asOfDate: string
): B2BReceivablesAgingSummary {
  const activeAccountIds = new Set<string>();
  for (const account of cariAccounts) {
    if (account.account_type === "gider" || account.archived_at) continue;
    activeAccountIds.add(account.id);
  }

  const allTxIds = new Set<string>();
  const reversedIds = new Set<string>();
  for (const tx of cariTransactions) {
    allTxIds.add(tx.id);
    if (tx.type === "storno" && tx.reverses_id) {
      reversedIds.add(tx.reverses_id);
    }
  }

  interface NormalizedCariTx {
    id: string;
    date: string;
    rawDate: string;
    delta: number;
  }

  const txByAccount = new Map<string, NormalizedCariTx[]>();
  for (const tx of cariTransactions) {
    if (!activeAccountIds.has(tx.account_id)) continue;
    if (reversedIds.has(tx.id)) continue;
    if (tx.type === "storno" && tx.reverses_id && allTxIds.has(tx.reverses_id)) continue;

    const delta = resolveCariTxDelta(tx);
    if (delta === 0) continue;

    const date = toIstanbulDateStr(tx.date, asOfDate);
    const list = txByAccount.get(tx.account_id);
    const entry: NormalizedCariTx = {
      id: tx.id,
      date,
      rawDate: tx.date ?? "",
      delta,
    };
    if (list) {
      list.push(entry);
    } else {
      txByAccount.set(tx.account_id, [entry]);
    }
  }

  let current0to7 = 0;
  let days8to15 = 0;
  let days16to30 = 0;
  let over30 = 0;

  for (const [, accountTxs] of txByAccount) {
    accountTxs.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
      return a.id.localeCompare(b.id);
    });

    const debtLots: Array<{ date: string; remaining: number }> = [];
    let totalCredits = 0;

    for (const tx of accountTxs) {
      if (tx.delta > 0) {
        debtLots.push({ date: tx.date, remaining: tx.delta });
      } else {
        totalCredits = round2(totalCredits + Math.abs(tx.delta));
      }
    }

    let remainingCredit = totalCredits;
    for (const lot of debtLots) {
      if (remainingCredit <= 0) break;
      const applied = Math.min(lot.remaining, remainingCredit);
      lot.remaining = round2(lot.remaining - applied);
      remainingCredit = round2(remainingCredit - applied);
    }

    for (const lot of debtLots) {
      if (lot.remaining <= 0) continue;
      const ageDays = Math.max(0, diffIsoDays(lot.date, asOfDate));
      if (ageDays <= 7) {
        current0to7 = round2(current0to7 + lot.remaining);
      } else if (ageDays <= 15) {
        days8to15 = round2(days8to15 + lot.remaining);
      } else if (ageDays <= 30) {
        days16to30 = round2(days16to30 + lot.remaining);
      } else {
        over30 = round2(over30 + lot.remaining);
      }
    }
  }

  const total = round2(current0to7 + days8to15 + days16to30 + over30);
  return {
    current0to7,
    days8to15,
    days16to30,
    over30,
    total,
  };
}

/**
 * Seçili tedarikçi için tarih aralığı (`fromDate`..`toDate`) bazlı bakiye özeti:
 * Dönem Başı Devir, Dönem Alış (+), Dönem Ödeme (−), Dönem Net ve Dönem Sonu Bakiye.
 * DEĞİŞMEZLER:
 * - `periodNet === round2(periodPurchases - periodPayments)`
 * - `closingBalance === round2(openingBalance + periodNet)`
 */
export function summarizeSupplierBalanceByDate(
  transactions: readonly SupplierTransaction[],
  supplierId: string,
  fromDate: string,
  toDate: string
): SupplierDateBalanceSummary {
  let openingBalance = 0;
  let periodPurchases = 0;
  let periodPayments = 0;

  for (const tx of transactions) {
    if (tx.supplierId !== supplierId || !tx.date) continue;
    if (tx.date < fromDate) {
      openingBalance = round2(openingBalance + tx.delta);
      continue;
    }
    if (tx.date > toDate) continue;

    if (tx.type === "alis") {
      periodPurchases = round2(periodPurchases + tx.amount);
    } else if (tx.type === "storno_alis") {
      periodPurchases = round2(periodPurchases - tx.amount);
    } else if (tx.type === "odeme") {
      periodPayments = round2(periodPayments + tx.amount);
    } else if (tx.type === "storno_odeme") {
      periodPayments = round2(periodPayments - tx.amount);
    }
  }

  const periodNet = round2(periodPurchases - periodPayments);
  const closingBalance = round2(openingBalance + periodNet);

  return {
    supplierId,
    fromDate,
    toDate,
    openingBalance,
    periodPurchases,
    periodPayments,
    periodNet,
    closingBalance,
  };
}

/**
 * Perakende + B2B Cari + Gider Defteri + Tedarikçi verilerini çifte sayım olmadan birleştirir;
 * Tahakkuk (P&L) ile Nakit Akışını (Cash Flow) ve Ödeme Kanalı bazlı kasayı net ayırır.
 */
export function computeCfoSummary(input: ComputeCfoSummaryInput): CfoPeriodSummary {
  const { periodFrom, periodTo } = input;
  const inRange = (dateStr: string): boolean => Boolean(dateStr && dateStr >= periodFrom && dateStr <= periodTo);

  const channelTotals: Record<CashFlowChannelKey, { cashIn: number; cashOut: number }> = {
    nakit: { cashIn: 0, cashOut: 0 },
    kart: { cashIn: 0, cashOut: 0 },
    havale: { cashIn: 0, cashOut: 0 },
    diger: { cashIn: 0, cashOut: 0 },
  };
  const addCashIn = (method: string | null | undefined, amount: number): void => {
    if (amount === 0) return;
    const ch = normalizeCashFlowChannel(method);
    channelTotals[ch].cashIn = round2(channelTotals[ch].cashIn + amount);
  };
  const addCashOut = (method: string | null | undefined, amount: number): void => {
    if (amount === 0) return;
    const ch = normalizeCashFlowChannel(method);
    channelTotals[ch].cashOut = round2(channelTotals[ch].cashOut + amount);
  };

  // 1. Perakende teslim edilmiş siparişler (`cari_id` null olanlar; cari siparişler account_transactions üzerinden sayılır)
  let retailDeliveredSales = 0;
  for (const order of input.orders) {
    if (order.status !== "teslim_edildi" || order.cari_id) continue;
    const orderDate = toIstanbulDateStr(order.delivery_date, "");
    if (!inRange(orderDate)) continue;
    retailDeliveredSales = round2(retailDeliveredSales + round2(Number(order.total_amount) || 0));
  }

  // 2. Perakende nakit/kart tahsilatları (`cari_transaction_id` null olanlar; cari tahsilatları account_transactions üzerinden sayılır)
  let retailCollectedCash = 0;
  for (const payment of input.payments) {
    if (payment.status !== "completed" || payment.cari_transaction_id) continue;
    const paidDate = toIstanbulDateStr(payment.paid_at ?? payment.created_at, "");
    if (!inRange(paidDate)) continue;
    const amt = round2(Number(payment.amount) || 0);
    retailCollectedCash = round2(retailCollectedCash + amt);
    addCashIn(payment.method, amt);
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
      const bal = round2(Number(account.balance) || 0);
      if (bal > 0) {
        totalB2BReceivables = round2(totalB2BReceivables + bal);
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
      const amt = round2(Number(tx.delta ?? tx.amount) || 0);
      b2bNetSales = round2(b2bNetSales + amt);
    } else if (tx.type === "tahsilat") {
      const amt = round2(Math.abs(Number(tx.delta ?? tx.amount) || 0));
      b2bCollectedCash = round2(b2bCollectedCash + amt);
      addCashIn(tx.payment_method, amt);
    }
  }

  // 5. Tedarikçi hareketleri tek kaynaktır; linked_financial_record_id ile bağlı gider kopyaları çifte sayılmaz
  const normalizedSupplierTxs = normalizeSupplierTransactions(input.supplierTransactions);
  const supplierTxIds = new Set(normalizedSupplierTxs.map((t) => t.id));
  const linkedFinancialRecordIds = new Set<string>();
  for (const stx of normalizedSupplierTxs) {
    if (stx.linkedFinancialRecordId) {
      linkedFinancialRecordIds.add(stx.linkedFinancialRecordId);
    }
  }

  // 6. Direkt gider defteri ve diğer gelirler (tedarikçi bağlı kopyaları ve onların stornoları hariç)
  const normalizedRecords = normalizeFinancialRecords(input.financialRecords);
  const directRecords = normalizedRecords.filter(
    (rec) =>
      !linkedFinancialRecordIds.has(rec.id) &&
      !(rec.reversesRecordId !== null && linkedFinancialRecordIds.has(rec.reversesRecordId))
  );
  const directRecordIds = new Set(directRecords.map((r) => r.id));

  let directOperatingExpenses = 0;
  let otherIncome = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const rec of directRecords) {
    if (!inRange(rec.date)) continue;
    if (rec.isReversed) continue;

    if (rec.type === "gider") {
      directOperatingExpenses = round2(directOperatingExpenses + rec.amount);
      expensesByCategory[rec.category] = round2((expensesByCategory[rec.category] ?? 0) + rec.amount);
      addCashOut(rec.paymentMethod, rec.amount);
    } else if (rec.type === "gelir") {
      otherIncome = round2(otherIncome + rec.amount);
      addCashIn(rec.paymentMethod, rec.amount);
    } else if (rec.type === "storno_gider") {
      // Bağlı asıl gider kaydı mevcutsa o kayıt zaten `isReversed` ile hariç tutuldu;
      // yalnızca hedefi bulunmayan eski/manuel storno giderleri tutardan düş.
      if (!rec.reversesRecordId || !directRecordIds.has(rec.reversesRecordId)) {
        directOperatingExpenses = round2(directOperatingExpenses - rec.amount);
        expensesByCategory[rec.category] = round2((expensesByCategory[rec.category] ?? 0) - rec.amount);
        addCashOut(rec.paymentMethod, -rec.amount);
      }
    } else if (rec.type === "storno_gelir") {
      if (!rec.reversesRecordId || !directRecordIds.has(rec.reversesRecordId)) {
        otherIncome = round2(otherIncome - rec.amount);
        addCashIn(rec.paymentMethod, -rec.amount);
      }
    }
  }

  // 7. Dönem içi tedarikçi tahakkuk alışları (P&L) ve nakit ödemeleri (Cash Flow)
  let supplierAccrualPurchases = 0;
  let supplierCashPayments = 0;

  for (const stx of normalizedSupplierTxs) {
    if (!inRange(stx.date)) continue;
    if (stx.isReversed) continue;

    const category = stx.expenseCategory || "diger";

    if (stx.type === "alis") {
      supplierAccrualPurchases = round2(supplierAccrualPurchases + stx.amount);
      expensesByCategory[category] = round2((expensesByCategory[category] ?? 0) + stx.amount);
    } else if (stx.type === "storno_alis") {
      if (!stx.reversesTransactionId || !supplierTxIds.has(stx.reversesTransactionId)) {
        supplierAccrualPurchases = round2(supplierAccrualPurchases - stx.amount);
        expensesByCategory[category] = round2((expensesByCategory[category] ?? 0) - stx.amount);
      }
    } else if (stx.type === "odeme") {
      supplierCashPayments = round2(supplierCashPayments + stx.amount);
      addCashOut(stx.paymentMethod, stx.amount);
    } else if (stx.type === "storno_odeme") {
      if (!stx.reversesTransactionId || !supplierTxIds.has(stx.reversesTransactionId)) {
        supplierCashPayments = round2(supplierCashPayments - stx.amount);
        addCashOut(stx.paymentMethod, -stx.amount);
      }
    }
  }

  for (const [cat, val] of Object.entries(expensesByCategory)) {
    if (val === 0) {
      delete expensesByCategory[cat];
    }
  }

  // 8. Tedarikçi bilanço kalemleri: borç bakiyeleri (balance > 0) ve verilen avanslar (balance < 0)
  let totalSupplierPayables = 0;
  let totalSupplierAdvances = 0;
  for (const supplier of input.suppliers) {
    const bal = round2(Number(supplier.balance) || 0);
    if (bal > 0) {
      totalSupplierPayables = round2(totalSupplierPayables + bal);
    } else if (bal < 0) {
      totalSupplierAdvances = round2(totalSupplierAdvances + Math.abs(bal));
    }
  }

  const totalOperatingExpenses = round2(directOperatingExpenses + supplierAccrualPurchases);
  const totalCashOut = round2(directOperatingExpenses + supplierCashPayments);
  const totalGrossSales = round2(retailDeliveredSales + b2bNetSales + otherIncome);
  const totalCashIn = round2(retailCollectedCash + b2bCollectedCash + otherIncome);
  const netOperatingProfit = round2(totalGrossSales - totalOperatingExpenses);
  const netOperatingMarginPct =
    totalGrossSales > 0 ? Math.round((netOperatingProfit / totalGrossSales) * 1000) / 10 : 0;
  const netCashFlow = round2(totalCashIn - totalCashOut);
  const netWorkingCapital = round2(totalB2BReceivables - totalSupplierPayables);

  const cashFlowByChannel: CashFlowChannelSummary[] = CASH_FLOW_CHANNEL_ORDER.map((channel) => {
    const { cashIn, cashOut } = channelTotals[channel];
    return {
      channel,
      label: CASH_FLOW_CHANNEL_LABELS[channel],
      cashIn,
      cashOut,
      net: round2(cashIn - cashOut),
    };
  });

  const b2bReceivablesAging = computeB2BReceivablesAging(
    input.cariAccounts,
    input.cariTransactions,
    input.asOfDate ?? periodTo
  );

  return {
    periodFrom,
    periodTo,
    retailDeliveredSales,
    retailCollectedCash,
    b2bNetSales,
    b2bCollectedCash,
    otherIncome,
    totalGrossSales,
    totalCashIn,
    directOperatingExpenses,
    supplierAccrualPurchases,
    supplierCashPayments,
    totalOperatingExpenses,
    totalCashOut,
    expensesByCategory,
    netOperatingProfit,
    netOperatingMarginPct,
    netCashFlow,
    totalB2BReceivables,
    totalSupplierPayables,
    totalSupplierAdvances,
    netWorkingCapital,
    cashFlowByChannel,
    b2bReceivablesAging,
  };
}
