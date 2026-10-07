import { describe, it, expect } from "vitest";
import {
  calculateBakersPercentage,
  formatRecipeText,
  roundTo,
} from "./bakersPercentage";
import { BakersPercentageInput } from "./types";

describe("Fırıncı Yüzdesi Hesaplama Motoru (Hand-Calculated Golden Fixtures)", () => {
  it("Standart 500g un ile baz reçete (Elle hesaplanmış altın örnek 1)", () => {
    // 500g un, %70 su, %20 maya (%100 hidrasyonlu), %2 tuz
    // Beklenen:
    // Un: 500g
    // Su: 500 * 0.70 = 350g
    // Maya: 500 * 0.20 = 100g (içinde 50g un, 50g su)
    // Tuz: 500 * 0.02 = 10g
    // Toplam hamur: 500 + 350 + 100 + 10 = 960g
    // Efektif Hidrasyon: (350 + 50) / (500 + 50) = 400 / 550 = %72.727... => 72.7%
    const input: BakersPercentageInput = {
      mode: "byFlour",
      totalFlourWeight: 500,
      flours: [{ id: "1", name: "Ekmeklik Un", ratio: 100 }],
      hydrationPercent: 70,
      starterPercent: 20,
      starterHydrationPercent: 100,
      saltPercent: 2,
    };

    const res = calculateBakersPercentage(input);

    expect(res.totalFlourWeight).toBe(500);
    expect(res.totalDoughWeight).toBe(960);
    expect(res.effectiveHydration).toBe(72.7);

    const water = res.ingredients.find((i) => i.category === "water");
    const starter = res.ingredients.find((i) => i.category === "starter");
    const salt = res.ingredients.find((i) => i.category === "salt");

    expect(water?.weight).toBe(350);
    expect(starter?.weight).toBe(100);
    expect(salt?.weight).toBe(10);
  });

  it("Hedef toplam hamurdan geriye hesaplama (Elle hesaplanmış altın örnek 2)", () => {
    // Hedef Hamur: 1000g
    // Oranlar: Un %100, Su %75, Maya %20, Tuz %2.
    // Toplam yüzde: 100 + 75 + 20 + 2 = 197%
    // Baz un: 1000 / 1.97 = 507.614... => 507.6g
    // Su: 507.614 * 0.75 = 380.71... => 380.7g
    // Maya: 507.614 * 0.20 = 101.52... => 101.5g
    // Tuz: 507.614 * 0.02 = 10.15... => 10.2g
    // Toplam hamur: 507.6 + 380.7 + 101.5 + 10.2 = 1000g
    const input: BakersPercentageInput = {
      mode: "byTotalDough",
      targetTotalDough: 1000,
      flours: [{ id: "1", name: "Ekmeklik Un", ratio: 100 }],
      hydrationPercent: 75,
      starterPercent: 20,
      saltPercent: 2,
    };

    const res = calculateBakersPercentage(input);

    expect(res.totalFlourWeight).toBe(507.6);
    expect(res.totalDoughWeight).toBe(1000);

    const water = res.ingredients.find((i) => i.category === "water");
    const starter = res.ingredients.find((i) => i.category === "starter");
    const salt = res.ingredients.find((i) => i.category === "salt");

    expect(water?.weight).toBe(380.7);
    expect(starter?.weight).toBe(101.5);
    expect(salt?.weight).toBe(10.2);
  });

  it("Somun adedi ve somun ağırlığı modu (2 x 800g somun)", () => {
    // 2 somun x 800g = 1600g toplam hamur
    // Su %70, Maya %20, Tuz %2 => Toplam %192
    // Un: 1600 / 1.92 = 833.3g
    const input: BakersPercentageInput = {
      mode: "byLoaves",
      loafCount: 2,
      loafWeight: 800,
      flours: [{ id: "1", name: "Ekmeklik Un", ratio: 100 }],
      hydrationPercent: 70,
      starterPercent: 20,
      saltPercent: 2,
    };

    const res = calculateBakersPercentage(input);

    expect(res.loafCount).toBe(2);
    expect(res.totalDoughWeight).toBe(1600);
    expect(res.totalFlourWeight).toBe(833.3);
    expect(res.loafWeight).toBe(800);
  });

  it("Çoklu un harmanı dağılımı (%70 Ekmeklik, %30 Tam Buğday)", () => {
    const input: BakersPercentageInput = {
      mode: "byFlour",
      totalFlourWeight: 1000,
      flours: [
        { id: "1", name: "Ekmeklik Un", ratio: 70 },
        { id: "2", name: "Tam Buğday Unu", ratio: 30 },
      ],
      hydrationPercent: 72,
      starterPercent: 20,
      saltPercent: 2,
    };

    const res = calculateBakersPercentage(input);

    const flours = res.ingredients.filter((i) => i.category === "flour");
    expect(flours).toHaveLength(2);
    expect(flours[0].name).toBe("Ekmeklik Un");
    expect(flours[0].weight).toBe(700);
    expect(flours[1].name).toBe("Tam Buğday Unu");
    expect(flours[1].weight).toBe(300);
  });

  it("Ekstra malzeme (tohum/ceviz vb.) hesabı", () => {
    const input: BakersPercentageInput = {
      mode: "byFlour",
      totalFlourWeight: 1000,
      flours: [{ id: "1", name: "Ekmeklik Un", ratio: 100 }],
      hydrationPercent: 70,
      starterPercent: 20,
      saltPercent: 2,
      customIngredients: [
        { id: "c1", name: "Kavrulmuş Ayçekirdeği", percentage: 10 },
        { id: "c2", name: "Zeytinyağı", percentage: 3 },
      ],
    };

    const res = calculateBakersPercentage(input);

    const sunflower = res.ingredients.find((i) => i.name === "Kavrulmuş Ayçekirdeği");
    const oliveOil = res.ingredients.find((i) => i.name === "Zeytinyağı");

    expect(sunflower?.weight).toBe(100);
    expect(oliveOil?.weight).toBe(30);
    // 1000 (un) + 700 (su) + 200 (maya) + 20 (tuz) + 100 + 30 = 2050g
    expect(res.totalDoughWeight).toBe(2050);
  });

  it("Reçete metin formatlayıcı doğrulaması", () => {
    const input: BakersPercentageInput = {
      mode: "byFlour",
      totalFlourWeight: 500,
      flours: [{ id: "1", name: "Karakılçık Unu", ratio: 100 }],
      hydrationPercent: 70,
      starterPercent: 20,
      saltPercent: 2,
    };

    const res = calculateBakersPercentage(input);
    const text = formatRecipeText(res, "Karakılçık Köy Somunu");

    expect(text).toContain("Karakılçık Köy Somunu");
    expect(text).toContain("Toplam Hamur: 960g");
    expect(text).toContain("Karakılçık Unu");
    expect(text).toContain("Efektif Hidrasyon");
  });
});
