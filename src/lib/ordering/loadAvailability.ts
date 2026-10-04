import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreSettings } from "@/types/settings";
import { computeDeliveryDates } from "./dates";
import { evaluateCartDates, type CartLine, type DateAvailability } from "./availability";
import { loadAvailabilityContext } from "@/lib/products/server";
import { istanbulToday } from "@/lib/time/istanbul";

/**
 * Sepetin TEK doğruluk kaynağı: seçilebilir günler × sepetteki ürünlerin kuralları ×
 * o günlerin doluluğu. Sepet ekranı ve `/api/orders/create` aynı fonksiyonu kullanır.
 */
export async function getCartAvailability(
  supabase: SupabaseClient,
  settings: StoreSettings,
  cart: CartLine[],
  now: Date = new Date()
): Promise<DateAvailability[]> {
  const baseDates = computeDeliveryDates(settings, now);
  if (baseDates.length === 0) return [];

  const { products, usage } = await loadAvailabilityContext(
    supabase,
    cart.map((c) => c.productId),
    baseDates[0].date,
    baseDates[baseDates.length - 1].date,
    settings.dailyBreadCapacity
  );
  return evaluateCartDates(baseDates, products, cart, usage, istanbulToday(now));
}
