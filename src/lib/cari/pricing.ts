import type { B2BHotSaleItem, B2BHotSalePaymentMethod } from "@/types/admin";

export interface HotSaleCatalogProduct {
  id: string;
  name: string;
  price: number | string | null;
  weight: number | string | null;
  weight_unit: string | null;
  is_active?: boolean | null;
}

export interface HotSalePricingLineInput {
  productId?: string | null;
  customName?: string;
  unitPrice?: number;
  unitPriceOverride?: number;
  quantity: number;
}

export interface LastOrderLine {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export type ResolveHotSaleLinesResult =
  | {
      ok: true;
      deliveredItems: B2BHotSaleItem[];
      returnItems: B2BHotSaleItem[];
      items: B2BHotSaleItem[];
      grossTotal: number;
      returnTotal: number;
      netAmount: number;
      overrideUsed: boolean;
      customItemCount: number;
    }
  | {
      ok: false;
      error: string;
    };

export function roundCariMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function resolveProductUnitLabel(
  prod: Pick<HotSaleCatalogProduct, "weight" | "weight_unit">
): string {
  const weightNum = Number(prod.weight);
  if (
    Number.isFinite(weightNum) &&
    weightNum > 0 &&
    typeof prod.weight_unit === "string" &&
    prod.weight_unit.trim()
  ) {
    return `${weightNum}${prod.weight_unit.trim()}`;
  }
  return "adet";
}

export function mapHotSalePaymentMethodToDb(
  method: B2BHotSalePaymentMethod | undefined
): string | null {
  if (!method) return null;
  if (method === "kredi_karti") return "pos";
  if (method === "havale") return "banka_havale";
  return "nakit";
}

function isCatalogInputLine(
  line: HotSalePricingLineInput
): line is HotSalePricingLineInput & { productId: string } {
  return typeof line.productId === "string" && line.productId.length > 0;
}

export function resolveHotSaleLines(params: {
  items: readonly HotSalePricingLineInput[];
  returnItems: readonly HotSalePricingLineInput[];
  productById: ReadonlyMap<string, HotSaleCatalogProduct>;
  customPrices: Record<string, number>;
  isAdmin: boolean;
}): ResolveHotSaleLinesResult {
  const { items, returnItems, productById, customPrices, isAdmin } = params;

  const catalogProductIds = Array.from(
    new Set([...items, ...returnItems].filter(isCatalogInputLine).map((l) => l.productId))
  );
  const missingProductId = catalogProductIds.find((pid) => !productById.has(pid));
  if (missingProductId) {
    return {
      ok: false,
      error: `Seçilen ürün katalogda bulunamadı (${missingProductId}).`,
    };
  }

  let overrideUsed = false;
  let customItemCount = 0;

  const resolveGroup = (
    lines: readonly HotSalePricingLineInput[],
    isReturn: boolean
  ): { items: B2BHotSaleItem[]; error?: string } => {
    const grouped = new Map<string, B2BHotSaleItem>();

    for (const line of lines) {
      let productId: string | null = null;
      let baseName = "";
      let unitPrice = 0;
      let unit = "adet";

      if (isCatalogInputLine(line)) {
        const prod = productById.get(line.productId)!;
        if (prod.is_active === false) {
          return { items: [], error: `${prod.name} şu anda aktif değil.` };
        }
        productId = prod.id;
        baseName = prod.name;
        unit = resolveProductUnitLabel(prod);

        if (isAdmin && line.unitPriceOverride !== undefined) {
          unitPrice = roundCariMoney(line.unitPriceOverride);
          overrideUsed = true;
        } else if (Object.prototype.hasOwnProperty.call(customPrices, prod.id)) {
          unitPrice = roundCariMoney(customPrices[prod.id]);
        } else {
          const catalog = Number(prod.price);
          if (!Number.isFinite(catalog) || catalog <= 0) {
            return {
              items: [],
              error: `${prod.name} için geçerli ${isReturn ? "iade " : ""}birim fiyat tanımlı değil.`,
            };
          }
          unitPrice = roundCariMoney(catalog);
        }
      } else {
        productId = null;
        baseName = (line.customName ?? "").trim();
        unitPrice = roundCariMoney(line.unitPrice ?? 0);
        unit = "adet";
        customItemCount += 1;
      }

      const key = `${productId ?? `custom:${baseName}`}::${unitPrice}`;
      const existing = grouped.get(key);
      const signedQty = isReturn ? -line.quantity : line.quantity;

      if (existing) {
        existing.quantity += signedQty;
        existing.lineTotal = roundCariMoney(existing.quantity * unitPrice);
      } else {
        grouped.set(key, {
          productId,
          name: isReturn ? `${baseName} (İade)` : baseName,
          productName: baseName,
          quantity: signedQty,
          unitPrice,
          lineTotal: roundCariMoney(signedQty * unitPrice),
          unit,
          isReturn,
        });
      }
    }

    return { items: Array.from(grouped.values()) };
  };

  const deliveredResolved = resolveGroup(items, false);
  if (deliveredResolved.error) {
    return { ok: false, error: deliveredResolved.error };
  }

  const returnResolved = resolveGroup(returnItems, true);
  if (returnResolved.error) {
    return { ok: false, error: returnResolved.error };
  }

  let grossTotal = 0;
  for (const item of deliveredResolved.items) {
    grossTotal = roundCariMoney(grossTotal + item.lineTotal);
  }

  let returnTotal = 0;
  for (const item of returnResolved.items) {
    returnTotal = roundCariMoney(returnTotal + Math.abs(item.lineTotal));
  }

  const netAmount = roundCariMoney(grossTotal - returnTotal);
  if (netAmount <= 0) {
    return {
      ok: false,
      error:
        "İade toplamı teslimat toplamını aşamaz; net satış tutarı 0'dan büyük olmalıdır. Tam iade için cari alacak / storno kullanın.",
    };
  }

  return {
    ok: true,
    deliveredItems: deliveredResolved.items,
    returnItems: returnResolved.items,
    items: [...deliveredResolved.items, ...returnResolved.items],
    grossTotal,
    returnTotal,
    netAmount,
    overrideUsed,
    customItemCount,
  };
}

export function parseLastOrderLedgerItems(raw: unknown): LastOrderLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: LastOrderLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    if (obj.isReturn === true) continue;
    const quantity = Math.trunc(Number(obj.quantity));
    const unitPrice = roundCariMoney(Number(obj.unitPrice ?? obj.unit_price ?? 0));
    const name =
      (typeof obj.productName === "string" && obj.productName.trim()) ||
      (typeof obj.name === "string" && obj.name.trim()) ||
      "";
    const productId =
      typeof obj.productId === "string" && obj.productId.trim()
        ? obj.productId.trim()
        : typeof obj.product_id === "string" && obj.product_id.trim()
          ? obj.product_id.trim()
          : null;
    if (
      !name ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      continue;
    }
    lines.push({ productId, name, quantity, unitPrice });
  }
  return lines;
}
