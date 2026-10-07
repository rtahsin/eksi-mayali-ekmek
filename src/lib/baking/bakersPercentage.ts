/**
 * Fırıncı Yüzdesi Hesaplama Motoru (P2-06)
 *
 * Temel İlke: Toplam un miktarı daima %100 kabul edilir.
 * Tüm bileşenler (su, maya, tuz, katkılar) un ağırlığına oranlanır.
 */

import {
  BakersPercentageInput,
  BakersPercentageResult,
  CalculatedIngredient,
} from "./types";

/**
 * Sayıyı belirtilen ondalık basamağa yuvarlar
 */
export function roundTo(num: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

export function calculateBakersPercentage(
  input: BakersPercentageInput
): BakersPercentageResult {
  const {
    mode,
    flours,
    hydrationPercent,
    starterPercent,
    starterHydrationPercent = 100,
    saltPercent,
    customIngredients = [],
  } = input;

  // 1. Toplam yüzde katsayısını hesapla (Un = %100)
  const customSumPercent = customIngredients.reduce(
    (acc, item) => acc + (item.percentage || 0),
    0
  );
  const totalFormulaPercent =
    100 + hydrationPercent + starterPercent + saltPercent + customSumPercent;

  // 2. Moduna göre baz un ağırlığını bul
  let totalFlourWeight = 0;
  let loafCount = 1;
  let loafWeight = 0;

  if (mode === "byFlour") {
    totalFlourWeight = Math.max(0, input.totalFlourWeight || 0);
    const totalDough = totalFlourWeight * (totalFormulaPercent / 100);
    loafCount = Math.max(1, input.loafCount || 1);
    loafWeight = loafCount > 0 ? totalDough / loafCount : totalDough;
  } else if (mode === "byTotalDough") {
    const targetDough = Math.max(0, input.targetTotalDough || 0);
    totalFlourWeight = totalFormulaPercent > 0 ? (targetDough / totalFormulaPercent) * 100 : 0;
    loafCount = Math.max(1, input.loafCount || 1);
    loafWeight = targetDough / loafCount;
  } else if (mode === "byLoaves") {
    loafCount = Math.max(1, input.loafCount || 1);
    loafWeight = Math.max(0, input.loafWeight || 0);
    const targetDough = loafCount * loafWeight;
    totalFlourWeight = totalFormulaPercent > 0 ? (targetDough / totalFormulaPercent) * 100 : 0;
  }

  // 3. Un çeşitlerinin gramajlarını hesapla
  const totalFlourRatio = flours.reduce((acc, f) => acc + (f.ratio || 0), 0);
  const ingredients: CalculatedIngredient[] = [];

  if (flours.length === 0) {
    ingredients.push({
      name: "Ekmeklik Un",
      weight: roundTo(totalFlourWeight, 1),
      percentage: 100,
      category: "flour",
    });
  } else {
    // Un oranlarını normalize ederek un kalemlerini oluştur
    flours.forEach((flour) => {
      const normalizedRatio =
        totalFlourRatio > 0 ? (flour.ratio / totalFlourRatio) * 100 : 100 / flours.length;
      const weight = totalFlourWeight * (normalizedRatio / 100);
      ingredients.push({
        name: flour.name || "Un",
        weight: roundTo(weight, 1),
        percentage: roundTo(normalizedRatio, 1),
        category: "flour",
      });
    });
  }

  // 4. Su, Maya, Tuz gramajları
  const waterWeight = totalFlourWeight * (hydrationPercent / 100);
  ingredients.push({
    name: "Su",
    weight: roundTo(waterWeight, 1),
    percentage: roundTo(hydrationPercent, 1),
    category: "water",
  });

  const starterWeight = totalFlourWeight * (starterPercent / 100);
  ingredients.push({
    name: "Ekşi Maya",
    weight: roundTo(starterWeight, 1),
    percentage: roundTo(starterPercent, 1),
    category: "starter",
  });

  const saltWeight = totalFlourWeight * (saltPercent / 100);
  ingredients.push({
    name: "Tuz",
    weight: roundTo(saltWeight, 1),
    percentage: roundTo(saltPercent, 1),
    category: "salt",
  });

  // 5. Ekstra katkılar
  customIngredients.forEach((item) => {
    const weight = totalFlourWeight * ((item.percentage || 0) / 100);
    ingredients.push({
      name: item.name || "Ekstra Malzeme",
      weight: roundTo(weight, 1),
      percentage: roundTo(item.percentage, 1),
      category: "custom",
    });
  });

  // 6. Toplam hamur ağırlığı
  const totalDoughWeight =
    totalFlourWeight +
    waterWeight +
    starterWeight +
    saltWeight +
    customIngredients.reduce(
      (acc, item) => acc + totalFlourWeight * ((item.percentage || 0) / 100),
      0
    );

  // 7. Efektif hidrasyon (mayadaki su ve un dahil)
  // Maya hidrasyonu: starterHydrationPercent = (starterWater / starterFlour) * 100
  // starterWeight = starterFlour + starterWater = starterFlour * (1 + starterHydration / 100)
  const starterFlour =
    starterHydrationPercent >= 0
      ? starterWeight / (1 + starterHydrationPercent / 100)
      : starterWeight / 2;
  const starterWater = starterWeight - starterFlour;

  const totalEffectiveFlour = totalFlourWeight + starterFlour;
  const totalEffectiveWater = waterWeight + starterWater;

  const effectiveHydration =
    totalEffectiveFlour > 0
      ? (totalEffectiveWater / totalEffectiveFlour) * 100
      : hydrationPercent;

  return {
    totalFlourWeight: roundTo(totalFlourWeight, 1),
    totalDoughWeight: roundTo(totalDoughWeight, 1),
    effectiveHydration: roundTo(effectiveHydration, 1),
    loafCount,
    loafWeight: roundTo(totalDoughWeight / loafCount, 1),
    ingredients,
  };
}

/**
 * Fırıncı reçetesini panoya kopyalamak için düz metin olarak biçimlendirir
 */
export function formatRecipeText(result: BakersPercentageResult, title: string = "EkmekLab Reçetesi"): string {
  const lines: string[] = [
    `🍞 ${title}`,
    `----------------------------------------`,
    `Toplam Hamur: ${result.totalDoughWeight}g | Somun: ${result.loafCount} x ${result.loafWeight}g`,
    `Fırıncı Hidrasyonu: ${result.ingredients.find((i) => i.category === "water")?.percentage || 0}%`,
    `Efektif Hidrasyon: %${result.effectiveHydration} (Mayadaki su/un dahil)`,
    `----------------------------------------`,
    `BİLEŞENLER:`,
  ];

  result.ingredients.forEach((item) => {
    lines.push(`• ${item.name.padEnd(22, " ")}: ${item.weight.toString().padStart(5, " ")}g (%${item.percentage})`);
  });

  lines.push(`----------------------------------------`);
  lines.push(`Kaynak: ekmeklab.com/arac/firinci-yuzdesi`);

  return lines.join("\n");
}
