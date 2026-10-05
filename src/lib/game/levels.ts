import type { LevelId, LevelProfile } from "@/types/game";

/**
 * Seviyeler. Köy ekmeği Tahsin'in reçetesidir (docs/OYUN.md §9).
 * %50 siyez: un davranışı literatürden (siyezde zayıf gluten, az su kaldırma, hızlı mayalanma);
 * kesme süresi Tahsin'den (~1 gün). Gece Yarısı (çavdar): Tahsin'in tarifi, kendi motoru (engine/rye.ts).
 */
export const LEVELS: Record<LevelId, LevelProfile> = {
  koy: {
    id: "koy",
    name: "Köy Ekmeği",
    rank: "Çırak",
    blurb: "%50 taş değirmen tam buğday, %50 beyaz un. Atölyenin her gün çıkan ekmeği.",
    maxHydration: 78,
    idealHydration: [74, 78],
    glutenStrength: 1,
    fermentSpeed: 1,
    cutIdealHours: 3,
    crumbColor: "#F2E0B5",
    available: true,
  },
  siyez: {
    id: "siyez",
    name: "%50 Siyez",
    rank: "Kalfa",
    blurb: "İnsanlığın ilk buğdaylarından siyez, güçlü beyaz unla yarı yarıya. Hamuru naz yapar.",
    maxHydration: 72,
    idealHydration: [68, 72],
    glutenStrength: 0.72,
    fermentSpeed: 1.15,
    cutIdealHours: 24,
    crumbColor: "#F1D48A",
    unlockScore: 75,
    available: true,
  },
  gece_yarisi: {
    id: "gece_yarisi",
    name: "Gece Yarısı",
    rank: "Usta",
    blurb: "Mavi haşhaşlı çavdar: haşlama, ekşi maya, düşen fırın. İki gün dinlenir, tek başına bir öğün.",
    maxHydration: 85,
    idealHydration: [80, 85],
    glutenStrength: 0.3,
    fermentSpeed: 0.9,
    cutIdealHours: 48,
    crumbColor: "#6B4A35",
    unlockScore: 80,
    available: true,
  },
};

export const LEVEL_ORDER: LevelId[] = ["koy", "siyez", "gece_yarisi"];

/** 8 ekmeklik parti (Tahsin'in örneği) */
export const FLOUR_GRAMS = 4000;
export const ROOM_TEMP_C = 24;
export const FLOUR_TEMP_C = 22;
export const LEVAIN_TEMP_C = 24;
