import type { BakeDecisions, BakeResult, TipKey } from "@/types/game";

/**
 * EkmekLab simülatörü: oyuncunun kararlarından ekmeği hesaplar (saf, deterministik).
 * Kurallar Tahsin'in köy ekmeği reçetesinden (docs/OYUN.md §9) basitleştirilmiştir.
 */

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));

/** Köy ekmeği un karışımının kaldırabileceği en yüksek su oranı */
export const FLOUR_MAX_HYDRATION = 78;

const WATER_C = { soguk: 4, oda: 20, ilik: 35 } as const;
const CUT_GUMMY = { hemen: 0.45, bir_saat: 0.12, uc_saat: 0 } as const;

/** Tahsin'in ayarları: oyunun "usta ayarı" ve testlerin referansı */
export const MASTER_DECISIONS: BakeDecisions = {
  levainHours: 4.5,
  levainPct: 20,
  hydration: 75,
  waterTemp: "soguk",
  saltPct: 2,
  kneadQuality: 0.9,
  bulkHours: 3,
  foldTimes: [0.5, 1, 1.5, 2, 2.5],
  shapeTension: 0.85,
  fridgePlan: "dort",
  scoreAngle: 30,
  scoreDepth: 0.45,
  ovenTemp: 220,
  steamMinutes: 20,
  bakeMinutes: 40,
  cutWait: "uc_saat",
};

/** Maya canlılığı: beslemeden ~4,5 saat sonra tepe; öncesi hızlı yükselir, sonrası yavaş düşer */
export function starterVigor(hours: number): number {
  return hours <= 4.5 ? gauss(hours, 4.5, 1.5) : gauss(hours, 4.5, 4);
}

/** Hamur sıcaklığı: su sıcaklığı + un/oda (~22 °C) + yoğurma sürtünmesi */
export function doughTemperature(waterTemp: BakeDecisions["waterTemp"], kneadQuality: number): number {
  return 0.45 * WATER_C[waterTemp] + 0.55 * 22 + (6 + 8 * clamp(kneadQuality));
}

/** Mayalanma hızı (1 = usta temposu): maya miktarı × canlılık × sıcaklık × tuz */
export function fermentationRate(d: BakeDecisions, doughTemp: number): number {
  const levainFactor = d.levainPct / 17.5;
  const vigor = 0.4 + 0.6 * starterVigor(d.levainHours);
  const tempFactor = 2 ** ((doughTemp - 27) / 7);
  const saltFactor = 1.25 - 0.125 * d.saltPct;
  return levainFactor * vigor * tempFactor * saltFactor;
}

export function simulateBread(d: BakeDecisions): BakeResult {
  const tips: TipKey[] = [];

  // 1) Maya, hamur sıcaklığı, mayalanma hızı
  const doughTemp = doughTemperature(d.waterTemp, d.kneadQuality);
  const r = fermentationRate(d, doughTemp);
  const acidity = clamp((d.levainHours - 4.5) / 6);
  const bulkRise = (r * d.bulkHours) / 3.3;

  // 2) Gluten: yoğurma + katlama (hamurun yayılma eğilimine göre) + tuz
  const spread = 0.4 + Math.max(0, d.hydration - 70) / 20;
  const foldsNeeded = 3 + 4 * spread;
  const folds = d.foldTimes.filter((t) => t > 0 && t <= d.bulkHours).length;
  const foldScore =
    folds <= foldsNeeded ? clamp(1 - (foldsNeeded - folds) / foldsNeeded) : clamp(1 - (folds - foldsNeeded) / (2 * foldsNeeded));
  const saltGluten = clamp(1 - Math.abs(d.saltPct - 2) / 4);
  const gluten = clamp(0.4 * d.kneadQuality + 0.4 * foldScore + 0.2 * saltGluten);
  const slack = Math.max(0, d.hydration - FLOUR_MAX_HYDRATION) / 10 + Math.max(0, 0.6 - gluten);

  // 3) Dolap: tam kabarmışsa 4 °C az ekler; erken şekil verildiyse 12 °C ideale taşır
  const extra =
    d.fridgePlan === "dort" ? r * 0.08 : Math.min(0.6 * r, Math.max(0.15 * r, 1.1 - bulkRise));
  const proof = bulkRise + extra;
  const proofQ = gauss(proof, 1.12, 0.22);
  const underProof = proof < 0.85;
  const overProof = proof > 1.4;
  // Aşırı mayalanma: maya şekeri tüketir → kabuk soluk, tat ekşi/alkolümsü
  const overFerm = clamp((proof - 1.4) / 1.0);

  // 4) Fırın
  const steamQ = gauss(d.steamMinutes, 20, 8);
  const doneness = (d.bakeMinutes * (d.ovenTemp / 220)) / 42;
  const scoreQ = gauss(d.scoreAngle, 30, 15) * gauss(d.scoreDepth, 0.45, 0.2);
  const ovenSpring = clamp(0.45 * proofQ + 0.25 * gluten + 0.15 * steamQ + 0.15 * d.shapeTension);

  const height = clamp(0.3 + 0.5 * ovenSpring - 0.25 * slack - (overProof ? 0.4 * (proof - 1.4) : 0), 0.18, 0.85);
  const ear = clamp(scoreQ * (0.4 + 0.6 * steamQ) * ovenSpring);
  const crust = clamp(
    0.25 +
      (0.55 * (doneness - 0.6)) / 0.6 +
      (0.15 * (d.ovenTemp - 220)) / 40 -
      (0.15 * Math.max(0, d.steamMinutes - 25)) / 10 -
      0.3 * overFerm
  );
  const openness = clamp(
    0.25 + 0.5 * proofQ * gluten + 0.3 * clamp((d.hydration - 65) / 20) - 0.2 * slack - (underProof ? 0.15 : 0)
  );
  const gummy = clamp(Math.max(0, 0.9 - doneness) * 3 + CUT_GUMMY[d.cutWait] + (underProof ? 0.2 : 0));
  const sourness = clamp(0.15 + 0.6 * acidity + 0.4 * overFerm + (d.fridgePlan === "on_iki_sonra_dort" ? 0.05 : 0));

  // 5) Puanlar
  const saltTaste = gauss(d.saltPct, 2, 0.8);
  // Tat: mayalanmanın gelişmesi + mayanın canlılığı; çiğ kalan iç ve yorgun maya tadı bozar
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

  // 6) Ustanın yorumları (en etkili olanlar önce)
  if (d.levainHours < 3) tips.push("maya_erken");
  else if (d.levainHours > 9) tips.push("maya_gec");
  if (d.levainPct > 22) tips.push("maya_cok");
  else if (d.levainPct < 12) tips.push("maya_az");
  if (doughTemp > 30) tips.push("hamur_sicak");
  else if (doughTemp < 23) tips.push("hamur_soguk");
  if (overProof) tips.push("fazla_kabardi");
  else if (underProof) tips.push("az_kabardi");
  if (d.hydration > FLOUR_MAX_HYDRATION + 2) tips.push("su_fazla");
  else if (d.hydration < 66) tips.push("su_az");
  if (d.saltPct < 1) tips.push("tuz_yok");
  else if (d.saltPct > 3) tips.push("tuz_fazla");
  if (d.kneadQuality < 0.5) tips.push("yogurma_zayif");
  if (folds < foldsNeeded - 2) tips.push("katlama_az");
  else if (d.hydration <= 68 && folds >= 6) tips.push("katlama_bosa");
  if (d.shapeTension < 0.45) tips.push("gerginlik_az");
  if (scoreQ < 0.4) tips.push("kesik_kotu");
  if (d.steamMinutes < 10) tips.push("buhar_az");
  else if (d.steamMinutes > 30) tips.push("buhar_fazla");
  if (doneness < 0.85) tips.push("az_pisti");
  else if (crust > 0.9) tips.push("yandi");
  if (d.cutWait === "hemen") tips.push("erken_kesti");

  return {
    doughTemp: Math.round(doughTemp * 10) / 10,
    bulkRise,
    proof,
    gluten,
    height,
    ear,
    crust,
    openness,
    gummy,
    sourness,
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
  if (total >= 88) return "Usta işi";
  if (total >= 75) return "Fena değil komşu";
  if (total >= 60) return "Ev ekmeği";
  if (s.overProof && s.height < 0.45) return "Pide oldu";
  if (s.underProof && s.openness < 0.45) return "Tuğla";
  return "Hamurumsu";
}

/** Tahsin'in ağzından ipuçları (oyunda baloncuk olarak) */
export const TIP_TEXT: Record<TipKey, string> = {
  maya_erken: "Mayayı erken kullandın; daha tepe yapmamıştı. 4–5 saat bekle, kabarcıkları gör.",
  maya_gec: "Maya beklemekten yorulmuş; çok asidik olunca ekmek hem ekşir hem kabarmaz.",
  maya_cok: "Maya fazla gelmiş; hamur öyle hızlı gider ki yetişemezsin. Unun %15–20'si yeter.",
  maya_az: "Maya az kalmış; hamuru kaldıracak gücü yok.",
  su_fazla: "Bu un o kadar suyu kaldırmıyor; hamur yayıldı. Her un aynı suyu içmez.",
  su_az: "Su az olunca içi sıkı olur; köy ekmeği %75 civarını sever.",
  hamur_sicak: "Hamur çok ısınmış; soğuk su kullan, 27–28 dereceyi geçmesin.",
  hamur_soguk: "Hamur soğuk kalmış; yoğurmayı biraz daha sürdür.",
  tuz_yok: "Tuzu unuttun! Tuzsuz ekmek yavan olur, hamur da gevşer.",
  tuz_fazla: "Tuz fazla; mayayı da yavaşlattı. %2 iyidir.",
  yogurma_zayif: "Yoğurma yarım kaldı; gluten penceresini görmeden bırakma.",
  katlama_az: "Hamur yayılırken katlamamışsın; yayıldıkça topla, gerginleştir.",
  katlama_bosa: "Bu hamur zaten yayılmıyordu; katlamak boşa yorgunluk.",
  az_kabardi: "Hamur yeterince kabarmadan fırına girdi; erken şekil verdiysen dolabı 12–13 dereceye al.",
  fazla_kabardi: "Fazla kabarmış, fırında çöktü. Tam kabardıysa dolap 4 derece olmalı.",
  gerginlik_az: "Şekil verirken gerginlik yok; ekmek yukarı değil yana büyüdü.",
  kesik_kotu: "Bıçağı yatık tut, 30 derece civarı, ne çok sığ ne çok derin; kulak öyle kalkar.",
  buhar_az: "Buhar az; kabuk erken sertleşti, ekmek açılamadı.",
  buhar_fazla: "Buharı çok tuttun; kabuk soluk ve kalın kaldı.",
  az_pisti: "Biraz daha fırında kalmalıydı; içi tam pişmedi.",
  yandi: "Fırında unuttun galiba; kabuk kömür oldu!",
  erken_kesti: "Sabırsızlık! Sıcakken kesersen içi hamur gibi olur; köy ekmeği 3 saat bekler.",
};
