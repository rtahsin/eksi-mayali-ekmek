import type {
  BakeDecisions,
  BakeEvent,
  BakeResult,
  BakeRun,
  HeatState,
  LevelProfile,
  Matrix,
  MicroPhase,
  MicroSnapshot,
  Populations,
  StarterProfile,
  TipKey,
} from "@/types/game";
import { LEVELS } from "../levels";
import {
  FLOUR_GRAMS,
  FLOUR_TEMP_C,
  FLOURS,
  FRIDGE_C,
  FRIDGE_HOURS,
  LEVAIN_TEMP_C,
  MATRIX,
  ROOM_TEMP_C,
} from "./params";
import { amylaseActivity, clamp, fermentStep, gauss, GUILD_LIST, mixPop, pHFromAcid, type FermentEnv, type FermentState } from "./kinetics";
import { matureStarterState, TAHSIN_STARTER } from "./starter";

/**
 * Pişirme günü motoru (v3): mayanın beslenmesinden ekmeğin kesilmesine kadar zaman adımlı simülasyon.
 * Mikro dünya (canlılar, asit, enzim, gluten, gaz) hesaplanır; sonuç puanları bu durumdan çıkar.
 */

const DT = 5 / 60;

/** Tahsin'in köy ekmeği: oyunun "usta ayarı" ve testlerin referansı */
export const MASTER_DECISIONS: BakeDecisions = {
  level: "koy",
  levainHours: 4.5,
  levainGrams: 800,
  waterGrams: 3000,
  waterTempC: 4,
  saltGrams: 80,
  saltTiming: "son",
  autolyseMinutes: 60,
  kneadQuality: 0.9,
  bulkHours: 3,
  foldTimes: [0.5, 1, 1.5, 2, 2.5],
  preshapeTension: 0.85,
  finalTension: 0.85,
  fridgePlan: "dort",
  cut: { angleToAxis: 8, coverage: 0.78, speed: 0.85, blade: 30 },
  steam: true,
  ventMinute: 20,
  bakeMinutes: 42,
  cutWaitHours: 3,
};

export function levelOf(d: BakeDecisions): LevelProfile {
  return LEVELS[d.level];
}

export function matrixOf(d: BakeDecisions): Matrix {
  return d.level === "siyez" ? "siyez" : d.level === "gece_yarisi" ? "cavdar" : "bugday";
}

/** Yoğurmanın hamuru ısıtması (sürtünme payı, °C toplamına eklenir) */
export function frictionFactor(kneadQuality: number): number {
  return 14 + 22 * clamp(kneadQuality);
}

/** İstenen hamur sıcaklığı (DDT), mayalı hamur: 4 × hamur = oda + un + maya + su + sürtünme */
export function doughTemperature(waterTempC: number, kneadQuality: number): number {
  return (ROOM_TEMP_C + FLOUR_TEMP_C + LEVAIN_TEMP_C + waterTempC + frictionFactor(kneadQuality)) / 4;
}

/** Hedef hamur sıcaklığı için gereken su sıcaklığı (DDT ters formülü) */
export function waterTempFor(targetDoughC: number, kneadQuality: number): number {
  return 4 * targetDoughC - (ROOM_TEMP_C + FLOUR_TEMP_C + LEVAIN_TEMP_C + frictionFactor(kneadQuality));
}

/** Fırındaki ekmeğin iç sıcaklığı (°C): dolaptan ~5 °C girer, 99 °C'ye yaklaşır (su kaynamadan geçemez) */
export function coreTempAt(minutes: number, startC = 5): number {
  return 99 - (99 - startC) * Math.exp(-minutes / 11.6);
}

/** Parmak testi: hamurun geri dönüş hızı (olgunluk M'ye göre) */
export function pokeResult(maturity: number): "hizli" | "yavas" | "donmuyor" {
  if (maturity < 0.62) return "hizli";
  if (maturity > 1.3) return "donmuyor";
  return "yavas";
}

/** Usta ayarında fırına girerken üretilmiş toplam gaz (olgunluk 1,0'ın karşılığı) */
const GAS_REF = 6.2;
/** Çözünmüş CO₂ kapasitesi (göreli): su doymadan kabarcık büyümez */
const DISSOLVE_CAP = 0.5;

interface DoughState {
  f: FermentState;
  T: number;
  water: number;
  dev: number;
  align: number;
  salt: number;
  dissolved: number;
  /** Hamurda tutulan serbest gaz (hacim artışı, 1 = iki katı) */
  vol: number;
  /** Karıştırmadan beri üretilen gaz */
  gasSinceMix: number;
  amylase: number;
  protease: number;
  phytase: number;
  pH: number;
  phase: MicroPhase;
  heat?: HeatState;
}

function snap(t: number, s: DoughState, matrix: Matrix, sugarRef: number, dstarchRef: number): MicroSnapshot {
  return {
    t,
    phase: s.phase,
    matrix,
    tempC: s.T,
    pH: s.pH,
    pop: { ...s.f.pop },
    sugar: clamp(s.f.sugar / sugarRef),
    damagedStarch: clamp(s.f.dstarch / dstarchRef),
    water: s.water,
    dissolvedCO2: clamp(s.dissolved / DISSOLVE_CAP),
    gas: s.vol,
    glutenDev: s.dev,
    glutenDamage: s.f.damage,
    glutenAlign: s.align,
    salt: s.salt,
    lactic: s.f.lactic,
    acetic: s.f.acetic,
    amylase: s.amylase,
    protease: s.protease,
    phytase: s.phytase,
    heat: s.heat ? { ...s.heat } : undefined,
  };
}

/** Tuz, mayayı ve bakterileri ozmotik olarak yavaşlatır (%2 ≈ %20 yavaş) */
const saltRate = (saltPct: number) => clamp(1 - 0.1 * saltPct, 0.4, 1);

export interface BakeOptions {
  starter?: StarterProfile;
  /** Hesabı bu aşamada kes (aşama ekranları canlı önizleme için) */
  until?: MicroPhase;
}

/** Pişirme gününü baştan sona çalıştır */
export function simulateBake(d: BakeDecisions, opts: BakeOptions = {}): BakeRun {
  const starter = opts.starter ?? TAHSIN_STARTER;
  const lv = levelOf(d);
  const matrix = matrixOf(d);
  const mx = MATRIX[matrix];
  const flourP = FLOURS[matrix === "bugday" ? "tam_bugday" : "tam_bugday"];
  const samples: MicroSnapshot[] = [];
  const events: BakeEvent[] = [];
  const marks = {} as BakeRun["marks"];
  const ev = (t: number, key: BakeEvent["key"], label: string) => events.push({ t, key, label });

  // ── 1) Maya tazeleme: olgun mayaya 1:1:1 (Tahsin: 200 g + 400 g un + 400 g su), oda sıcaklığında ──
  const m = matureStarterState(starter);
  const freshPop = {} as Populations;
  for (const g of GUILD_LIST) freshPop[g] = flourP.inoculum[g] - 0.3;
  let lev: FermentState = {
    pop: mixPop(m.pop, freshPop, 1 / 3),
    sugar: m.sugar / 3 + (2 / 3) * flourP.sugar * 0.5,
    dstarch: (2 / 3) * flourP.damagedStarch * 0.5,
    lactic: m.lactic / 3,
    acetic: m.acetic / 3,
    gasCum: 0,
    damage: 0,
  };
  const levEnv: FermentEnv = { T: LEVAIN_TEMP_C, dtH: DT, buffer: flourP.buffer, amylase: flourP.amylase, nutrients: flourP.nutrients, aceticMod: 1, robust: 0.8 };
  const levSugarRef = flourP.sugar * 0.5;
  const levStarchRef = flourP.damagedStarch * 0.5;
  marks.kavanoz = 0;
  ev(0, "maya_beslendi", "Maya beslendi · 1:1:1");
  let levVol = 0;
  let levPeak = { t: 0, vol: 0 };
  const autoH = Math.max(0, d.autolyseMinutes) / 60;
  const tMix = Math.max(0.5, d.levainHours);
  const tAuto = Math.max(0, tMix - autoH);
  let t = 0;
  for (; t < tMix - 1e-9; t += DT) {
    const r = fermentStep(lev, levEnv);
    levVol = Math.max(0, levVol + (1.3 * r.gas * (1 - levVol / 2.2) - (0.12 + 0.5 * lev.damage) * levVol) * DT);
    if (levVol > levPeak.vol) levPeak = { t, vol: levVol };
    if (t < tAuto - 1e-9 || autoH === 0) {
      samples.push(
        snap(t, {
          f: lev, T: LEVAIN_TEMP_C, water: 1, dev: 0.25, align: 0, salt: 0, dissolved: clamp(r.gas / 0.8) * DISSOLVE_CAP,
          vol: levVol, gasSinceMix: 0, amylase: r.amylase, protease: r.protease, phytase: r.phytase, pH: r.pH, phase: "kavanoz",
        }, matrix, levSugarRef, levStarchRef)
      );
    }
    lev = r.s;
  }
  if (levPeak.vol > 0.5) ev(levPeak.t, "maya_tepe", `Maya tepe noktasında · ${levPeak.t.toFixed(1)}. saat`);
  // Mayanın canlılığı: kullanıldığı anda gaz üretim gücü (tepe civarı en yüksek)
  const levPH = pHFromAcid(lev.lactic + lev.acetic, flourP.buffer);

  // ── 2) Otoliz: un + su, maya beklerken (sıcaklık suya göre düşük; amilaz şeker hazırlar, ağ kendiliğinden kurulur) ──
  const doughFlour = FLOUR_GRAMS + d.levainGrams / 2;
  const doughWater = d.waterGrams + d.levainGrams / 2;
  const mass = FLOUR_GRAMS + d.waterGrams + d.levainGrams + d.saltGrams;
  const hydration = (d.waterGrams / FLOUR_GRAMS) * 100;
  const saltPct = (d.saltGrams / FLOUR_GRAMS) * 100;
  const levainPct = (d.levainGrams / FLOUR_GRAMS) * 100;
  // Otoliz kasesinde g/kg değerler (un + su)
  const bowlMass = FLOUR_GRAMS + d.waterGrams;
  let bowlSugar = (flourP.sugar * FLOUR_GRAMS) / bowlMass;
  let bowlStarch = (flourP.damagedStarch * FLOUR_GRAMS) / bowlMass;
  const autoT = (ROOM_TEMP_C + FLOUR_TEMP_C + d.waterTempC) / 3;
  const saltInAuto = d.saltTiming === "otoliz";
  let dev = 0;
  const cap = mx.glutenCapacity;
  marks.otoliz = tAuto;
  if (autoH > 0) ev(tAuto, "otoliz", `Otoliz · su unla buluştu (${Math.round(autoT)} °C)`);
  for (let ta = 0; ta < autoH - 1e-9; ta += DT) {
    const amy = amylaseActivity(autoT, 6.2) * flourP.amylase;
    const made = Math.min(bowlStarch, 6 * amy * (bowlStarch / (bowlStarch + 15)) * DT);
    bowlSugar += made;
    bowlStarch -= made;
    // Tuz otolizde: su alımını ve kendiliğinden ağ kurulmasını yavaşlatır
    dev = cap * 0.32 * (1 - Math.exp(-(ta + DT) / (saltInAuto ? 0.7 : 0.35)));
    const water = clamp(0.35 + 0.65 * (1 - Math.exp(-(ta + DT) / (saltInAuto ? 0.3 : 0.15))));
    samples.push(
      snap(tAuto + ta, {
        f: { pop: { ent: 4, lacP: 3.5, lacS: 0.5, yst: 1.5 }, sugar: bowlSugar, dstarch: bowlStarch, lactic: 0, acetic: 0, gasCum: 0, damage: 0 },
        T: autoT, water, dev, align: 0, salt: saltInAuto ? 1 : 0, dissolved: 0, vol: 0, gasSinceMix: 0,
        amylase: amy, protease: 0.02, phytase: 0.1, pH: 6.2, phase: "otoliz",
      }, matrix, levSugarRef, levStarchRef)
    );
  }

  // ── 3) Yoğurma: maya + otoliz hamuru (+ tuz); hamur sıcaklığı DDT ──
  t = tMix;
  marks.yogurma = t;
  const doughT0 = doughTemperature(d.waterTempC, d.kneadQuality);
  ev(t, "yogurma", `Yoğurma · hamur ${doughT0.toFixed(1)} °C`);
  const wLev = d.levainGrams / mass;
  const flourInoc = {} as Populations;
  for (const g of GUILD_LIST) flourInoc[g] = flourP.inoculum[g] + Math.log10(FLOUR_GRAMS / mass);
  const sugarRef = (flourP.sugar * doughFlour) / mass + 2;
  const starchRef = (flourP.damagedStarch * doughFlour) / mass;
  let f: FermentState = {
    pop: mixPop(lev.pop, flourInoc, wLev),
    sugar: lev.sugar * wLev + (bowlSugar * bowlMass) / mass,
    dstarch: lev.dstarch * wLev + (bowlStarch * bowlMass) / mass,
    lactic: lev.lactic * wLev,
    acetic: lev.acetic * wLev,
    gasCum: 0,
    damage: 0,
  };
  // Siyez daha hızlı mayalanır (şeker/enzim); su fazlası ve zayıf ağ hamuru gevşetir
  const env: FermentEnv = {
    T: doughT0,
    dtH: DT,
    buffer: mx.buffer,
    amylase: flourP.amylase * mx.fermentBoost,
    nutrients: flourP.nutrients * mx.fermentBoost,
    aceticMod: 1,
    robust: mx.glutenRobust,
    rateMul: saltRate(saltPct),
  };
  // Yoğurma ağı kurar (ritim başarısı); tuz sonda eklenirse ağı sıkılaştırır
  dev = clamp(dev + (cap - dev) * (0.35 + 0.5 * clamp(d.kneadQuality)));
  const saltLevel = clamp(saltPct / 2, 0, 2);
  if (!saltInAuto && d.saltGrams > 0) ev(t + 0.2, "tuz", "Tuz · ağ sıkılaştı");
  const st: DoughState = {
    f, T: doughT0, water: 1, dev, align: 0.35, salt: saltLevel, dissolved: 0, vol: 0, gasSinceMix: 0,
    amylase: 0, protease: 0, phytase: 0, pH: pHFromAcid(f.lactic + f.acetic, mx.buffer), phase: "yogurma",
  };
  const push = (tt: number) => samples.push(snap(tt, st, matrix, sugarRef, starchRef));
  const step = (T: number, dt = DT) => {
    env.T = T;
    env.dtH = dt;
    const r = fermentStep(st.f, env);
    st.f = r.s;
    st.T = T;
    st.pH = r.pH;
    st.amylase = r.amylase;
    st.protease = r.protease;
    st.phytase = r.phytase;
    // Gaz önce suda çözünür; su doyunca hava çekirdeklerine geçer ve hacmi büyütür
    let g = r.gas * dt;
    st.gasSinceMix += g;
    const room = DISSOLVE_CAP - st.dissolved;
    const into = Math.min(room, g * 0.8);
    st.dissolved += into;
    g -= into;
    const strength = clamp(st.dev * (1 - st.f.damage) * (0.85 + 0.075 * Math.min(2, st.salt)));
    const retain = 0.35 + 0.65 * strength;
    st.vol = Math.max(0, st.vol + g * 0.42 * retain - st.vol * (0.015 + 0.05 * (1 - strength)) * dt);
  };
  for (let tk = 0; tk < 0.25 - 1e-9; tk += DT) {
    step(doughT0);
    push(t + tk);
  }

  // ── 4) Katlamalı mayalanma: hamur oda sıcaklığına yavaşça yaklaşır; katlamalar ağı toplar ──
  t = tMix + 0.25;
  marks.mayalanma = t;
  const spreadBase = 0.4 + Math.max(0, hydration - (lv.maxHydration - 8)) / 20 + (1 - mx.glutenCapacity) * 0.5;
  const foldsNeeded = 3 + 4 * spreadBase;
  const folds = d.foldTimes.filter((x) => x > 0 && x <= d.bulkHours + 1e-6);
  let doubled = false;
  let fi = 0;
  const sortedFolds = [...folds].sort((a, b) => a - b);
  for (let tb = 0; tb < d.bulkHours - 1e-9; tb += DT) {
    const T = ROOM_TEMP_C + (doughT0 - ROOM_TEMP_C) * Math.exp(-tb / 3);
    st.phase = "mayalanma";
    // Ağ zamanla gevşer (yayılma); katlama toplar ve hizalar
    st.align = Math.max(0.1, st.align - 0.12 * spreadBase * DT * 2);
    while (fi < sortedFolds.length && sortedFolds[fi] <= tb + DT / 2) {
      st.dev = clamp(st.dev + (cap - st.dev) * 0.09);
      st.align = clamp(st.align + 0.35);
      st.vol *= 0.93;
      ev(t + tb, "katlama", `Katlama · ${(tb + DT / 2).toFixed(1)}. saat`);
      fi++;
    }
    step(T);
    push(t + tb);
    if (!doubled && st.vol >= 0.9) {
      doubled = true;
      ev(t + tb, "iki_kat", "Hamur iki katına yaklaştı");
    }
  }
  const bulkRise = st.vol;
  const bulkEndT = st.T;

  // ── 5) Ön şekil, tezgâh dinlenmesi, son şekil ──
  t = tMix + 0.25 + d.bulkHours;
  marks.sekil = t;
  ev(t, "on_sekil", "Ön şekil · gaz bir miktar çıktı");
  st.vol *= 0.62;
  st.align = clamp(0.3 + 0.6 * d.preshapeTension);
  for (let tr = 0; tr < 0.5 - 1e-9; tr += DT) {
    st.phase = "sekil";
    step(ROOM_TEMP_C + (bulkEndT - ROOM_TEMP_C) * 0.9);
    push(t + tr);
  }
  t += 0.5;
  ev(t, "son_sekil", "Son şekil · bannetona");
  st.vol *= 0.75;
  st.align = clamp(0.35 + 0.6 * d.finalTension);
  const maturityAtShape = st.gasSinceMix / GAS_REF;

  // ── 6) Dolap: hamur saatler içinde soğur; 12 °C planında önce 12 °C'de olgunlaşır ──
  marks.dolap = t;
  ev(t, "dolap", d.fridgePlan === "dort" ? "Dolap · 4 °C" : "Dolap · önce 12 °C");
  let T = st.T;
  let warmUntil = 0;
  if (d.fridgePlan === "on_iki_sonra_dort") {
    // 12 °C'de ideal olgunluğa yaklaşana kadar (en fazla 6 saat)
    warmUntil = 6;
  }
  for (let tf = 0; tf < FRIDGE_HOURS - 1e-9; tf += DT) {
    const target = tf < warmUntil && st.gasSinceMix / GAS_REF < 0.88 ? 12 : FRIDGE_C;
    if (target === FRIDGE_C && warmUntil > 0 && tf < warmUntil) warmUntil = tf;
    T = target + (T - target) * Math.exp(-DT / 1.6);
    st.phase = "dolap";
    step(T);
    push(t + tf);
  }
  t += FRIDGE_HOURS;
  const maturity = st.gasSinceMix / GAS_REF;
  const proofVol = st.vol;
  const damage = st.f.damage;
  const ovenPH = st.pH;
  const lacticOven = st.f.lactic;
  const aceticOven = st.f.acetic;
  const yeastAtOven = st.f.pop.yst;
  const sugarAtOven = st.f.sugar;
  const dissolvedAtOven = st.dissolved / DISSOLVE_CAP;

  // ── 7) Fırın: iç sıcaklık olayları sürer ──
  marks.firin = t;
  ev(t, "firin", "Fırına girdi · 220 °C taş taban");
  const startC = st.T;
  const steamUntil = d.steam ? Math.min(d.bakeMinutes, d.ventMinute ?? d.bakeMinutes) : 0;
  const heat: HeatState = { coreC: startC, surfaceC: startC, yeastAlive: 1, labAlive: 1, starchGel: 0, glutenSet: 0, crust: 0, retro: 0 };
  st.heat = heat;
  let crustColor = 0;
  let burst = false;
  const seen = new Set<string>();
  let surf = startC;
  for (let mnt = 0; mnt <= d.bakeMinutes; mnt += 1) {
    const core = coreTempAt(mnt, startC);
    // Yüzey: buhar varken yoğuşma yüzeyi ıslak ve ~100 °C tutar; buhar gidince kurur ve ısınır
    const steaming = d.steam && mnt < steamUntil;
    const surfTarget = steaming ? 100 : 205;
    surf = surfTarget + (surf - surfTarget) * Math.exp(-1 / (steaming ? 2 : 7));
    if (!steaming && surf > 115) crustColor += ((surf - 115) / 90) * 0.035;
    heat.coreC = core;
    heat.surfaceC = surf;
    heat.yeastAlive = clamp(1 - (core - 50) / 10);
    heat.labAlive = clamp(1 - (core - 55) / 12);
    heat.starchGel = clamp((core - mx.gelStart) / (mx.gelEnd - mx.gelStart));
    heat.glutenSet = clamp((core - 70) / 15);
    heat.crust = clamp(crustColor);
    st.phase = "firin";
    st.T = core;
    st.amylase = amylaseActivity(core, ovenPH, mx.amylaseOff);
    if (heat.yeastAlive > 0) {
      for (const g of GUILD_LIST) st.f.pop[g] = Math.max(-1, st.f.pop[g] - (core > 50 ? (core - 50) * 0.08 : 0));
    }
    if (!burst && core >= 40) {
      burst = true;
      ev(t + mnt / 60, "son_maya_patlamasi", "Son maya patlaması · 40 °C");
    }
    const mark = (key: BakeEvent["key"], cond: boolean, label: string) => {
      if (cond && !seen.has(key)) {
        seen.add(key);
        ev(t + mnt / 60, key, label);
      }
    };
    mark("maya_oldu", core >= 58, "Mayalar öldü · ~55–60 °C");
    mark("nisasta_jel", core >= mx.gelStart, `Nişasta jelleşiyor · ${mx.gelStart} °C`);
    mark("gluten_dondu", core >= 75, "Protein ağı dondu · 75 °C");
    mark("amilaz_durdu", core >= mx.amylaseOff, `Amilaz sustu · ${mx.amylaseOff} °C`);
    mark("kabuk_renk", crustColor > 0.25, "Kabuk renk alıyor · Maillard");
    mark("ic_pisti", core >= 96, "İç 96 °C · pişti");
    samples.push(snap(t + mnt / 60, st, matrix, sugarRef, starchRef));
  }
  t += d.bakeMinutes / 60;
  marks.sogutma = t;
  ev(t, "firindan_cikti", "Fırından çıktı");

  // ── 8) Soğuma: nişasta oturur (retrogradasyon başlar), nem dengelenir ──
  const coolH = Math.max(0, d.cutWaitHours);
  const coolSteps = 24;
  for (let i = 1; i <= coolSteps; i++) {
    const tc = (coolH * i) / coolSteps;
    heat.coreC = ROOM_TEMP_C + (heat.coreC - ROOM_TEMP_C) * Math.exp(-(coolH / coolSteps) / 0.7);
    heat.surfaceC = heat.coreC;
    heat.retro = clamp(tc / lv.cutIdealHours);
    st.phase = "sogutma";
    st.T = heat.coreC;
    samples.push(snap(t + tc, st, matrix, sugarRef, starchRef));
  }
  marks.kesim = t + coolH;
  ev(t + coolH, "kesildi", `Kesildi · ${coolH} saat sonra`);

  const result = scoreBake(d, lv, {
    doughT0,
    hydration,
    saltPct,
    levainPct,
    levainPH: levPH,
    bulkRise,
    maturity,
    maturityAtShape,
    proofVol,
    dev: st.dev,
    damage,
    foldsNeeded,
    folds: folds.length,
    spread: spreadBase,
    lactic: lacticOven,
    acetic: aceticOven,
    ovenPH,
    yeastAtOven,
    sugarAtOven,
    dissolvedAtOven,
    crustColor,
    steamMinutes: steamUntil,
    startC,
  });
  events.sort((a, b) => a.t - b.t);
  return { result, samples, events, marks };
}

interface Physio {
  doughT0: number;
  hydration: number;
  saltPct: number;
  levainPct: number;
  levainPH: number;
  bulkRise: number;
  maturity: number;
  maturityAtShape: number;
  proofVol: number;
  dev: number;
  damage: number;
  foldsNeeded: number;
  folds: number;
  spread: number;
  lactic: number;
  acetic: number;
  ovenPH: number;
  yeastAtOven: number;
  sugarAtOven: number;
  dissolvedAtOven: number;
  crustColor: number;
  steamMinutes: number;
  startC: number;
}

function scoreBake(d: BakeDecisions, lv: LevelProfile, p: Physio): BakeResult {
  const tips: TipKey[] = [];
  const foldScore =
    p.folds <= p.foldsNeeded
      ? clamp(1 - (p.foldsNeeded - p.folds) / p.foldsNeeded)
      : clamp(1 - (p.folds - p.foldsNeeded) / (2 * p.foldsNeeded));
  const saltGluten = clamp(1 - Math.abs(p.saltPct - 2) / 4);
  const gluten = clamp(
    (0.4 * d.kneadQuality + 0.4 * foldScore + 0.2 * saltGluten) * (0.78 + 0.22 * lv.glutenStrength) * (1 - 0.6 * p.damage) -
      (d.saltTiming === "otoliz" ? 0.05 : 0)
  );
  const slack = Math.max(0, p.hydration - lv.maxHydration) / 10 + Math.max(0, 0.6 - gluten);
  const tension = (d.preshapeTension + d.finalTension) / 2;
  const tornSkin = Math.max(d.preshapeTension, d.finalTension) > 0.97;

  const proof = p.maturity;
  const proofQ = gauss(proof, 1.0, 0.2);
  const underProof = proof < 0.72;
  const overProof = proof > 1.38;
  const overFerm = clamp((proof - 1.38) / 0.9 + Math.max(0, p.damage - 0.45));

  const steamQ = gauss(p.steamMinutes, 20, 7);
  const doneness = d.bakeMinutes / 42;
  const internalTemp = coreTempAt(d.bakeMinutes, p.startC);
  const c = d.cut;
  const cutQ = gauss(c.angleToAxis, 8, 18) * gauss(c.coverage, 0.78, 0.22) * (0.45 + 0.55 * clamp(c.speed * 1.3));
  // Fırın kabarması: gazın ısıyla genleşmesi + çözünmüş CO₂'nin açığa çıkması + son maya patlaması (şeker kaldıysa)
  const yeastBurst = clamp((p.yeastAtOven - 6) / 2) * clamp(p.sugarAtOven / 2);
  const springFuel = clamp(0.45 + 0.3 * p.dissolvedAtOven + 0.25 * yeastBurst);
  const ovenSpring = clamp(
    (0.45 * proofQ + 0.22 * gluten + 0.15 * steamQ + 0.13 * tension + 0.05 * cutQ - (tornSkin ? 0.08 : 0)) * (0.8 + 0.2 * springFuel)
  );

  const height = clamp(0.3 + 0.5 * ovenSpring - 0.25 * slack - (overProof ? 0.4 * (proof - 1.38) : 0), 0.18, 0.85);
  const ear = clamp(cutQ * (c.blade === 30 ? 1 : 0.3) * (0.35 + 0.65 * steamQ) * ovenSpring);
  // Kabuk rengi: buharsız fırın süresi ve yüzey sıcaklığı (Maillard); tükenmiş şeker rengi soldurur
  const crust = clamp(p.crustColor * (0.75 + 0.25 * clamp(p.sugarAtOven / 3)) - 0.25 * overFerm);
  const openness = clamp(
    0.22 + 0.5 * proofQ * gluten + 0.3 * clamp((p.hydration - 62) / 20) - 0.2 * slack - (underProof ? 0.15 : 0)
  );
  const cutEarly = clamp(1 - d.cutWaitHours / lv.cutIdealHours);
  const gummy = clamp(Math.max(0, 0.9 - doneness) * 3 + 0.5 * cutEarly + (underProof ? 0.2 : 0));

  // Aroma: gerçek asit birikiminden (mmol/kg). Laktik yumuşak, asetik keskin; kabuk Maillard
  const acid = p.lactic + p.acetic;
  const acShare = acid > 0 ? p.acetic / acid : 0;
  const aroma = {
    laktik: clamp((p.lactic / 45) * 0.9),
    asetik: clamp((p.acetic / 18) * 0.9),
    kavrulmus: clamp(gauss(crust, 0.62, 0.22) * (0.5 + 0.5 * steamQ) + (crust > 0.75 ? 0.15 : 0)),
  };
  const sourness = clamp((acid - 15) / 60 + 0.4 * acShare);

  const saltTaste = gauss(p.saltPct, 2, 0.8);
  // Lezzet gövdesi: yeterli olgunluk, dengeli asit (ne yavan ne sirke), mayanın tepe civarında kullanılması
  const acidBalance = acid < 18 ? clamp(0.55 + 0.45 * (acid / 18)) : clamp(1 - Math.max(0, acid - 60) / 60);
  const levainFresh = clamp(1 - Math.max(0, 1.6 - Math.abs(d.levainHours - 4.5)) * 0) * gauss(d.levainHours, 4.8, d.levainHours < 4.5 ? 1.6 : 3.2);
  const flavorBody = clamp(0.3 + 0.3 * Math.min(1, proof) + 0.25 * levainFresh + 0.15 * acidBalance - (d.levainHours > 9 ? 0.2 : 0));
  const scores = {
    kabarma: Math.round(100 * clamp(0.7 * ovenSpring + 0.3 * ear)),
    ic: Math.round(100 * clamp(0.6 * openness + 0.4 * (1 - gummy) - (overProof ? 0.15 : 0))),
    kabuk: Math.round(100 * gauss(crust, 0.6, 0.18) * (0.6 + 0.4 * steamQ)),
    lezzet: Math.round(100 * clamp(saltTaste * flavorBody * acidBalance ** 0.5 * (1 - 0.6 * overFerm) * (1 - 0.35 * gummy))),
    toplam: 0,
  };
  scores.toplam = Math.round((scores.kabarma + scores.ic + scores.kabuk + scores.lezzet) / 4);

  if (overProof) tips.push("fazla_kabardi");
  else if (underProof) tips.push("az_kabardi");
  if (d.levainHours < 3) tips.push("maya_erken");
  else if (d.levainHours > 9) tips.push("maya_gec");
  if (p.levainPct > 22) tips.push("maya_cok");
  else if (p.levainPct < 12) tips.push("maya_az");
  if (p.doughT0 > 30) tips.push("hamur_sicak");
  else if (p.doughT0 < 23) tips.push("hamur_soguk");
  if (p.hydration > lv.maxHydration + 2) tips.push("su_fazla");
  else if (p.hydration < lv.idealHydration[0] - 8) tips.push("su_az");
  if (p.saltPct < 1) tips.push("tuz_yok");
  else if (p.saltPct > 3) tips.push("tuz_fazla");
  else if (d.saltTiming === "otoliz") tips.push("tuz_otoliz");
  if (d.kneadQuality < 0.5) tips.push("yogurma_zayif");
  if (p.folds < p.foldsNeeded - 2) tips.push("katlama_az");
  else if (p.spread < 0.5 && p.folds >= 6) tips.push("katlama_bosa");
  if (tornSkin) tips.push("gerginlik_fazla");
  else if (tension < 0.45) tips.push("gerginlik_az");
  if (c.blade === 90 && cutQ > 0.4) tips.push("kesik_dik");
  else if (cutQ < 0.35) tips.push("kesik_kotu");
  if (!d.steam) tips.push("buhar_yok");
  else if (d.ventMinute === null || p.steamMinutes > 30) tips.push("buhar_tahliye_yok");
  else if (p.steamMinutes < 12) tips.push("buhar_erken");
  if (doneness < 0.85) tips.push("az_pisti");
  else if (crust > 0.9) tips.push("yandi");
  if (cutEarly > 0.3) tips.push("erken_kesti");

  return {
    doughTemp: Math.round(p.doughT0 * 10) / 10,
    hydration: Math.round(p.hydration * 10) / 10,
    levainPct: Math.round(p.levainPct * 10) / 10,
    saltPct: Math.round(p.saltPct * 100) / 100,
    bulkRise: p.bulkRise,
    proof,
    gluten,
    internalTemp: Math.round(internalTemp),
    height,
    ear,
    crust,
    openness,
    gummy,
    sourness,
    aroma,
    crumbColor: lv.crumbColor,
    scores,
    title: titleFor(scores.toplam, { height, crust, underProof, overProof, openness }),
    tips: tips.slice(0, 3),
  };
}

function titleFor(
  total: number,
  s: { height: number; crust: number; underProof: boolean; overProof: boolean; openness: number }
): string {
  if (s.crust > 0.92) return "Kömür";
  if (total >= 90) return "Usta işi";
  if (total >= 80) return "Kalfalık hak edildi";
  if (total >= 68) return "Fena değil komşu";
  if (total >= 55) return "Ev ekmeği";
  if (s.overProof && s.height < 0.45) return "Pide oldu";
  if (s.underProof && s.openness < 0.45) return "Tuğla";
  return "Hamurumsu";
}

/** Zaman çizelgesinde t anındaki örnek (en yakın) */
export function sampleAt(run: Pick<BakeRun, "samples">, t: number): MicroSnapshot {
  const s = run.samples;
  if (s.length === 0) throw new Error("boş zaman çizelgesi");
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(s[lo - 1].t - t) < Math.abs(s[lo].t - t)) return s[lo - 1];
  return s[lo];
}

/** Bir aşamanın örnekleri */
export function phaseSamples(run: Pick<BakeRun, "samples">, phase: MicroPhase): MicroSnapshot[] {
  return run.samples.filter((x) => x.phase === phase);
}
