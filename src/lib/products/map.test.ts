import { describe, it, expect } from "vitest";
import {
  ACCOMPANIMENT_IMAGE_PLACEHOLDER,
  PRODUCT_IMAGE_PLACEHOLDER,
  getProductPlaceholder,
  isPlaceholderImageUrl,
  mapProductRow,
  type ProductRow,
} from "./map";

function baseRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "prod-1",
    name: "Test Ürün",
    slug: "test-urun",
    description: "Test açıklama",
    price: 150,
    image_url: null,
    category: "bread",
    weight: 850,
    weight_unit: "g",
    made_to_order: false,
    is_popular: false,
    is_new: false,
    is_available: true,
    is_active: true,
    ingredients: ["Un", "Su", "Tuz"],
    flour_types: ["Karakılçık"],
    hydration: 76,
    atelier_placement: null,
    masterclass: null,
    display_order: 1,
    ...overrides,
  };
}

describe("products/map placeholders & mapping", () => {
  it("selects bread vs accompaniment SVG placeholder by category", () => {
    expect(getProductPlaceholder("bread")).toBe(PRODUCT_IMAGE_PLACEHOLDER);
    expect(getProductPlaceholder("specialty")).toBe(PRODUCT_IMAGE_PLACEHOLDER);
    expect(getProductPlaceholder("mandira")).toBe(ACCOMPANIMENT_IMAGE_PLACEHOLDER);
    expect(getProductPlaceholder("sarkuteri")).toBe(ACCOMPANIMENT_IMAGE_PLACEHOLDER);
    expect(getProductPlaceholder("gurme")).toBe(ACCOMPANIMENT_IMAGE_PLACEHOLDER);
  });

  it("identifies legacy broken /images/categories/ and /images/placeholders/ URLs as placeholders", () => {
    expect(isPlaceholderImageUrl(null)).toBe(true);
    expect(isPlaceholderImageUrl("")).toBe(true);
    expect(isPlaceholderImageUrl("/images/categories/bread.jpg")).toBe(true);
    expect(isPlaceholderImageUrl("/images/placeholders/bread.svg")).toBe(true);
    expect(isPlaceholderImageUrl("https://cdn.example.com/yogurt.webp")).toBe(false);
    expect(isPlaceholderImageUrl("/images/products/koy-ekmegi.jpg")).toBe(false);
  });

  it("maps null or broken category image_url to category-aware SVG placeholder", () => {
    const milk = mapProductRow(baseRow({ name: "Jersey Çiğ Sütü", category: "mandira", image_url: null, capacity_units: 0 }));
    expect(milk.imageUrl).toBe(ACCOMPANIMENT_IMAGE_PLACEHOLDER);
    expect(milk.capacityUnits).toBe(0);

    const legacyBread = mapProductRow(baseRow({ category: "bread", image_url: "/images/categories/bread.jpg" }));
    expect(legacyBread.imageUrl).toBe(PRODUCT_IMAGE_PLACEHOLDER);

    const realPhoto = mapProductRow(baseRow({ category: "gurme", image_url: "/images/products/dogal-yogurt.jpg" }));
    expect(realPhoto.imageUrl).toBe("/images/products/dogal-yogurt.jpg");
  });
});
