import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtendedProduct, ProductCategoryInfo } from "@/types";
import {
  __resetProductsCacheForTests,
  fetchCatalog,
  mergeFetchedCatalogState,
  resolveInitialCatalogState,
  type CatalogState,
} from "./useProducts";

function sampleProduct(id = "prod_1", name = "Köy Ekmeği"): ExtendedProduct {
  return {
    id,
    slug: id,
    name,
    description: "Taş fırında pişen ekşi mayalı somun.",
    price: 150,
    imageUrl: "https://cdn.example.com/koy-ekmegi.webp",
    category: "bread",
    stock: 0,
    weight: 800,
    weightUnit: "g",
    capacityUnits: 1,
    isAvailable: true,
    isActive: true,
  };
}

const sampleCategory: ProductCategoryInfo = {
  id: "bread",
  name: "Taş Fırın Ekmeklerimiz",
  description: "Günlük taze ekmekler.",
  displayOrder: 1,
  isVisible: true,
};

describe("useProducts katalog durum yardımcıları", () => {
  beforeEach(() => {
    __resetProductsCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetProductsCacheForTests();
  });

  it("SSR boş dizi ([]) verdiğinde kilitlenmez ve yükleniyor durumunu korur", () => {
    const res = resolveInitialCatalogState([]);
    expect(res.state.products).toEqual([]);
    expect(res.loading).toBe(true);
  });

  it("SSR dolu ürün listesi verdiğinde hemen hazır başlar", () => {
    const p1 = sampleProduct("p1");
    const res = resolveInitialCatalogState([p1]);
    expect(res.state.products).toEqual([p1]);
    expect(res.loading).toBe(false);
  });

  it("initialProducts = [] iken API yanıtından gelen 5 ürünü yutmaz ve uygular", () => {
    const emptyPrev: CatalogState = { products: [], categories: [] };
    const fetched: CatalogState = {
      products: [
        sampleProduct("p1"),
        sampleProduct("p2"),
        sampleProduct("p3"),
        sampleProduct("p4"),
        sampleProduct("p5"),
      ],
      categories: [sampleCategory],
    };

    const merged = mergeFetchedCatalogState(emptyPrev, fetched, false);
    expect(merged.products).toHaveLength(5);
    expect(merged.categories).toHaveLength(1);
  });

  it("mevcut ürünler varken force=false iken boş API yanıtıyla ekranı sıfırlamaz", () => {
    const p1 = sampleProduct("p1");
    const populatedPrev: CatalogState = { products: [p1], categories: [sampleCategory] };
    const merged = mergeFetchedCatalogState(populatedPrev, { products: [], categories: [] }, false);
    expect(merged.products).toEqual([p1]);
    expect(merged.categories).toEqual([sampleCategory]);
  });

  it("force=true ile açıkça yenilendiğinde boş yanıtı kabul eder", () => {
    const p1 = sampleProduct("p1");
    const populatedPrev: CatalogState = { products: [p1], categories: [sampleCategory] };
    const merged = mergeFetchedCatalogState(populatedPrev, { products: [], categories: [] }, true);
    expect(merged.products).toEqual([]);
  });

  it("/api/products 503 hatasında reddeder ve önbelleği boş yanıtla kirletmez, sonraki denemede yükler", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Katalog hazır değil" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ products: [sampleProduct("p1")], categories: [sampleCategory] }),
      });

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCatalog()).rejects.toThrow("HTTP 503");

    const loaded = await fetchCatalog();
    expect(loaded.products).toHaveLength(1);
    expect(loaded.products[0].id).toBe("p1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
