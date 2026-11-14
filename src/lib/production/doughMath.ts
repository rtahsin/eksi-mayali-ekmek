import type { ProductionLine } from "@/types/production";

/** Pişmiş somun ağırlığı girilmemişse varsayılan gramaj (750 g). */
export const DEFAULT_LOAF_WEIGHT_GRAMS = 750;

/** Ürün hidrasyonu girilmemişse varsayılan su oranı (%72). */
export const DEFAULT_HYDRATION_PCT = 72;

/** Pişme / buharlaşma kaybı için çiğ hamur çarpanı (+%12 pay). */
export const BAKE_LOSS_MULTIPLIER = 1.12;

/** Un ağırlığına göre %100 hidrasyonlu canlı ekşi maya (levain) oranı (%20). */
export const LEVAIN_PCT = 20;

/** Un ağırlığına göre kaya/deniz tuzu oranı (%2). */
export const SALT_PCT = 2;

export interface DoughItemInput {
  productId: string;
  name: string;
  /** Pişirilecek somun / ürün adedi */
  quantity: number;
  weight?: number | null;
  weightUnit?: string | null;
  hydration?: number | null;
  isAccompaniment?: boolean;
  capacityUnits?: number;
}

export interface DoughBreakdown {
  /** Toplam somun adedi */
  loafCount: number;
  /** Hedef pişmiş toplam ağırlık (g) */
  bakedGrams: number;
  /** Pişme payı (%12) dahil toplam çiğ hamur (g) */
  rawDoughGrams: number;
  /** Toplam çiğ hamur (kg) */
  doughKg: number;
  /** Ana yoğurma unu (g) */
  flourGrams: number;
  /** Ana yoğurma unu (kg) */
  flourKg: number;
  /** Ana yoğurma suyu (g / mL) */
  waterGrams: number;
  /** Ana yoğurma suyu (L) */
  waterLiters: number;
  /** %100 hidrasyonlu canlı ekşi maya / levain (g) */
  levainGrams: number;
  /** %100 hidrasyonlu canlı ekşi maya / levain (kg) */
  levainKg: number;
  /** Tuz (g) */
  saltGrams: number;
}

export interface DoughLineBreakdown extends DoughBreakdown {
  productId: string;
  name: string;
  unitBakedGrams: number;
  hydrationPct: number;
}

export interface ProductionDoughSummary {
  lines: DoughLineBreakdown[];
  wholesale: DoughLineBreakdown | null;
  totals: DoughBreakdown;
}

export interface ProductionDoughOptions {
  /** Ayarlardan gelen günlük toptan / şarküteri somun adedi */
  wholesaleLoaves?: number;
  wholesaleUnitGrams?: number;
  wholesaleHydrationPct?: number;
}

const ZERO_BREAKDOWN: DoughBreakdown = {
  loafCount: 0,
  bakedGrams: 0,
  rawDoughGrams: 0,
  doughKg: 0,
  flourGrams: 0,
  flourKg: 0,
  waterGrams: 0,
  waterLiters: 0,
  levainGrams: 0,
  levainKg: 0,
  saltGrams: 0,
};

/** Ürün ağırlığını pişmiş somun gramına çevirir; geçersiz/eksik ise 750 g döner. */
export function resolveLoafBakedGrams(weight?: number | null, weightUnit?: string | null): number {
  if (weight === null || weight === undefined || !Number.isFinite(weight) || weight <= 0) {
    return DEFAULT_LOAF_WEIGHT_GRAMS;
  }
  const unit = (weightUnit ?? "g").trim().toLowerCase();
  if (unit === "kg") return weight * 1000;
  if (unit === "g" || unit === "gr" || unit === "gram" || unit === "") return weight;
  return DEFAULT_LOAF_WEIGHT_GRAMS;
}

/** Hidrasyon yüzdesini doğrular; eksik veya geçersizse %72 döner. */
export function resolveHydrationPct(hydration?: number | null): number {
  if (hydration === null || hydration === undefined || !Number.isFinite(hydration) || hydration <= 0) {
    return DEFAULT_HYDRATION_PCT;
  }
  return hydration;
}

/**
 * Tek bir ekmek kalemi için Fırıncı Yüzdesi (Baker's Percentage) hamur reçetesi:
 * - Çiğ hamur = adet * pişmiş_gram * 1.12 (%12 pişme kaybı payı)
 * - Un = %100, Su = %hidrasyon, Canlı Ekşi Maya (Levain %100 hidr.) = %20, Tuz = %2
 * - Toplam oran = 100 + hidrasyon + 20 + 2
 */
export function calculateSingleBreadDough(params: {
  count: number;
  weight?: number | null;
  weightUnit?: string | null;
  hydration?: number | null;
}): DoughBreakdown & { unitBakedGrams: number; hydrationPct: number } {
  const unitBakedGrams = resolveLoafBakedGrams(params.weight, params.weightUnit);
  const hydrationPct = resolveHydrationPct(params.hydration);
  const loafCount = Number.isFinite(params.count) && params.count > 0 ? params.count : 0;

  if (loafCount === 0) {
    return { ...ZERO_BREAKDOWN, unitBakedGrams, hydrationPct };
  }

  const bakedGrams = loafCount * unitBakedGrams;
  const rawDoughGrams = bakedGrams * BAKE_LOSS_MULTIPLIER;
  const formulaTotalPct = 100 + hydrationPct + LEVAIN_PCT + SALT_PCT;

  const flourGrams = (rawDoughGrams * 100) / formulaTotalPct;
  const waterGrams = (flourGrams * hydrationPct) / 100;
  const levainGrams = (flourGrams * LEVAIN_PCT) / 100;
  const saltGrams = (flourGrams * SALT_PCT) / 100;

  return {
    loafCount,
    unitBakedGrams,
    hydrationPct,
    bakedGrams,
    rawDoughGrams,
    doughKg: rawDoughGrams / 1000,
    flourGrams,
    flourKg: flourGrams / 1000,
    waterGrams,
    waterLiters: waterGrams / 1000,
    levainGrams,
    levainKg: levainGrams / 1000,
    saltGrams,
  };
}

function sumBreakdowns(items: readonly DoughBreakdown[]): DoughBreakdown {
  let loafCount = 0;
  let bakedGrams = 0;
  let rawDoughGrams = 0;
  let flourGrams = 0;
  let waterGrams = 0;
  let levainGrams = 0;
  let saltGrams = 0;

  for (const item of items) {
    loafCount += item.loafCount;
    bakedGrams += item.bakedGrams;
    rawDoughGrams += item.rawDoughGrams;
    flourGrams += item.flourGrams;
    waterGrams += item.waterGrams;
    levainGrams += item.levainGrams;
    saltGrams += item.saltGrams;
  }

  return {
    loafCount,
    bakedGrams,
    rawDoughGrams,
    doughKg: rawDoughGrams / 1000,
    flourGrams,
    flourKg: flourGrams / 1000,
    waterGrams,
    waterLiters: waterGrams / 1000,
    levainGrams,
    levainKg: levainGrams / 1000,
    saltGrams,
  };
}

function isBreadProductionItem(item: DoughItemInput | ProductionLine): boolean {
  if (item.isAccompaniment) return false;
  if (typeof item.capacityUnits === "number" && item.capacityUnits <= 0) return false;
  return item.quantity > 0;
}

/**
 * Günlük üretim satırlarından eşlikçileri ayıklar; her ekmek çeşidi ve gün toplamı için
 * yoğrulacak Toplam Hamur (kg), Un (kg), Su (L), Canlı Ekşi Maya / Levain (kg) ve Tuz (g) hesaplar.
 */
export function calculateProductionDough(
  items: readonly (DoughItemInput | ProductionLine)[],
  options: ProductionDoughOptions = {}
): ProductionDoughSummary {
  const lines: DoughLineBreakdown[] = items
    .filter(isBreadProductionItem)
    .map((item) => {
      const calc = calculateSingleBreadDough({
        count: item.quantity,
        weight: item.weight,
        weightUnit: item.weightUnit,
        hydration: item.hydration,
      });
      return {
        productId: item.productId,
        name: item.name,
        ...calc,
      };
    });

  const wholesaleCount =
    options.wholesaleLoaves && Number.isFinite(options.wholesaleLoaves) && options.wholesaleLoaves > 0
      ? options.wholesaleLoaves
      : 0;

  const wholesale: DoughLineBreakdown | null =
    wholesaleCount > 0
      ? {
          productId: "__wholesale__",
          name: "Şarküteriler (Toptan)",
          ...calculateSingleBreadDough({
            count: wholesaleCount,
            weight: options.wholesaleUnitGrams ?? DEFAULT_LOAF_WEIGHT_GRAMS,
            weightUnit: "g",
            hydration: options.wholesaleHydrationPct ?? DEFAULT_HYDRATION_PCT,
          }),
        }
      : null;

  const all = wholesale ? [...lines, wholesale] : lines;
  return {
    lines,
    wholesale,
    totals: sumBreakdowns(all),
  };
}
