/** EkmekLab simülatörü ("Usta olabilir misin?") — seviyeler, oyuncu kararları, sonuç. */

export type LevelId = "koy" | "siyez" | "gece_yarisi";

export interface LevelProfile {
  id: LevelId;
  name: string;
  rank: "Çırak" | "Kalfa" | "Usta";
  blurb: string;
  /** Unun kaldırabileceği en yüksek su oranı (%) */
  maxHydration: number;
  /** Ustanın su aralığı (%) */
  idealHydration: [number, number];
  /** Gluten gücü (köy = 1); siyez zayıf */
  glutenStrength: number;
  /** Mayalanma hızı çarpanı */
  fermentSpeed: number;
  /** Kesmek için ideal bekleme (saat) */
  cutIdealHours: number;
  crumbColor: string;
  /** Açılması için köy ekmeğinde gereken en iyi puan (yoksa açık) */
  unlockScore?: number;
  available: boolean;
}

export type FridgePlan = "dort" | "on_iki_sonra_dort";
export type SaltTiming = "otoliz" | "son";

export interface ScoreCut {
  /** Kesiğin ekmeğin uzun eksenine göre açısı (derece, 0 = boylamasına) */
  angleToAxis: number;
  /** Kesiğin ekmek boyunu kaplama oranı (0–1) */
  coverage: number;
  /** Hareketin kararlılığı / hızı (0–1) */
  speed: number;
  /** Bıçağın yüzeye göre tutuluşu */
  blade: 30 | 90;
}

export interface BakeDecisions {
  level: LevelId;
  /** Mayayı beslemeden kaç saat sonra kullandın */
  levainHours: number;
  /** Döküp tarttığın maya (g, 4000 g una) */
  levainGrams: number;
  /** Döküp tarttığın su (g) */
  waterGrams: number;
  /** Suyun sıcaklığı (°C) */
  waterTempC: number;
  saltGrams: number;
  saltTiming: SaltTiming;
  /** Yoğurma ritim oyunu başarısı (0–1) */
  kneadQuality: number;
  /** Katlamalı mayalanma süresi (saat) */
  bulkHours: number;
  /** Katlamaların yapıldığı saatler */
  foldTimes: number[];
  preshapeTension: number;
  finalTension: number;
  fridgePlan: FridgePlan;
  cut: ScoreCut;
  /** Fırına buhar verildi mi */
  steam: boolean;
  /** Buharın tahliye edildiği dakika (null = hiç) */
  ventMinute: number | null;
  bakeMinutes: number;
  /** Fırından çıktıktan kaç saat sonra kesildi */
  cutWaitHours: number;
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
  | "tuz_otoliz"
  | "yogurma_zayif"
  | "katlama_az"
  | "katlama_bosa"
  | "az_kabardi"
  | "fazla_kabardi"
  | "gerginlik_az"
  | "gerginlik_fazla"
  | "kesik_kotu"
  | "kesik_dik"
  | "buhar_yok"
  | "buhar_tahliye_yok"
  | "buhar_erken"
  | "az_pisti"
  | "yandi"
  | "erken_kesti";

export interface AromaProfile {
  /** Yoğurt gibi yumuşak ekşilik */
  laktik: number;
  /** Sirke gibi keskin ekşilik */
  asetik: number;
  /** Kabuktan gelen kavrulmuş / kraker kokusu (Maillard) */
  kavrulmus: number;
}

export interface BakeResult {
  doughTemp: number;
  hydration: number;
  levainPct: number;
  saltPct: number;
  bulkRise: number;
  /** Fırına girerken toplam kabarma (≈1,0–1,2 ideal) */
  proof: number;
  gluten: number;
  internalTemp: number;
  /** Çizim için 0–1 değerler */
  height: number;
  ear: number;
  crust: number;
  openness: number;
  gummy: number;
  sourness: number;
  aroma: AromaProfile;
  crumbColor: string;
  scores: { kabarma: number; ic: number; kabuk: number; lezzet: number; toplam: number };
  title: string;
  tips: TipKey[];
}
