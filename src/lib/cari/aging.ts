import type { CariTransaction, LedgerType } from "@/types/admin";
import { isIsoDate, istanbulToday } from "@/lib/time/istanbul";
import { roundCariMoney } from "./pricing";

export type CariAgingTransaction = Pick<CariTransaction, "date" | "type" | "delta"> &
  Partial<Pick<CariTransaction, "id" | "reversesId" | "reversedById" | "createdAt">>;

export interface CariAccountAging {
  /** Güncel net cari bakiye (Σ delta; pozitif = açık alacak, negatif = avans/fazla ödeme) */
  netBalance: number;
  /** Toplam açık alacak = Math.max(0, netBalance) */
  totalOpenReceivable: number;
  /** 0–7 günlük açık borç */
  current0to7: number;
  /** 8–15 günlük açık borç */
  days8to15: number;
  /** 16–30 günlük açık borç */
  days16to30: number;
  /** 30+ günlük (31 gün ve üzeri) açık borç */
  over30: number;
  /** En eski kapanmamış açık borç tarihi (YYYY-MM-DD, Europe/Istanbul); açık borç yoksa null */
  oldestUnpaidDate: string | null;
  /** En eski kapanmamış açık borcun takvim günü yaşı; açık borç yoksa 0 */
  oldestUnpaidDays: number;
  /** Storno edilmemiş en son tahsilat tarihi (YYYY-MM-DD, Europe/Istanbul); yoksa null */
  lastCollectionDate: string | null;
}

const MS_PER_DAY = 86_400_000;

function toCents(amount: number): number {
  const sign = amount < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(amount) + Number.EPSILON) * 100);
}

function fromCents(cents: number): number {
  if (cents === 0) return 0;
  return roundCariMoney(cents / 100);
}

function diffCalendarDays(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(`${fromIso}T00:00:00Z`);
  const toMs = Date.parse(`${toIso}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return 0;
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

interface OpenDebtEntry {
  date: string;
  createdAt: string;
  index: number;
  cents: number;
}

/**
 * B2B cari hesap hareketleri için FIFO (First-In, First-Out) alacak yaşlandırması hesaplar.
 *
 * Kurallar:
 * - Storno ile iptal edilmiş (`reversedById` veya storno `reversesId` eşleşmesi) ve `type === "storno"`
 *   kayıtları eşleştirilerek dışlanır.
 * - Açık pozitif borçlar (`delta > 0`) kronolojik sıraya (`date` artan) dizilir.
 * - İptal edilmemiş toplam net alacaklar (`delta < 0`) en eski açık borçtan başlayarak FIFO mahsup edilir.
 * - Kalan açık borçlar `today` (YYYY-MM-DD, Europe/Istanbul) takvim gününe göre 4 vade kovasına dağıtılır:
 *   0–7 gün, 8–15 gün, 16–30 gün ve 30+ gün.
 * - Değişmez: `roundCariMoney(current0to7 + days8to15 + days16to30 + over30) === totalOpenReceivable`
 *   ve `totalOpenReceivable === Math.max(0, netBalance)` (0,00 ₺ kuruş sapması).
 */
export function computeAccountAgingFifo(
  transactions: ReadonlyArray<CariAgingTransaction>,
  today: string = istanbulToday(),
): CariAccountAging {
  const referenceToday = isIsoDate(today) ? today : istanbulToday();

  // Storno ile iptal edilen orijinal kayıt kimliklerini topla
  const reversedTargetIds = new Set<string>();
  for (const tx of transactions) {
    if (tx.type === "storno" && typeof tx.reversesId === "string" && tx.reversesId.trim().length > 0) {
      reversedTargetIds.add(tx.reversesId);
    }
  }

  const openDebts: OpenDebtEntry[] = [];
  let totalDebtCents = 0;
  let totalCreditCents = 0;
  let lastCollectionDate: string | null = null;

  for (let idx = 0; idx < transactions.length; idx += 1) {
    const tx = transactions[idx];
    const isStorno: boolean = (tx.type as LedgerType) === "storno";
    const isReversed: boolean =
      Boolean(tx.reversedById) ||
      (typeof tx.id === "string" && tx.id.length > 0 && reversedTargetIds.has(tx.id));

    if (isStorno || isReversed) {
      continue;
    }

    const delta = Number(tx.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      continue;
    }

    const cents = toCents(delta);
    if (cents === 0) continue;

    const txDate = isIsoDate(tx.date) ? tx.date : referenceToday;

    if (cents > 0) {
      totalDebtCents += cents;
      openDebts.push({
        date: txDate,
        createdAt: tx.createdAt ?? "",
        index: idx,
        cents,
      });
    } else {
      totalCreditCents += Math.abs(cents);
      if (tx.type === "tahsilat" && isIsoDate(tx.date)) {
        if (lastCollectionDate === null || tx.date > lastCollectionDate) {
          lastCollectionDate = tx.date;
        }
      }
    }
  }

  const netBalanceCents = totalDebtCents - totalCreditCents;
  const totalOpenReceivableCents = Math.max(0, netBalanceCents);

  // En eski açık borçtan başla (date asc, createdAt asc, kaynak sırası asc)
  openDebts.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const createdCmp = a.createdAt.localeCompare(b.createdAt);
    if (createdCmp !== 0) return createdCmp;
    return a.index - b.index;
  });

  let remainingCreditCents = totalCreditCents;
  let current0to7Cents = 0;
  let days8to15Cents = 0;
  let days16to30Cents = 0;
  let over30Cents = 0;
  let oldestUnpaidDate: string | null = null;
  let oldestUnpaidDays = 0;

  for (const debt of openDebts) {
    if (remainingCreditCents >= debt.cents) {
      remainingCreditCents -= debt.cents;
      continue;
    }

    const unpaidCents = debt.cents - remainingCreditCents;
    remainingCreditCents = 0;

    if (unpaidCents <= 0) continue;

    const ageDays = Math.max(0, diffCalendarDays(debt.date, referenceToday));
    if (oldestUnpaidDate === null) {
      oldestUnpaidDate = debt.date;
      oldestUnpaidDays = ageDays;
    }

    if (ageDays <= 7) {
      current0to7Cents += unpaidCents;
    } else if (ageDays <= 15) {
      days8to15Cents += unpaidCents;
    } else if (ageDays <= 30) {
      days16to30Cents += unpaidCents;
    } else {
      over30Cents += unpaidCents;
    }
  }

  return {
    netBalance: fromCents(netBalanceCents),
    totalOpenReceivable: fromCents(totalOpenReceivableCents),
    current0to7: fromCents(current0to7Cents),
    days8to15: fromCents(days8to15Cents),
    days16to30: fromCents(days16to30Cents),
    over30: fromCents(over30Cents),
    oldestUnpaidDate,
    oldestUnpaidDays,
    lastCollectionDate,
  };
}
