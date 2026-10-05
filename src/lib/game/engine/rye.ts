import type { BakeEvent, HeatState, MicroPhase, MicroSnapshot, Populations, RyeDecisions, RyeResult, RyeRun, RyeTipKey } from "@/types/game";
import { FRIDGE_C, FRIDGE_HOURS, MATRIX, ROOM_TEMP_C } from "./params";
import { amylaseActivity, clamp, fermentStep, gauss, mixPop, pHFromAcid, type FermentEnv, type FermentState } from "./kinetics";

/**
 * Gece Yarısı motoru (Tahsin'in mavi haşhaşlı çavdarı). Bilim: docs/BILIM.md §8 ve §12.
 * - Çavdar gluten ağı kurmaz; yapıyı pentozan jeli ve nişasta taşır → yoğurmak kazandırmaz.
 * - Çavdarda α-amilaz bol, nişasta düşük sıcaklıkta jelleşir → fırında "nişasta saldırısı"; ekşi mayanın asidi frenler.
 * - Kaynar suyla haşlama: tahılın bir kısmını önceden jelleştirir (daha çok su tutar) ve o kısmın enzimlerini
 *   kaynar suyla söndürür; karışım soğurken 60–70 °C'den geçer, amilaz nişastanın bir kısmını şekere çevirir.
 * - Uzun, düşen sıcaklıkta pişirme; 24–48 saat dinlenme iç yapıyı oturtur.
 */

const DT = 5 / 60;

export const RYE_MASTER: RyeDecisions = {
  scaldWater: "kaynar",
  scaldHours: 24,
  sourGrams: 1500,
  waterGrams: 2400,
  saltGrams: 170,
  mix: "karistir",
  wetHands: true,
  poppyCoverage: 0.9,
  proofHours: 1.5,
  covered: true,
  fallingOven: true,
  steamAtLoad: true,
  bakeMinutes: 120,
  vents: 3,
  flip: true,
  restHours: 48,
};

/** Tarifin sabit kısmı (g) */
export const RYE_RECIPE = {
  haslama: { arpaUnu: 500, cavdarKirmasi: 1200, kabakCekirdegi: 600, keten: 400, karabugday: 500, kaynarSu: 3000 },
  hamur: { cavdarUnu: 3000, siyezUnu: 800 },
  parca: 12,
};

const SCALD_GRAIN = RYE_RECIPE.haslama.arpaUnu + RYE_RECIPE.haslama.cavdarKirmasi + RYE_RECIPE.haslama.karabugday; // 2200
const SEEDS = RYE_RECIPE.haslama.kabakCekirdegi + RYE_RECIPE.haslama.keten; // 1000
const MAIN_FLOUR = RYE_RECIPE.hamur.cavdarUnu + RYE_RECIPE.hamur.siyezUnu; // 3800

/** Fırındaki 1,2 kg'lık kalıp ekmeğin iç sıcaklığı: büyük ve yoğun olduğu için yavaş ısınır */
export function ryeCoreAt(minutes: number, startC: number, fallingOven: boolean): number {
  const tau = fallingOven ? 27 : 24;
  return 99 - (99 - startC) * Math.exp(-minutes / tau);
}

/** Fırın havası: 280 °C'de ısıtılır; düşen fırında 220 °C'de yüklenip ısıtıcılar kapalı ~45 dk düşer, sonra 180 °C */
export function ryeOvenAirAt(minutes: number, fallingOven: boolean): number {
  if (!fallingOven) return 220;
  if (minutes < 45) return 220 - 70 * (1 - Math.exp(-minutes / 25));
  return 180;
}

export function simulateRye(d: RyeDecisions): RyeRun {
  const mx = MATRIX.cavdar;
  const samples: MicroSnapshot[] = [];
  const events: BakeEvent[] = [];
  const ev = (t: number, key: BakeEvent["key"], label: string) => events.push({ t, key, label });

  // ── Haşlama: kaynar su enzimleri söndürür ve nişastanın bir kısmını jelleştirir; soğurken şeker oluşur ──
  const scaldH = Math.max(0, d.scaldHours);
  const hot = d.scaldWater === "kaynar";
  // Haşlamadaki tahılın enzim yükü: kaynar su söndürür
  const scaldEnzymeLeft = hot ? 0.15 : 1;
  // Önceden jelleşen nişasta: suyu tutar, iç nemli kalır (zaman içinde tamamlanır)
  const preGel = hot ? clamp(0.5 + 0.5 * (1 - Math.exp(-scaldH / 4))) : 0.1;
  // Tatlılık: soğurken 60–70 °C'den geçerken amilazın kestiği maltoz; uzun bekleme çözünmeyi tamamlar
  const sweetness = hot ? clamp(0.35 + 0.65 * (1 - Math.exp(-scaldH / 8))) : clamp(0.1 + 0.2 * (scaldH / 24));
  ev(0, "otoliz", hot ? "Haşlama · kaynar su" : "Haşlama · ılık su");

  // ── Karıştırma: haşlama + çavdar unu + siyez + su + ekşi maya + tuz ──
  const sourFlour = d.sourGrams / 2;
  const sourWater = d.sourGrams / 2;
  const flour = SCALD_GRAIN + MAIN_FLOUR + sourFlour;
  const water = RYE_RECIPE.haslama.kaynarSu + d.waterGrams + sourWater;
  const mass = SCALD_GRAIN + SEEDS + RYE_RECIPE.haslama.kaynarSu + MAIN_FLOUR + d.waterGrams + d.sourGrams + d.saltGrams;
  const hydration = (water / flour) * 100;
  const saltPct = (d.saltGrams / flour) * 100;
  const tMix = scaldH;
  ev(tMix, "yogurma", "Karıştırma · çavdar yoğrulmaz");

  // Olgun çavdar ekşi mayası (beslemeden ~12 sa sonra): bol bakteri, düşük pH
  const sourPop: Populations = { ent: 1, lacP: 7, lacS: 9.3, yst: 7.2 };
  const flourPop: Populations = { ent: 4.2, lacP: 3.6, lacS: 0.6, yst: 1.8 };
  const w = d.sourGrams / mass;
  let f: FermentState = {
    pop: mixPop(sourPop, flourPop, w),
    sugar: 10 + 6 * sweetness,
    dstarch: 18 * (1 - 0.6 * preGel),
    lactic: 190 * w,
    acetic: 55 * w,
    gasCum: 0,
    damage: 0,
  };
  const env: FermentEnv = {
    T: ROOM_TEMP_C,
    dtH: DT,
    buffer: mx.buffer,
    amylase: 1.5,
    nutrients: 1.15,
    aceticMod: 1,
    robust: mx.glutenRobust,
    rateMul: clamp(1 - 0.08 * saltPct, 0.5, 1),
  };
  // Pentozan jeli: karıştırınca kurulur; yoğurmak ağ kurmaz, hamuru yapışkanlaştırır
  const gel = clamp(0.55 + 0.25 * preGel);
  const snap = (t: number, phase: MicroPhase, T: number, pH: number, extra: Partial<MicroSnapshot> = {}): MicroSnapshot => ({
    t,
    phase,
    matrix: "cavdar",
    tempC: T,
    pH,
    pop: { ...f.pop },
    sugar: clamp(f.sugar / 18),
    damagedStarch: clamp(f.dstarch / 18),
    water: 1,
    dissolvedCO2: 0.5,
    gas: 0,
    glutenDev: gel,
    glutenDamage: f.damage,
    glutenAlign: 0.15,
    salt: clamp(saltPct / 2),
    lactic: f.lactic,
    acetic: f.acetic,
    amylase: 0,
    protease: 0,
    phytase: 0,
    ...extra,
  });

  let gas = 0;
  let vol = 0;
  const stepAt = (T: number) => {
    env.T = T;
    const r = fermentStep(f, env);
    f = r.s;
    gas += r.gas * DT;
    // Çavdar hamuru gazı jelde tutar; ağ olmadığı için az kabarır
    vol = Math.max(0, vol + r.gas * DT * 1.6 * gel - vol * 0.02 * DT);
    return r;
  };

  // Karıştırma (15 dk) + 12'ye bölme, ıslak elle haşhaş
  for (let tk = 0; tk < 0.25 - 1e-9; tk += DT) {
    const r = stepAt(ROOM_TEMP_C);
    samples.push(snap(tMix + tk, "yogurma", ROOM_TEMP_C, r.pH, { amylase: r.amylase, protease: r.protease, gas: vol }));
  }

  // ── Kalıpta mayalanma: üstte çatlaklar belirene dek ──
  const tProof = tMix + 0.25;
  let cracked = false;
  for (let tp = 0; tp < d.proofHours - 1e-9; tp += DT) {
    const r = stepAt(ROOM_TEMP_C);
    if (!cracked && gas / RYE_GAS_REF >= 0.55) {
      cracked = true;
      ev(tProof + tp, "iki_kat", "Üstte çatlaklar belirdi");
    }
    samples.push(snap(tProof + tp, "mayalanma", ROOM_TEMP_C, r.pH, { amylase: r.amylase, protease: r.protease, gas: vol, dissolvedCO2: 0.9 }));
  }
  const proofAtFridge = gas / RYE_GAS_REF;

  // ── Dolap: kapalı kalıp, gece boyunca ──
  const tFridge = tProof + d.proofHours;
  ev(tFridge, "dolap", d.covered ? "Dolap · üstü kapalı" : "Dolap · üstü açık");
  let T = ROOM_TEMP_C;
  for (let tf = 0; tf < FRIDGE_HOURS - 1e-9; tf += DT) {
    T = FRIDGE_C + (T - FRIDGE_C) * Math.exp(-DT / 2.2);
    const r = stepAt(T);
    samples.push(snap(tFridge + tf, "dolap", T, r.pH, { gas: vol, dissolvedCO2: 0.7 }));
  }
  const proof = gas / RYE_GAS_REF;
  const pH = pHFromAcid(f.lactic + f.acetic, mx.buffer);

  // ── Fırın: düşen sıcaklık, uzun pişme; amilaz jelleşen nişastaya saldırır, asit frenler ──
  const tOven = tFridge + FRIDGE_HOURS;
  ev(tOven, "firin", d.fallingOven ? "Fırın · 280 °C'de ısındı, 220 °C'de yüklendi, ısıtıcılar kapalı" : "Fırın · sabit 220 °C");
  const heat: HeatState = { coreC: T, surfaceC: T, yeastAlive: 1, labAlive: 1, starchGel: 0, glutenSet: 0, crust: 0, retro: 0 };
  // Saldırı gücü: haşlanmamış çavdar ununun enzimi + haşlamadan kalan; pH 4'te durur, 5,6'da tam
  const enzymeLoad = (RYE_RECIPE.hamur.cavdarUnu + sourFlour * 0.3 + SCALD_GRAIN * scaldEnzymeLeft) / flour;
  const phBrake = clamp((pH - 4.2) / 1.4);
  let attack = 0;
  let crust = 0;
  let surf = T;
  const seen = new Set<string>();
  const mark = (key: BakeEvent["key"], cond: boolean, label: string, t: number) => {
    if (cond && !seen.has(key)) {
      seen.add(key);
      ev(t, key, label);
    }
  };
  // Fırın içindeki nem: yüklerken verilen buhar + hamurun kendi buharı; tahliye düşürür
  let moisture = d.steamAtLoad ? 1 : 0.45;
  const ventEvery = d.vents > 0 ? d.bakeMinutes / (d.vents + 1) : Infinity;
  for (let m = 0; m <= d.bakeMinutes; m += 1) {
    const core = ryeCoreAt(m, T, d.fallingOven);
    const air = ryeOvenAirAt(m, d.fallingOven);
    if (m > 0 && m % Math.max(1, Math.round(ventEvery)) === 0 && d.vents > 0) moisture *= 0.55;
    moisture = Math.min(1, moisture + 0.006);
    // Yüzey: nem çoksa ~100 °C'de kalır; kurudukça fırın havasına yaklaşır
    const surfTarget = 100 + (air - 100) * (1 - 0.6 * moisture);
    surf = surfTarget + (surf - surfTarget) * Math.exp(-1 / 6);
    if (surf > 120) crust += ((surf - 120) / 100) * 0.019;
    const gelNow = clamp((core - mx.gelStart) / (mx.gelEnd - mx.gelStart));
    // Saldırı: amilaz hâlâ çalışırken (≤ 90 °C) jelleşmiş nişasta kesilir
    attack += amylaseActivity(core, 5.5, mx.amylaseOff) * gelNow * enzymeLoad * phBrake * 0.055;
    heat.coreC = core;
    heat.surfaceC = surf;
    heat.yeastAlive = clamp(1 - (core - 50) / 10);
    heat.labAlive = clamp(1 - (core - 55) / 12);
    heat.starchGel = Math.max(preGel * 0.5, gelNow);
    heat.glutenSet = clamp((core - 70) / 20);
    heat.crust = clamp(crust);
    const t = tOven + m / 60;
    mark("maya_oldu", core >= 60, "Mayalar ve bakteriler öldü · ~60 °C", t);
    mark("nisasta_jel", core >= mx.gelStart, `Çavdar nişastası jelleşiyor · ${mx.gelStart} °C`, t);
    mark("amilaz_durdu", core >= mx.amylaseOff, `Amilaz sustu · ${mx.amylaseOff} °C`, t);
    mark("ic_pisti", core >= 96, "İç 96 °C · pişti", t);
    if (m % 3 === 0)
      samples.push(
        snap(t, "firin", core, pH, {
          heat: { ...heat },
          amylase: amylaseActivity(core, pH, mx.amylaseOff),
          damagedStarch: clamp(f.dstarch / 18),
          gas: vol,
        })
      );
  }
  const coreC = ryeCoreAt(d.bakeMinutes, T, d.fallingOven);
  if (d.flip) ev(tOven + d.bakeMinutes / 60, "firindan_cikti", "Kalıptan çıkarıldı, ters çevrildi · alt kabuk kurudu");
  const bottomCrust = d.flip ? 0.85 : 0.35;

  // ── Dinlenme: streçte, nem dağılır, nişasta oturur ──
  const tRest = tOven + d.bakeMinutes / 60 + (d.flip ? 0.2 : 0);
  const restIdeal = 48;
  for (let i = 1; i <= 24; i++) {
    const tr = (Math.max(0, d.restHours) * i) / 24;
    heat.coreC = ROOM_TEMP_C + (heat.coreC - ROOM_TEMP_C) * Math.exp(-(d.restHours / 24) / 1.5);
    heat.retro = clamp(tr / restIdeal);
    samples.push(snap(tRest + tr, "sogutma", heat.coreC, pH, { heat: { ...heat }, gas: vol }));
  }
  ev(tRest + d.restHours, "kesildi", `Kesildi · ${d.restHours} saat sonra`);

  const result = scoreRye(d, {
    pH,
    attack: clamp(attack),
    proof,
    proofAtFridge,
    coreC,
    crust,
    bottomCrust,
    hydration,
    saltPct,
    sweetness,
    preGel,
    acid: f.lactic + f.acetic,
  });
  events.sort((a, b) => a.t - b.t);
  return {
    result,
    samples,
    events,
    marks: { haslama: 0, karistirma: tMix, mayalanma: tProof, dolap: tFridge, firin: tOven, dinlenme: tRest },
  };
}

/** Usta ayarında fırına girerken üretilmiş gaz (olgunluk 1,0) — kalibrasyon */
export const RYE_GAS_REF = 0.44;

interface RyePhysio {
  pH: number;
  attack: number;
  proof: number;
  proofAtFridge: number;
  coreC: number;
  crust: number;
  bottomCrust: number;
  hydration: number;
  saltPct: number;
  sweetness: number;
  preGel: number;
  acid: number;
}

function scoreRye(d: RyeDecisions, p: RyePhysio): RyeResult {
  const tips: RyeTipKey[] = [];
  const proofQ = gauss(p.proof, 1, 0.28);
  const under = p.proof < 0.65;
  const over = p.proof > 1.45;
  // Kaplama: ıslak el olmadan haşhaş tutmaz
  const poppy = clamp(d.poppyCoverage * (d.wetHands ? 1 : 0.45));
  const skin = d.covered ? 1 : 0.55;
  const done = clamp((p.coreC - 88) / 9);
  const restQ = clamp(d.restHours / 48);
  const earlyCut = clamp(1 - d.restHours / 24);
  // Yapışkan iç: nişasta saldırısı + erken kesim + az pişme + yoğurmanın yapışkanlığı
  const gummy = clamp(0.9 * p.attack + 0.6 * earlyCut + 0.8 * (1 - done) + (d.mix === "yogur" ? 0.08 : 0) - 0.15 * p.preGel);
  const height = clamp(0.35 + 0.35 * proofQ - (over ? 0.25 * (p.proof - 1.45) : 0) - (under ? 0.1 : 0), 0.15, 0.8);
  // Kabuk: renk + alt kabuk + kapalı dolap (kabuk derisi kurumaz) + haşhaş
  const crustColor = clamp(p.crust);
  const burnt = crustColor > 0.95;
  const crustQ = gauss(crustColor, 0.62, 0.2);
  const sourness = clamp((p.acid - 20) / 70);
  const acidBalance = gauss(sourness, 0.45, 0.3);
  const saltTaste = gauss(p.saltPct, 2.5, 0.9);
  const scores = {
    // Buharsız yüklemede kabuk erken bağlar, ekmek açılamaz ve yanlardan yırtılır
    kabarma: Math.round(100 * clamp(0.75 * proofQ + 0.25 * poppy) * (d.mix === "yogur" ? 0.92 : 1) * (d.steamAtLoad ? 1 : 0.85)),
    // Fazla mayalanan çavdarın kabuk altında boşluk kalır, iç çöker
    ic: Math.round(100 * clamp(1 - gummy) * (0.85 + 0.15 * restQ) * (over ? 0.75 : 1)),
    kabuk: Math.round(100 * clamp(crustQ * (0.55 + 0.45 * p.bottomCrust) * skin * (0.8 + 0.2 * poppy) * (burnt ? 0.3 : 1))),
    lezzet: Math.round(100 * clamp(saltTaste * (0.45 + 0.3 * acidBalance + 0.25 * p.sweetness) * (0.75 + 0.25 * restQ) * (1 - 0.4 * gummy))),
    toplam: 0,
  };
  scores.toplam = Math.round((scores.kabarma + scores.ic + scores.kabuk + scores.lezzet) / 4);

  if (p.attack > 0.35) tips.push("asit_az");
  if (d.scaldWater === "ilik") tips.push("haslama_ilik");
  else if (d.scaldHours < 8) tips.push("haslama_kisa");
  if (d.mix === "yogur") tips.push("yogurdun");
  if (!d.wetHands) tips.push("el_kuru");
  else if (d.poppyCoverage < 0.6) tips.push("hashas_eksik");
  if (over) tips.push("mayalanma_fazla");
  else if (under) tips.push("mayalanma_az");
  if (!d.covered) tips.push("ortu_yok");
  if (!d.fallingOven && crustColor > 0.8) tips.push("firin_sabit");
  if (!d.steamAtLoad) tips.push("buhar_yok");
  if (d.vents === 0) tips.push("buhar_kaldi");
  if (!d.flip) tips.push("ters_cevirmedi");
  if (done < 0.7) tips.push("az_pisti");
  if (d.restHours < 24) tips.push("erken_kesti");
  if (Math.abs(p.saltPct - 2.5) > 1) tips.push("tuz");

  const title = burnt
    ? "Kömür"
    : p.attack > 0.5
    ? "Yapışkan tuğla"
    : earlyCut > 0.5
    ? "Sabırsız fırıncı"
    : scores.toplam >= 90
    ? "Gece yarısı ustası"
    : scores.toplam >= 80
    ? "Çavdarın dilini çözdün"
    : scores.toplam >= 68
    ? "Fena değil komşu"
    : "Hamur bloğu";

  return {
    pH: Math.round(p.pH * 100) / 100,
    starchAttack: p.attack,
    proof: p.proof,
    coreC: Math.round(p.coreC),
    gummy,
    crust: crustColor,
    bottomCrust: p.bottomCrust,
    height,
    sweetness: p.sweetness,
    sourness,
    scores,
    title,
    tips: tips.slice(0, 3),
  };
}

export const RYE_TIP_TEXT: Record<RyeTipKey, string> = {
  asit_az: "Ekşi maya az kalmış; asit amilazı frenleyemedi, fırında nişastayı kesti ve iç yapıştı. Çavdarda asit şart.",
  haslama_ilik: "Haşlamayı ılık suyla yaptın; enzimler sönmedi, nişasta önceden jelleşmedi. Kaynar su hem tatlılık hem nem verir.",
  haslama_kisa: "Haşlama yeterince beklemedi; tohumlar ve kırma suyu tam çekmedi, tatlılık gelişmedi. Bir gün beklet.",
  yogurdun: "Çavdarı yoğurdun; çavdar gluten ağı kurmaz, yoğurmak yalnız yapışkanlaştırır. Sadece karıştır.",
  el_kuru: "Elin ve hamur kuruyken haşhaş tutmadı. Önce elini ve hamurun her tarafını ıslat.",
  hashas_eksik: "Haşhaş her yeri kaplamamış; kabukta çıplak yerler kaldı.",
  mayalanma_az: "Üstte çatlaklar belirmeden dolaba koydun; ekmek sıkı ve yanları yırtık oldu.",
  mayalanma_fazla: "Fazla mayalandı; çatlaklar derinleşti, fırında çöktü. Çatlaklar belirince dolaba al.",
  ortu_yok: "Dolapta üstünü kapatmadın; yüzey kurudu, kabuk derisi çatladı.",
  firin_sabit: "Fırını 220 °C'de sabit bıraktın; iki saatte üst yandı. Isıtıcıları kapat, sıcaklık kendiliğinden düşsün.",
  buhar_kaldi: "Buharı hiç tahliye etmedin; kabuk ıslak ve yumuşak kaldı.",
  buhar_yok: "Yüklerken buhar vermedin; kabuk hemen bağladı, ekmek açılamadı.",
  ters_cevirmedi: "Kalıptan çıkarıp ters çevirmedin; alt kabuk nemli kaldı.",
  az_pisti: "Biraz daha fırında kalmalıydı; yoğun çavdarın içi 96 dereceyi görmedi.",
  erken_kesti: "Bir gün dolmadan kestin; jel oturmadan bıçağa yapışır. Streçte en az bir, ideali iki gün.",
  tuz: "Tuz dengesi kaçmış; bu hamurda unun ~%2,5'i iyi.",
};
