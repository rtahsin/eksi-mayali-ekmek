/**
 * EkmekLab — Avrami Nişasta Retrogradasyon & Buharlı Canlandırma Fizik Motoru (M-04D)
 *
 * Fırından çıkan somunda amiloz saatler içinde jel iskeletini kurarken, çok dallanmış
 * amilopektin zincirleri günler boyunca B-tipi çift sarmal kristaller oluşturur.
 * +4°C buzdolabı sıcaklığı çekirdeklenme hızını zirveye taşıyarak sertleşmeyi ~3 kat
 * hızlandırır; 200°C fırında 4 dakikalık buharlı ısıtma ise iç sıcaklığı >60°C DSC
 * erime eşiğinin üzerine çıkararak amilopektin kristallerini yeniden çözer.
 */

import { roundTo } from "./bakersPercentage";

export type StorageMode = "fridge_4c" | "linen_20c" | "freezer_m18c";

export type BreadStarchProfile = "wheat" | "ancient" | "rye";

export type MarkerShape = "square" | "circle" | "diamond";

export interface StorageModeMeta {
  mode: StorageMode;
  label: string;
  shortLabel: string;
  temperatureLabel: string;
  tempC: number;
  /** Avrami hız sabiti k (1/saat) — buğday referans profilinde */
  baseAvramiRate: number;
  /** Sıcaklığa bağlı aşırı soğuma (supercooling) denge kristallik çarpanı */
  equilibriumFactor: number;
  /** Saatlik bağıl nem göçü / su yeniden dağılım katsayısı */
  moistureLossPerHour: number;
  maxMoisturePenalty: number;
  /** WCAG 1.4.1 uyumlu SVG çizgi deseni */
  strokeDasharray: string;
  /** WCAG 1.4.1 uyumlu işaretçi şekli */
  markerShape: MarkerShape;
  markerSymbol: string;
  mechanismNote: string;
}

export interface StarchProfileMeta {
  profile: BreadStarchProfile;
  label: string;
  shortLabel: string;
  subtitle: string;
  /** İlk bıçak / jel oturma penceresi (saat) — docs/BILIM.md §8, §11, §12 */
  restingHours: number;
  /** Buğdaya kıyasla bağıl amilopektin kristalleşme hız çarpanı */
  rateMultiplier: number;
  /** 7 günlük plato kristalleşme tavanı (%) */
  maxCrystallinityPct: number;
  restingWarningTitle: string;
  restingWarningBody: string;
  matrixChemistryNote: string;
}

export interface StalingPointSnapshot {
  mode: StorageMode;
  hours: number;
  day: number;
  /** Isıtma öncesi ham amilopektin kristalleşme indeksi (0-100%) */
  rawCrystallinityPct: number;
  /** Aktif duruma göre (200°C canlandırma dahil) amilopektin kristalleşme indeksi (0-100%) */
  crystallinityPct: number;
  /** 200°C fırınlamayla çözünen kristal payı (%) */
  meltedCrystalPct: number;
  /** İç doku yumuşaklık ve esneklik skoru (0-100) */
  softnessScore: number;
  /** Kabuk gevreklik skoru (0-100) */
  crustCrispnessScore: number;
  /** Kabuk çıtırtı durumu etiketi */
  crustStateLabel: string;
}

export interface StalingSimulationInput {
  profile: BreadStarchProfile;
  /** Fırından çıkıştan itibaren geçen süre (0..168 saat) */
  hours: number;
  /** 200°C'de 4 dk buharlı fırınlama (>60°C DSC kristal erime eşiği) */
  reheatAt200c: boolean;
  /** Zaman serisi örnekleme adımı (varsayılan 6 saat) */
  stepHours?: number;
}

export interface StalingSimulationResult {
  profile: BreadStarchProfile;
  profileMeta: StarchProfileMeta;
  hours: number;
  day: number;
  reheatAt200c: boolean;
  isWithinRestingWindow: boolean;
  restingWarning: {
    title: string;
    body: string;
    remainingHours: number;
  } | null;
  reheatSummary: string;
  selected: Record<StorageMode, StalingPointSnapshot>;
  series: Record<StorageMode, StalingPointSnapshot[]>;
}

export interface ProductLikeForStarch {
  category?: string | null;
  name?: string | null;
  slug?: string | null;
  flourTypes?: readonly string[] | null;
}

export const MAX_STALING_HOURS = 168; // 7 gün
const AVRAMI_EXPONENT = 1.08;
/** >60°C iç sıcaklıkta B-tipi amilopektin kristallerinin ~%86'sı termal olarak çözünür */
const REHEAT_RESIDUAL_CRYSTAL_FACTOR = 0.14;

export const STORAGE_MODES: readonly StorageMode[] = [
  "fridge_4c",
  "linen_20c",
  "freezer_m18c",
] as const;

export const BREAD_STARCH_PROFILES: readonly BreadStarchProfile[] = [
  "wheat",
  "ancient",
  "rye",
] as const;

export const STORAGE_MODE_META: Record<StorageMode, StorageModeMeta> = {
  fridge_4c: {
    mode: "fridge_4c",
    label: "+4°C Buzdolabı (Bayatlama Tuzağı)",
    shortLabel: "+4°C Buzdolabı",
    temperatureLabel: "+4 °C",
    tempC: 4,
    baseAvramiRate: 0.042, // Oda sıcaklığının ~3 katı çekirdeklenme hızı
    equilibriumFactor: 1.0,
    moistureLossPerHour: 0.1,
    maxMoisturePenalty: 16,
    strokeDasharray: "7 4",
    markerShape: "square",
    markerSymbol: "■",
    mechanismNote:
      "Amilopektin B-tipi kristal çekirdeklenme hızı +4°C civarında zirve yapar; Avrami hız sabiti oda sıcaklığının yaklaşık 3 katına çıkar.",
  },
  linen_20c: {
    mode: "linen_20c",
    label: "+20°C Bez Torba / Kese Kâğıdı",
    shortLabel: "+20°C Bez Torba",
    temperatureLabel: "+20 °C",
    tempC: 20,
    baseAvramiRate: 0.014,
    equilibriumFactor: 0.82,
    moistureLossPerHour: 0.09,
    maxMoisturePenalty: 14,
    strokeDasharray: "none",
    markerShape: "circle",
    markerSymbol: "●",
    mechanismNote:
      "Nefes alan keten veya kese kâğıdı kabuktaki buharı dengeler; ekşi maya organik asitleri ve polisakkaritler su tutuşunu destekler.",
  },
  freezer_m18c: {
    mode: "freezer_m18c",
    label: "-18°C Dilimli Derin Dondurucu",
    shortLabel: "-18°C Dondurucu",
    temperatureLabel: "-18 °C",
    tempC: -18,
    baseAvramiRate: 0.0012,
    equilibriumFactor: 0.12,
    moistureLossPerHour: 0.018,
    maxMoisturePenalty: 3.5,
    strokeDasharray: "2 4",
    markerShape: "diamond",
    markerSymbol: "◆",
    mechanismNote:
      "Cam geçiş sıcaklığının altında su hareketliliği durur; amilopektin çift sarmal kristalleşmesi neredeyse sıfırlanır.",
  },
};

export const STARCH_PROFILE_META: Record<BreadStarchProfile, StarchProfileMeta> = {
  wheat: {
    profile: "wheat",
    label: "Taş Değirmen Köy (Buğday)",
    shortLabel: "Köy (Buğday)",
    subtitle: "Gluten-nişasta ağı · 3 saat ilk bıçak dinlenmesi",
    restingHours: 3,
    rateMultiplier: 1.0,
    maxCrystallinityPct: 86,
    restingWarningTitle:
      "Bıçağı henüz vurma: nişasta ve su buharı jel ağında oturuyor",
    restingWarningBody:
      "Taş değirmen buğday somununda ilk 3 saat boyunca iç sıcaklık düşerken serbest buhar gözenek duvarlarına yerleşir ve amiloz jeli kesilebilir iskeletini kurar.",
    matrixChemistryNote:
      "Açık gözenekli gluten-nişasta matrisi; ilk gün çıtır kabuk verir, 2. günden sonra dilimleyip -18°C dondurucuya almak dokuyu sabitler.",
  },
  ancient: {
    profile: "ancient",
    label: "Siyez / Karakılçık",
    shortLabel: "Siyez / Karakılçık",
    subtitle: "Atalık tahıl matrisi · 24 saat iç jel oturması",
    restingHours: 24,
    rateMultiplier: 0.76,
    maxCrystallinityPct: 78,
    restingWarningTitle:
      "Bıçağı henüz vurma: nişasta ve su buharı jel ağında oturuyor",
    restingWarningBody:
      "Siyez, karakılçık ve kavılca gibi atalık buğdaylarda düşük elastikiyetli gluten ağındaki suyun homojen dağılması ve karotenoidce zengin iç dokunun oturması 24 saat sürer.",
    matrixChemistryNote:
      "Sıkı gözenekli atalık tane matrisi ve lipit-amiloz etkileşimi, standart buğdaya kıyasla kristalleşme eğrisini daha yatay tutar.",
  },
  rye: {
    profile: "rye",
    label: "Çavdar (Pentozan Ağı)",
    shortLabel: "Çavdar (Pentozan)",
    subtitle: "Arabinoksilan jeli · 48 saat nem ve nişasta oturması",
    restingHours: 48,
    rateMultiplier: 0.52,
    maxCrystallinityPct: 64,
    restingWarningTitle:
      "Bıçağı henüz vurma: nişasta ve su buharı jel ağında oturuyor",
    restingWarningBody:
      "Çavdar hamuru gluten ağı kurmaz; yapıyı arabinoksilan (pentozan) su jeli taşır. Bıçağa yapışmayan net dilim dokusu için nemin dağılması 48 saat ister.",
    matrixChemistryNote:
      "Pentozan sünger jeli ve yoğun çavdar ekşi mayası asitliği suyu matriste hapseder; amilopektin sertleşmesi buğdaya göre belirgin biçimde yavaş ilerler.",
  },
};

export const REHEAT_THERMAL_EXPLANATION =
  "200°C fırında 4 dakikalık buharlı ısıtma, somun merkezini >60°C DSC kristal erime eşiğinin üzerine çıkarır: amilopektin çift sarmalları çözünür, su yeniden jel ağına katılır ve kabuk gevrekleşir.";

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function normalizeAsciiTr(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

/**
 * Ürün bilgisinden (`category`, `name`, `slug`, `flourTypes`) nişasta profilini çıkarır.
 */
export function inferBreadStarchProfile(
  product?: ProductLikeForStarch | null
): BreadStarchProfile {
  if (!product) return "wheat";

  const haystack = normalizeAsciiTr(
    [
      product.category ?? "",
      product.name ?? "",
      product.slug ?? "",
      ...(product.flourTypes ?? []),
    ].join(" ")
  );

  if (
    haystack.includes("cavdar") ||
    haystack.includes("rye") ||
    haystack.includes("gece yarisi") ||
    haystack.includes("gece-yarisi")
  ) {
    return "rye";
  }

  if (
    haystack.includes("siyez") ||
    haystack.includes("karakilcik") ||
    haystack.includes("kavilca") ||
    haystack.includes("emmer") ||
    haystack.includes("gernik") ||
    haystack.includes("atalik") ||
    haystack.includes("ata tohum")
  ) {
    return "ancient";
  }

  return "wheat";
}

function computeCrustState(
  mode: StorageMode,
  hours: number,
  reheatAt200c: boolean,
  profile: BreadStarchProfile
): { score: number; label: string } {
  if (hours <= 2) {
    return {
      score: profile === "rye" ? 86 : 96,
      label: "Fırın Çıkışı Çıtır Kabuk",
    };
  }

  if (reheatAt200c) {
    return {
      score: profile === "rye" ? 84 : 92,
      label: "200°C Sonrası Yeniden Çıtır Kabuk",
    };
  }

  if (mode === "fridge_4c") {
    const score = clamp(Math.round(72 - hours * 0.45), 22, 72);
    return {
      score,
      label:
        hours < 18
          ? "Soğukta Nem Çekmiş Yarı-Yumuşak Kabuk"
          : "İçten Göçen Nemle Yumuşamış Kabuk",
    };
  }

  if (mode === "linen_20c") {
    const score = clamp(Math.round(88 - hours * 0.34), 38, 88);
    if (hours <= 18) {
      return { score, label: "Dengeli Gevrek Kabuk" };
    }
    if (hours <= 72) {
      return { score, label: "Nefes Alan Esnek Kabuk" };
    }
    return { score, label: "Kurumaya Başlayan Sert Kabuk" };
  }

  // freezer_m18c
  const score = clamp(Math.round(84 - hours * 0.04), 74, 86);
  return {
    score,
    label: "Dondurucuda Kilitli Kabuk (Fırınlanınca Çıtır)",
  };
}

/**
 * Tek bir saat ve saklama modu için Avrami kristalleşme ve doku durumunu hesaplar.
 */
export function calculateStalingPoint(
  profile: BreadStarchProfile,
  mode: StorageMode,
  rawHours: number,
  reheatAt200c: boolean
): StalingPointSnapshot {
  const hours = clamp(rawHours, 0, MAX_STALING_HOURS);
  const profileMeta = STARCH_PROFILE_META[profile];
  const modeMeta = STORAGE_MODE_META[mode];

  const effectiveRate = modeMeta.baseAvramiRate * profileMeta.rateMultiplier;
  const avramiFraction =
    hours === 0 ? 0 : 1 - Math.exp(-Math.pow(effectiveRate * hours, AVRAMI_EXPONENT));

  const rawCrystallinity = roundTo(
    clamp(
      profileMeta.maxCrystallinityPct * modeMeta.equilibriumFactor * avramiFraction,
      0,
      100
    ),
    1
  );

  const activeCrystallinity =
    reheatAt200c && hours > 0
      ? roundTo(rawCrystallinity * REHEAT_RESIDUAL_CRYSTAL_FACTOR, 1)
      : rawCrystallinity;

  const meltedCrystalPct = roundTo(
    Math.max(0, rawCrystallinity - activeCrystallinity),
    1
  );

  const rawMoisturePenalty = Math.min(
    modeMeta.maxMoisturePenalty,
    hours * modeMeta.moistureLossPerHour * profileMeta.rateMultiplier
  );
  const effectiveMoisturePenalty =
    reheatAt200c && hours > 0 ? rawMoisturePenalty * 0.35 : rawMoisturePenalty;

  const softnessScore = clamp(
    Math.round(100 - activeCrystallinity * 0.82 - effectiveMoisturePenalty),
    8,
    100
  );

  const crust = computeCrustState(mode, hours, reheatAt200c, profile);

  return {
    mode,
    hours: roundTo(hours, 1),
    day: roundTo(hours / 24, 2),
    rawCrystallinityPct: rawCrystallinity,
    crystallinityPct: activeCrystallinity,
    meltedCrystalPct,
    softnessScore,
    crustCrispnessScore: crust.score,
    crustStateLabel: crust.label,
  };
}

/**
 * 0..168 saat (7 gün) boyunca 3 saklama ortamının tam eğrisini ve seçili anın
 * karşılaştırmalı okumalarını üretir.
 */
export function simulateStalingCurve(
  input: StalingSimulationInput
): StalingSimulationResult {
  const profile = input.profile;
  const hours = clamp(input.hours, 0, MAX_STALING_HOURS);
  const reheatAt200c = Boolean(input.reheatAt200c);
  const stepHours = clamp(input.stepHours ?? 6, 1, 24);
  const profileMeta = STARCH_PROFILE_META[profile];

  const timePoints: number[] = [];
  for (let h = 0; h <= MAX_STALING_HOURS; h += stepHours) {
    timePoints.push(h);
  }
  if (timePoints[timePoints.length - 1] !== MAX_STALING_HOURS) {
    timePoints.push(MAX_STALING_HOURS);
  }

  const series: Record<StorageMode, StalingPointSnapshot[]> = {
    fridge_4c: timePoints.map((h) =>
      calculateStalingPoint(profile, "fridge_4c", h, reheatAt200c)
    ),
    linen_20c: timePoints.map((h) =>
      calculateStalingPoint(profile, "linen_20c", h, reheatAt200c)
    ),
    freezer_m18c: timePoints.map((h) =>
      calculateStalingPoint(profile, "freezer_m18c", h, reheatAt200c)
    ),
  };

  const selected: Record<StorageMode, StalingPointSnapshot> = {
    fridge_4c: calculateStalingPoint(profile, "fridge_4c", hours, reheatAt200c),
    linen_20c: calculateStalingPoint(profile, "linen_20c", hours, reheatAt200c),
    freezer_m18c: calculateStalingPoint(
      profile,
      "freezer_m18c",
      hours,
      reheatAt200c
    ),
  };

  const isWithinRestingWindow = hours < profileMeta.restingHours;
  const restingWarning = isWithinRestingWindow
    ? {
        title: profileMeta.restingWarningTitle,
        body: profileMeta.restingWarningBody,
        remainingHours: roundTo(profileMeta.restingHours - hours, 1),
      }
    : null;

  return {
    profile,
    profileMeta,
    hours: roundTo(hours, 1),
    day: roundTo(hours / 24, 1),
    reheatAt200c,
    isWithinRestingWindow,
    restingWarning,
    reheatSummary: REHEAT_THERMAL_EXPLANATION,
    selected,
    series,
  };
}
