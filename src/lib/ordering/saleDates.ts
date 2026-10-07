import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, istanbulToday, istanbulWeekday } from "@/lib/time/istanbul";

export const WEEKDAY_MAP: Record<number, string> = {
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
  7: "Pazar",
};

export const WEEKDAY_SHORT_MAP: Record<number, string> = {
  1: "Pzt",
  2: "Sal",
  3: "Çar",
  4: "Per",
  5: "Cum",
  6: "Cmt",
  7: "Paz",
};

const MONTH_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

/**
 * ISO tarihini "10 Eki" şeklinde biçimlendirir.
 */
export function formatTrDayMonth(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const monthName = MONTH_SHORT[monthIdx] || "";
  return `${day} ${monthName}`.trim();
}

/**
 * Verilen haftalık günlere (1=Pzt..7=Paz) karşılık gelen gün isimlerini bağlar.
 * Örn: [5] -> "Cuma", [2, 5] -> "Salı ve Cuma", [1, 3, 5] -> "Pazartesi, Çarşamba ve Cuma"
 */
export function weekdayLabel(weekdays: number[]): string {
  if (!weekdays || weekdays.length === 0) return "";
  const unique = Array.from(new Set(weekdays))
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b);

  if (unique.length === 0) return "";
  if (unique.length === 7) return "Her gün";

  const names = unique.map((d) => WEEKDAY_MAP[d]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} ve ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`;
}

/**
 * Belirli hafta günleri (1=Pzt..7=Paz) için İstanbul zamanına göre
 * bugünden başlayarak N haftalık (varsayılan 8 hafta) satış tarihlerini üretir.
 */
export function upcomingSaleDates(
  weekdays: number[] | null | undefined,
  fromIstanbulDate: string = istanbulToday(),
  weeks: number = 8
): string[] {
  if (!weekdays || weekdays.length === 0 || weeks <= 0) return [];
  const validDays = new Set(weekdays.filter((d) => d >= 1 && d <= 7));
  if (validDays.size === 0) return [];

  const out: string[] = [];
  const totalDays = weeks * 7;

  for (let i = 0; i < totalDays; i++) {
    const dateStr = addDays(fromIstanbulDate, i);
    // istanbulWeekday: 0=Pazar, 1=Pazartesi..6=Cumartesi
    const jsDay = istanbulWeekday(dateStr);
    const isoDay = jsDay === 0 ? 7 : jsDay;
    if (validDays.has(isoDay)) {
      out.push(dateStr);
    }
  }

  return out;
}

/**
 * Ürün kartı ve modalı için satış takvimi rozeti metnini üretir.
 * - Özel fırın günü (tek gün): "Her Cuma · sıradaki 10 Eki"
 * - Özel fırın günü (çoklu gün): "Salı ve Cuma · sıradaki 10 Eki"
 * - Her gün ekmeği: "Her gün"
 */
export function getSaleScheduleBadge(
  product: {
    saleWeekdays?: number[] | null;
    isAvailable?: boolean;
    category?: string;
  },
  today: string = istanbulToday()
): string | null {
  if (product.isAvailable === false) return null;

  const days = product.saleWeekdays;
  if (!days || days.length === 0 || days.length === 7) {
    return "Her gün";
  }

  const label = weekdayLabel(days);
  const nextDates = upcomingSaleDates(days, today, 8);
  const next = nextDates[0];
  const nextStr = next ? formatTrDayMonth(next) : null;

  if (days.length === 1) {
    return nextStr ? `Her ${label} · sıradaki ${nextStr}` : `Her ${label}`;
  }

  return nextStr ? `${label} · sıradaki ${nextStr}` : label;
}

/**
 * Aktif ürünlerin önümüzdeki 8 haftalık satış günlerini product_sale_dates tablosunda garantiye alır.
 * Idempotent: Varsa dokunmaz, yoksa ekler.
 */
export async function ensureSaleDatesWindow(
  supabase: SupabaseClient,
  weeks: number = 8,
  today: string = istanbulToday()
): Promise<{ productsCount: number; datesAdded: number }> {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, sale_weekdays, daily_limit")
    .eq("is_active", true)
    .not("sale_weekdays", "is", null);

  if (error || !products) {
    console.warn("ensureSaleDatesWindow products fetch failed:", error?.message);
    return { productsCount: 0, datesAdded: 0 };
  }

  let totalAdded = 0;
  let productsCount = 0;

  for (const p of products as { id: string; sale_weekdays: number[]; daily_limit: number | null }[]) {
    if (!p.sale_weekdays || p.sale_weekdays.length === 0) continue;
    const dates = upcomingSaleDates(p.sale_weekdays, today, weeks);
    if (dates.length === 0) continue;

    const rows = dates.map((d) => ({
      product_id: p.id,
      sale_date: d,
      quantity_limit: p.daily_limit ?? null,
    }));

    const { error: insertError } = await supabase
      .from("product_sale_dates")
      .upsert(rows, { onConflict: "product_id, sale_date", ignoreDuplicates: true });

    if (!insertError) {
      totalAdded += rows.length;
      productsCount++;
    }
  }

  return { productsCount, datesAdded: totalAdded };
}
