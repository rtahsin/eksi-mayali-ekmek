import type { BakeDecisions, BakeResult, LevelProfile, TipKey } from "@/types/game";
import { FLOUR_GRAMS, FLOUR_TEMP_C, LEVAIN_TEMP_C, LEVELS, ROOM_TEMP_C } from "./levels";

/**
 * EkmekLab simülatörü v2: oyuncunun kararlarından ekmeği hesaplar (saf, deterministik).
 * Kurallar Tahsin'in reçetesi (docs/OYUN.md §9) + fırıncılık bilgisinin basitleştirilmiş modelidir.
 */

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));

/** Tahsin'in köy ekmeği: oyunun "usta ayarı" ve testlerin referansı */
export const MASTER_DECISIONS: BakeDecisions = {
  level: "koy",
  levainHours: 4.5,
  levainGrams: 800,
  waterGrams: 3000,
  waterTempC: 4,
  saltGrams: 80,
  saltTiming: "son",
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

/** Maya canlılığı: beslemeden ~4,5 saat sonra tepe; öncesi hızlı yükselir, sonrası yavaş düşer */
export function starterVigor(hours: number): number {
  return hours <= 4.5 ? gauss(hours, 4.5, 1.5) : gauss(hours, 4.5, 4);
}

/** Yoğurmanın hamuru ısıtması (makine sürtünmesi, °C toplamına eklenen pay) */
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

export function levelOf(d: BakeDecisions): LevelProfile {
  return LEVELS[d.level];
}

/** Mayalanma hızı (1 = usta temposu): maya miktarı × canlılık × sıcaklık × tuz × un */
export function fermentationRate(d: BakeDecisions, doughTemp: number): number {
  const levainPct = (d.levainGrams / FLOUR_GRAMS) * 100;
  const saltPct = (d.saltGrams / FLOUR_GRAMS) * 100;
  const levainFactor = levainPct / 17.5;
  const vigor = 0.4 + 0.6 * starterVigor(d.levainHours);
  const tempFactor = 2 ** ((doughTemp - 27) / 7);
  const saltFactor = 1.25 - 0.125 * saltPct;
  return levainFactor * vigor * tempFactor * saltFactor * levelOf(d).fermentSpeed;
}

/** Belirli bir anda bulk hacim artışı (1,0 = iki katı) */
export function bulkRiseAt(d: BakeDecisions, doughTemp: number, hours: number): number {
  return (fermentationRate(d, doughTemp) * hours) / 3.3;
}

/** Fırındaki ekmeğin iç sıcaklığı (°C) */
export function internalTempAt(minutes: number): number {
  return 20 + 79 * (1 - Math.exp(-minutes / 11));
}

/** Parmak testi: hamurun geri dönüş hızı */
export function pokeResult(proof: number): "hizli" | "yavas" | "donmuyor" {
  if (proof < 0.85) return "hizli";
  if (proof > 1.4) return "donmuyor";
  return "yavas";
}

/** Dolabın eklediği kabarma (4 °C az; 12 °C ideale taşır) */
export function fridgeExtra(plan: BakeDecisions["fridgePlan"], rate: number, bulkRise: number): number {
  return plan === "dort" ? rate * 0.08 : Math.min(0.6 * rate, Math.max(0.15 * rate, 1.1 - bulkRise));
}

export function simulateBread(d: BakeDecisions): BakeResult {
  const lv = levelOf(d);
  const tips: TipKey[] = [];
  const hydration = (d.waterGrams / FLOUR_GRAMS) * 100;
  const levainPct = (d.levainGrams / FLOUR_GRAMS) * 100;
  const saltPct = (d.saltGrams / FLOUR_GRAMS) * 100;

  // 1) Maya, hamur sıcaklığı, mayalanma
  const doughTemp = doughTemperature(d.waterTempC, d.kneadQuality);
  const r = fermentationRate(d, doughTemp);
  const acidity = clamp((d.levainHours - 4.5) / 6);
  const bulkRise = (r * d.bulkHours) / 3.3;

  // 2) Gluten: yoğurma + katlama (yayılma eğilimine göre) + tuz; un gücü çarpan
  const spread = 0.4 + Math.max(0, hydration - (lv.maxHydration - 8)) / 20 + (1 - lv.glutenStrength) * 0.5;
  const foldsNeeded = 3 + 4 * spread;
  const folds = d.foldTimes.filter((t) => t > 0 && t <= d.bulkHours).length;
  const foldScore =
    folds <= foldsNeeded ? clamp(1 - (foldsNeeded - folds) / foldsNeeded) : clamp(1 - (folds - foldsNeeded) / (2 * foldsNeeded));
  const saltGluten = clamp(1 - Math.abs(saltPct - 2) / 4);
  const gluten = clamp(
    (0.4 * d.kneadQuality + 0.4 * foldScore + 0.2 * saltGluten) * (0.78 + 0.22 * lv.glutenStrength) -
      (d.saltTiming === "otoliz" ? 0.05 : 0)
  );
  const slack = Math.max(0, hydration - lv.maxHydration) / 10 + Math.max(0, 0.6 - gluten);
  const tension = (d.preshapeTension + d.finalTension) / 2;
  const tornSkin = Math.max(d.preshapeTension, d.finalTension) > 0.97;

  // 3) Dolap
  const proof = bulkRise + fridgeExtra(d.fridgePlan, r, bulkRise);
  const proofQ = gauss(proof, 1.12, 0.22);
  const underProof = proof < 0.85;
  const overProof = proof > 1.4;
  const overFerm = clamp((proof - 1.4) / 1.0);

  // 4) Fırın (taş taban 280 °C ön ısıtma, 220 °C pişirme — Tahsin)
  const steamMinutes = d.steam ? Math.min(d.bakeMinutes, d.ventMinute ?? d.bakeMinutes) : 0;
  const steamQ = gauss(steamMinutes, 20, 7);
  const doneness = d.bakeMinutes / 42;
  const internalTemp = internalTempAt(d.bakeMinutes);
  const c = d.cut;
  const cutQ = gauss(c.angleToAxis, 8, 18) * gauss(c.coverage, 0.78, 0.22) * (0.45 + 0.55 * clamp(c.speed * 1.3));
  const ovenSpring = clamp(
    0.45 * proofQ + 0.22 * gluten + 0.15 * steamQ + 0.13 * tension + 0.05 * cutQ - (tornSkin ? 0.08 : 0)
  );

  const height = clamp(0.3 + 0.5 * ovenSpring - 0.25 * slack - (overProof ? 0.4 * (proof - 1.4) : 0), 0.18, 0.85);
  const ear = clamp(cutQ * (c.blade === 30 ? 1 : 0.3) * (0.35 + 0.65 * steamQ) * ovenSpring);
  const crust = clamp(
    // Uzun buhar kabuğu soluk tutar ama fırın sonunda yine kızartır (etki sınırlı)
    0.25 + (0.55 * (doneness - 0.6)) / 0.6 - 0.18 * Math.min(2, Math.max(0, steamMinutes - 25) / 10) - 0.3 * overFerm
  );
  const openness = clamp(
    0.22 + 0.5 * proofQ * gluten + 0.3 * clamp((hydration - 62) / 20) - 0.2 * slack - (underProof ? 0.15 : 0)
  );
  const cutEarly = clamp(1 - d.cutWaitHours / lv.cutIdealHours);
  const gummy = clamp(Math.max(0, 0.9 - doneness) * 3 + 0.5 * cutEarly + (underProof ? 0.2 : 0));

  // 5) Aroma: sıcak hamur laktik (yumuşak), serin ve uzun bekleme asetik (keskin); kabuk Maillard
  const totalAcid = clamp(0.25 + 0.5 * acidity + 0.3 * overFerm + (d.fridgePlan === "on_iki_sonra_dort" ? 0.08 : 0));
  const aceticShare = clamp(0.25 + (d.fridgePlan === "dort" ? 0.12 : 0.05) + 0.25 * acidity - 0.03 * (doughTemp - 27));
  const aroma = {
    laktik: clamp(totalAcid * (1 - aceticShare) * 1.4),
    asetik: clamp(totalAcid * aceticShare * 2.2),
    kavrulmus: clamp(gauss(crust, 0.62, 0.22) * (0.5 + 0.5 * steamQ) + (crust > 0.75 ? 0.15 : 0)),
  };
  const sourness = clamp(totalAcid * (0.55 + 0.6 * aceticShare));

  // 6) Puanlar
  const saltTaste = gauss(saltPct, 2, 0.8);
  const flavorBody = clamp(
    0.35 + 0.35 * Math.min(1, proof) + 0.3 * starterVigor(d.levainHours) - (d.levainHours > 9 ? 0.25 : 0)
  );
  const scores = {
    kabarma: Math.round(100 * clamp(0.7 * ovenSpring + 0.3 * ear)),
    ic: Math.round(100 * clamp(0.6 * openness + 0.4 * (1 - gummy) - (overProof ? 0.15 : 0))),
    kabuk: Math.round(100 * gauss(crust, 0.6, 0.18) * (0.6 + 0.4 * steamQ)),
    lezzet: Math.round(100 * clamp(saltTaste * flavorBody * (1 - 0.6 * overFerm) * (1 - 0.35 * gummy))),
    toplam: 0,
  };
  scores.toplam = Math.round((scores.kabarma + scores.ic + scores.kabuk + scores.lezzet) / 4);

  // 7) Ustanın yorumları (en etkili olanlar önce)
  if (overProof) tips.push("fazla_kabardi");
  else if (underProof) tips.push("az_kabardi");
  if (d.levainHours < 3) tips.push("maya_erken");
  else if (d.levainHours > 9) tips.push("maya_gec");
  if (levainPct > 22) tips.push("maya_cok");
  else if (levainPct < 12) tips.push("maya_az");
  if (doughTemp > 30) tips.push("hamur_sicak");
  else if (doughTemp < 23) tips.push("hamur_soguk");
  if (hydration > lv.maxHydration + 2) tips.push("su_fazla");
  else if (hydration < lv.idealHydration[0] - 8) tips.push("su_az");
  if (saltPct < 1) tips.push("tuz_yok");
  else if (saltPct > 3) tips.push("tuz_fazla");
  else if (d.saltTiming === "otoliz") tips.push("tuz_otoliz");
  if (d.kneadQuality < 0.5) tips.push("yogurma_zayif");
  if (folds < foldsNeeded - 2) tips.push("katlama_az");
  else if (spread < 0.5 && folds >= 6) tips.push("katlama_bosa");
  if (tornSkin) tips.push("gerginlik_fazla");
  else if (tension < 0.45) tips.push("gerginlik_az");
  if (c.blade === 90 && cutQ > 0.4) tips.push("kesik_dik");
  else if (cutQ < 0.35) tips.push("kesik_kotu");
  if (!d.steam) tips.push("buhar_yok");
  else if (d.ventMinute === null || steamMinutes > 30) tips.push("buhar_tahliye_yok");
  else if (steamMinutes < 12) tips.push("buhar_erken");
  if (doneness < 0.85) tips.push("az_pisti");
  else if (crust > 0.9) tips.push("yandi");
  if (cutEarly > 0.3) tips.push("erken_kesti");

  return {
    doughTemp: Math.round(doughTemp * 10) / 10,
    hydration: Math.round(hydration * 10) / 10,
    levainPct: Math.round(levainPct * 10) / 10,
    saltPct: Math.round(saltPct * 100) / 100,
    bulkRise,
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

/** Tahsin'in ağzından ipuçları */
export const TIP_TEXT: Record<TipKey, string> = {
  maya_erken: "Mayayı erken kullandın; daha tepe yapmamıştı. Kabarcıkları, kubbeyi bekle.",
  maya_gec: "Maya beklemekten yorulmuş; çok asidik olunca ekmek hem ekşir hem kabarmaz.",
  maya_cok: "Maya fazla gelmiş; hamur öyle hızlı gider ki yetişemezsin. Unun %15–20'si yeter.",
  maya_az: "Maya az kalmış; hamuru kaldıracak gücü yok.",
  su_fazla: "Bu un o kadar suyu kaldırmıyor; hamur yayıldı. Her un aynı suyu içmez.",
  su_az: "Su az olunca içi sıkı olur; hamura biraz daha su ver.",
  hamur_sicak: "Hamur çok ısınmış; soğuk su kullan, 27–28 dereceyi geçmesin.",
  hamur_soguk: "Hamur soğuk kalmış; mayalanma sürünür. Suyu biraz ılıt.",
  tuz_yok: "Tuzu unuttun! Tuzsuz ekmek yavan olur, hamur da gevşer.",
  tuz_fazla: "Tuz fazla; mayayı da yavaşlattı. %2 iyidir.",
  tuz_otoliz: "Tuzu otolize koymuşsun; un suyu yavaş çekti. Tuz en sonda, yoğurmanın bitiminde.",
  yogurma_zayif: "Yoğurma yarım kaldı; gluten penceresini görmeden bırakma.",
  katlama_az: "Hamur yayılırken katlamamışsın; yayıldıkça topla, gerginleştir.",
  katlama_bosa: "Bu hamur zaten yayılmıyordu; katlamak boşa yorgunluk.",
  az_kabardi: "Hamur yeterince kabarmadan fırına girdi; erken şekil verdiysen dolabı 12–13 dereceye al.",
  fazla_kabardi: "Fazla kabarmış, fırında çöktü. Tam kabardıysa dolap 4 derece olmalı.",
  gerginlik_az: "Şekil verirken gerginlik yok; ekmek yukarı değil yana büyüdü.",
  gerginlik_fazla: "Fazla zorladın, yüzey yırtıldı; gaz kaçtı. Gergin ama nazik.",
  kesik_kotu: "Kesik kararsız kaldı. Boylamasına, tek ve kararlı bir hareket; ekmeğin dörtte üçü boyunca.",
  kesik_dik: "Bıçağı dik tuttun; ekmek açıldı ama kulak kalkmadı. Bıçağı 30 derece yatır.",
  buhar_yok: "Buhar vermedin; kabuk hemen sertleşti, ekmek açılamadı.",
  buhar_tahliye_yok: "Buharı hiç tahliye etmedin; kabuk soluk ve yumuşak kaldı. 20. dakikada kapağı aç.",
  buhar_erken: "Buharı çok erken bıraktın; ekmek tam açılmadan kabuk dondu.",
  az_pisti: "Biraz daha fırında kalmalıydı; içi 96 dereceyi görmedi.",
  yandi: "Fırında unuttun galiba; kabuk kömür oldu!",
  erken_kesti: "Sabırsızlık! Nişasta oturmadan kesersen içi hamur gibi olur.",
};
