import type { DeliveryDateOption } from "@/types/settings";
import { addDays, formatTrDate } from "@/lib/time/istanbul";

/** Satılabilirlik hesabı için ürünün ihtiyaç duyulan alanları. */
export interface AvailabilityProduct {
  id: string;
  name: string;
  isActive: boolean;
  isAvailable: boolean;
  availability: "daily" | "dates";
  /** availability = "dates": satış günü → o günün adet sınırı (null = günlük sınır / sınırsız) */
  saleDates: Map<string, number | null>;
  dailyLimit: number | null;
  leadTimeDays: number;
  capacityUnits: number;
}

export interface AvailabilityUsage {
  /** `${productId}|${date}` → o gün için alınmış (iptal hariç) adet */
  reserved: Map<string, number>;
  /** date → o gün için kullanılmış ekmek kapasitesi birimi */
  capacityUsed: Map<string, number>;
  /** date → o güne özel ekmek kapasitesi */
  capacityOverride: Map<string, number>;
  /** Ayardaki varsayılan günlük ekmek kapasitesi (null = sınırsız) */
  defaultCapacity: number | null;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface DateAvailability {
  date: string;
  label: string;
  available: boolean;
  /** Uygun değilse müşteriye gösterilecek kısa neden */
  reason: string | null;
  /** O gün kalan ekmek kapasitesi (sınır yoksa null) */
  remainingCapacity: number | null;
}

export const reservationKey = (productId: string, date: string) => `${productId}|${date}`;

function aggregate(cart: CartLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of cart) {
    if (line.quantity > 0) out.set(line.productId, (out.get(line.productId) ?? 0) + line.quantity);
  }
  return out;
}

/** Ürünün o gün için limiti: satış gününe özel limit, yoksa günlük limit. */
export function productLimitFor(product: AvailabilityProduct, date: string): number | null {
  if (product.availability === "dates") {
    const dayLimit = product.saleDates.get(date);
    if (dayLimit !== undefined && dayLimit !== null) return dayLimit;
  }
  return product.dailyLimit;
}

export function capacityFor(date: string, usage: AvailabilityUsage): number | null {
  return usage.capacityOverride.get(date) ?? usage.defaultCapacity;
}

function saleDaysText(product: AvailabilityProduct, today: string): string {
  const upcoming = Array.from(product.saleDates.keys())
    .filter((d) => d >= today)
    .sort()
    .slice(0, 3)
    .map((d) => formatTrDate(d));
  return upcoming.length > 0 ? upcoming.join(", ") : "yakında açılacak günlerde";
}

/** Tek bir gün için sepetin uygun olup olmadığını ve nedenini döndürür. */
export function evaluateDate(
  date: string,
  products: Map<string, AvailabilityProduct>,
  cart: CartLine[],
  usage: AvailabilityUsage,
  today: string
): { available: boolean; reason: string | null; remainingCapacity: number | null } {
  const lines = aggregate(cart);
  let units = 0;

  for (const [productId, qty] of lines) {
    const product = products.get(productId);
    if (!product || !product.isActive || !product.isAvailable) {
      return { available: false, reason: `${product?.name ?? "Bir ürün"} şu an satışta değil`, remainingCapacity: null };
    }
    if (product.leadTimeDays > 0 && date < addDays(today, product.leadTimeDays)) {
      return {
        available: false,
        reason: `${product.name} en az ${product.leadTimeDays} gün önceden sipariş edilir`,
        remainingCapacity: null,
      };
    }
    if (product.availability === "dates" && !product.saleDates.has(date)) {
      return {
        available: false,
        reason: `${product.name} sadece şu günlerde: ${saleDaysText(product, today)}`,
        remainingCapacity: null,
      };
    }
    const limit = productLimitFor(product, date);
    if (limit !== null) {
      const left = Math.max(0, limit - (usage.reserved.get(reservationKey(productId, date)) ?? 0));
      if (qty > left) {
        return {
          available: false,
          reason: left === 0 ? `${product.name} o gün tükendi` : `${product.name} için o gün en fazla ${left} adet kaldı`,
          remainingCapacity: null,
        };
      }
    }
    units += qty * product.capacityUnits;
  }

  const cap = capacityFor(date, usage);
  if (cap === null) return { available: true, reason: null, remainingCapacity: null };

  const remaining = Math.max(0, cap - (usage.capacityUsed.get(date) ?? 0));
  if (units > remaining) {
    return {
      available: false,
      reason: remaining === 0 ? "O gün fırın kapasitesi doldu" : `O gün en fazla ${remaining} ekmek daha alabiliyoruz`,
      remainingCapacity: remaining,
    };
  }
  return { available: true, reason: null, remainingCapacity: remaining };
}

/** Seçilebilir her gün için sepetin durumu. Boş sepette tüm günler uygundur. */
export function evaluateCartDates(
  baseDates: DeliveryDateOption[],
  products: Map<string, AvailabilityProduct>,
  cart: CartLine[],
  usage: AvailabilityUsage,
  today: string
): DateAvailability[] {
  return baseDates.map((d) => ({ ...d, ...evaluateDate(d.date, products, cart, usage, today) }));
}

/** Paketleri içindeki ürünlere açar (üretim toplamı için). Paket olmayan ürün kendisi olarak kalır. */
export function expandBundles(
  lines: { productId: string; quantity: number; components?: { productId: string; quantity: number }[] }[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of lines) {
    if (line.components && line.components.length > 0) {
      for (const c of line.components) {
        out.set(c.productId, (out.get(c.productId) ?? 0) + c.quantity * line.quantity);
      }
    } else {
      out.set(line.productId, (out.get(line.productId) ?? 0) + line.quantity);
    }
  }
  return out;
}
