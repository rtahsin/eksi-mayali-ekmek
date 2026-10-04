/**
 * Tek saat kaynağı: tüm "bugün", cutoff ve teslim tarihi hesapları Europe/Istanbul
 * saatine göre yapılır. Tarihler her yerde `YYYY-MM-DD` (ISO, saat dilimsiz) metindir.
 *
 * `new Date().toISOString().split("T")[0]` KULLANMAYIN: UTC'dir, İstanbul'da
 * 00:00–03:00 arası bir önceki günü verir.
 */

export const ISTANBUL_TZ = "Europe/Istanbul";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): boolean {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ISTANBUL_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** İstanbul'da verilen anın tarihi (`YYYY-MM-DD`). */
export function istanbulToday(now: Date = new Date()): string {
  return dateFormatter.format(now);
}

/** Verilen anın İstanbul tarihi (ör. `created_at` → teslim günü). */
export function toIstanbulDate(value: string | Date): string {
  return istanbulToday(typeof value === "string" ? new Date(value) : value);
}

/** İstanbul'da şu anki saat ve dakika. */
export function istanbulTime(now: Date = new Date()): { hour: number; minute: number } {
  const [h, m] = timeFormatter.format(now).split(":");
  return { hour: Number(h), minute: Number(m) };
}

/** `YYYY-MM-DD` + n gün (takvim aritmetiği, saat diliminden bağımsız). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Pazar … 6 = Cumartesi (takvim günü). */
export function istanbulWeekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** "HH:mm" → dakika; geçersizse null. */
export function parseClock(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** İstanbul saatine göre cutoff ("HH:mm") geçti mi? Geçersiz cutoff → false. */
export function isPastCutoff(cutoff: string, now: Date = new Date()): boolean {
  const cutoffMinutes = parseClock(cutoff);
  if (cutoffMinutes === null) return false;
  const { hour, minute } = istanbulTime(now);
  return hour * 60 + minute >= cutoffMinutes;
}

const WEEKDAY_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const WEEKDAY_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTH_LONG = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** "Pzt 6 Eki" (short) veya "6 Ekim Pazartesi" (long). */
export function formatTrDate(isoDate: string, style: "short" | "long" = "short"): string {
  if (!isIsoDate(isoDate)) return isoDate;
  const [, mm, dd] = isoDate.split("-").map(Number);
  const weekday = istanbulWeekday(isoDate);
  return style === "long"
    ? `${dd} ${MONTH_LONG[mm - 1]} ${WEEKDAY_LONG[weekday]}`
    : `${WEEKDAY_SHORT[weekday]} ${dd} ${MONTH_SHORT[mm - 1]}`;
}

/** "Bugün" / "Yarın" / "Pzt 6 Eki" */
export function relativeTrDate(isoDate: string, now: Date = new Date()): string {
  const today = istanbulToday(now);
  if (isoDate === today) return "Bugün";
  if (isoDate === addDays(today, 1)) return "Yarın";
  return formatTrDate(isoDate);
}

/**
 * 014 öncesi kayıtlardaki eski teslim tarihi metinlerini ("today", "tomorrow",
 * "custom:YYYY-MM-DD") sipariş anına göre ISO tarihe çevirir. ISO ise aynen döner.
 */
export function normalizeDeliveryDate(raw: string | null | undefined, createdAt?: string | null): string {
  const base = createdAt ? toIstanbulDate(createdAt) : istanbulToday();
  if (!raw) return base;
  if (isIsoDate(raw)) return raw;
  if (raw.startsWith("custom:") && isIsoDate(raw.slice(7))) return raw.slice(7);
  if (raw === "tomorrow") return addDays(base, 1);
  return base;
}
