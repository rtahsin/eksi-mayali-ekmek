import type { Product } from "@/types";

export interface DraftData {
  breads: Product[];
  extras: Product[];
  freeShippingThreshold: number;
  shippingFee: number;
}

export const tl = (n: number) => `${n.toLocaleString("tr-TR")} ₺`;

export const weightLabel = (p: Product) => (p.weight ? `${p.weight}${p.weightUnit || "g"}` : "");
