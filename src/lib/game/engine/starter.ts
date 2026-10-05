import type {
  FeedRatio,
  FlourKind,
  MicroSnapshot,
  Populations,
  StarterDay,
  StarterDayDecision,
  StarterProfile,
  StarterSmell,
  StarterStageKey,
  StarterState,
} from "@/types/game";
import { FLOURS, SPOT_TEMP } from "./params";
import { clamp, fermentStep, mixPop, pHFromAcid, type FermentEnv, type FermentState } from "./kinetics";

/**
 * Bölüm 1: unla suyu karıştırıp kendiliğinden ekşi maya yakalamak.
 * Gerçek ardışıklık (De Vuyst ve ark.; Van Kerrebroeck ve ark. 2017): ilk gün enterobakteriler ve öncüler
 * çoğalır (gazlı "sahte kabarma", kötü koku), asit birikip pH ~4,5 altına inince çekilirler; aside dayanıklı
 * laktik bakteriler baskın olur; mayalar birkaç gün sonra yerleşir ve düzenli kabarmayı onlar getirir.
 */

const STEP_H = 0.25;
/** Un:su 1:1 macun → kütlenin yarısı un */
const FLOUR_FRACTION = 0.5;

function freshPaste(flour: FlourKind): FermentState {
  const f = FLOURS[flour];
  const pop = {} as Populations;
  for (const [g, v] of Object.entries(f.inoculum) as [keyof Populations, number][]) pop[g] = v + Math.log10(FLOUR_FRACTION);
  return {
    pop,
    sugar: f.sugar * FLOUR_FRACTION,
    dstarch: f.damagedStarch * FLOUR_FRACTION,
    lactic: 0,
    acetic: 0,
    gasCum: 0,
    damage: 0,
  };
}

const RATIO_OLD_SHARE: Record<FeedRatio, number> = { "1:1:1": 1 / 3, "1:2:2": 1 / 5, "1:5:5": 1 / 11 };

/** Taze kavanoz: gün 0, henüz karıştırılmadı (ilk gün "besle" = un + su karıştırmak) */
export function newStarter(flour: FlourKind): StarterState {
  const p = freshPaste(flour);
  return {
    day: 0,
    flour,
    pop: p.pop,
    pH: pHFromAcid(0, FLOURS[flour].buffer),
    lactic: 0,
    acetic: 0,
    sugar: p.sugar,
    hungryDays: 0,
    ruined: false,
  };
}

function toFerment(s: StarterState): FermentState {
  return {
    pop: { ...s.pop },
    sugar: s.sugar,
    dstarch: 0,
    lactic: s.lactic,
    acetic: s.acetic,
    gasCum: 0,
    damage: 0,
  };
}

function feed(s: StarterState, ratio: FeedRatio | "yok", firstDay: boolean): FermentState {
  const fresh = freshPaste(s.flour);
  if (firstDay) return fresh;
  const cur = toFerment(s);
  if (ratio === "yok") return cur;
  const w = RATIO_OLD_SHARE[ratio];
  return {
    pop: mixPop(cur.pop, fresh.pop, w),
    sugar: w * cur.sugar + (1 - w) * fresh.sugar,
    dstarch: (1 - w) * fresh.dstarch,
    lactic: w * cur.lactic,
    acetic: w * cur.acetic,
    gasCum: 0,
    damage: 0,
  };
}

export interface StarterRun {
  samples: { t: number; s: FermentState; pH: number; gasRate: number; entGas: number; amylase: number; protease: number; phytase: number }[];
  rise: number[];
}

/** Kavanozu 24 saat (ya da verilen süre) çalıştır; saatlik örnek + kabarma */
export function runJar(start: FermentState, flour: FlourKind, tempC: number, hours = 24): StarterRun {
  const f = FLOURS[flour];
  const env: FermentEnv = {
    T: tempC,
    dtH: STEP_H,
    buffer: f.buffer,
    amylase: f.amylase,
    nutrients: f.nutrients,
    aceticMod: 1,
    robust: 0.8,
  };
  let s = start;
  let rise = 0;
  const out: StarterRun = { samples: [], rise: [] };
  const steps = Math.round(hours / STEP_H);
  for (let i = 0; i <= steps; i++) {
    const t = i * STEP_H;
    const r = fermentStep(s, env);
    // Enterobakteri gazı: payını ayrıca izle (sahte kabarmayı tanımak için)
    const entOnly = fermentStep({ ...s, pop: { ...s.pop, lacP: -1, lacS: -1, yst: -1 } }, env).gas;
    // Kabarma: gaz üretimi macunu şişirir; ağ zayıfladıkça ve gaz azaldıkça gaz kaçar, kavanoz iner
    const leak = 0.12 + 0.5 * s.damage;
    rise = Math.max(0, rise + (1.3 * r.gas * (1 - rise / 2.2) - leak * rise) * STEP_H);
    if (Math.abs(t - Math.round(t)) < 1e-6) {
      out.samples.push({ t, s, pH: r.pH, gasRate: r.gas, entGas: entOnly, amylase: r.amylase, protease: r.protease, phytase: r.phytase });
      out.rise.push(rise);
    }
    s = r.s;
  }
  return out;
}

function snapshotOf(x: StarterRun["samples"][number], rise: number, flour: FlourKind, tempC: number): MicroSnapshot {
  const sugar0 = FLOURS[flour].sugar * FLOUR_FRACTION;
  return {
    t: x.t,
    phase: "kavanoz",
    matrix: flour === "tam_cavdar" ? "cavdar" : "bugday",
    tempC,
    pH: x.pH,
    pop: x.s.pop,
    sugar: clamp(x.s.sugar / (sugar0 * 1.2)),
    damagedStarch: clamp(x.s.dstarch / (FLOURS[flour].damagedStarch * FLOUR_FRACTION)),
    water: 1,
    dissolvedCO2: clamp(x.gasRate / 0.8),
    gas: rise,
    glutenDev: flour === "tam_cavdar" ? 0.35 : 0.25,
    glutenDamage: x.s.damage,
    glutenAlign: 0,
    salt: 0,
    lactic: x.s.lactic,
    acetic: x.s.acetic,
    amylase: x.amylase,
    protease: x.protease,
    phytase: x.phytase,
  };
}

function classify(
  st: StarterState,
  dec: StarterDayDecision,
  run: StarterRun,
  peakRise: number,
  peakHour: number,
  hooch: boolean
): { stage: StarterStageKey; smell: StarterSmell } {
  if (st.ruined) return { stage: "kuf", smell: "kuf" };
  const end = run.samples[run.samples.length - 1];
  const pop = end.s.pop;
  const totalGas = run.samples.reduce((a, x) => a + x.gasRate, 0);
  const entGas = run.samples.reduce((a, x) => a + x.entGas, 0);
  const entShare = totalGas > 0 ? entGas / totalGas : 0;
  const acidTotal = end.s.lactic + end.s.acetic;
  const acShare = acidTotal > 0 ? end.s.acetic / acidTotal : 0;

  if (hooch && dec.feed === "yok") return { stage: "ac", smell: "aseton" };
  // Hazır: işlevle tanımlanır (tür adıyla değil): beslemeden sonra ≤ 9 saatte iki katı, yerleşik maya, öncüler çekilmiş, asit oturmuş
  if (peakRise >= 0.9 && peakHour <= 9 && pop.yst >= 6.6 && pop.ent < 4.5 && end.pH < 4.2 && dec.feed !== "yok")
    return { stage: "hazir", smell: acShare > 0.3 ? "elma" : "meyve" };
  if (peakRise >= 0.3 && entShare > 0.45) return { stage: "sahte_kabarma", smell: end.pH > 5.0 && pop.ent > 8.3 ? "kusmuk" : "peynir" };
  if (pop.yst >= 6.4 && peakRise >= 0.45) return { stage: "uyaniyor", smell: acShare > 0.32 ? "sirke" : "yogurt" };
  if (end.pH < 4.7) return { stage: "sessizlik", smell: acShare > 0.32 ? "sirke" : "yogurt" };
  if (peakRise < 0.15 || end.pH > 5) return { stage: "uyku", smell: st.day <= 1 ? "un" : "peynir" };
  return { stage: "sessizlik", smell: "yogurt" };
}

/** Bir günü oyna: sabah karar (yer + besleme), 24 saat akış, akşam durum */
export function runStarterDay(st: StarterState, dec: StarterDayDecision): { next: StarterState; day: StarterDay } {
  const dayNo = st.day + 1;
  const tempC = SPOT_TEMP[dec.spot];
  const firstDay = st.day === 0;
  const hungryDays = firstDay || dec.feed !== "yok" ? 0 : st.hungryDays + 1;
  const ruined = st.ruined || hungryDays >= 3;
  const start = feed(st, firstDay ? "1:1:1" : dec.feed, firstDay);
  const run = runJar(start, st.flour, tempC);
  let peakRise = 0;
  let peakHour = 0;
  run.rise.forEach((r, h) => {
    if (r > peakRise) {
      peakRise = r;
      peakHour = h;
    }
  });
  const end = run.samples[run.samples.length - 1];
  const hungryHours = run.samples.filter((x) => x.s.sugar < 0.4).length;
  const hooch = hungryHours >= 8 && end.s.lactic + end.s.acetic > 120;
  const next: StarterState = {
    day: dayNo,
    flour: st.flour,
    pop: end.s.pop,
    pH: end.pH,
    lactic: end.s.lactic,
    acetic: end.s.acetic,
    sugar: end.s.sugar,
    hungryDays,
    ruined,
  };
  const { stage, smell } = classify(next, dec, run, peakRise, peakHour, hooch);
  return {
    next,
    day: {
      day: dayNo,
      decision: dec,
      hours: run.samples.map((x, i) => snapshotOf(x, run.rise[i], st.flour, tempC)),
      rise: run.rise,
      peakRise,
      peakHour,
      smell,
      hooch,
      stage,
    },
  };
}

/** Standart test: 1:1:1 besle, 24 °C'de 12 saat; iki katına çıkma süresi ve asitlik */
export function testFeed(st: StarterState): { doubleHour: number | null; peakRise: number; pH12: number; aceticShare: number } {
  const run = runJar(feed(st, "1:1:1", false), st.flour, 24, 12);
  const idx = run.rise.findIndex((r) => r >= 1);
  const end = run.samples[run.samples.length - 1];
  const acid = end.s.lactic + end.s.acetic;
  return {
    doubleHour: idx >= 0 ? idx : null,
    peakRise: Math.max(...run.rise),
    pH12: end.pH,
    aceticShare: acid > 0 ? end.s.acetic / acid : 0,
  };
}

export function starterProfile(name: string, st: StarterState, days: StarterDay[]): StarterProfile {
  const t = testFeed(st);
  const readyDay = days.find((d) => d.stage === "hazir")?.day ?? null;
  const lab = Math.log10(10 ** st.pop.lacS + 10 ** st.pop.lacP);
  return {
    name: name.trim() || "Adsız maya",
    flour: st.flour,
    readyDay,
    vigor: t.doubleHour === null ? clamp(t.peakRise * 0.5) : clamp((11 - t.doubleHour) / 7),
    acidity: clamp((4.7 - t.pH12) / 1.0),
    aceticShare: clamp(t.aceticShare),
    labPerYeast: Math.round(10 ** clamp(lab - st.pop.yst, 0, 4)),
  };
}

/** Bölümü atlayan oyuncu Tahsin'in olgun mayasıyla başlar */
export const TAHSIN_STARTER: StarterProfile = {
  name: "Tahsin'in mayası",
  flour: "tam_bugday",
  readyDay: 6,
  vigor: 0.95,
  acidity: 0.55,
  aceticShare: 0.25,
  labPerYeast: 100,
};

/** Olgun bir mayanın beslemeden hemen önceki durumu (pişirme günü motoru kullanır) */
export function matureStarterState(profile: StarterProfile): StarterState {
  return {
    day: 30,
    flour: profile.flour,
    pop: { ent: 2, lacP: 7.5, lacS: 9.3, yst: 7.0 + 0.6 * profile.vigor },
    pH: 3.7,
    lactic: 120 + 40 * profile.acidity,
    acetic: (120 + 40 * profile.acidity) * (0.15 + 0.35 * profile.aceticShare),
    sugar: 0.5,
    hungryDays: 0,
    ruined: false,
  };
}
