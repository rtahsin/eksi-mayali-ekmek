import type { CariTransaction } from "@/types/admin";
import { addDays, formatTrDate, isIsoDate } from "@/lib/time/istanbul";
import { roundCariMoney } from "./pricing";

export type CariDateFilter = "all" | "this_month" | "last_month" | "last_30" | "custom";

export interface CariDateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface DailyBalanceRow {
  /** YYYY-MM-DD (Europe/Istanbul) */
  date: string;
  /** O tarihteki toplam hareket adedi */
  transactionCount: number;
  /** O tarihteki borç artışı (delta > 0 toplamı) */
  debt: number;
  /** O tarihteki alacak / tahsilat (delta < 0 mutlak toplamı) */
  credit: number;
  /** O tarihteki net değişim (debt - credit = Σ delta) */
  net: number;
  /** O tarih sonundaki kümülatif bakiye (date <= gün için Σ delta) */
  closingBalance: number;
}

export interface CariDateBalanceSummary {
  range: CariDateRange;
  isInvalidRange: boolean;
  /** Dönem başı devir bakiyesi (date < startDate için Σ delta; startDate yoksa 0) */
  openingBalance: number;
  /** Dönem içi toplam borç / satış (delta > 0 toplamı) */
  periodDebt: number;
  /** Dönem içi toplam alacak / tahsilat (delta < 0 mutlak toplamı) */
  periodCredit: number;
  /** Dönem içi net değişim (periodDebt - periodCredit) */
  periodNet: number;
  /** Dönem sonu bakiye (openingBalance + periodNet) */
  closingBalance: number;
  /** Dönem içi hareket adedi */
  transactionCount: number;
  /** Dönem içi gün bazlı bakiye dökümü (en yeni tarih en üstte) */
  dailyRows: DailyBalanceRow[];
}

function normalizeMoney(value: number): number {
  const rounded = roundCariMoney(value);
  return rounded === 0 ? 0 : rounded;
}

function endOfMonthIso(yyyyMm: string): string {
  const [yearStr, monthStr] = yyyyMm.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const nextMonthFirst =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return addDays(nextMonthFirst, -1);
}

/**
 * Seçili dönem filtresini Europe/Istanbul takvim günü sınırlarına (`YYYY-MM-DD`) çevirir.
 */
export function resolveCariDateRange(
  filter: CariDateFilter,
  today: string,
  customStart?: string,
  customEnd?: string,
): CariDateRange {
  if (filter === "all") {
    return { startDate: null, endDate: null };
  }

  if (filter === "this_month") {
    const yyyyMm = today.slice(0, 7);
    return {
      startDate: `${yyyyMm}-01`,
      endDate: endOfMonthIso(yyyyMm),
    };
  }

  if (filter === "last_month") {
    const thisMonthFirst = `${today.slice(0, 7)}-01`;
    const lastMonthEnd = addDays(thisMonthFirst, -1);
    const lastMonthYm = lastMonthEnd.slice(0, 7);
    return {
      startDate: `${lastMonthYm}-01`,
      endDate: lastMonthEnd,
    };
  }

  if (filter === "last_30") {
    return {
      startDate: addDays(today, -30),
      endDate: null,
    };
  }

  return {
    startDate: isIsoDate(customStart) ? (customStart as string) : null,
    endDate: isIsoDate(customEnd) ? (customEnd as string) : null,
  };
}

export function isTransactionInDateRange(txDate: string, range: CariDateRange): boolean {
  if (range.startDate && range.endDate && range.startDate > range.endDate) {
    return false;
  }
  if (range.startDate && txDate < range.startDate) return false;
  if (range.endDate && txDate > range.endDate) return false;
  return true;
}

export function formatCariDateRangeLabel(filter: CariDateFilter, range: CariDateRange): string {
  if (filter === "all") return "Tüm Zamanlar";
  if (filter === "this_month") return "Bu Ay";
  if (filter === "last_month") return "Geçen Ay";
  if (filter === "last_30") return "Son 30 Gün";

  if (range.startDate && range.endDate) {
    if (range.startDate === range.endDate) {
      return formatTrDate(range.startDate, "long");
    }
    return `${formatTrDate(range.startDate)} – ${formatTrDate(range.endDate)}`;
  }
  if (range.startDate) return `${formatTrDate(range.startDate)} ve sonrası`;
  if (range.endDate) return `${formatTrDate(range.endDate)} ve öncesi`;
  return "Özel Tarih (Tümü)";
}

/**
 * Simetrik bakiye ilkesiyle (`Bakiye = Toplam Borç − Toplam Alacak = Σ delta`)
 * seçili tarih aralığının dönem başı devir, borç, alacak, net değişim, dönem sonu
 * ve gün bazlı kümülatif bakiye özetini hesaplar.
 */
export function summarizeBalanceByDate(
  transactions: ReadonlyArray<Pick<CariTransaction, "date" | "delta">>,
  range: CariDateRange,
): CariDateBalanceSummary {
  const isInvalidRange = Boolean(
    range.startDate && range.endDate && range.startDate > range.endDate,
  );

  if (isInvalidRange) {
    return {
      range,
      isInvalidRange: true,
      openingBalance: 0,
      periodDebt: 0,
      periodCredit: 0,
      periodNet: 0,
      closingBalance: 0,
      transactionCount: 0,
      dailyRows: [],
    };
  }

  let openingRaw = 0;
  let periodDebtRaw = 0;
  let periodCreditRaw = 0;
  let transactionCount = 0;

  const dailyBuckets = new Map<
    string,
    { count: number; debtRaw: number; creditRaw: number }
  >();

  for (const tx of transactions) {
    const delta = Number(tx.delta);
    if (!Number.isFinite(delta)) continue;

    if (range.startDate && tx.date < range.startDate) {
      openingRaw += delta;
      continue;
    }

    if (range.endDate && tx.date > range.endDate) {
      continue;
    }

    transactionCount += 1;
    const bucket = dailyBuckets.get(tx.date) ?? { count: 0, debtRaw: 0, creditRaw: 0 };
    bucket.count += 1;
    if (delta > 0) {
      periodDebtRaw += delta;
      bucket.debtRaw += delta;
    } else if (delta < 0) {
      const creditAbs = Math.abs(delta);
      periodCreditRaw += creditAbs;
      bucket.creditRaw += creditAbs;
    }
    dailyBuckets.set(tx.date, bucket);
  }

  const openingBalance = normalizeMoney(openingRaw);
  const periodDebt = normalizeMoney(periodDebtRaw);
  const periodCredit = normalizeMoney(periodCreditRaw);
  const periodNet = normalizeMoney(periodDebt - periodCredit);
  const closingBalance = normalizeMoney(openingBalance + periodNet);

  const sortedDates = Array.from(dailyBuckets.keys()).sort((a, b) => a.localeCompare(b));
  let runningRaw = openingRaw;
  const ascRows: DailyBalanceRow[] = sortedDates.map((date) => {
    const bucket = dailyBuckets.get(date)!;
    const debt = normalizeMoney(bucket.debtRaw);
    const credit = normalizeMoney(bucket.creditRaw);
    const net = normalizeMoney(bucket.debtRaw - bucket.creditRaw);
    runningRaw += bucket.debtRaw - bucket.creditRaw;
    return {
      date,
      transactionCount: bucket.count,
      debt,
      credit,
      net,
      closingBalance: normalizeMoney(runningRaw),
    };
  });

  return {
    range,
    isInvalidRange: false,
    openingBalance,
    periodDebt,
    periodCredit,
    periodNet,
    closingBalance,
    transactionCount,
    dailyRows: ascRows.reverse(),
  };
}
