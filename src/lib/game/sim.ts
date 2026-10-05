import type { BakeDecisions, BakeResult, BakeRun, TipKey } from "@/types/game";
import { coreTempAt, simulateBake, sampleAt } from "./engine/bake";

/**
 * Aşama ekranlarının kullandığı yardımcılar. Hesap v3 motorunda (engine/bake.ts): zaman adımlı mikro dünya.
 * Bu dosya ekranlarla motor arasındaki ince katmandır.
 */

export { MASTER_DECISIONS, doughTemperature, waterTempFor, frictionFactor, levelOf, pokeResult } from "./engine/bake";

const gauss = (x: number, mu: number, sigma: number) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));

/** Aynı kararlarla tekrar tekrar hesaplamamak için küçük önbellek */
const cache = new Map<string, BakeRun>();
export function runFor(d: BakeDecisions): BakeRun {
  const key = JSON.stringify(d);
  const hit = cache.get(key);
  if (hit) return hit;
  const run = simulateBake(d);
  cache.set(key, run);
  if (cache.size > 40) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  return run;
}

export function simulateBread(d: BakeDecisions): BakeResult {
  return runFor(d).result;
}

/** Maya canlılığı: beslemeden ~4,5 saat sonra tepe; öncesi hızlı yükselir, sonrası yavaş düşer */
export function starterVigor(hours: number): number {
  return hours <= 4.5 ? gauss(hours, 4.5, 1.5) : gauss(hours, 4.5, 4);
}

/** Katlamalı mayalanmanın t. saatinde hacim artışı (1 = iki katı), motorun zaman çizelgesinden */
export function bulkRiseAt(d: BakeDecisions, _doughTemp: number, hours: number): number {
  const run = runFor({ ...d, bulkHours: Math.max(5, d.bulkHours) });
  if (hours <= 0) return 0;
  return sampleAt(run, run.marks.mayalanma + Math.min(hours, 5) - 1e-6).gas;
}

/** Şekil anında hamurun olgunluğu (1 = fırına girerken ideal) */
export function maturityAtShape(d: BakeDecisions): number {
  return runFor(d).maturityAtShape;
}

/** Fırına girerken olgunluk */
export function maturityAtOven(d: BakeDecisions): number {
  return runFor(d).result.proof;
}

/** Fırındaki ekmeğin iç sıcaklığı (°C), dolaptan ~5 °C girer */
export function internalTempAt(minutes: number): number {
  return coreTempAt(minutes, 5);
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
  tuz_otoliz: "Tuzu otolize koymuşsun. Ben sona saklarım ama denemelerde farkı tartışmalı; asıl önemli olan miktarı.",
  yogurma_zayif: "Yoğurma yarım kaldı; gluten penceresini görmeden bırakma.",
  katlama_az: "Hamur yayılırken katlamamışsın; yayıldıkça topla, gerginleştir.",
  katlama_bosa: "Bu hamur zaten yayılmıyordu; katlamak boşa yorgunluk.",
  az_kabardi: "Hamur yeterince olgunlaşmadan fırına girdi; erken şekil verdiysen dolabı önce 12–13 dereceye al.",
  fazla_kabardi: "Fazla mayalanmış; ağ gazı tutamadı, fırında çöktü. Tam kabardıysa dolap 4 derece olmalı.",
  gerginlik_az: "Şekil verirken gerginlik yok; ekmek yukarı değil yana büyüdü.",
  gerginlik_fazla: "Fazla zorladın, yüzey yırtıldı; gaz kaçtı. Gergin ama nazik.",
  kesik_kotu: "Kesik kararsız kaldı. Boylamasına, tek ve kararlı bir hareket; ekmeğin dörtte üçü boyunca.",
  kesik_dik: "Bıçağı dik tuttun; ekmek açıldı ama kulak kalkmadı. Bıçağı 30 derece yatır.",
  buhar_yok: "Buhar vermedin; kabuk hemen sertleşti, ekmek açılamadı.",
  buhar_tahliye_yok: "Buharı hiç tahliye etmedin; kabuk soluk ve yumuşak kaldı. 20. dakikada kapağı aç.",
  buhar_erken: "Buharı çok erken bıraktın; ekmek tam açılmadan kabuk dondu.",
  az_pisti: "Biraz daha fırında kalmalıydı; içi pişme sıcaklığını görmedi.",
  yandi: "Fırında unuttun galiba; kabuk kömür oldu!",
  erken_kesti: "Sabırsızlık! Nişasta oturmadan kesersen içi hamur gibi olur.",
};
