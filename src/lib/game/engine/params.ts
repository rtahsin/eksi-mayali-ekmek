import type { FlourKind, Guild, Matrix, StarterSpot } from "@/types/game";

/**
 * Simülasyon sabitleri. Sayılar literatürden (docs/BILIM.md) alınıp oyun için yuvarlanmıştır;
 * amaç laboratuvar doğruluğu değil, yönün ve büyüklüğün doğru olmasıdır.
 */

export interface GuildParams {
  /** En iyi koşulda özgül büyüme hızı (ln birim / saat) */
  muOpt: number;
  /** Kardinal sıcaklıklar (°C): altında/üstünde büyüme yok */
  Tmin: number;
  Topt: number;
  Tmax: number;
  /** Büyümenin durduğu pH ve tam hıza ulaştığı pH */
  pHmin: number;
  pHopt: number;
  /** Taşıma kapasitesi (log10 KOB/g) */
  maxLog: number;
  /** Etkinlik başına gaz (göreli birim / saat) */
  gas: number;
  /** Etkinlik başına asit (mmol/kg/saat) */
  acid: number;
  /** Ürettiği asidin asetik payı (heterofermentatif canlılarda yüksek) */
  aceticShare: number;
  /** Etkinlik başına şeker tüketimi (g/kg/saat) */
  sugarUse: number;
  /** pH sınırın altına inince ölüm hızı (log10/saat, pH birimi başına) */
  acidDeath: number;
}

/**
 * Loncalar.
 * - lacS: F. sanfranciscensis ~32 °C'de en hızlı, ~38 °C üstünde büyümez; aside çok dayanıklı (Gänzle ve ark. 1998).
 * - yst: K. humilis (C. milleri) ~27 °C'de en hızlı, ~35 °C üstünde büyümez (Gänzle ve ark. 1998).
 * - ent: enterobakteriler nötr pH'ta hızlı, pH ~4,5 altında çekilir (De Vuyst ve ark.; Ercolini ve ark. 2013).
 * - lacP: öncü LAB (Leuconostoc, Weissella, Lactococcus) ılımlı sıcaklık, orta asit dayanımı.
 */
export const GUILDS: Record<Guild, GuildParams> = {
  ent: { muOpt: 1.1, Tmin: 5, Topt: 37, Tmax: 46, pHmin: 4.5, pHopt: 6.3, maxLog: 9.0, gas: 1.3, acid: 2.5, aceticShare: 0.45, sugarUse: 0.5, acidDeath: 0.55 },
  lacP: { muOpt: 0.7, Tmin: 2, Topt: 28, Tmax: 38, pHmin: 4.1, pHopt: 6.2, maxLog: 9.2, gas: 0.06, acid: 3.0, aceticShare: 0.3, sugarUse: 0.5, acidDeath: 0.3 },
  lacS: { muOpt: 0.62, Tmin: 3, Topt: 33, Tmax: 41, pHmin: 3.55, pHopt: 5.6, maxLog: 9.5, gas: 0.05, acid: 1.5, aceticShare: 0.22, sugarUse: 0.27, acidDeath: 0.08 },
  yst: { muOpt: 0.23, Tmin: 6, Topt: 27, Tmax: 36, pHmin: 2.8, pHopt: 4.5, maxLog: 7.8, gas: 3.2, acid: 0, aceticShare: 0, sugarUse: 0.45, acidDeath: 0.05 },
};

/**
 * Pişirme günü hamurundaki maya: olgun mayada K. humilis ile S. cerevisiae birlikte yaşar; S. cerevisiae
 * gaz üretiminde daha sıcakta (~32–36 °C) en hızlıdır. Hamurda bu karışımın ortalaması kullanılır (ılık hamur hızlanır).
 */
export const DOUGH_YEAST: GuildParams = { ...GUILDS.yst, muOpt: 0.28, Topt: 34, Tmax: 42 };

export interface FlourParams {
  label: string;
  /** Unun getirdiği canlılar (log10 KOB/g un) */
  inoculum: Record<Guild, number>;
  /** Başlangıçta serbest şeker (g/kg un) */
  sugar: number;
  /** Amilazın kesebileceği hasarlı nişasta (g/kg un) */
  damagedStarch: number;
  /** Amilaz gücü (göreli) */
  amylase: number;
  /** Tampon kapasitesi (kepek ve mineral arttıkça pH daha yavaş düşer) */
  buffer: number;
  /** Mikroplar için besin zenginliği (vitamin, mineral, amino asit) */
  nutrients: number;
}

export const FLOURS: Record<FlourKind, FlourParams> = {
  beyaz: {
    label: "Beyaz un",
    inoculum: { ent: 3.6, lacP: 3.0, lacS: 0.3, yst: 1.6 },
    sugar: 12,
    damagedStarch: 55,
    amylase: 0.9,
    buffer: 1.0,
    nutrients: 0.9,
  },
  tam_bugday: {
    label: "Tam buğday",
    inoculum: { ent: 4.6, lacP: 4.0, lacS: 0.8, yst: 1.8 },
    sugar: 15,
    damagedStarch: 60,
    amylase: 1.0,
    buffer: 1.3,
    nutrients: 1.0,
  },
  tam_cavdar: {
    label: "Tam çavdar",
    inoculum: { ent: 5.0, lacP: 4.4, lacS: 1.2, yst: 2.2 },
    sugar: 22,
    damagedStarch: 60,
    amylase: 1.5,
    buffer: 1.45,
    nutrients: 1.15,
  },
};

export const SPOT_TEMP: Record<StarterSpot, number> = { serin: 18, tezgah: 24, ilik: 28 };

export interface MatrixParams {
  /** Gluten ağı kurma kapasitesi (köy buğday karışımı = 1) */
  glutenCapacity: number;
  /** Proteaz hasarına dayanıklılık (zayıf ağ daha çabuk çözülür) */
  glutenRobust: number;
  /** Nişastanın jelleşmeye başladığı ve bitirdiği sıcaklık (°C) */
  gelStart: number;
  gelEnd: number;
  /** α-amilazın fırında söndüğü sıcaklık (°C) */
  amylaseOff: number;
  /** Fırında amilazın jelleşmiş nişastaya saldırı gücü */
  ovenAmylase: number;
  /** Mayalanma hızına etkisi (şeker ve enzim zenginliği) */
  fermentBoost: number;
  /** Tampon (pH düşüşünü yavaşlatır) */
  buffer: number;
}

export const MATRIX: Record<Matrix, MatrixParams> = {
  bugday: { glutenCapacity: 1, glutenRobust: 1, gelStart: 60, gelEnd: 80, amylaseOff: 84, ovenAmylase: 0.35, fermentBoost: 1, buffer: 0.8 },
  siyez: { glutenCapacity: 0.66, glutenRobust: 0.7, gelStart: 60, gelEnd: 80, amylaseOff: 84, ovenAmylase: 0.4, fermentBoost: 1.12, buffer: 0.85 },
  cavdar: { glutenCapacity: 0.12, glutenRobust: 0.5, gelStart: 52, gelEnd: 70, amylaseOff: 90, ovenAmylase: 1, fermentBoost: 1.1, buffer: 0.8 },
};

/** Laktik asidin pKa'sı 3,86; asetiğin 4,76 (ayrışmamış asit, hücre zarından geçip içeriden zarar verir) */
export const PKA_LACTIC = 3.86;
export const PKA_ACETIC = 4.76;

/** Un-su karışımının başlangıç pH'ı */
export const PH_FLOUR = 6.2;
/** Tampon modelinde inilebilecek en düşük pH */
export const PH_FLOOR = 3.35;

/** Pişirme günü: 8 ekmeklik parti */
export const FLOUR_GRAMS = 4000;
export const ROOM_TEMP_C = 24;
export const FLOUR_TEMP_C = 22;
export const LEVAIN_TEMP_C = 24;
export const FRIDGE_C = 4;
/** Dolapta geçen gece (saat) */
export const FRIDGE_HOURS = 12;
