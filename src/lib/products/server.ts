import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtendedProduct, ProductCategoryInfo, ProductSaleDate } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { istanbulToday } from "@/lib/time/istanbul";
import { mapCategoryRow, mapProductRow, type CategoryRow, type ProductRow } from "./map";
import type { AvailabilityProduct, AvailabilityUsage } from "@/lib/ordering/availability";
import { reservationKey } from "@/lib/ordering/availability";

export interface Catalog {
  products: ExtendedProduct[];
  categories: ProductCategoryInfo[];
}

interface SaleDateRow {
  product_id: string;
  sale_date: string;
  quantity_limit: number | null;
}

async function loadSaleDates(supabase: SupabaseClient, productIds: string[], from: string): Promise<Map<string, ProductSaleDate[]>> {
  const out = new Map<string, ProductSaleDate[]>();
  if (productIds.length === 0) return out;
  const { data, error } = await supabase
    .from("product_sale_dates")
    .select("product_id, sale_date, quantity_limit")
    .in("product_id", productIds)
    .gte("sale_date", from)
    .order("sale_date");
  if (error) {
    console.warn("product_sale_dates read:", error.message);
    return out;
  }
  for (const row of (data ?? []) as SaleDateRow[]) {
    const list = out.get(row.product_id) ?? [];
    list.push({ date: row.sale_date, limit: row.quantity_limit });
    out.set(row.product_id, list);
  }
  return out;
}

/**
 * Katalog (service-role). Vitrin: yalnız aktif ürünler ve görünür kategoriler.
 * Admin: `includeInactive` ile arşivlenmişler ve gizli kategoriler dahil.
 * Veritabanına ulaşılamazsa boş katalog döner (eski fiyatlı statik yedek GÖSTERİLMEZ).
 */
export async function getCatalog(options: { includeInactive?: boolean; client?: SupabaseClient | null } = {}): Promise<Catalog> {
  const supabase = options.client ?? createAdminClient();
  if (!supabase) return { products: [], categories: [] };

  let productQuery = supabase.from("products").select("*").order("display_order", { ascending: true }).order("name");
  if (!options.includeInactive) productQuery = productQuery.eq("is_active", true);

  let categoryQuery = supabase.from("categories").select("*").order("display_order", { ascending: true });
  if (!options.includeInactive) categoryQuery = categoryQuery.neq("is_visible", false);

  const [{ data: productRows, error: productErr }, { data: categoryRows, error: categoryErr }] = await Promise.all([
    productQuery,
    categoryQuery,
  ]);

  if (productErr) {
    console.error("getCatalog products:", productErr.message);
    return { products: [], categories: [] };
  }
  if (categoryErr) console.warn("getCatalog categories:", categoryErr.message);

  const rows = (productRows ?? []) as ProductRow[];
  const datesProductIds = rows.filter((r) => r.availability === "dates").map((r) => r.id);
  const saleDates = await loadSaleDates(supabase, datesProductIds, istanbulToday());

  return {
    products: rows.map((r) => mapProductRow(r, saleDates.get(r.id) ?? [])),
    categories: ((categoryRows ?? []) as CategoryRow[]).map(mapCategoryRow),
  };
}

export async function getProductBySlugOrId(slugOrId: string): Promise<ExtendedProduct | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const key = slugOrId.trim().slice(0, 120);
  const bySlug = await supabase.from("products").select("*").eq("is_active", true).eq("slug", key).limit(1).maybeSingle();
  const data =
    bySlug.data ??
    (await supabase.from("products").select("*").eq("is_active", true).eq("id", key).limit(1).maybeSingle()).data;
  if (!data) return null;
  const row = data as ProductRow;
  const saleDates = row.availability === "dates" ? await loadSaleDates(supabase, [row.id], istanbulToday()) : new Map();
  return mapProductRow(row, saleDates.get(row.id) ?? []);
}

interface UsageItemRow {
  product_id: string | null;
  quantity: number | null;
  capacity_units: number | null;
  orders: { delivery_date: string; status: string } | { delivery_date: string; status: string }[] | null;
}

/**
 * Bir tarih aralığı için sepet ürünlerinin kuralları ve o günlerin doluluğu.
 * Fırın kapasitesi tüm ürünlerden etkilendiği için kullanılan kapasite aralıktaki TÜM kalemlerden hesaplanır.
 */
export async function loadAvailabilityContext(
  supabase: SupabaseClient,
  productIds: string[],
  from: string,
  to: string,
  defaultCapacity: number | null
): Promise<{ products: Map<string, AvailabilityProduct>; usage: AvailabilityUsage }> {
  const ids = Array.from(new Set(productIds));
  const usage: AvailabilityUsage = {
    reserved: new Map(),
    capacityUsed: new Map(),
    capacityOverride: new Map(),
    defaultCapacity,
  };

  const [productsRes, itemsRes, overridesRes] = await Promise.all([
    ids.length
      ? supabase
          .from("products")
          .select("id, name, is_active, is_available, availability, daily_limit, lead_time_days, capacity_units")
          .in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("order_items")
      .select("product_id, quantity, capacity_units, orders!inner(delivery_date, status)")
      .gte("orders.delivery_date", from)
      .lte("orders.delivery_date", to)
      .neq("orders.status", "iptal"),
    supabase.from("capacity_days").select("day, bread_capacity").gte("day", from).lte("day", to),
  ]);

  if (productsRes.error) throw new Error(`products: ${productsRes.error.message}`);
  if (itemsRes.error) throw new Error(`order_items: ${itemsRes.error.message}`);

  const productRows = (productsRes.data ?? []) as {
    id: string;
    name: string;
    is_active: boolean | null;
    is_available: boolean | null;
    availability: string | null;
    daily_limit: number | null;
    lead_time_days: number | null;
    capacity_units: number | null;
  }[];

  const saleDates = await loadSaleDates(
    supabase,
    productRows.filter((p) => p.availability === "dates").map((p) => p.id),
    from
  );

  const products = new Map<string, AvailabilityProduct>();
  for (const p of productRows) {
    products.set(p.id, {
      id: p.id,
      name: p.name,
      isActive: p.is_active !== false,
      isAvailable: p.is_available !== false,
      availability: p.availability === "dates" ? "dates" : "daily",
      saleDates: new Map((saleDates.get(p.id) ?? []).map((d) => [d.date, d.limit])),
      dailyLimit: p.daily_limit ?? null,
      leadTimeDays: Number(p.lead_time_days) || 0,
      capacityUnits: p.capacity_units ?? 1,
    });
  }

  // Eski kalemlerde capacity_units yoksa ürünün güncel değeri (bilinmiyorsa 1) kullanılır
  const itemRows = (itemsRes.data ?? []) as UsageItemRow[];
  const missingUnitIds = Array.from(
    new Set(itemRows.filter((r) => r.capacity_units === null && r.product_id && !products.has(r.product_id)).map((r) => r.product_id as string))
  );
  const unitLookup = new Map<string, number>(Array.from(products.values()).map((p) => [p.id, p.capacityUnits]));
  if (missingUnitIds.length) {
    const { data } = await supabase.from("products").select("id, capacity_units").in("id", missingUnitIds);
    for (const r of (data ?? []) as { id: string; capacity_units: number | null }[]) unitLookup.set(r.id, r.capacity_units ?? 1);
  }

  for (const row of itemRows) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    if (!order || !row.product_id) continue;
    const qty = Number(row.quantity) || 0;
    const date = order.delivery_date;
    const key = reservationKey(row.product_id, date);
    usage.reserved.set(key, (usage.reserved.get(key) ?? 0) + qty);
    const units = row.capacity_units ?? unitLookup.get(row.product_id) ?? 1;
    usage.capacityUsed.set(date, (usage.capacityUsed.get(date) ?? 0) + qty * units);
  }

  if (!overridesRes.error) {
    for (const r of (overridesRes.data ?? []) as { day: string; bread_capacity: number }[]) {
      usage.capacityOverride.set(r.day, r.bread_capacity);
    }
  }

  return { products, usage };
}
