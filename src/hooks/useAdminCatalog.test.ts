import { describe, expect, it } from "vitest";
import type { ExtendedProduct } from "@/types";
import { applyCategoryChange, emptyProductForm, productToForm } from "./useAdminCatalog";

function sampleProduct(overrides: Partial<ExtendedProduct> = {}): ExtendedProduct {
  return {
    id: "prod_test_1",
    slug: "test-urun",
    name: "Köy Ekmeği",
    description: "Taş fırında pişen ekşi mayalı somun.",
    price: 160,
    imageUrl: "https://cdn.example.com/urun-kapak/koy-ekmegi.webp",
    category: "bread",
    stock: 0,
    weight: 850,
    weightUnit: "g",
    capacityUnits: 1,
    isAvailable: true,
    isActive: true,
    ...overrides,
  };
}

describe("useAdminCatalog pure helpers", () => {
  describe("emptyProductForm", () => {
    it("starts bread categories with capacityUnits = 1", () => {
      expect(emptyProductForm("bread").capacityUnits).toBe(1);
      expect(emptyProductForm("specialty").capacityUnits).toBe(1);
      expect(emptyProductForm("ekmek").capacityUnits).toBe(1);
    });

    it("starts accompaniment categories (mandira, sarkuteri, gurme) with capacityUnits = 0", () => {
      expect(emptyProductForm("mandira").capacityUnits).toBe(0);
      expect(emptyProductForm("sarkuteri").capacityUnits).toBe(0);
      expect(emptyProductForm("gurme").capacityUnits).toBe(0);
      expect(emptyProductForm("peynir").capacityUnits).toBe(0);
    });
  });

  describe("productToForm placeholder protection", () => {
    it("normalizes /images/placeholders/*.svg and /images/categories/* URLs to null", () => {
      const breadPlaceholder = productToForm(
        sampleProduct({ imageUrl: "/images/placeholders/bread.svg" })
      );
      expect(breadPlaceholder.imageUrl).toBeNull();

      const accompPlaceholder = productToForm(
        sampleProduct({ category: "mandira", imageUrl: "/images/placeholders/accompaniment.svg", capacityUnits: 0 })
      );
      expect(accompPlaceholder.imageUrl).toBeNull();
      expect(accompPlaceholder.capacityUnits).toBe(0);

      const legacyCat = productToForm(
        sampleProduct({ imageUrl: "/images/categories/dairy.jpg" })
      );
      expect(legacyCat.imageUrl).toBeNull();

      const emptyImg = productToForm(sampleProduct({ imageUrl: "   " }));
      expect(emptyImg.imageUrl).toBeNull();
    });

    it("preserves real uploaded product photo URLs", () => {
      const realUrl = "https://project.supabase.co/storage/v1/object/public/media/urun-kapak/abc.webp";
      const form = productToForm(sampleProduct({ imageUrl: realUrl }));
      expect(form.imageUrl).toBe(realUrl);
    });
  });

  describe("applyCategoryChange", () => {
    it("switches capacityUnits 1 -> 0 and clears bread-only fields when new product moves from bread to accompaniment", () => {
      const initial = {
        ...emptyProductForm("bread"),
        hydration: 78,
        flourTypes: ["Karakılçık", "Siyez"],
      };
      const moved = applyCategoryChange(initial, "mandira");
      expect(moved.category).toBe("mandira");
      expect(moved.capacityUnits).toBe(0);
      expect(moved.hydration).toBeNull();
      expect(moved.flourTypes).toEqual([]);
    });

    it("switches capacityUnits 0 -> 1 when new product moves from accompaniment back to bread", () => {
      const initial = emptyProductForm("sarkuteri");
      expect(initial.capacityUnits).toBe(0);

      const moved = applyCategoryChange(initial, "bread");
      expect(moved.category).toBe("bread");
      expect(moved.capacityUnits).toBe(1);
    });

    it("updates capacityUnits on existing product when it was still on the previous category default", () => {
      const existingBread = productToForm(sampleProduct({ id: "prod_yogurt", category: "bread", capacityUnits: 1 }));
      const asMandira = applyCategoryChange(existingBread, "mandira");
      expect(asMandira.capacityUnits).toBe(0);

      const backToBread = applyCategoryChange(asMandira, "bread");
      expect(backToBread.capacityUnits).toBe(1);
    });

    it("preserves custom capacityUnits (e.g. 3-loaf bundle) on existing product when switching categories", () => {
      const bundle = productToForm(
        sampleProduct({
          id: "prod_paket_3",
          category: "bread",
          capacityUnits: 3,
          hydration: 75,
          flourTypes: ["Atalık Buğday"],
        })
      );

      const toSpecialty = applyCategoryChange(bundle, "specialty");
      expect(toSpecialty.capacityUnits).toBe(3);

      const toGurme = applyCategoryChange(bundle, "gurme");
      expect(toGurme.capacityUnits).toBe(3);
      // Existing product keeps its saved metadata unless explicitly edited
      expect(toGurme.hydration).toBe(75);
      expect(toGurme.flourTypes).toEqual(["Atalık Buğday"]);
    });
  });
});
