import type { Guild, Populations } from "@/types/game";
import { GUILDS, PH_FLOOR, PH_FLOUR } from "./params";

/** Mikrobiyal kinetik: büyüme, asit, gaz, enzimler. Saf fonksiyonlar. */

export const GUILD_LIST: Guild[] = ["ent", "lacP", "lacS", "yst"];

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * Kardinal sıcaklık modeli (CTMI, Rosso ve ark. 1993): Topt'ta 1, Tmin ve Tmax'ta 0.
 * Mikrobiyolojide büyüme hızının sıcaklıkla değişimini tek eğriyle anlatır.
 */
export function ctmi(T: number, Tmin: number, Topt: number, Tmax: number): number {
  if (T <= Tmin || T >= Tmax) return 0;
  const num = (T - Tmax) * (T - Tmin) ** 2;
  const den = (Topt - Tmin) * ((Topt - Tmin) * (T - Topt) - (Topt - Tmax) * (Topt + Tmin - 2 * T));
  return clamp(num / den);
}

/** Asit birikimi → pH (tampon modeli; kepek/mineral tamponu pH düşüşünü yavaşlatır) */
export function pHFromAcid(acidMmolPerKg: number, buffer: number, pH0 = PH_FLOUR): number {
  return PH_FLOOR + (pH0 - PH_FLOOR) * Math.exp(-Math.max(0, acidMmolPerKg) / (60 * buffer));
}

/**
 * Amilaz (α+β): ~60 °C civarında en etkin, ~85 °C'de söner; düşük pH'ta (≈ 4,3 altı) frenlenir.
 * Hamur sıcaklığında optimumun yaklaşık üçte biri kadar çalışır.
 */
export function amylaseActivity(T: number, pH: number, offC = 85): number {
  return ctmi(T, -2, 62, offC) * sigmoid((pH - 4.3) / 0.2);
}

/** Tahıl proteazları (aspartik proteinazlar): düşük pH'ta (≈ 3,5–4,5) uyanır, ~45 °C'de en hızlı */
export function proteaseActivity(T: number, pH: number): number {
  return ctmi(T, 0, 45, 72) * gauss(pH, 3.9, 0.55);
}

/** Fitaz: pH ~5–5,5 ve ~50 °C civarında en etkin */
export function phytaseActivity(T: number, pH: number): number {
  return ctmi(T, 0, 50, 72) * gauss(pH, 5.2, 0.7);
}

/** Bir loncanın verilen koşullarda büyüme hızı (ln/saat) */
export function growthRate(g: Guild, logN: number, T: number, pH: number, sugar: number, nutrients: number): number {
  const p = GUILDS[g];
  const tau = ctmi(T, p.Tmin, p.Topt, p.Tmax);
  const phi = pH <= p.pHmin ? 0 : clamp((pH - p.pHmin) / (p.pHopt - p.pHmin)) ** 0.8;
  const sF = sugar / (sugar + 1.2);
  const room = 1 - 10 ** (logN - p.maxLog);
  // Mayalar vitamin ve mineral ister: tam tahıl unu onları belirgin hızlandırır
  const feed = g === "yst" ? nutrients ** 1.5 : Math.sqrt(nutrients);
  return p.muOpt * tau * phi * sF * feed * Math.max(0, room);
}

/** Metabolik etkinlik (büyümeden bağımsız: durağan fazda da asit ve gaz üretilir) */
export function activity(g: Guild, logN: number, T: number, pH: number, sugar: number): number {
  const p = GUILDS[g];
  const tau = ctmi(T, p.Tmin - 4, p.Topt, p.Tmax + 1);
  const lo = p.pHmin - 0.35;
  const phi = clamp((pH - lo) / (p.pHopt - lo));
  const sF = sugar / (sugar + 1.2);
  return 10 ** (logN - 8) * tau * phi * sF;
}

export interface FermentState {
  pop: Populations;
  /** g/kg */
  sugar: number;
  /** Amilazın kesebileceği hasarlı nişasta (g/kg) */
  dstarch: number;
  /** mmol/kg */
  lactic: number;
  acetic: number;
  /** Toplam üretilen gaz (göreli) */
  gasCum: number;
  /** Proteaz hasarı 0–1 */
  damage: number;
}

export interface FermentEnv {
  T: number;
  dtH: number;
  buffer: number;
  /** Unun amilaz gücü */
  amylase: number;
  nutrients: number;
  /** Asetik payını artıran çarpan (sıkı maya, serin ortam) */
  aceticMod: number;
  /** Ağın proteaza dayanıklılığı */
  robust: number;
  /** Canlıların hız çarpanı (tuz ozmotik olarak yavaşlatır; yoksa 1) */
  rateMul?: number;
}

export interface StepOut {
  s: FermentState;
  pH: number;
  /** Bu adımda üretilen gaz */
  gas: number;
  amylase: number;
  protease: number;
  phytase: number;
}

/** Amilazın hasarlı nişastadan maltoz üretme katsayısı (g/kg/saat, tam etkinlikte) */
const K_AMYLASE = 6;
/** Proteazın ağı çözme katsayısı (/saat, tam etkinlikte) */
const K_PROTEASE = 0.3;

/** 1 zaman adımı (Euler). Sıcaklığa, pH'a, şekere göre nüfus, asit, gaz, enzim. */
export function fermentStep(s: FermentState, env: FermentEnv): StepOut {
  const { T, dtH } = env;
  const pH = pHFromAcid(s.lactic + s.acetic, env.buffer);
  const pop = { ...s.pop };
  let sugarUse = 0;
  let lac = 0;
  let ac = 0;
  let gas = 0;
  const acMod = env.aceticMod * clamp(1 + 0.035 * (28 - T), 0.7, 1.6);
  const rm = env.rateMul ?? 1;

  for (const g of GUILD_LIST) {
    const p = GUILDS[g];
    const logN = s.pop[g];
    const mu = growthRate(g, logN, T, pH, s.sugar, env.nutrients);
    let death = 0;
    if (pH < p.pHmin) death += p.acidDeath * (p.pHmin - pH);
    if (s.sugar < 0.25) death += 0.008;
    pop[g] = Math.max(-1, logN + ((mu * rm) / Math.LN10 - death) * dtH);
    const a = activity(g, logN, T, pH, s.sugar) * rm;
    sugarUse += p.sugarUse * a;
    const share = clamp(p.aceticShare * acMod, 0, 0.6);
    lac += p.acid * (1 - share) * a;
    ac += p.acid * share * a;
    gas += p.gas * a;
  }

  // Şeker yetmezse tüm üretim orantılı kısılır
  const need = sugarUse * dtH;
  const scale = need > s.sugar && need > 0 ? s.sugar / need : 1;
  const amy = amylaseActivity(T, pH);
  const made = Math.min(s.dstarch, K_AMYLASE * env.amylase * amy * (s.dstarch / (s.dstarch + 15)) * dtH);
  const prot = proteaseActivity(T, pH);
  const next: FermentState = {
    pop,
    sugar: Math.max(0, s.sugar - need * scale + made),
    dstarch: s.dstarch - made,
    lactic: s.lactic + lac * scale * dtH,
    acetic: s.acetic + ac * scale * dtH,
    gasCum: s.gasCum + gas * scale * dtH,
    damage: clamp(s.damage + (K_PROTEASE * prot * (1 - s.damage) * dtH) / env.robust),
  };
  return { s: next, pH, gas: gas * scale, amylase: amy, protease: prot, phytase: phytaseActivity(T, pH) };
}

/** İki kültürü karıştır (ör. maya + taze un/su). w = birincinin kütle payı. */
export function mixPop(a: Populations, b: Populations, w: number): Populations {
  const out = {} as Populations;
  for (const g of GUILD_LIST) {
    const v = w * 10 ** a[g] + (1 - w) * 10 ** b[g];
    out[g] = v > 0 ? Math.log10(v) : -1;
  }
  return out;
}
