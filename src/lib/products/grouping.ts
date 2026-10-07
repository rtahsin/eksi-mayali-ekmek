import type { ExtendedProduct } from "@/types";

export type ProductGroupType = "her_gun" | "ozel" | "eslikci";

export interface GroupedCatalog {
  /** Tüm ekmekler: önce her gün ekmekleri, sonra özel ekmekler */
  breads: ExtendedProduct[];
  /** Sadece her gün taze pişen ekmekler */
  everydayBreads: ExtendedProduct[];
  /** Sipariş üzerine açılan / eşikli / ön sipariş ekmekler */
  specialtyBreads: ExtendedProduct[];
  /** Eşlikçiler (mandıra, gurme, kiler) */
  accompaniments: ExtendedProduct[];
  /** Sıralanmış tüm ürünler (her gün ekmekleri -> özel ekmekler -> eşlikçiler) */
  allOrdered: ExtendedProduct[];
}

const ACCOMPANIMENT_CATEGORIES = new Set([
  "pantry",
  "gurme",
  "mandira",
  "sarkuteri",
  "accompaniment",
  "accompaniments",
  "kiler",
  "peynir",
  "recel",
  "zeytin",
  "tereyag",
]);

/**
 * Ürünün eşlikçi (ekmek dışı mandıra/kiler/gurme) olup olmadığını belirler.
 */
export function isAccompaniment(product: ExtendedProduct): boolean {
  const cat = (product.category || "").toLowerCase();
  if (ACCOMPANIMENT_CATEGORIES.has(cat)) return true;
  if (product.capacityUnits === 0 && cat !== "bread" && cat !== "ekmek") return true;
  return false;
}

/**
 * Ürünün özel / sipariş üzerine / eşikli ekmek olup olmadığını belirler.
 */
export function isSpecialtyBread(product: ExtendedProduct): boolean {
  if (isAccompaniment(product)) return false;
  if (
    product.orderThreshold !== null &&
    product.orderThreshold !== undefined &&
    product.orderThreshold > 0
  ) {
    return true;
  }
  if (product.madeToOrder) return true;
  if (product.availability === "dates") return true;
  if (product.category === "specialty") return true;
  return false;
}

/**
 * Ürünün ait olduğu grubu döner.
 */
export function getProductGroup(product: ExtendedProduct): ProductGroupType {
  if (isAccompaniment(product)) return "eslikci";
  if (isSpecialtyBread(product)) return "ozel";
  return "her_gun";
}

/**
 * Ürünleri grup içi sıralama kuralına göre sıralar:
 * 1. displayOrder (admin) artan sırada
 * 2. İsim (Türkçe alfabetik)
 */
export function sortProductsWithinGroup(products: ExtendedProduct[]): ExtendedProduct[] {
  return [...products].sort((a, b) => {
    const orderA = a.displayOrder ?? 0;
    const orderB = b.displayOrder ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "", "tr");
  });
}

/**
 * Kataloğu mantıksal gruplara ayırır ve sıralar (I-01):
 * 1. Her gün ekmekleri (displayOrder -> ad)
 * 2. Özel / eşikli ekmekler (displayOrder -> ad)
 * 3. Eşlikçiler (displayOrder -> ad)
 */
export function groupCatalog(products: ExtendedProduct[]): GroupedCatalog {
  const everydayBreads: ExtendedProduct[] = [];
  const specialtyBreads: ExtendedProduct[] = [];
  const accompaniments: ExtendedProduct[] = [];

  for (const p of products) {
    const group = getProductGroup(p);
    if (group === "her_gun") {
      everydayBreads.push(p);
    } else if (group === "ozel") {
      specialtyBreads.push(p);
    } else {
      accompaniments.push(p);
    }
  }

  const sortedEveryday = sortProductsWithinGroup(everydayBreads);
  const sortedSpecialty = sortProductsWithinGroup(specialtyBreads);
  const sortedAccompaniments = sortProductsWithinGroup(accompaniments);
  const sortedBreads = [...sortedEveryday, ...sortedSpecialty];
  const allOrdered = [...sortedBreads, ...sortedAccompaniments];

  return {
    breads: sortedBreads,
    everydayBreads: sortedEveryday,
    specialtyBreads: sortedSpecialty,
    accompaniments: sortedAccompaniments,
    allOrdered,
  };
}
