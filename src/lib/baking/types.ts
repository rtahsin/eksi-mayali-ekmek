/**
 * Profesyonel Fırıncı Araçları Tipleri (P2-06)
 * EkmekLab Atölye Standartları
 */

export interface FlourItem {
  id: string;
  name: string;
  ratio: number; // Yüzde payı (ör. %80 Ekmeklik, %20 Tam Buğday)
}

export interface CustomIngredient {
  id: string;
  name: string;
  percentage: number; // Fırıncı yüzdesi (%)
}

export interface BakersPercentageInput {
  // Hesaplama modu
  mode: "byFlour" | "byTotalDough" | "byLoaves";
  totalFlourWeight?: number; // Gram (mode: byFlour)
  targetTotalDough?: number; // Gram (mode: byTotalDough)
  loafCount?: number;        // Adet (mode: byLoaves)
  loafWeight?: number;       // Gram (mode: byLoaves)

  // Un kırılımı (toplam oranı %100 olmalı)
  flours: FlourItem[];

  // Temel oranlar (Un %100 kabul edilir)
  hydrationPercent: number; // Su yüzdesi (örn. 75)
  starterPercent: number;   // Ekşi maya yüzdesi (örn. 20)
  starterHydrationPercent?: number; // Mayanın kendi hidrasyonu (varsayılan 100)
  saltPercent: number;      // Tuz yüzdesi (örn. 2.0)

  // Ekstra malzemeler (tohum, zeytinyağı vb.)
  customIngredients?: CustomIngredient[];
}

export interface CalculatedIngredient {
  name: string;
  weight: number;      // Gram
  percentage: number;  // Fırıncı yüzdesi (%)
  category: "flour" | "water" | "starter" | "salt" | "custom";
}

export interface BakersPercentageResult {
  totalFlourWeight: number; // Toplam baz un ağırlığı (g)
  totalDoughWeight: number; // Toplam hamur ağırlığı (g)
  effectiveHydration: number; // Mayadaki un/su dahil gerçek hidrasyon (%)
  loafCount: number;
  loafWeight: number;
  ingredients: CalculatedIngredient[];
}

export type KneadingMethod = "hand" | "stand_mixer" | "spiral_mixer" | "custom";

export interface DDTInput {
  targetDDT: number;        // İstenen hamur sıcaklığı (°C, genelde 24-27)
  roomTemp: number;         // Ortam/oda sıcaklığı (°C)
  flourTemp: number;        // Un sıcaklığı (°C)
  kneadingMethod: KneadingMethod;
  customFriction?: number;  // Özel sürtünme faktörü (°C)
  starterTemp?: number;     // Varsa ön maya sıcaklığı (°C)
}

export interface DDTResult {
  requiredWaterTemp: number; // Gereken su sıcaklığı (°C)
  frictionFactor: number;    // Kullanılan sürtünme faktörü (°C)
  isFourFactor: boolean;     // 4 faktörlü (ön mayalı) mi?
  status: "ideal" | "warm" | "chilled" | "needs_ice" | "too_hot_warning";
  note: string;
}

export interface IceCalculationInput {
  targetWaterTemp: number;  // DDT'den çıkan gereken su sıcaklığı (< musluk suyu)
  tapWaterTemp: number;     // Musluk suyu sıcaklığı (°C)
  totalWaterWeight: number; // Tarifteki toplam su miktarı (g)
}

export interface IceCalculationResult {
  iceWeight: number;        // Eklenecek kırılmış buz (g)
  tapWaterWeight: number;   // Eklenecek musluk suyu (g)
  totalWater: number;       // Toplam su (buz + su = total)
}

export type StarterFeedingRatio = "1:1:1" | "1:2:2" | "1:3:3" | "1:4:4" | "1:5:5";

export interface StarterFeedingInput {
  targetStarterWeight: number;      // Hedeflenen aktif maya miktarı (g)
  ratio: StarterFeedingRatio;       // Besleme oranı (Maya : Un : Su)
  ambientTemp: number;              // Mayalanma ortam sıcaklığı (°C)
  targetBakingTime?: Date | string; // Hedef yoğurma saati (isteğe bağlı)
}

export interface StarterFeedingResult {
  seedStarterWeight: number;        // Ana maya (starter) miktarı (g)
  flourWeight: number;              // Eklenecek un (g)
  waterWeight: number;              // Eklenecek su (g)
  totalWeight: number;              // Toplam aktif maya (g)
  estimatedPeakHours: number;       // Zirveye ulaşma tahmini süresi (saat)
  peakWindowStartHours: number;     // Zirve penceresi başlangıcı
  peakWindowEndHours: number;       // Zirve penceresi bitişi
  suggestedFeedingTime?: string;    // Eğer hedef saat verildiyse besleme saati (ISO / HH:mm)
}
