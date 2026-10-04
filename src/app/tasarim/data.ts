import { getCatalog } from "@/lib/products/server";
import { getStoreSettings } from "@/lib/settings/server";
import type { Product } from "@/types";

/** Tasarım taslakları gerçek katalogla çizilir (Faz 4: yön seçimi). */
export interface DraftData {
  breads: Product[];
  extras: Product[];
  freeShippingThreshold: number;
  shippingFee: number;
}

export async function loadDraftData(): Promise<DraftData> {
  const [{ products }, settings] = await Promise.all([getCatalog(), getStoreSettings()]);
  const visible = products.filter((p) => p.isAvailable !== false);
  return {
    breads: visible.filter((p) => (p.capacityUnits ?? 1) > 0),
    extras: visible.filter((p) => (p.capacityUnits ?? 1) === 0),
    freeShippingThreshold: settings.freeShippingThreshold,
    shippingFee: settings.shippingFee,
  };
}

export const tl = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;

export const weightLabel = (p: Product) => (p.weight ? `${p.weight}${p.weightUnit || "g"}` : "");
