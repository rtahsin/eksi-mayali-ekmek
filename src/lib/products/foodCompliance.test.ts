import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  BREAD_DEFAULT_STORAGE_GUIDANCE,
  COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE,
  CROSS_CONTACT_NOTE,
  DRY_PANTRY_ACCOMPANIMENT_STORAGE_GUIDANCE,
  RAW_MILK_DETAIL,
  RAW_MILK_HEADLINE,
  RAW_MILK_STORAGE_GUIDANCE,
  deriveProductAllergens,
  getDefaultStorageGuidance,
  getFoodComplianceSummary,
  isRawMilkProduct,
  type FoodComplianceProductInput,
} from "./foodCompliance";
import { findHealthTerms, hasBenefitVerb } from "@/lib/knowledge/lint";

describe("foodCompliance — TGK 2017/20 & Ek-1 Alerjen Motoru", () => {
  it("1. Jersey çiğ süt ürününü tanır, yalnızca süt alerjeni ve çiğ süt muhafaza kalkanı döner", () => {
    const rawMilk: FoodComplianceProductInput = {
      id: "prod-milk-1",
      name: "Jersey Çiğ Sütü (3 Litre)",
      slug: "jersey-cig-sutu-3-litre",
      category: "sut",
      description: "Günlük sağılmış yüksek yağlı Jersey sütü. Yoğurt mayalamaya uygundur.",
      ingredients: ["%100 Çiğ Jersey İnek Sütü"],
      capacityUnits: 0,
    };

    expect(isRawMilkProduct(rawMilk)).toBe(true);
    expect(deriveProductAllergens(rawMilk)).toEqual([
      "Süt ve süt ürünleri (laktoz dahil)",
    ]);
    expect(getDefaultStorageGuidance(rawMilk)).toBe(RAW_MILK_STORAGE_GUIDANCE);

    const summary = getFoodComplianceSummary(rawMilk);
    expect(summary.isRawMilk).toBe(true);
    expect(summary.rawMilkHeadline).toBe(RAW_MILK_HEADLINE);
    expect(summary.rawMilkDetail).toBe(RAW_MILK_DETAIL);
    expect(summary.crossContactNote).toBe(CROSS_CONTACT_NOTE);
  });

  it("sepet kalemi (CartItem) gibi kategori alanı olmayan çiğ süt girdisini de doğru sınıflandırır", () => {
    const cartRawMilk: FoodComplianceProductInput = {
      productId: "jersey-cig-sutu-3-litre",
      name: "JERSEY ÇİĞ SÜT 3L",
    };

    expect(isRawMilkProduct(cartRawMilk)).toBe(true);
    expect(deriveProductAllergens(cartRawMilk)).toEqual([
      "Süt ve süt ürünleri (laktoz dahil)",
    ]);
  });

  it("2. Yoğurt, peynir ve tereyağında (içindekilerde çiğ süt yazsa bile) isRawMilk false döner", () => {
    const yogurt: FoodComplianceProductInput = {
      id: "prod-yogurt",
      name: "Doğal Koyun & İnek Ev Yoğurdu",
      slug: "dogal-ev-yogurdu",
      category: "yogurt",
      description: "Uzun süre dinlendirilmiş geleneksel taş kıvamlı yoğurt.",
      ingredients: ["Pastörize edilmiş çiğ süt", "Doğal yoğurt mayası"],
      capacityUnits: 0,
    };

    const cheese: FoodComplianceProductInput = {
      id: "prod-cheese",
      name: "Olgunlaştırılmış Ezine Peyniri",
      slug: "ezine-peyniri",
      category: "peynir",
      ingredients: ["Çiğ koyun ve inek sütü", "Şirden mayası", "Deniz tuzu"],
      capacityUnits: 0,
    };

    const butter: FoodComplianceProductInput = {
      id: "prod-butter",
      name: "Yayık Tereyağı",
      slug: "yayik-tereyagi",
      category: "tereyag",
      ingredients: ["Süt kreması"],
      capacityUnits: 0,
    };

    expect(isRawMilkProduct(yogurt)).toBe(false);
    expect(isRawMilkProduct(cheese)).toBe(false);
    expect(isRawMilkProduct(butter)).toBe(false);

    // "koyun", "uzun", "olgunlaştırılmış" kelimeleri yanlışlıkla "un" (gluten) tetiklememeli!
    expect(deriveProductAllergens(yogurt)).toEqual([
      "Süt ve süt ürünleri (laktoz dahil)",
    ]);
    expect(deriveProductAllergens(cheese)).toEqual([
      "Süt ve süt ürünleri (laktoz dahil)",
    ]);
    expect(getDefaultStorageGuidance(yogurt)).toBe(
      COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE
    );
    expect(getDefaultStorageGuidance(butter)).toBe(
      COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE
    );
  });

  it("3. Yumurta ürünlerinde yalnızca Yumurta alerjeni ve soğuk zincir saklama döner", () => {
    const eggs: FoodComplianceProductInput = {
      id: "prod-eggs",
      name: "Serbest Gezen Köy Yumurtası (15 Adet)",
      slug: "koy-yumurtasi-15li",
      category: "yumurta",
      description: "Günlük toplanan doğal köy yumurtası.",
      capacityUnits: 0,
    };

    expect(isRawMilkProduct(eggs)).toBe(false);
    expect(deriveProductAllergens(eggs)).toEqual(["Yumurta"]);
    expect(getDefaultStorageGuidance(eggs)).toBe(
      COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE
    );
  });

  it("4. Cevizli çavdar ekmeğinde hem Gluten hem Sert kabuklu meyveler alerjenini ve ekmek muhafazasını döner", () => {
    const walnutRyeBread: FoodComplianceProductInput = {
      id: "prod-walnut-rye",
      name: "Cevizli Çavdar Ekmeği",
      slug: "cevizli-cavdar-ekmegi",
      category: "bread",
      description: "Taş değirmen çavdar unu, ekşi maya ve yerli ceviz içi ile.",
      flourTypes: ["Çavdar Unu", "Tam Buğday Unu"],
      ingredients: ["Ekşi maya", "Ceviz", "Su", "Kaya tuzu"],
      capacityUnits: 1,
    };

    expect(isRawMilkProduct(walnutRyeBread)).toBe(false);
    expect(deriveProductAllergens(walnutRyeBread)).toEqual([
      "Gluten içeren tahıllar",
      "Sert kabuklu meyveler",
    ]);
    expect(getDefaultStorageGuidance(walnutRyeBread)).toBe(
      BREAD_DEFAULT_STORAGE_GUIDANCE
    );
  });

  it("5. Günlük yufka (eşlikçi kategorisi) için Gluten alerjeni ve kuru/serin kiler muhafazası döner", () => {
    const yufka: FoodComplianceProductInput = {
      id: "prod-yufka",
      name: "Günlük El Açması Yufka (5 Adet)",
      slug: "gunluk-el-acmasi-yufka",
      category: "yufka",
      description: "Sac üzerinde günlük pişirilen el açması böreklik yufka.",
      ingredients: ["Buğday unu", "İçme suyu", "Tuz"],
      capacityUnits: 0,
    };

    expect(isRawMilkProduct(yufka)).toBe(false);
    expect(deriveProductAllergens(yufka)).toEqual(["Gluten içeren tahıllar"]);
    expect(getDefaultStorageGuidance(yufka)).toBe(
      DRY_PANTRY_ACCOMPANIMENT_STORAGE_GUIDANCE
    );
  });

  it("susam, tahin, fındık, badem, antep fıstığı ve erişte alerjenlerini eksiksiz yakalar", () => {
    const sesameTahiniPastry: FoodComplianceProductInput = {
      id: "prod-tahin",
      name: "Susamlı Tahinli ve Antep Fıstıklı Çörek",
      category: "specialty",
      ingredients: ["Buğday unu", "Tahin", "Susam", "Antep Fıstığı", "Tereyağı", "Yumurta"],
    };

    expect(deriveProductAllergens(sesameTahiniPastry)).toEqual([
      "Gluten içeren tahıllar",
      "Süt ve süt ürünleri (laktoz dahil)",
      "Yumurta",
      "Sert kabuklu meyveler",
      "Susam",
    ]);

    const eriste: FoodComplianceProductInput = {
      id: "prod-eriste",
      name: "Ev Yapımı Köy Eriştesi",
      category: "kiler",
      ingredients: ["Siyez unu", "Köy yumurtası", "Tuz"],
      capacityUnits: 0,
    };
    expect(deriveProductAllergens(eriste)).toEqual([
      "Gluten içeren tahıllar",
      "Yumurta",
    ]);
  });

  it("K006 Sıfır Sağlık Beyanı: üretilen hiçbir metinde sağlık terimi veya fayda fiili ('korur' dahil) geçmez", () => {
    const sampleProducts: FoodComplianceProductInput[] = [
      { name: "Jersey Çiğ Sütü", slug: "jersey-cig-sutu-3-litre", category: "sut" },
      { name: "Ev Yoğurdu", category: "yogurt" },
      { name: "Köy Yumurtası", category: "yumurta" },
      { name: "Cevizli Çavdar Ekmeği", category: "bread", ingredients: ["Ceviz", "Susam"] },
      { name: "Günlük Yufka", category: "yufka" },
      { name: "Dana Kangal Sucuk", category: "sucuk" },
    ];

    const allGeneratedStrings = new Set<string>([
      RAW_MILK_HEADLINE,
      RAW_MILK_DETAIL,
      CROSS_CONTACT_NOTE,
      RAW_MILK_STORAGE_GUIDANCE,
      COLD_CHAIN_ACCOMPANIMENT_STORAGE_GUIDANCE,
      DRY_PANTRY_ACCOMPANIMENT_STORAGE_GUIDANCE,
      BREAD_DEFAULT_STORAGE_GUIDANCE,
    ]);

    for (const p of sampleProducts) {
      const s = getFoodComplianceSummary(p);
      if (s.rawMilkHeadline) allGeneratedStrings.add(s.rawMilkHeadline);
      if (s.rawMilkDetail) allGeneratedStrings.add(s.rawMilkDetail);
      allGeneratedStrings.add(s.crossContactNote);
      allGeneratedStrings.add(s.defaultStorage);
      for (const a of s.allergens) allGeneratedStrings.add(a);
    }

    for (const text of allGeneratedStrings) {
      expect(findHealthTerms(text), `K006 ihlali: "${text}"`).toEqual([]);
      expect(hasBenefitVerb(text), `Benefit verb ihlali: "${text}"`).toBe(false);
    }
  });

  it("M-04A bileşen ve hukuki sayfalarında K006 terimi, geliştirici notu veya karanlık zindan sınıfı kalmaz", () => {
    const filesToAudit = [
      "src/components/storefront/FoodComplianceNotice.tsx",
      "src/components/storefront/ProductModal.tsx",
      "src/app/mesafeli-satis/page.tsx",
      "src/app/kvkk/page.tsx",
      "src/app/gizlilik/page.tsx",
      "src/components/common/Footer.tsx",
    ];

    for (const relPath of filesToAudit) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const source = fs.readFileSync(fullPath, "utf8");

      expect(findHealthTerms(source), `${relPath} K006 terimi içeriyor`).toEqual([]);
      expect(hasBenefitVerb(source), `${relPath} K006 fayda fiili içeriyor`).toBe(false);
      expect(source).not.toContain("HUKUKI TEYIT GEREKLIDIR");
      expect(source).not.toContain("ekmeklab.tr / yerel platform");
      expect(source).not.toContain("bg-background");
      expect(source).not.toContain("/laboratuvar");
    }
  });
});
