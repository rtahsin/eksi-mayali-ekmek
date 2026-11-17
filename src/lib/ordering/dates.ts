import type { DeliveryDateOption, StoreSettings } from "@/types/settings";
import { addDays, istanbulToday, istanbulWeekday, relativeTrDate } from "@/lib/time/istanbul";

type DateSettings = Pick<
  StoreSettings,
  "orderAcceptanceOpen" | "openWeekdays" | "closedDates" | "maxDaysAhead"
>;

/**
 * Müşterinin seçebileceği teslim tarihleri (İstanbul saatine göre):
 * - sipariş alımı kapalıysa hiç tarih yok,
 * - aynı gün için saat sınırı yok,
 * - bugünden itibaren `maxDaysAhead` gün (dahil) içinde, açık hafta günü olan ve kapalı tarih olmayan günler.
 */
export function computeDeliveryDates(settings: DateSettings, now: Date = new Date()): DeliveryDateOption[] {
  if (!settings.orderAcceptanceOpen) return [];

  const today = istanbulToday(now);
  const openDays = new Set(settings.openWeekdays);
  const closed = new Set(settings.closedDates);
  const options: DeliveryDateOption[] = [];

  for (let offset = 0; offset <= settings.maxDaysAhead; offset++) {
    const date = addDays(today, offset);
    if (!openDays.has(istanbulWeekday(date)) || closed.has(date)) continue;
    options.push({ date, label: relativeTrDate(date, now) });
  }
  return options;
}

export function isDeliveryDateAllowed(date: string, settings: DateSettings, now: Date = new Date()): boolean {
  return computeDeliveryDates(settings, now).some((o) => o.date === date);
}
