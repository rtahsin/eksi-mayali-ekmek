import { addDays, istanbulTime, istanbulToday, istanbulWeekday } from "@/lib/time/istanbul";
import { SITE_URL } from "@/lib/site";

export type IcsWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface BakeDayReminderOptions {
  weekday: IcsWeekday;
  hour: number;
  minute: number;
  note?: string;
  now?: Date;
}

export const ICS_WEEKDAY_LABELS: Record<IcsWeekday, string> = {
  MO: "Pazartesi",
  TU: "Salı",
  WE: "Çarşamba",
  TH: "Perşembe",
  FR: "Cuma",
  SA: "Cumartesi",
  SU: "Pazar",
};

export const ICS_WEEKDAY_ORDER: readonly IcsWeekday[] = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
];

const WEEKDAY_TO_JS: Record<IcsWeekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function formatUtcTimestamp(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, "0");
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());
  const mm = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function formatLocalDateTime(isoDate: string, hour: number, minute: number): string {
  const compactDate = isoDate.replace(/-/g, "");
  return `${compactDate}T${pad2(hour)}${pad2(minute)}00`;
}

function addMinutesToLocalSlot(
  isoDate: string,
  hour: number,
  minute: number,
  durationMinutes: number
): { date: string; hour: number; minute: number } {
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const extraDays = Math.floor(totalMinutes / 1440);
  const rem = ((totalMinutes % 1440) + 1440) % 1440;
  return {
    date: extraDays === 0 ? isoDate : addDays(isoDate, extraDays),
    hour: Math.floor(rem / 60),
    minute: rem % 60,
  };
}

/** RFC 5545 §3.3.11 metin kaçış kuralları */
export function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * RFC 5545 §3.1: Her satır en fazla 75 UTF-8 oktet olmalı; taşan kısım `\r\n ` ile katlanır.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const segments: string[] = [];
  let current = "";
  let currentBytes = 0;

  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    const maxBytes = segments.length === 0 ? 75 : 74; // devam satırlarında baştaki boşluk 1 oktet yer kaplar
    if (currentBytes + chBytes > maxBytes) {
      segments.push(current);
      current = ch;
      currentBytes = chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  if (current) {
    segments.push(current);
  }

  return segments.join("\r\n ");
}

/**
 * iPhone (Apple Takvim) ve Google Takvim ile %100 uyumlu haftalık tekrarlayan RFC 5545 `.ics` üretir.
 */
export function buildBakeDayReminderIcs({
  weekday,
  hour,
  minute,
  note = "",
  now = new Date(),
}: BakeDayReminderOptions): string {
  const safeHour = clampInt(hour, 0, 23);
  const safeMinute = clampInt(minute, 0, 59);
  const targetJsDay = WEEKDAY_TO_JS[weekday];

  const todayIso = istanbulToday(now);
  const todayJsDay = istanbulWeekday(todayIso);
  let deltaDays = (targetJsDay - todayJsDay + 7) % 7;

  if (deltaDays === 0) {
    const currentClock = istanbulTime(now);
    const currentTotal = currentClock.hour * 60 + currentClock.minute;
    const targetTotal = safeHour * 60 + safeMinute;
    if (currentTotal >= targetTotal) {
      deltaDays = 7;
    }
  }

  const startIsoDate = addDays(todayIso, deltaDays);
  const endSlot = addMinutesToLocalSlot(startIsoDate, safeHour, safeMinute, 30);

  const dtStamp = formatUtcTimestamp(now);
  const dtStart = formatLocalDateTime(startIsoDate, safeHour, safeMinute);
  const dtEnd = formatLocalDateTime(endSlot.date, endSlot.hour, endSlot.minute);
  const uid = `ekmeklab-bake-${weekday.toLowerCase()}-${pad2(safeHour)}${pad2(safeMinute)}@ekmeklab.tr`;

  const cleanNote = note.trim();
  const baseDescription = `EkmekLab taş fırın ekmekleri ve günlük mandıra eşlikçileri için haftalık sipariş hatırlatıcısı. Sipariş ekranı: ${SITE_URL}`;
  const fullDescription = cleanNote ? `${cleanNote}\n\n${baseDescription}` : baseDescription;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EkmekLab//Tas Firin Siparis Hatirlatici//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Istanbul",
    "X-LIC-LOCATION:Europe/Istanbul",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:+03",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Europe/Istanbul:${dtStart}`,
    `DTEND;TZID=Europe/Istanbul:${dtEnd}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${weekday}`,
    `SUMMARY:${escapeIcsText("EkmekLab Taş Fırın Sipariş Günü")}`,
    `DESCRIPTION:${escapeIcsText(fullDescription)}`,
    `URL:${SITE_URL}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText("EkmekLab Taş Fırın Sipariş Günü (15 dk sonra)")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
