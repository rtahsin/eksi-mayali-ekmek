import type { Product } from "@/types";

/**
 * Ana sayfa ("Atölye Kremi") için saf yardımcılar: katalogdan bölüm grupları ve
 * ayarlardan okunur teslimat metinleri. Hiçbir ürün bilgisi uydurulmaz; her şey
 * admin'de girilen ürün kurallarından türetilir.
 */

export interface HomeProductGroups<P extends Product = Product> {
  /** Ön siparişle satılan, öne çıkan ekmek (imza). Yoksa null. */
  featured: P | null;
  /** Diğer ekmekler (fırın kapasitesinden düşenler, paket olmayanlar). */
  breads: P[];
  /** Paketler (içinde birden fazla ürün olan). */
  bundles: P[];
  /** Ekmeğin yanına (kapasiteden düşmeyen eşlikçiler: peynir, tereyağı…). */
  extras: P[];
}

/** Ön sipariş kuralı olan ürün mü? (yalnız belirli günlerde satılır ya da günler önceden sipariş ister) */
export function isPreOrder(p: Product): boolean {
  return p.availability === "dates" || (p.leadTimeDays ?? 0) > 0;
}

const isBundle = (p: Product) => (p.bundleItems?.length ?? 0) > 0;
const isBread = (p: Product) => (p.capacityUnits ?? 1) > 0;

export function groupHomeProducts<P extends Product>(products: readonly P[]): HomeProductGroups<P> {
  const bundles = products.filter(isBundle);
  const breadsAll = products.filter((p) => !isBundle(p) && isBread(p));
  const extras = products.filter((p) => !isBundle(p) && !isBread(p));

  // İmza: satışta olan ön siparişli ekmeklerden en yüksek fiyatlısı (fiyat merdiveninin tepesi)
  const featured =
    breadsAll
      .filter((p) => p.isAvailable !== false && isPreOrder(p))
      .reduce<P | null>((best, p) => (best === null || p.price > best.price ? p : best), null);

  return {
    featured,
    breads: featured ? breadsAll.filter((p) => p.id !== featured.id) : breadsAll,
    bundles,
    extras,
  };
}

const WEEKDAY_LONG = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
/** Haftayı pazartesiden başlat */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** `openWeekdays` (0 = Pazar … 6 = Cumartesi) → "Her gün", "Pazar hariç her gün", "Salı, Perşembe ve Cumartesi". */
export function deliveryDaysLabel(openWeekdays: readonly number[]): string {
  const open = new Set(openWeekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  if (open.size === 0) return "Şu an teslimat günü yok";
  if (open.size === 7) return "Her gün";
  if (open.size === 6) {
    const closed = WEEK_ORDER.find((d) => !open.has(d)) as number;
    return `${WEEKDAY_LONG[closed]} hariç her gün`;
  }
  const names = WEEK_ORDER.filter((d) => open.has(d)).map((d) => WEEKDAY_LONG[d]);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} ve ${names[names.length - 1]}`;
}

/** 1250 → "1.250 ₺" */
export function formatTl(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} ₺`;
}

/** "250g", "1kg", "1L" */
export function weightText(p: Pick<Product, "weight" | "weightUnit">): string {
  if (!p.weight) return "";
  const unit = p.weightUnit || "g";
  if (p.weight >= 1000 && (unit === "ml" || unit === "g")) return `${p.weight / 1000}${unit === "ml" ? "L" : "kg"}`;
  return `${p.weight}${unit}`;
}
