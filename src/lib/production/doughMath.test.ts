import { describe, expect, it } from "vitest";
import {
  BAKE_LOSS_MULTIPLIER,
  calculateProductionDough,
  calculateSingleBreadDough,
  DEFAULT_HYDRATION_PCT,
  DEFAULT_LOAF_WEIGHT_GRAMS,
  resolveHydrationPct,
  resolveLoafBakedGrams,
} from "./doughMath";

describe("doughMath", () => {
  it("eksik ağırlık ve hidrasyonda varsayılan 750g ve %72 kullanır", () => {
    expect(resolveLoafBakedGrams(null, null)).toBe(DEFAULT_LOAF_WEIGHT_GRAMS);
    expect(resolveLoafBakedGrams(0, "g")).toBe(DEFAULT_LOAF_WEIGHT_GRAMS);
    expect(resolveLoafBakedGrams(1, "adet")).toBe(DEFAULT_LOAF_WEIGHT_GRAMS);
    expect(resolveLoafBakedGrams(1.2, "kg")).toBe(1200);
    expect(resolveHydrationPct(null)).toBe(DEFAULT_HYDRATION_PCT);
    expect(resolveHydrationPct(0)).toBe(DEFAULT_HYDRATION_PCT);
    expect(resolveHydrationPct(78)).toBe(78);
  });

  it("tek ekmek kaleminde %12 pişme kaybı payı ve fırıncı yüzdelerini tam korur", () => {
    // %78 hidrasyon → toplam oran = 100 (un) + 78 (su) + 20 (levain) + 2 (tuz) = 200
    const res = calculateSingleBreadDough({
      count: 5,
      weight: 1,
      weightUnit: "kg",
      hydration: 78,
    });

    expect(res.loafCount).toBe(5);
    expect(res.bakedGrams).toBe(5000);
    expect(res.rawDoughGrams).toBeCloseTo(5000 * BAKE_LOSS_MULTIPLIER, 6);
    expect(res.doughKg).toBeCloseTo(5.6, 6);
    expect(res.flourKg).toBeCloseTo(2.8, 6);
    expect(res.waterLiters).toBeCloseTo(2.184, 6);
    expect(res.levainKg).toBeCloseTo(0.56, 6);
    expect(res.saltGrams).toBeCloseTo(56, 6);

    // Kütle korunumu: Un + Su + Levain + Tuz = Toplam Çiğ Hamur
    expect(res.flourGrams + res.waterGrams + res.levainGrams + res.saltGrams).toBeCloseTo(
      res.rawDoughGrams,
      6
    );
  });

  it("varsayılan 750g somun ve %72 hidrasyon ile 10 somun hesabını doğru yapar", () => {
    const res = calculateSingleBreadDough({ count: 10 });
    // 10 * 750 * 1.12 = 8400 g = 8.4 kg çiğ hamur; toplam yüzde = 194
    expect(res.doughKg).toBeCloseTo(8.4, 6);
    expect(res.flourGrams).toBeCloseTo(840000 / 194, 5);
    expect(res.waterGrams).toBeCloseTo((840000 / 194) * 0.72, 5);
    expect(res.levainGrams).toBeCloseTo((840000 / 194) * 0.2, 5);
    expect(res.saltGrams).toBeCloseTo((840000 / 194) * 0.02, 5);
    expect(res.flourGrams + res.waterGrams + res.levainGrams + res.saltGrams).toBeCloseTo(8400, 6);
  });

  it("eşlikçi (mandıra/şarküteri) kalemleri hamur hesabından dışlar ve toptan somunları toplama katar", () => {
    const summary = calculateProductionDough(
      [
        {
          productId: "koy-ekmegi",
          name: "Taş Fırın Köy Ekmeği",
          quantity: 10,
          weight: 850,
          weightUnit: "g",
          hydration: 74,
          isAccompaniment: false,
          capacityUnits: 1,
        },
        {
          productId: "ezine-peyniri",
          name: "Ezine Koyun Peyniri",
          quantity: 6,
          weight: 500,
          weightUnit: "g",
          hydration: null,
          isAccompaniment: true,
          capacityUnits: 0,
        },
        {
          productId: "zeytinyagi",
          name: "Soğuk Sıkım Zeytinyağı",
          quantity: 3,
          weight: 500,
          weightUnit: "ml",
          hydration: null,
          isAccompaniment: false,
          capacityUnits: 0,
        },
      ],
      { wholesaleLoaves: 4 }
    );

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]?.productId).toBe("koy-ekmegi");
    expect(summary.wholesale?.loafCount).toBe(4);
    expect(summary.totals.loafCount).toBe(14);

    // 10 * 850 * 1.12 = 9520 g + 4 * 750 * 1.12 = 3360 g → 12880 g = 12.88 kg
    expect(summary.totals.doughKg).toBeCloseTo(12.88, 6);
    expect(
      summary.totals.flourGrams +
        summary.totals.waterGrams +
        summary.totals.levainGrams +
        summary.totals.saltGrams
    ).toBeCloseTo(summary.totals.rawDoughGrams, 6);
  });

  it("boş veya sıfır adetli üretimde tüm değerler sıfır döner", () => {
    const summary = calculateProductionDough([{ productId: "x", name: "X", quantity: 0 }]);
    expect(summary.lines).toHaveLength(0);
    expect(summary.wholesale).toBeNull();
    expect(summary.totals.doughKg).toBe(0);
    expect(summary.totals.flourKg).toBe(0);
    expect(summary.totals.waterLiters).toBe(0);
    expect(summary.totals.levainKg).toBe(0);
    expect(summary.totals.saltGrams).toBe(0);
  });
});
