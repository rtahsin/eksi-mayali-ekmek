import "server-only";
import { getCatalog } from "@/lib/products/server";
import { getStoreSettings } from "@/lib/settings/server";
import type { DraftData } from "./types";

export type { DraftData };

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
