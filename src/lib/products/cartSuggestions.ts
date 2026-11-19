import type { Product } from "@/types";
import { isSoldOn } from "@/lib/ordering/saleDates";
import { addDays, istanbulToday } from "@/lib/time/istanbul";
import { isAccompaniment, isSpecialtyBread } from "./grouping";
import { getSmartPairings } from "./pairingChemistry";

export interface CartSuggestionItemRef {
  productId: string;
}

/**
 * Ürünün seçili teslimat gününde (YYYY-MM-DD) satılıp satılmadığını,
 * ön hazırlık süresini (`leadTimeDays`) ve günlük limitini (`dailyLimit`) kontrol eder.
 */
function isCompatibleWithDeliveryDate(
  product: Product,
  selectedDeliveryDate: string | null | undefined,
  today: string
): boolean {
  const date = selectedDeliveryDate?.trim();
  if (!date) return false;

  if (product.leadTimeDays && product.leadTimeDays > 0) {
    if (date < addDays(today, product.leadTimeDays)) return false;
  }

  if (product.availability === "dates") {
    if (!product.saleDates || product.saleDates.length === 0) return false;
    const match = product.saleDates.find((day) => day.date === date);
    if (!match) return false;
    const effectiveLimit = match.limit ?? product.dailyLimit;
    return effectiveLimit !== 0;
  }

  if (product.availability === "daily") {
    if (product.dailyLimit === 0) return false;
    return isSoldOn(product.saleWeekdays, date);
  }

  if (product.saleDates && product.saleDates.length > 0) {
    const match = product.saleDates.find((day) => day.date === date);
    if (!match) return false;
    const effectiveLimit = match.limit ?? product.dailyLimit;
    return effectiveLimit !== 0;
  }

  if (product.dailyLimit === 0) return false;
  return isSoldOn(product.saleWeekdays, date);
}

function isEligibleSuggestion(
  product: Product,
  inCart: ReadonlySet<string>,
  selectedDeliveryDate: string | null | undefined,
  today: string
): boolean {
  if (product.isActive === false) return false;
  if (product.isAvailable === false) return false;
  if (inCart.has(product.id)) return false;
  return isCompatibleWithDeliveryDate(product, selectedDeliveryDate, today);
}

/**
 * Sepet çekmecesi için tarih-uyumlu, sepet-farkındalıklı çapraz satış önerileri üretir.
 *
 * 1. Önce sepetteki ürünlerin açık `crossSell` kimliklerini toplar.
 * 2. Eksik kalırsa `getSmartPairings` ile tamamlar:
 *    - Sepette ekmek varsa eşlikçileri,
 *    - Sepette yalnız eşlikçi varsa günlük ekmekleri öne çıkarır.
 * 3. Aktif olmayan, stok dışı, günlük limiti 0 olan, ön hazırlık süresini aşmayan,
 *    sepette zaten bulunan veya seçili teslim gününü bozacak ürünleri asla önermez.
 */
export function getCartSuggestions(
  items: readonly CartSuggestionItemRef[],
  allProducts: readonly Product[],
  selectedDeliveryDate?: string | null,
  limit: number = 3,
  today: string = istanbulToday()
): Product[] {
  if (limit <= 0 || items.length === 0 || allProducts.length === 0 || !selectedDeliveryDate?.trim()) {
    return [];
  }

  const inCart = new Set(items.map((item) => item.productId));
  const productById = new Map<string, Product>(
    allProducts.map((product) => [product.id, product])
  );

  const eligibleProducts = allProducts.filter((product) =>
    isEligibleSuggestion(product, inCart, selectedDeliveryDate, today)
  );
  if (eligibleProducts.length === 0) {
    return [];
  }

  const eligibleById = new Map<string, Product>(
    eligibleProducts.map((product) => [product.id, product])
  );

  const selected: Product[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: Product | undefined) => {
    if (!candidate || seen.has(candidate.id) || selected.length >= limit) return;
    seen.add(candidate.id);
    selected.push(candidate);
  };

  // 1. Admin tarafından tanımlanan crossSell önceliği
  const cartProducts: Product[] = [];
  const seenCartIds = new Set<string>();

  for (const item of items) {
    const cartProduct = productById.get(item.productId);
    if (!cartProduct) continue;
    if (!seenCartIds.has(cartProduct.id)) {
      seenCartIds.add(cartProduct.id);
      cartProducts.push(cartProduct);
    }

    for (const crossId of cartProduct.crossSell ?? []) {
      pushCandidate(eligibleById.get(crossId));
      if (selected.length >= limit) return selected;
    }
  }

  if (cartProducts.length === 0) {
    return selected;
  }

  // 2. Akıllı fizikokimyasal eşleşme fallback'i
  const remainingPool = eligibleProducts.filter((product) => !seen.has(product.id));
  if (remainingPool.length === 0) {
    return selected;
  }

  const cartBreads = cartProducts.filter((product) => !isAccompaniment(product));
  const hasBreadInCart = cartBreads.length > 0;
  const anchor = hasBreadInCart ? cartBreads[0] : cartProducts[0];

  const smartRanked = getSmartPairings(anchor, remainingPool, remainingPool.length).map(
    (entry) => entry.product
  );

  if (!hasBreadInCart) {
    // Sepette yalnız eşlikçi varsa önce günlük (her gün pişen) ekmekleri öne çıkar
    const dailyBreads = smartRanked.filter(
      (product) => !isAccompaniment(product) && !isSpecialtyBread(product)
    );
    for (const bread of dailyBreads) {
      pushCandidate(bread);
      if (selected.length >= limit) return selected;
    }
  }

  for (const candidate of smartRanked) {
    pushCandidate(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
}
