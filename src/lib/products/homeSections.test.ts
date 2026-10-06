import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { deliveryDaysLabel, formatTl, groupHomeProducts, isPreOrder, weightText } from "./homeSections";

function product(id: string, over: Partial<Product> = {}): Product {
  return {
    id,
    name: id,
    description: "",
    price: 100,
    imageUrl: "",
    category: "ekmek",
    stock: 0,
    weight: 1000,
    ...over,
  };
}

describe("groupHomeProducts", () => {
  it("ekmek, paket ve eşlikçileri ayırır", () => {
    const g = groupHomeProducts([
      product("koy"),
      product("peynir", { capacityUnits: 0 }),
      product("paket", { capacityUnits: 2, bundleItems: [{ productId: "koy", quantity: 2 }] }),
    ]);
    expect(g.breads.map((p) => p.id)).toEqual(["koy"]);
    expect(g.extras.map((p) => p.id)).toEqual(["peynir"]);
    expect(g.bundles.map((p) => p.id)).toEqual(["paket"]);
    expect(g.featured).toBeNull();
  });

  it("ön siparişli ekmeklerden en pahalısını öne çıkarır ve listeden çıkarır", () => {
    const g = groupHomeProducts([
      product("koy", { price: 150 }),
      product("siyez", { price: 190, leadTimeDays: 1 }),
      product("cavdar", { price: 250, availability: "dates" }),
    ]);
    expect(g.featured?.id).toBe("cavdar");
    expect(g.breads.map((p) => p.id)).toEqual(["koy", "siyez"]);
  });

  it("tükenmiş ürünü öne çıkarmaz", () => {
    const g = groupHomeProducts([product("cavdar", { price: 250, leadTimeDays: 2, isAvailable: false })]);
    expect(g.featured).toBeNull();
    expect(g.breads).toHaveLength(1);
  });

  it("isPreOrder yalnız gün kuralına bakar", () => {
    expect(isPreOrder(product("a"))).toBe(false);
    expect(isPreOrder(product("b", { leadTimeDays: 1 }))).toBe(true);
    expect(isPreOrder(product("c", { availability: "dates" }))).toBe(true);
  });
});

describe("deliveryDaysLabel", () => {
  it("her gün", () => expect(deliveryDaysLabel([0, 1, 2, 3, 4, 5, 6])).toBe("Her gün"));
  it("tek gün hariç", () => expect(deliveryDaysLabel([1, 2, 3, 4, 5, 6])).toBe("Pazar hariç her gün"));
  it("liste pazartesiden başlar", () =>
    expect(deliveryDaysLabel([6, 2, 4])).toBe("Salı, Perşembe ve Cumartesi"));
  it("tek gün", () => expect(deliveryDaysLabel([0])).toBe("Pazar"));
  it("boş ve geçersiz", () => expect(deliveryDaysLabel([9, -1])).toBe("Şu an teslimat günü yok"));
});

describe("biçimler", () => {
  it("formatTl", () => expect(formatTl(1250)).toBe("1.250 ₺"));
  it("weightText", () => {
    expect(weightText({ weight: 750, weightUnit: "g" })).toBe("750g");
    expect(weightText({ weight: 1000 })).toBe("1kg");
    expect(weightText({ weight: 3000, weightUnit: "ml" })).toBe("3L");
    expect(weightText({ weight: 0 })).toBe("");
  });
});
