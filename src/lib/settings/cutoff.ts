/**
 * 🍞 EkmekLab - Sipariş Cutoff Saati Yönetimi
 * Fırın üretim ve kurye dağıtım planlaması için son sipariş saatini yönetir.
 */

export const DEFAULT_CUTOFF_TIME = "12:00";

/**
 * Türkiye (Europe/Istanbul) saat diliminde bugünün tarihini YYYY-MM-DD olarak döndürür.
 */
export function getTodayDateStringTurkey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Türkiye saat dilimine göre mevcut saatin cutoff saatini geçip geçmediğini kontrol eder.
 * @param cutoffTimeStr "HH:mm" formatında cutoff saati (ör. "12:00", "11:30")
 * @param date Test veya kontrol için referans tarih (varsayılan: new Date())
 */
export function isPastCutoff(cutoffTimeStr: string = DEFAULT_CUTOFF_TIME, date: Date = new Date()): boolean {
  const parts = cutoffTimeStr.trim().split(":");
  const cutoffHour = parseInt(parts[0], 10);
  const cutoffMinute = parseInt(parts[1] || "0", 10);
  if (isNaN(cutoffHour)) return false;

  const trTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const [currentHourStr, currentMinuteStr] = trTime.split(":");
  const currentHour = parseInt(currentHourStr, 10);
  const currentMinute = parseInt(currentMinuteStr, 10);

  if (currentHour > cutoffHour) return true;
  if (currentHour === cutoffHour && currentMinute >= cutoffMinute) return true;
  return false;
}

/**
 * Belirtilen deliveryDate değerinin aynı gün ("bugün") teslimatı temsil edip etmediğini kontrol eder.
 */
export function isSameDayDelivery(deliveryDate?: string | null, date: Date = new Date()): boolean {
  if (!deliveryDate || deliveryDate === "today") return true;
  const todayStr = getTodayDateStringTurkey(date);
  if (deliveryDate === todayStr) return true;
  if (deliveryDate === `custom:${todayStr}`) return true;
  return false;
}

/**
 * Supabase bakery_settings tablosundan cutoff saatini okur.
 */
export async function getOrderCutoffTime(supabase: any): Promise<string> {
  try {
    // 1. Doğrudan order_cutoff_time anahtarı
    const { data: cutoffRow } = await supabase
      .from("bakery_settings")
      .select("value")
      .eq("key", "order_cutoff_time")
      .maybeSingle();

    if (cutoffRow?.value !== undefined && cutoffRow?.value !== null) {
      if (typeof cutoffRow.value === "string") return cutoffRow.value;
      if (typeof cutoffRow.value === "object") {
        const val =
          cutoffRow.value.cutoff_time ||
          cutoffRow.value.time ||
          cutoffRow.value.orderCutoffTime;
        if (val) return String(val);
      }
    }

    // 2. operational_settings içerisindeki orderCutoffTime
    const { data: opRow } = await supabase
      .from("bakery_settings")
      .select("value")
      .eq("key", "operational_settings")
      .maybeSingle();

    if (opRow?.value?.orderCutoffTime) {
      return String(opRow.value.orderCutoffTime);
    }
  } catch (err) {
    console.error("Error reading order cutoff time from bakery_settings:", err);
  }

  return DEFAULT_CUTOFF_TIME;
}
