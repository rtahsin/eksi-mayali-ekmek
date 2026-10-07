import { describe, it, expect } from "vitest";
import { groupCatalog, isAccompaniment, isSpecialtyBread, getProductGroup } from "./grouping";
import type { ExtendedProduct } from "@/types";

function mockProduct(partial: Partial<ExtendedProduct>): ExtendedProduct {
  return {
    id: "p-" + Math.random().toString(36).slice(2, 7),
    name: "Ürün",
    description: "Özel taş fırın ekşi mayalı",
    price: 100,
    imageUrl: "/images/bread.jpg",
    category: "bread",
    stock: 10,
    weight: 500,
    ...partial,
  };
}


describe("groupCatalog pure function (I-01)", () => {
  it("correctly identifies product groups", () => {
    const everyday = mockProduct({ name: "Köy Ekmeği", category: "bread", orderThreshold: null });
    const specialty = mockProduct({ name: "Gece Yarısı", category: "bread", orderThreshold: 10 });
    const pantry = mockProduct({ name: "Doğal Bal", category: "pantry" });
    const gurme = mockProduct({ name: "Tulum Peyniri", category: "gurme" });

    expect(getProductGroup(everyday)).toBe("her_gun");
    expect(getProductGroup(specialty)).toBe("ozel");
    expect(getProductGroup(pantry)).toBe("eslikci");
    expect(getProductGroup(gurme)).toBe("eslikci");
  });

  it("sorts everyday bread first, specialty bread second, accompaniments last", () => {
    const p1Pantry = mockProduct({ id: "1", name: "Karakovan Balı", category: "pantry" });
    const p2Specialty = mockProduct({ id: "2", name: "Siyez Cevizli (Özel)", category: "bread", orderThreshold: 10 });
    const p3Everyday = mockProduct({ id: "3", name: "Klasik Köy Ekmeği", category: "bread", orderThreshold: null });

    const grouped = groupCatalog([p1Pantry, p2Specialty, p3Everyday]);

    expect(grouped.allOrdered.map((p) => p.id)).toEqual(["3", "2", "1"]);
    expect(grouped.breads.map((p) => p.id)).toEqual(["3", "2"]);
    expect(grouped.everydayBreads.map((p) => p.id)).toEqual(["3"]);
    expect(grouped.specialtyBreads.map((p) => p.id)).toEqual(["2"]);
    expect(grouped.accompaniments.map((p) => p.id)).toEqual(["1"]);
  });

  it("preserves display_order within each group", () => {
    const breadA = mockProduct({ id: "b1", name: "Ekmek A", category: "bread", displayOrder: 20 });
    const breadB = mockProduct({ id: "b2", name: "Ekmek B", category: "bread", displayOrder: 10 });
    const breadC = mockProduct({ id: "b3", name: "Ekmek C", category: "bread", displayOrder: 30 });

    const grouped = groupCatalog([breadA, breadB, breadC]);

    expect(grouped.everydayBreads.map((p) => p.id)).toEqual(["b2", "b1", "b3"]);
  });

  it("falls back to Turkish alphabetical name sort when displayOrder is equal", () => {
    const pÇ = mockProduct({ id: "1", name: "Çavdar Ekmeği", category: "bread", displayOrder: 1 });
    const pA = mockProduct({ id: "2", name: "Ayçekirdekli Ekmek", category: "bread", displayOrder: 1 });
    const pD = mockProduct({ id: "3", name: "Dinkel Ekmeği", category: "bread", displayOrder: 1 });

    const grouped = groupCatalog([pÇ, pA, pD]);

    expect(grouped.everydayBreads.map((p) => p.name)).toEqual([
      "Ayçekirdekli Ekmek",
      "Çavdar Ekmeği",
      "Dinkel Ekmeği",
    ]);
  });
});
