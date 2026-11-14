import { describe, expect, it } from "vitest";
import type { ExtendedProduct } from "@/types";
import { describePairingChemistry, getSmartPairings } from "./pairingChemistry";
import { isAccompaniment } from "./grouping";
import { findHealthTerms, hasBenefitVerb } from "@/lib/knowledge/lint";

function makeProduct(overrides: Partial<ExtendedProduct> & { id: string; name: string }): ExtendedProduct {
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.slug ?? overrides.id,
    description: overrides.description ?? "",
    price: overrides.price ?? 150,
    imageUrl: overrides.imageUrl ?? "/images/placeholders/bread.svg",
    category: overrides.category ?? "bread",
    stock: 10,
    weight: overrides.weight ?? 1000,
    weightUnit: overrides.weightUnit ?? "g",
    isAvailable: overrides.isAvailable ?? true,
    isActive: overrides.isActive ?? true,
    capacityUnits: overrides.capacityUnits ?? 1,
    flourTypes: overrides.flourTypes ?? [],
    ingredients: overrides.ingredients ?? [],
    crossSell: overrides.crossSell ?? [],
    displayOrder: overrides.displayOrder ?? 0,
  };
}

const SAMPLE_CATALOG: ExtendedProduct[] = [
  makeProduct({
    id: "koy-ekmegi",
    name: "Taş Fırın Köy Ekmeği",
    category: "bread",
    flourTypes: ["Taş Değirmen Tam Buğday", "Beyaz Un"],
  }),
  makeProduct({
    id: "siyez-ekmegi",
    name: "%50 Siyez Ekmeği",
    category: "bread",
    flourTypes: ["Siyez Unu", "Tam Buğday"],
  }),
  makeProduct({
    id: "cavdar-gece",
    name: "Gece Yarısı Mavi Haşhaşlı Çavdar",
    category: "specialty",
    flourTypes: ["%100 Çavdar"],
  }),
  makeProduct({
    id: "yudane-tost",
    name: "Yudane Tost Ekmeği",
    category: "bread",
  }),
  makeProduct({
    id: "jersey-sut",
    name: "Günlük Jersey Çiğ Sütü",
    category: "sut",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "ev-yogurdu",
    name: "Doğal Ev Yoğurdu",
    category: "yogurt",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "yayik-tereyag",
    name: "Yayık Tereyağı",
    category: "tereyag",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "ezine-peynir",
    name: "Olgun Ezine Peyniri",
    category: "peynir",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "fermente-sucuk",
    name: "Katkısız Fermente Sucuk",
    category: "sucuk",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "gezen-yumurta",
    name: "Gezen Tavuk Yumurtası",
    category: "yumurta",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "dana-kavurma",
    name: "Odun Ateşinde Dana Kavurma",
    category: "kavurma",
    capacityUnits: 0,
  }),
  makeProduct({
    id: "gemlik-zeytin",
    name: "Sele Zeytin",
    category: "zeytin",
    capacityUnits: 0,
  }),
];

describe("pairingChemistry — Ekmek × Eşlikçi Akıllı Eşleşme ve K006 Denetimi", () => {
  it("bir ekmek ürünü için önce aktif eşlikçileri seçer, eşlikçi azsa diğer ekmeklerle tamamlar", () => {
    const bread = SAMPLE_CATALOG[0]; // Köy ekmeği
    const pairings = getSmartPairings(bread, SAMPLE_CATALOG, 4);

    expect(pairings).toHaveLength(4);
    for (const item of pairings) {
      expect(isAccompaniment(item.product)).toBe(true);
      expect(item.isCrossCategory).toBe(true);
      expect(item.chemistryLabel.length).toBeGreaterThan(5);
      expect(item.chemistryNote.length).toBeGreaterThan(20);
    }

    // Yalnızca 2 eşlikçi olan dar katalogda kalan 2 yeri diğer ekmeklerle doldurur
    const smallCatalog = [
      SAMPLE_CATALOG[0], // Köy
      SAMPLE_CATALOG[1], // Siyez
      SAMPLE_CATALOG[2], // Çavdar
      SAMPLE_CATALOG[4], // Süt
      SAMPLE_CATALOG[8], // Sucuk
    ];
    const fallbackPairings = getSmartPairings(bread, smallCatalog, 4);
    expect(fallbackPairings).toHaveLength(4);
    expect(isAccompaniment(fallbackPairings[0].product)).toBe(true);
    expect(isAccompaniment(fallbackPairings[1].product)).toBe(true);
    expect(isAccompaniment(fallbackPairings[2].product)).toBe(false);
    expect(isAccompaniment(fallbackPairings[3].product)).toBe(false);
  });

  it("bir eşlikçi ürünü için önce aktif taş fırın ekmeklerini seçer", () => {
    const sucuk = SAMPLE_CATALOG.find((p) => p.id === "fermente-sucuk")!;
    const pairings = getSmartPairings(sucuk, SAMPLE_CATALOG, 4);

    expect(pairings).toHaveLength(4);
    for (const item of pairings) {
      expect(isAccompaniment(item.product)).toBe(false);
      expect(item.isCrossCategory).toBe(true);
    }
  });

  it("çavdar somununda tereyağı, kavurma ve peynir gibi yüksek lipit/umami eşlikçilerini öne alır", () => {
    const rye = SAMPLE_CATALOG.find((p) => p.id === "cavdar-gece")!;
    const pairings = getSmartPairings(rye, SAMPLE_CATALOG, 3);
    const ids = pairings.map((p) => p.product.id);

    expect(ids).toContain("yayik-tereyag");
    expect(ids).toContain("dana-kavurma");
  });

  it("K006 sıfır sağlık beyanı: tüm ürün çiftlerinin kimya notlarında HEALTH_TERMS ve BENEFIT_VERBS sıfırdır", () => {
    for (const source of SAMPLE_CATALOG) {
      for (const target of SAMPLE_CATALOG) {
        if (source.id === target.id) continue;
        const chem = describePairingChemistry(source, target);
        const combined = `${chem.label} ${chem.note}`;

        expect(
          findHealthTerms(combined),
          `${source.id} -> ${target.id} içinde sağlık terimi bulundu: "${combined}"`
        ).toEqual([]);
        expect(
          hasBenefitVerb(combined),
          `${source.id} -> ${target.id} içinde fayda fiili bulundu: "${combined}"`
        ).toBe(false);
      }
    }
  });
});
