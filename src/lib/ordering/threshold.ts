import { addDays, istanbulWeekday } from "@/lib/time/istanbul";

export type ThresholdStatus = "toplaniyor" | "kesinlesti" | "tukendi";

export interface ThresholdState {
  status: ThresholdStatus;
  current: number;
  threshold: number;
  limit: number | null;
  remainingToThreshold: number;
  remainingToLimit: number | null;
  isReached: boolean;
  isSoldOut: boolean;
  label: string;
  badgeLabel: string;
  progressPercent: number;
}

/**
 * Ürün eşik durumunu hesaplayan saf fonksiyon.
 * @param adet Mevcut toplanan sipariş adedi
 * @param esik Üretim için gereken asgari adet (ör. 10)
 * @param ustSinir İsteğe bağlı üst limit (ör. fırın kapasitesi 25)
 */
export function thresholdState(
  adet: number,
  esik: number,
  ustSinir: number | null = null
): ThresholdState {
  const current = Math.max(0, adet);
  const threshold = Math.max(1, esik);
  const limit = ustSinir !== null && ustSinir > 0 ? ustSinir : null;

  const isReached = current >= threshold;
  const isSoldOut = limit !== null && current >= limit;
  const remainingToThreshold = Math.max(0, threshold - current);
  const remainingToLimit = limit !== null ? Math.max(0, limit - current) : null;

  let status: ThresholdStatus = "toplaniyor";
  let label = `${current}/${threshold}`;
  let badgeLabel = `${remainingToThreshold} adet kaldı`;

  const maxScale = limit ? Math.max(threshold, limit) : threshold;
  const progressPercent = Math.min(100, Math.round((current / maxScale) * 100));

  if (isSoldOut) {
    status = "tukendi";
    label = "Kesinleşti · Tükendi";
    badgeLabel = "Tükendi";
  } else if (isReached) {
    status = "kesinlesti";
    if (limit !== null) {
      label = `Kesinleşti · ${current}/${limit}`;
      badgeLabel = `${remainingToLimit} adet kaldı`;
    } else {
      label = "Kesinleşti";
      badgeLabel = "Kesinleşti";
    }
  }

  return {
    status,
    current,
    threshold,
    limit,
    remainingToThreshold,
    remainingToLimit,
    isReached,
    isSoldOut,
    label,
    badgeLabel,
    progressPercent,
  };
}

/**
 * Verilen satış günlerinden (1=Pzt..7=Paz) belirli bir tarihten sonraki ilk satış gününü bulur.
 * @param gunler Satışın gerçekleştiği hafta günleri (1..7, 1=Pazartesi, 7=Pazar)
 * @param tarih Başlangıç referans tarihi (YYYY-MM-DD)
 * @param allowSameDate Referans tarih günlerden biriyse kendisi kabul edilsin mi? (varsayılan: false)
 */
export function nextSaleDate(
  gunler: number[],
  tarih: string,
  allowSameDate: boolean = false
): string {
  if (!gunler || gunler.length === 0) {
    // Gün listesi yoksa varsayılan olarak haftalık +7 gün döner
    return addDays(tarih, 7);
  }

  // JS weekday: 0=Paz, 1=Pzt.. 6=Cmt
  // Bizim sistemde: 1=Pzt.. 7=Paz (ISO weekday)
  // istanbulWeekday: 0=Pazar, 1=Pazartesi.. 6=Cumartesi
  // Dönüşüm: istanbulWeekday == 0 ? 7 : istanbulWeekday
  const allowedIsoDays = new Set(
    gunler.map((g) => (g === 0 ? 7 : g))
  );

  const startOffset = allowSameDate ? 0 : 1;
  for (let offset = startOffset; offset <= 14; offset++) {
    const candidate = addDays(tarih, offset);
    const jsDay = istanbulWeekday(candidate);
    const isoDay = jsDay === 0 ? 7 : jsDay;

    if (allowedIsoDays.has(isoDay)) {
      return candidate;
    }
  }

  return addDays(tarih, 7);
}

const DATIVE_DAYS: Record<number, string> = {
  0: "Pazar'a",
  1: "Pazartesi'ye",
  2: "Salı'ya",
  3: "Çarşamba'ya",
  4: "Perşembe'ye",
  5: "Cuma'ya",
  6: "Cumartesi'ye",
};

/**
 * Belirli bir satış gününe kalan süreyi Türkçe yönelme ekiyle biçimlendirir (ör. "Cuma'ya 2 gün").
 */
export function formatCountdown(saleDate: string, todayStr: string): string {
  const dSale = new Date(`${saleDate}T00:00:00Z`).getTime();
  const dToday = new Date(`${todayStr}T00:00:00Z`).getTime();
  const diffDays = Math.round((dSale - dToday) / 86400000);
  const weekday = istanbulWeekday(saleDate);
  const dative = DATIVE_DAYS[weekday] ?? "Satış gününe";

  if (diffDays <= 0) return "Bugün fırında";
  if (diffDays === 1) return `${dative} 1 gün`;
  return `${dative} ${diffDays} gün`;
}

export interface ProductThresholdDisplay {
  isThreshold: boolean;
  state: ThresholdState | null;
  saleDate: string | null;
  countdownLabel: string | null;
  displayLabel: string;
}

/**
 * Ürün kartı ve detay modalı için eşik çubuğu verisini hazırlar.
 */
export function getProductThresholdDisplay(
  product: {
    orderThreshold?: number | null;
    dailyLimit?: number | null;
    saleDates?: Array<{ date: string; limit: number | null; status?: string; orderedCount?: number }>;
    saleWeekdays?: number[] | null;
  },
  todayStr: string
): ProductThresholdDisplay {
  if (!product.orderThreshold || product.orderThreshold <= 0) {
    return {
      isThreshold: false,
      state: null,
      saleDate: null,
      countdownLabel: null,
      displayLabel: "Bugün fırında",
    };
  }

  const upcoming = product.saleDates && product.saleDates.length > 0 ? product.saleDates[0] : null;
  const targetDate = upcoming?.date || (product.saleWeekdays ? nextSaleDate(product.saleWeekdays, todayStr, true) : null);
  const count = upcoming?.orderedCount ?? 0;
  const limit = upcoming?.limit ?? product.dailyLimit ?? null;
  const state = thresholdState(count, product.orderThreshold, limit);
  const countdown = targetDate ? formatCountdown(targetDate, todayStr) : null;

  let displayLabel = "";
  if (state.isSoldOut) {
    displayLabel = "Tükendi";
  } else if (state.isReached) {
    if (limit !== null) {
      displayLabel = `Kesinleşti · ${count}/${limit}`;
    } else {
      displayLabel = "Kesinleşti";
    }
  } else {
    displayLabel = countdown ? `${state.current}/${state.threshold} · ${countdown}` : `${state.current}/${state.threshold}`;
  }

  return {
    isThreshold: true,
    state,
    saleDate: targetDate,
    countdownLabel: countdown,
    displayLabel,
  };
}
