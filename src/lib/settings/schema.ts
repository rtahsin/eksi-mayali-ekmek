import { z } from "zod";
import type { PublicStoreSettings, StoreSettings } from "@/types/settings";
import { isIsoDate, parseClock } from "@/lib/time/istanbul";

export const DEFAULT_NEIGHBORHOODS = [
  "Adnan Kahveci",
  "Barış",
  "Büyükşehir",
  "Cumhuriyet",
  "Dereağzı",
  "Gürpınar",
  "Kavaklı",
  "Marmara",
  "Sahil",
  "Yakuplu",
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  shippingFee: 150,
  freeShippingThreshold: 1000,
  minBasketAmount: 0,
  deliveryWindow: "14:00 - 18:00",
  whatsappPhone: "0501 012 66 53",
  orderAcceptanceOpen: true,
  announcementText: "",
  orderCutoffTime: "12:00",
  neighborhoods: DEFAULT_NEIGHBORHOODS,
  openWeekdays: [0, 1, 2, 3, 4, 5, 6],
  closedDates: [],
  maxDaysAhead: 7,
  dailyBreadCapacity: null,
  wholesaleDailyLoaves: 0,
};

const money = z.coerce.number().finite().min(0).max(100000);
const clock = z.string().trim().refine((v) => parseClock(v) !== null, "Saat SS:DD formatında olmalıdır");
const neighborhoodName = z
  .string()
  .trim()
  .min(2)
  .max(60)
  // Eski kayıtlardaki " Mah." sonekini at: tek biçim "Barış"
  .transform((v) => v.replace(/\s+Mah(\.|allesi)?$/i, "").trim());

/** Admin formundan gelen (katı) şema. */
export const StoreSettingsSchema = z.object({
  shippingFee: money,
  freeShippingThreshold: money,
  minBasketAmount: money,
  deliveryWindow: z.string().trim().min(1).max(50),
  whatsappPhone: z.string().trim().min(10).max(30),
  orderAcceptanceOpen: z.boolean(),
  announcementText: z.string().trim().max(300),
  orderCutoffTime: clock,
  neighborhoods: z.array(neighborhoodName).min(1, "En az bir mahalle seçin").max(40),
  openWeekdays: z.array(z.number().int().min(0).max(6)).min(1, "En az bir gün açık olmalı").max(7),
  closedDates: z.array(z.string().refine(isIsoDate, "Tarih YYYY-AA-GG olmalı")).max(120),
  maxDaysAhead: z.coerce.number().int().min(0).max(30),
  dailyBreadCapacity: z.coerce.number().int().min(0).max(10000).nullable(),
  wholesaleDailyLoaves: z.coerce.number().int().min(0).max(10000),
});

/**
 * Veritabanındaki ham JSON'u okur: bozuk/eksik her alan tek tek varsayılana düşer,
 * böylece eski veya yarım kayıtlar siteyi kırmaz.
 */
export function parseStoredSettings(raw: unknown, legacyCutoff?: unknown): StoreSettings {
  const source = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result = { ...DEFAULT_STORE_SETTINGS };
  const shape = StoreSettingsSchema.shape;

  (Object.keys(shape) as (keyof StoreSettings)[]).forEach((key) => {
    if (!(key in source)) return;
    const parsed = shape[key].safeParse(source[key]);
    if (parsed.success) {
      (result as Record<keyof StoreSettings, unknown>)[key] = parsed.data;
    }
  });

  // Eski ayrı anahtar (`order_cutoff_time`) varsa ve operational içinde yoksa onu kullan
  if (!("orderCutoffTime" in source) && legacyCutoff !== undefined && legacyCutoff !== null) {
    const legacy =
      typeof legacyCutoff === "object"
        ? (legacyCutoff as Record<string, unknown>).cutoff_time ?? (legacyCutoff as Record<string, unknown>).time
        : legacyCutoff;
    const parsed = clock.safeParse(String(legacy ?? ""));
    if (parsed.success) result.orderCutoffTime = parsed.data;
  }

  result.openWeekdays = Array.from(new Set(result.openWeekdays)).sort((a, b) => a - b);
  result.closedDates = Array.from(new Set(result.closedDates)).sort();
  result.neighborhoods = Array.from(new Set(result.neighborhoods));
  return result;
}

export function toPublicSettings(settings: StoreSettings): PublicStoreSettings {
  return {
    shippingFee: settings.shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    minBasketAmount: settings.minBasketAmount,
    deliveryWindow: settings.deliveryWindow,
    whatsappPhone: settings.whatsappPhone,
    orderAcceptanceOpen: settings.orderAcceptanceOpen,
    announcementText: settings.announcementText,
    orderCutoffTime: settings.orderCutoffTime,
    neighborhoods: settings.neighborhoods,
    openWeekdays: settings.openWeekdays,
    closedDates: settings.closedDates,
    maxDaysAhead: settings.maxDaysAhead,
  };
}

/** Ara toplama göre teslimat ücreti (sunucu ve sepet aynı fonksiyonu kullanır). */
export function computeShippingFee(subtotal: number, settings: Pick<StoreSettings, "shippingFee" | "freeShippingThreshold">): number {
  if (subtotal <= 0) return 0;
  if (settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold) return 0;
  return settings.shippingFee;
}

/** "0501 012 66 53" → "905010126653" (wa.me biçimi). */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `9${digits}`;
  return `90${digits}`;
}
