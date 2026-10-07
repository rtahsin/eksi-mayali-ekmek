import type { Product } from "@/types";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import { getSaleScheduleBadge } from "@/lib/ordering/saleDates";

export interface ProductBadge {
  label: string;
  tone: "accent" | "gold" | "danger";
}

/** Ürün kartı / detay rozetleri — admin'deki kurallardan türetilir (en fazla 2). */
export function productBadges(product: Product, today: string = istanbulToday()): ProductBadge[] {
  const out: ProductBadge[] = [];
  if (product.isAvailable === false) {
    out.push({ label: "Tükendi", tone: "danger" });
    return out;
  }
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    const pct = Math.round((1 - product.price / product.compareAtPrice) * 100);
    out.push({ label: pct >= 5 ? `Kampanya %${pct}` : "Kampanya", tone: "gold" });
  }
  if (product.bundleItems && product.bundleItems.length > 0) out.push({ label: "Paket", tone: "accent" });
  if (product.saleWeekdays && product.saleWeekdays.length > 0) {
    const scheduleLabel = getSaleScheduleBadge(product, today);
    if (scheduleLabel) out.push({ label: scheduleLabel, tone: "accent" });
  } else if (product.availability === "dates") {
    const next = (product.saleDates ?? []).map((d) => d.date).filter((d) => d >= today).sort()[0];
    out.push({ label: next ? `Sadece ${formatTrDate(next)}` : "Yakında", tone: "accent" });
  } else if ((product.leadTimeDays ?? 0) > 0) {
    out.push({ label: `${product.leadTimeDays} gün önceden`, tone: "accent" });
  } else if (product.madeToOrder) {
    out.push({ label: "Ön Sipariş", tone: "accent" });
  }
  return out.slice(0, 2);
}
