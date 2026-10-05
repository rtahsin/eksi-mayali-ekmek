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
  /** Otoliz süresi (dakika; 0 = otoliz yok) */
  autolyseMinutes: number;
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

/* ───────────────────────── Sürüm 3: mikro dünya, maya bölümü, defter ───────────────────────── */

/** Mikro dünyadaki canlı grupları (lonca) */
export type Guild =
  /** Enterobakteriler ve benzeri aside duyarlı öncüler (yeni mayanın ilk günleri) */
  | "ent"
  /** Öncü laktik asit bakterileri (Leuconostoc, Weissella, Lactococcus…) */
  | "lacP"
  /** Ekşi maya uzmanı laktik asit bakterileri (F. sanfranciscensis, L. plantarum…) */
  | "lacS"
  /** Mayalar (K. humilis, S. cerevisiae…) */
  | "yst";

/** Nüfuslar: log10 KOB/g (koloni oluşturan birim / gram) */
export type Populations = Record<Guild, number>;

export type MicroPhase = "kavanoz" | "otoliz" | "yogurma" | "mayalanma" | "sekil" | "dolap" | "firin" | "sogutma";

/** Hamurun ana yapı malzemesi: buğday/siyez gluten ağı kurar, çavdar pentozan jeli */
export type Matrix = "bugday" | "siyez" | "cavdar";

/** Fırın ve soğuma sırasında iç yapının durumu */
export interface HeatState {
  /** Çekirdek sıcaklık (°C) */
  coreC: number;
  /** Yüzey sıcaklığı (°C) */
  surfaceC: number;
  /** Canlı maya oranı (1 = hepsi canlı, 0 = hepsi öldü) */
  yeastAlive: number;
  labAlive: number;
  /** Nişasta jelleşmesi 0–1 */
  starchGel: number;
  /** Protein ağının pişip donması 0–1 */
  glutenSet: number;
  /** Kabuk oluşumu ve renk (Maillard) 0–1 */
  crust: number;
  /** Soğurken nişastanın yeniden düzenlenmesi (retrogradasyon, içi "oturtur") 0–1 */
  retro: number;
}

/**
 * Bir andaki mikro dünya. Büyüteç (MicroScope) bunu çizer; motor üretir.
 * 0–1 alanlar görselleştirme içindir; mutlak değerler ayrı alanlarda.
 */
export interface MicroSnapshot {
  /** Zaman (saat), kendi çizelgesinde (maya bölümünde günün saati; pişirme gününde maya beslemesinden beri) */
  t: number;
  phase: MicroPhase;
  matrix: Matrix;
  /** Ortam/hamur sıcaklığı (°C) */
  tempC: number;
  pH: number;
  /** log10 KOB/g */
  pop: Populations;
  /** Fermente edilebilir şeker, 0–1 (1 = bol) */
  sugar: number;
  /** Henüz kesilmemiş hasarlı nişasta, 0–1 */
  damagedStarch: number;
  /** Suyun unla buluşması (otoliz başında düşük), 0–1 */
  water: number;
  /** Çözünmüş CO₂ doygunluğu, 0–1 (1 = su doydu, gaz kabarcıklara geçiyor) */
  dissolvedCO2: number;
  /** Hacim artışı (0 = başlangıç, 1 = iki katı) */
  gas: number;
  /** Gluten ağı gelişimi 0–1 (çavdarda pentozan jeli) */
  glutenDev: number;
  /** Proteaz/asit hasarı 0–1 */
  glutenDamage: number;
  /** Ağın hizalanması 0–1 (katlama, şekil gerginliği) */
  glutenAlign: number;
  /** Tuz iyonları 0–1 (0 = tuz yok, 1 = %2) */
  salt: number;
  /** mmol/kg */
  lactic: number;
  acetic: number;
  /** Anlık enzim aktiviteleri 0–1 */
  amylase: number;
  protease: number;
  phytase: number;
  /** Fırın/soğuma (yalnız o aşamalarda) */
  heat?: HeatState;
}

/** Pişirme günü zaman çizelgesindeki olaylar */
export type BakeEventKey =
  | "maya_beslendi"
  | "maya_tepe"
  | "otoliz"
  | "yogurma"
  | "tuz"
  | "katlama"
  | "iki_kat"
  | "on_sekil"
  | "son_sekil"
  | "dolap"
  | "firin"
  | "son_maya_patlamasi"
  | "maya_oldu"
  | "nisasta_jel"
  | "gluten_dondu"
  | "amilaz_durdu"
  | "kabuk_renk"
  | "ic_pisti"
  | "firindan_cikti"
  | "kesildi";

export interface BakeEvent {
  /** saat (pişirme günü çizelgesi) */
  t: number;
  key: BakeEventKey;
  /** Kısa Türkçe etiket (ör. "Maya öldü · 55 °C") */
  label: string;
}

/** Simülasyonun tamamı: sonuç + mikro zaman çizelgesi */
export interface BakeRun {
  result: BakeResult;
  /** Zamana göre sıralı örnekler (5 dk; fırında 1 dk) */
  samples: MicroSnapshot[];
  events: BakeEvent[];
  /** Aşama başlangıçları (saat) */
  marks: Record<MicroPhase | "kesim", number>;
  /** Son şekil anındaki olgunluk (1 = fırına girerken ideal); parmak testi ve dolap kararı için */
  maturityAtShape: number;
}

/* ── Bölüm 1: maya ── */

export type FlourKind = "beyaz" | "tam_bugday" | "tam_cavdar";
export type StarterSpot = "serin" | "tezgah" | "ilik";
export type FeedRatio = "1:1:1" | "1:2:2" | "1:5:5";

export interface StarterDayDecision {
  spot: StarterSpot;
  /** Günün başında besleme ("yok" = beslemeden bekle) */
  feed: FeedRatio | "yok";
}

export type StarterSmell = "un" | "peynir" | "kusmuk" | "yogurt" | "sirke" | "meyve" | "aseton" | "elma" | "kuf";

/** Günün özeti: oyuncuya ne görüneceği */
export type StarterStageKey = "uyku" | "sahte_kabarma" | "sessizlik" | "uyaniyor" | "hazir" | "ac" | "kuf";

export interface StarterState {
  /** Tamamlanan gün sayısı */
  day: number;
  flour: FlourKind;
  pop: Populations;
  pH: number;
  /** mmol/kg */
  lactic: number;
  acetic: number;
  /** g/kg fermente edilebilir şeker */
  sugar: number;
  /** Arka arkaya beslenmeden geçen gün */
  hungryDays: number;
  /** Küflendi: atılıp yeniden başlanmalı */
  ruined: boolean;
}

export interface StarterDay {
  day: number;
  decision: StarterDayDecision;
  /** Saatlik örnekler 0..24 (25 adet) */
  hours: MicroSnapshot[];
  /** Saatlik kavanoz kabarması 0..24 (0 = lastik çizgisi, 1 = iki katı) */
  rise: number[];
  peakRise: number;
  peakHour: number;
  smell: StarterSmell;
  hooch: boolean;
  stage: StarterStageKey;
}

/** Mayanın karnesi: sonraki bölümlerde kullanılır */
export interface StarterProfile {
  name: string;
  flour: FlourKind;
  /** Hazır olduğu gün (null = henüz değil) */
  readyDay: number | null;
  /** 0–1: 1:1:1 beslemeden sonra iki katına çıkma hızı */
  vigor: number;
  /** 0–1 */
  acidity: number;
  /** 0–1: asetik asidin payı (keskinlik) */
  aceticShare: number;
  /** Bakteri:maya oranı (ör. 100 = 100 bakteriye 1 maya) */
  labPerYeast: number;
}

/* ── Gece Yarısı (çavdar) ── */

/**
 * Gece Yarısı (Tahsin'in tarifi, docs/OYUN.md §11): haşlama (arpa unu, çavdar kırması, kabak çekirdeği, keten,
 * karabuğday + kaynar su, ~1 gün) → çavdar unu, siyez, su, çavdar ekşi mayası, tuz; yoğrulmaz → 12 parça, ıslak elle
 * mavi haşhaşa bula, kalıba → oda sıcaklığında çatlayana dek → kapalı dolap → düşen fırın ~2 sa, ters çevir → 1–2 gün dinlen.
 */
export interface RyeDecisions {
  /** Haşlamanın suyu: kaynar (Tahsin) ya da ılık */
  scaldWater: "kaynar" | "ilik";
  /** Haşlamanın beklediği süre (saat) */
  scaldHours: number;
  /** Çavdar ekşi mayası (g; Tahsin 1500) */
  sourGrams: number;
  /** Ana hamura eklenen su (g; Tahsin 2400) */
  waterGrams: number;
  saltGrams: number;
  /** Karıştırma: yalnız karıştır (Tahsin) ya da yoğur */
  mix: "karistir" | "yogur";
  /** Parçaları haşhaşa bulamadan önce el ve hamur ıslatıldı mı */
  wetHands: boolean;
  /** Haşhaş kaplaması (0–1) */
  poppyCoverage: number;
  /** Kalıpta oda sıcaklığında mayalanma (saat) */
  proofHours: number;
  /** Dolapta üstü hava almayacak şekilde kapatıldı mı */
  covered: boolean;
  /** Düşen fırın: 280 °C'de ısıt, 220 °C'de yükle, ısıtıcılar kapalı kalsın */
  fallingOven: boolean;
  /** Kalıpları yüklerken buhar verildi mi (Tahsin: evet) */
  steamAtLoad: boolean;
  /** Fırında toplam süre (dk; Tahsin ~120) */
  bakeMinutes: number;
  /** Buharı kaç kez tahliye etti */
  vents: number;
  /** Sonda kalıptan çıkarıp ters çevirip altını kurutmak */
  flip: boolean;
  /** Streçte dinlenme (saat; en az 24, ideali 48) */
  restHours: number;
}

export type RyeTipKey =
  | "asit_az"
  | "haslama_ilik"
  | "haslama_kisa"
  | "yogurdun"
  | "el_kuru"
  | "hashas_eksik"
  | "mayalanma_az"
  | "mayalanma_fazla"
  | "ortu_yok"
  | "firin_sabit"
  | "buhar_kaldi"
  | "buhar_yok"
  | "ters_cevirmedi"
  | "az_pisti"
  | "erken_kesti"
  | "tuz";

export interface RyeResult {
  /** Fırına girerken hamurun pH'ı */
  pH: number;
  /** Nişasta saldırısı 0–1 (amilazın jelleşen nişastayı kesmesi) */
  starchAttack: number;
  /** Fırına girerken olgunluk (1 = ideal) */
  proof: number;
  coreC: number;
  gummy: number;
  crust: number;
  bottomCrust: number;
  height: number;
  sweetness: number;
  sourness: number;
  scores: { kabarma: number; ic: number; kabuk: number; lezzet: number; toplam: number };
  title: string;
  tips: RyeTipKey[];
}

export interface RyeRun {
  result: RyeResult;
  samples: MicroSnapshot[];
  events: BakeEvent[];
  marks: { haslama: number; karistirma: number; mayalanma: number; dolap: number; firin: number; dinlenme: number };
}

/* ── Tahminler (tahmin et → gör → anla) ── */

export interface Prediction {
  id: string;
  /** Hangi anda sorulur ("bolum:asama", ör. "maya:gun2", "koy:mayalanma") */
  at: string;
  question: string;
  options: { id: string; text: string }[];
  correct: string;
  /** Cevaptan sonra gösterilen kısa açıklama (1–2 cümle) */
  reveal: string;
  /** Açılan defter kartı */
  cardId?: string;
}

/* ── Defter ── */

export type CardKind = "canli" | "molekul" | "olay" | "efsane" | "tarih";

export interface CardSource {
  citation: string;
  url: string;
}

/** Büyüteçte dokunulabilen varlık türleri */
export type MicroEntityKind =
  | "ent"
  | "lacP"
  | "lacS"
  | "yst"
  | "nisasta"
  | "gluten"
  | "amilaz"
  | "proteaz"
  | "fitaz"
  | "kabarcik"
  | "co2"
  | "maltoz"
  | "asit"
  | "tuz"
  | "pentozan";

export interface CodexCard {
  id: string;
  kind: CardKind;
  /** Türkçe ad (ör. "Kazachstania humilis" ya da "Amilaz") */
  name: string;
  /** Bilimsel ad (canlılar) */
  latin?: string;
  /** Sevimli lakap (canlılar, ör. "Humi") */
  nick?: string;
  /** Usta sözü / tek satır (≤ 140 karakter) */
  short: string;
  /** Neden? (sade mekanizma) */
  why: string;
  /** Bilim (sayılar, koşullar) */
  deep: string;
  /** Canlılar için kimlik */
  stats?: {
    shape?: string;
    sizeUm?: string;
    tempOpt?: string;
    pH?: string;
    eats?: string;
    makes?: string;
    foundIn?: string;
  };
  sources: CardSource[];
  /** Çoğu ustanın bilmediği */
  rare?: boolean;
  /** Çizim anahtarı (CardArt) */
  art: string;
  /** Büyüteçte bu varlığa dokununca açılır */
  microKey?: MicroEntityKind;
}

/* ── İlerleme ── */

export interface LabProgressV3 {
  version: 3;
  /** Bölüm/seviye başına en iyi puan */
  best: Partial<Record<LevelId | "maya", number>>;
  /** Açılan defter kartları */
  cards: string[];
  /** Tahminler: doğru / toplam */
  sezgi: { right: number; total: number };
  /** Cevaplanan tahminler (aynı soru iki kez sayılmasın) */
  answered: string[];
  /** Oyuncunun mayası (Bölüm 1) */
  starter: StarterProfile | null;
  plays: number;
  /** Tamamlanan deney görevleri */
  quests: string[];
}
