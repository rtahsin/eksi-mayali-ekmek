/** EkmekLab simülatörü ("Usta Olabilir misin?") — oyuncunun kararları ve ekmeğin sonucu. */

export type WaterTemp = "soguk" | "oda" | "ilik";
export type FridgePlan = "dort" | "on_iki_sonra_dort";
export type CutWait = "hemen" | "bir_saat" | "uc_saat";

export interface BakeDecisions {
  /** Mayayı beslemeden kaç saat sonra kullandın (0–12) */
  levainHours: number;
  /** Maya miktarı, unun yüzdesi (5–30) */
  levainPct: number;
  /** Su / un yüzdesi (60–90) */
  hydration: number;
  waterTemp: WaterTemp;
  /** Tuz, unun yüzdesi (0–4) */
  saltPct: number;
  /** Yoğurma mini oyunu başarısı (0–1) */
  kneadQuality: number;
  /** Katlamalı mayalanma süresi, saat (1–6) */
  bulkHours: number;
  /** Katlamaların yapıldığı saatler (bulk başından itibaren) */
  foldTimes: number[];
  /** Ön + son şekildeki gerginlik (0–1) */
  shapeTension: number;
  fridgePlan: FridgePlan;
  /** Bıçak açısı, hamur yüzeyine göre derece (0–90) */
  scoreAngle: number;
  /** Kesik derinliği (0–1) */
  scoreDepth: number;
  /** Fırın sıcaklığı, °C (180–260) */
  ovenTemp: number;
  /** Buharlı pişirme, dakika (0–30) */
  steamMinutes: number;
  /** Toplam pişirme, dakika (20–70) */
  bakeMinutes: number;
  cutWait: CutWait;
}

export type TipKey =
  | "maya_erken"
  | "maya_gec"
  | "maya_cok"
  | "maya_az"
  | "su_fazla"
  | "su_az"
  | "hamur_sicak"
  | "hamur_soguk"
  | "tuz_yok"
  | "tuz_fazla"
  | "yogurma_zayif"
  | "katlama_az"
  | "katlama_bosa"
  | "az_kabardi"
  | "fazla_kabardi"
  | "gerginlik_az"
  | "kesik_kotu"
  | "buhar_az"
  | "buhar_fazla"
  | "az_pisti"
  | "yandi"
  | "erken_kesti";

export interface BakeResult {
  /** Ara değerler (ekranda göstergeler için) */
  doughTemp: number;
  /** Bulk sonu hacim artışı (1.0 = iki katı) */
  bulkRise: number;
  /** Fırına girerken toplam kabarma (1.0–1.2 ideal) */
  proof: number;
  gluten: number;
  /** Ekmeğin şekli ve görünüşü (çizim için, 0–1) */
  height: number;
  ear: number;
  crust: number;
  openness: number;
  gummy: number;
  sourness: number;
  /** Puanlar (0–100) */
  scores: { kabarma: number; ic: number; kabuk: number; lezzet: number; toplam: number };
  title: string;
  tips: TipKey[];
}
