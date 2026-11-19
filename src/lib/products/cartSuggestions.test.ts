import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { getCartSuggestions } from "./cartSuggestions";

function makeProduct(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    description: "",
    price: 120,
    imageUrl: "/images/test.jpg",
    category: "bread",
    stock: 10,
    weight: 800,
    weightUnit: "g",
    isActive: true,
    isAvailable: true,
    availability: "daily",
    ...overrides,
  };
}

describe("getCartSuggestions", () => {
  const koyEkmegi = makeProduct({
    id: "koy",
    name: "Köy Ekmeği",
    category: "bread",
    crossSell: ["tereyag", "ezine"],
  });

  const siyezEkmegi = makeProduct({
    id: "siyez",
    name: "Siyez Ekmeği",
    category: "bread",
    displayOrder: 2,
  });

  const cumaOzelEkmek = makeProduct({
    id: "cuma-ozel",
    name: "Cuma Özel Çavdar",
    category: "specialty",
    availability: "daily",
    saleWeekdays: [5], // Yalnız Cuma
  });

  const tarihliEkmek = makeProduct({
    id: "tarihli",
    name: "Planlı Fırın Ekmeği",
    category: "specialty",
    availability: "dates",
    saleDates: [
      { date: "2026-10-09", limit: 5 }, // Cuma
      { date: "2026-10-10", limit: 0 }, // Limit 0 = kapalı
    ],
  });

  const tereyag = makeProduct({
    id: "tereyag",
    name: "Yayık Tereyağı",
    category: "tereyag",
    weight: 250,
    price: 180,
  });

  const ezine = makeProduct({
    id: "ezine",
    name: "Ezine Peyniri",
    category: "peynir",
    weight: 300,
    price: 210,
  });

  const sut = makeProduct({
    id: "sut",
    name: "Jersey Çiftlik Sütü",
    category: "sut",
    weight: 1000,
    weightUnit: "ml",
    price: 95,
  });

  const sucuk = makeProduct({
    id: "sucuk",
    name: "Fermente Sucuk",
    category: "sucuk",
    weight: 300,
    price: 320,
  });

  const pasifUrun = makeProduct({
    id: "pasif",
    name: "Pasif Zeytin",
    category: "zeytin",
    isActive: false,
  });

  const tukenmisUrun = makeProduct({
    id: "tukendi",
    name: "Tükenen Bal",
    category: "pantry",
    isAvailable: false,
  });

  const catalog = [
    koyEkmegi,
    siyezEkmegi,
    cumaOzelEkmek,
    tarihliEkmek,
    tereyag,
    ezine,
    sut,
    sucuk,
    pasifUrun,
    tukenmisUrun,
  ];

  it("prioritizes explicit crossSell IDs from cart items first", () => {
    const result = getCartSuggestions(
      [{ productId: "koy" }],
      catalog,
      "2026-10-06", // Salı
      3
    );

    expect(result.slice(0, 2).map((p) => p.id)).toEqual(["tereyag", "ezine"]);
    expect(result).toHaveLength(3);
  });

  it("falls back to smart pairings: accompaniments for bread, daily breads for accompaniment-only cart", () => {
    // Ekmek sepetteyken (crossSell boş) eşlikçileri öne çıkarır
    const forBread = getCartSuggestions(
      [{ productId: "siyez" }],
      catalog,
      "2026-10-06",
      3
    );
    expect(forBread).toHaveLength(3);
    expect(forBread.every((p) => ["tereyag", "ezine", "sut", "sucuk"].includes(p.id))).toBe(true);

    // Yalnız eşlikçi sepetteyken günlük ekmekleri öne çıkarır (Cuma olsa bile günlük ekmekler özel ekmekten önce gelir)
    const forAccompaniment = getCartSuggestions(
      [{ productId: "sut" }],
      catalog,
      "2026-10-09", // Cuma: cuma-ozel ve tarihli de uygun
      3
    );
    expect(forAccompaniment.slice(0, 2).map((p) => p.id)).toEqual(["koy", "siyez"]);
  });

  it("excludes items already in cart even if listed in crossSell", () => {
    const result = getCartSuggestions(
      [{ productId: "koy" }, { productId: "tereyag" }],
      catalog,
      "2026-10-06",
      3
    );

    const ids = result.map((p) => p.id);
    expect(ids).not.toContain("koy");
    expect(ids).not.toContain("tereyag");
    expect(ids[0]).toBe("ezine");
  });

  it("excludes inactive and out-of-stock products even when referenced by crossSell", () => {
    const breadWithBadCrossSell = makeProduct({
      id: "test-ekmek",
      name: "Test Ekmeği",
      crossSell: ["pasif", "tukendi", "sut"],
    });

    const result = getCartSuggestions(
      [{ productId: "test-ekmek" }],
      [breadWithBadCrossSell, pasifUrun, tukenmisUrun, sut],
      "2026-10-06",
      3
    );

    expect(result.map((p) => p.id)).toEqual(["sut"]);
  });

  it("filters out date-incompatible products to prevent delivery date jumps", () => {
    const breadCrossSellingSpecialty = makeProduct({
      id: "cross-ekmek",
      name: "Klasik Ekmek",
      crossSell: ["cuma-ozel", "tarihli", "tereyag"],
    });
    const pool = [breadCrossSellingSpecialty, cumaOzelEkmek, tarihliEkmek, tereyag];

    // Salı (2026-10-06): cuma-ozel ve tarihli elenmeli
    const onTuesday = getCartSuggestions(
      [{ productId: "cross-ekmek" }],
      pool,
      "2026-10-06",
      3
    );
    expect(onTuesday.map((p) => p.id)).toEqual(["tereyag"]);

    // Cuma (2026-10-09): cuma-ozel ve tarihli (limit: 5) ikisi de uygun
    const onFriday = getCartSuggestions(
      [{ productId: "cross-ekmek" }],
      pool,
      "2026-10-09",
      3
    );
    expect(onFriday.map((p) => p.id)).toEqual(["cuma-ozel", "tarihli", "tereyag"]);

    // Cumartesi (2026-10-10): tarihli'nin limit'i 0 olduğu için elenmeli
    const onSaturday = getCartSuggestions(
      [{ productId: "cross-ekmek" }],
      pool,
      "2026-10-10",
      3
    );
    expect(onSaturday.map((p) => p.id)).toEqual(["tereyag"]);
  });

  it("excludes products blocked by leadTimeDays, dailyLimit=0, or missing deliveryDate", () => {
    const onSiparisYogurt = makeProduct({
      id: "yogurt-on-siparis",
      name: "Sipariş Üzerine Yoğurt",
      category: "yogurt",
      availability: "daily",
      leadTimeDays: 2,
    });
    const limitSifirPeynir = makeProduct({
      id: "limit-sifir",
      name: "Limit Sıfır Peynir",
      category: "peynir",
      availability: "daily",
      dailyLimit: 0,
    });
    const tarihliLimitNull = makeProduct({
      id: "tarihli-limit-null",
      name: "Tarihli Limit Sıfır",
      category: "specialty",
      availability: "dates",
      dailyLimit: 0,
      saleDates: [{ date: "2026-10-08", limit: null }],
    });
    const anchor = makeProduct({
      id: "anchor",
      name: "Köy Ekmeği",
      crossSell: ["yogurt-on-siparis", "limit-sifir", "tarihli-limit-null", "tereyag"],
    });
    const pool = [anchor, onSiparisYogurt, limitSifirPeynir, tarihliLimitNull, tereyag];

    // Boş tarih -> öneri üretilmez
    expect(getCartSuggestions([{ productId: "anchor" }], pool, "", 3, "2026-10-06")).toEqual([]);

    // Bugün 2026-10-06 iken yarın (2026-10-07) için leadTimeDays=2 olan ürün ve dailyLimit=0 elenmeli
    expect(
      getCartSuggestions([{ productId: "anchor" }], pool, "2026-10-07", 3, "2026-10-06").map(
        (p) => p.id
      )
    ).toEqual(["tereyag"]);

    // 2 gün sonrası (2026-10-08) için leadTimeDays=2 uygun, ancak dailyLimit=0 hâlâ elenmeli
    expect(
      getCartSuggestions([{ productId: "anchor" }], pool, "2026-10-08", 3, "2026-10-06").map(
        (p) => p.id
      )
    ).toEqual(["yogurt-on-siparis", "tereyag"]);
  });

  it("returns empty list for empty cart or non-positive limit", () => {
    expect(getCartSuggestions([], catalog, "2026-10-06", 3, "2026-10-06")).toEqual([]);
    expect(getCartSuggestions([{ productId: "koy" }], catalog, "2026-10-06", 0, "2026-10-06")).toEqual([]);
  });
});
