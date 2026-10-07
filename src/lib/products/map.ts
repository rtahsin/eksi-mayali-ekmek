import type { BundleItem, ExtendedProduct, MasterclassDetail, ProductCategoryInfo, ProductSaleDate } from "@/types";
import { slugify } from "@/lib/utils/slugify";

/** `products` tablosunun okunan sütunları. */
export interface ProductRow {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number | string;
  compare_at_price?: number | string | null;
  image_url: string | null;
  category: string | null;
  weight: number | null;
  weight_unit: string | null;
  made_to_order: boolean | null;
  is_popular: boolean | null;
  is_new: boolean | null;
  is_available: boolean | null;
  is_active: boolean | null;
  ingredients: unknown;
  flour_types: unknown;
  hydration: number | null;
  atelier_placement: unknown;
  masterclass: unknown;
  display_order: number | null;
  availability?: string | null;
  daily_limit?: number | null;
  lead_time_days?: number | null;
  capacity_units?: number | null;
  bundle_items?: unknown;
  cross_sell?: string[] | null;
  order_threshold?: number | null;
  sale_weekdays?: number[] | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  is_visible?: boolean | null;
}

/** Ürün görseli yoksa gösterilen yer tutucu (yerel dosya; harici alan adına bağımlılık yok). */
export const PRODUCT_IMAGE_PLACEHOLDER = "/images/categories/bread.jpg";

const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function parseBundleItems(v: unknown): BundleItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x !== "object" || x === null) return null;
      const r = x as Record<string, unknown>;
      const productId = typeof r.product_id === "string" ? r.product_id : typeof r.productId === "string" ? r.productId : null;
      const quantity = Number(r.quantity);
      return productId && Number.isInteger(quantity) && quantity > 0 ? { productId, quantity } : null;
    })
    .filter((x): x is BundleItem => x !== null);
}

function isMasterclass(v: unknown): v is MasterclassDetail {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mapProductRow(row: ProductRow, saleDates: ProductSaleDate[] = []): ExtendedProduct {
  const compareAt = toNumberOrNull(row.compare_at_price);
  const price = Number(row.price) || 0;
  return {
    id: row.id,
    slug: row.slug || slugify(row.name) || row.id,
    name: row.name,
    description: row.description || "",
    price,
    compareAtPrice: compareAt !== null && compareAt > price ? compareAt : null,
    imageUrl: row.image_url || PRODUCT_IMAGE_PLACEHOLDER,
    category: row.category || "bread",
    stock: 0,
    weight: Number(row.weight) || 0,
    weightUnit: row.weight_unit || "g",
    madeToOrder: Boolean(row.made_to_order),
    isPopular: Boolean(row.is_popular),
    isNew: Boolean(row.is_new),
    isAvailable: row.is_available !== false,
    isActive: row.is_active !== false,
    ingredients: toStringArray(row.ingredients),
    flourTypes: toStringArray(row.flour_types),
    hydration: row.hydration ? Number(row.hydration) : undefined,
    masterclass: isMasterclass(row.masterclass) ? row.masterclass : undefined,
    availability: row.availability === "dates" ? "dates" : "daily",
    saleDates,
    dailyLimit: toNumberOrNull(row.daily_limit),
    leadTimeDays: Number(row.lead_time_days) || 0,
    capacityUnits: row.capacity_units === null || row.capacity_units === undefined ? 1 : Number(row.capacity_units),
    bundleItems: parseBundleItems(row.bundle_items),
    crossSell: Array.isArray(row.cross_sell) ? row.cross_sell : [],
    displayOrder: Number(row.display_order) || 0,
    orderThreshold: toNumberOrNull(row.order_threshold),
    saleWeekdays: Array.isArray(row.sale_weekdays) ? row.sale_weekdays.map(Number) : null,
  };
}

export function mapCategoryRow(row: CategoryRow): ProductCategoryInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    displayOrder: Number(row.display_order) || 0,
    isVisible: row.is_visible !== false,
  };
}
