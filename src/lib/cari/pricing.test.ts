import { describe, expect, it } from "vitest";
import {
  mapHotSalePaymentMethodToDb,
  parseLastOrderLedgerItems,
  resolveHotSaleLines,
  resolveProductUnitLabel,
  type HotSaleCatalogProduct,
} from "./pricing";

const PRODUCTS = new Map<string, HotSaleCatalogProduct>([
  [
    "prod_1",
    {
      id: "prod_1",
      name: "Siyez Ekşi Maya",
      price: 120,
      weight: 800,
      weight_unit: "g",
      is_active: true,
    },
  ],
  [
    "prod_2",
    {
      id: "prod_2",
      name: "Köy Bageti",
      price: 60,
      weight: null,
      weight_unit: null,
      is_active: true,
    },
  ],
  [
    "prod_sample",
    {
      id: "prod_sample",
      name: "Tadım Dilim",
      price: 40,
      weight: 200,
      weight_unit: "g",
      is_active: true,
    },
  ],
  [
    "prod_inactive",
    {
      id: "prod_inactive",
      name: "Kaldırılan Ekmek",
      price: 90,
      weight: 500,
      weight_unit: "g",
      is_active: false,
    },
  ],
  [
    "prod_noprice",
    {
      id: "prod_noprice",
      name: "Fiyatsız Ürün",
      price: 0,
      weight: null,
      weight_unit: null,
      is_active: true,
    },
  ],
]);

describe("cari/pricing saf motoru", () => {
  it("birim etiketi ve DB odeme yontemini dogru cozer", () => {
    expect(resolveProductUnitLabel(PRODUCTS.get("prod_1")!)).toBe("800g");
    expect(resolveProductUnitLabel(PRODUCTS.get("prod_2")!)).toBe("adet");
    expect(mapHotSalePaymentMethodToDb("kredi_karti")).toBe("pos");
    expect(mapHotSalePaymentMethodToDb("havale")).toBe("banka_havale");
    expect(mapHotSalePaymentMethodToDb("nakit")).toBe("nakit");
    expect(mapHotSalePaymentMethodToDb(undefined)).toBeNull();
  });

  it("kuryenin unitPriceOverride gonderisini yok sayar ve 0 TL custom_prices numuneyi korur", () => {
    const res = resolveHotSaleLines({
      items: [
        { productId: "prod_1", quantity: 2, unitPriceOverride: 1 },
        { productId: "prod_2", quantity: 1, unitPriceOverride: 2 },
        { productId: "prod_sample", quantity: 3 },
      ],
      returnItems: [{ productId: "prod_2", quantity: 1 }],
      productById: PRODUCTS,
      customPrices: { prod_1: 85, prod_sample: 0 },
      isAdmin: false,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.overrideUsed).toBe(false);
    expect(res.grossTotal).toBe(230); // 2*85 + 1*60 + 3*0
    expect(res.returnTotal).toBe(60);
    expect(res.netAmount).toBe(170);
    expect(res.items.find((i) => i.productId === "prod_sample")?.unitPrice).toBe(0);
  });

  it("admin unitPriceOverride ve serbest ozel kalemleri destekler", () => {
    const res = resolveHotSaleLines({
      items: [
        { productId: "prod_1", quantity: 1, unitPriceOverride: 95 },
        { productId: null, customName: "Özel Galeta", unitPrice: 50, quantity: 2 },
      ],
      returnItems: [],
      productById: PRODUCTS,
      customPrices: { prod_1: 85 },
      isAdmin: true,
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.overrideUsed).toBe(true);
    expect(res.customItemCount).toBe(1);
    expect(res.netAmount).toBe(195);
  });

  it("pasif urun, katalogda olmayan urun ve fiyatsiz urunu reddeder", () => {
    const missing = resolveHotSaleLines({
      items: [{ productId: "prod_x", quantity: 1 }],
      returnItems: [],
      productById: PRODUCTS,
      customPrices: {},
      isAdmin: true,
    });
    expect(missing).toEqual({
      ok: false,
      error: "Seçilen ürün katalogda bulunamadı (prod_x).",
    });

    const inactive = resolveHotSaleLines({
      items: [{ productId: "prod_inactive", quantity: 1 }],
      returnItems: [],
      productById: PRODUCTS,
      customPrices: {},
      isAdmin: true,
    });
    expect(inactive).toEqual({
      ok: false,
      error: "Kaldırılan Ekmek şu anda aktif değil.",
    });

    const noPriceReturn = resolveHotSaleLines({
      items: [{ productId: "prod_2", quantity: 2 }],
      returnItems: [{ productId: "prod_noprice", quantity: 1 }],
      productById: PRODUCTS,
      customPrices: {},
      isAdmin: false,
    });
    expect(noPriceReturn).toEqual({
      ok: false,
      error: "Fiyatsız Ürün için geçerli iade birim fiyat tanımlı değil.",
    });
  });

  it("iade toplami teslimat toplamini asar veya esitlerse netAmount <= 0 hatasi verir", () => {
    const res = resolveHotSaleLines({
      items: [{ productId: "prod_2", quantity: 1 }],
      returnItems: [{ productId: "prod_1", quantity: 1 }],
      productById: PRODUCTS,
      customPrices: { prod_1: 85 },
      isAdmin: true,
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("net satış tutarı 0'dan büyük olmalıdır");
  });

  it("parseLastOrderLedgerItems iade satirlarini disarida birakir ve alanlari normalize eder", () => {
    const parsed = parseLastOrderLedgerItems([
      { product_id: "p1", productName: "Köy Ekmeği", quantity: 4, unit_price: "95.5", isReturn: false },
      { productId: "p2", name: "Bayat İade", quantity: 2, unitPrice: 90, isReturn: true },
      { name: "Geçersiz", quantity: 0, unitPrice: 10 },
    ]);

    expect(parsed).toEqual([
      { productId: "p1", name: "Köy Ekmeği", quantity: 4, unitPrice: 95.5 },
    ]);
  });
});
