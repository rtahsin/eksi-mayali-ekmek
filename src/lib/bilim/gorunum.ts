// Bilim odasının görünüme dair sabitleri. Renk bilgi taşır (BILIM_PLATFORMU_PLANI "Tasarım").

/** Durağın zemin rengi: ekmeğin yolculuğundaki sıcaklık. Tarla ve hamur serin, fırın en sıcak, soğuma yine serin. */
export const DURAK_ZEMIN: Record<string, string> = {
  tarla: "#142417",
  degirmen: "#1f1d17",
  hamur: "#1b2226",
  eksi_maya: "#0e2a22",
  fermantasyon: "#2a2410",
  sekil: "#2b1f14",
  firin: "#3a1812",
  sonra: "#161c26",
};

/** İlk 10 gün anında zemin, asitliğin arttığı yönü indikatör şeridi gibi gösterir (ölçülmüş pH değil). */
export const ASITLIK_ZEMIN: readonly (readonly [number, string])[] = [
  [0, "#0e2a22"],
  [2, "#1e2b13"],
  [4, "#33290e"],
  [6, "#3b1f10"],
  [10, "#3a1318"],
];

export function asitlikZemini(gun: number): string {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let i = 1; i < ASITLIK_ZEMIN.length; i++) {
    const [g0, c0] = ASITLIK_ZEMIN[i - 1];
    const [g1, c1] = ASITLIK_ZEMIN[i];
    if (gun <= g1) {
      const t = Math.max(0, (gun - g0) / (g1 - g0));
      const a = hex(c0);
      const b = hex(c1);
      return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * t)).join(",")})`;
    }
  }
  return ASITLIK_ZEMIN[ASITLIK_ZEMIN.length - 1][1];
}

/**
 * "Fırının ilk 8 dakikası" bayrak sahnesi: okur fırın sıcaklığını seçer, kesit o deneyin ölçümleriyle büyür.
 * Her sayı `bilgiler` içindeki kimliklerin metninde geçer (bilim.check.test.ts denetler).
 */
export const FIRIN_DENEYI = {
  an: "firinin_ilk_8_dakikasi",
  bilgiler: {
    hacim: "firin_kabarmasi.hacim_artisi_ilk_3_dakika",
    merkez: "isi_aktarimi.merkez_100_derecede_plato",
    maya: "firin_kabarmasi.maya_50_derecede_olur",
    gluten: "disulfit.90c_ye_kadar_gliadin_glutenin_baglanmasi",
    bolge: "isi_aktarimi.uc_isil_bolge",
  },
  firinlar: [
    { c: 180, hacim3: "27,6", durdu: 6, merkez100: 17 },
    { c: 200, hacim3: "23,3", durdu: 3, merkez100: 13 },
    { c: 220, hacim3: "23,5", durdu: 3, merkez100: 11 },
  ],
  esikler: [
    { c: 50, ad: "maya canlı değil" },
    { c: 90, ad: "gliadin glutenine bağlanıyor" },
    { c: 100, ad: "buharlaşma cephesi" },
  ],
  gorseller: {
    kapak: "prince_djehutymes_baking_bread_e_2749_img_4510_gradient",
    kesit: "home_made_sour_dough_bread",
    maya: "saccharomyces_cerevisiae_sem",
    gluten: "gluten_and_carbon_nanotubes",
    nisasta: "photomicrograph_of_wheat_starch",
  },
} as const;

/**
 * "Kabuğun kızarması" bayrak sahnesi: iki kilit (sıcaklık ve su aktivitesi) birlikte açılınca renk başlar.
 * Eşikler ve ölçümler `bilgiler` içindeki kimliklerin metninde geçer (bilim.check.test.ts denetler).
 */
export const KABUK = {
  an: "kabugun_kizarmasi",
  bilgiler: {
    renk: "maillard.renk_baslangic_asgari_kosullari",
    maltoz: "maillard.115_derece_uzerinde_maltoz_substrati",
    hmf: "maillard.hmf_birikimi_ve_su_aktivitesi",
    akrilamid: "akrilamid.esik_175c_model_sistem",
    tost: "maillard.tost_ekmeginde_firin_ve_ic_sicaklikla_esmerlesme",
    kavilca: "maillard.kavilca_ekmeginde_kizariklik_ve_esmerlesme_indeksi",
    disKabuk: "akrilamid.dis_kabuk_kuru_ve_yuksek",
    kabukta: "akrilamid.kabukta_toplanir_sure_sicaklik",
    kalanSu: "akrilamid.kalan_su_buharlasmasi_azaltir",
    koku: "maillard.aldehitlerin_strecker_yikimiyla_olusumu",
  },
  /** Renk: aw 0,6'nın altı VE 120 °C'nin üstü. */
  renkC: 120,
  renkAw: 0.6,
  maltozC: 115,
  hmfAw: 0.4,
  akrilamidC: 175,
  tost: [
    { firin: 200, ic: 90, indeks: 16 },
    { firin: 240, ic: 98, indeks: 55 },
  ],
  kavilca: { kavilca: "70,95", beyaz: "48,15" },
  kokular: ["2-metilpropanal", "2-metilbütanal", "3-metilbütanal", "2-asetil-1-pirolin", "furanlar", "pirazinler", "piroller"],
  gorseller: { kapak: "brown_bread_crust", sils: "sils_bread_2", laugen: "laugenbroetchen_fcm" },
} as const;

/**
 * "Rafta ilk hafta" bayrak sahnesi: "Kim bayatlattı?" Her cümle `{ bilgi, sira }` ile bulunur:
 * anın metninde o bilgiye atıf yapan `sira`ncı cümle. Sayılar bilgi metninde geçer (bilim.check.test.ts).
 */
export const RAF = {
  an: "rafta_ilk_hafta",
  bilgiler: {
    ilk24: "bayatlama.ilk_24_saat",
    hiz: "bayatlama.sertlesme_hizlari",
    dsc: "retrogradasyon.dsc_tepe_noktalari",
    yuzElli: "bayatlama.yuz_elli_yil",
  },
  hizlar: [
    { ad: "Karışık çavdar-buğday ekşi mayalı", en: "0,92", cok: "1,38" },
    { ad: "Kalıp buğday ekmeği", en: "0,27", cok: "0,51" },
  ],
  dscAralik: "50–80 °C",
  supheliler: [
    {
      ad: "Nişastanın yeniden kristalleşmesi",
      lehine: [
        { bilgi: "bayatlama.retrogradasyon_payi_tartismali", sira: 1 },
        { bilgi: "retrogradasyon.depolamada_amilopektin_artar", sira: 0 },
      ],
      ama: [{ bilgi: "bayatlama.retrogradasyon_payi_tartismali", sira: 2 }],
    },
    {
      ad: "Nem kaybı",
      lehine: [
        { bilgi: "bayatlama.nem_plastiklestirici", sira: 0 },
        { bilgi: "bayatlama.nem_kaybi_sertlik", sira: 0 },
      ],
      ama: [{ bilgi: "bayatlama.iki_sertlesme_yolu", sira: 0 }],
    },
    {
      ad: "Suyun yeniden dağılımı",
      lehine: [
        { bilgi: "retrogradasyon.bayatlamada_amilopektin_ve_su_dagilimi", sira: 0 },
        { bilgi: "retrogradasyon.bayatlamada_amilopektin_ve_su_dagilimi", sira: 1 },
      ],
      ama: [{ bilgi: "bayatlama.yuz_elli_yil", sira: 0 }],
    },
  ],
  karar: { bilgi: "bayatlama.cok_etkenli", sira: 2 },
  gorseller: {
    kapak: "breadcrumb",
    nisasta1: "potato_starch_polarized_light_100x",
    nisasta2: "potato_amyloplast_granules_observed_at_200_magnification",
    panko: "panko_paprika_3",
  },
} as const;

/**
 * "Olgun tanenin içi" bayrak sahnesi: tahmin et sonra bak, iki sayım (sayı ↔ alan), tane takvimi.
 * Her sayı ilgili bilginin metninde geçer (bilim.check.test.ts).
 */
export const TANE = {
  an: "olgun_tanenin_ici",
  bilgiler: {
    oran: "tane_yapisi.anatomik_kisim_oranlari",
    protein: "tane_yapisi.alt_aleron_protein_gradyani",
    yuzMikron: "tane_yapisi.nisastali_endosperm_30_yuzde_protein",
    granul: "tane_yapisi.depo_nisastasi_a_b_granul",
    zaman: "tane_yapisi.nisasta_granul_baslangic_zamani",
    gluten: "tane_yapisi.gluten_proteini_sentez_zamanlamasi",
    aleron: "tane_yapisi.alt_aleron_hucre_kokeni",
  },
  oranlar: [
    { ad: "nişastalı endosperm", yazi: "80–84", orta: 82 },
    { ad: "botanik kepek", yazi: "6–8", orta: 7 },
    { ad: "alöron", yazi: "6–7", orta: 6.5 },
    { ad: "rüşeym", yazi: "3", orta: 3 },
  ],
  protein: { tepe: "32,0", pay: "30", mikron: "100" },
  /** A-tipi: alanın %75'ten fazlası, sayının ortalama %15'i. */
  granul: { alan: "75", sayi: "15" },
  takvim: [
    { ad: "A-tipi granüller başlar", bas: 3, son: 5, yazi: "3–5. gün" },
    { ad: "gluten proteini yapılır", bas: 10, son: 20, yazi: "~10–20. gün" },
    { ad: "B-tipi granüller başlar", bas: 11, son: 16, yazi: "11–16. gün, çalışmalar ayrılıyor" },
    { ad: "alöron hücreleri bölünür", bas: 0, son: 21, yazi: "21. güne kadar", acikBaslangic: true },
  ],
  gorseller: {
    kapak: "journal_pone_0251556_sekil_2a",
    nisasta: "photomicrograph_of_wheat_starch",
    polarize: "potato_starch_polarized_light_100x",
    gluten: "gluten_and_carbon_nanotubes",
  },
} as const;

/**
 * "Değirmen taşında" bayrak sahnesi: su dök (basılı tut), dönen taş, kristal kaybı, mayanın şekeri, ölçülü hasar.
 * Her sayı ilgili bilginin metninde geçer (bilim.check.test.ts).
 */
export const DEGIRMEN = {
  an: "degirmen_tasinda",
  bilgiler: {
    su: "hasarli_nisasta.dogal_ve_hasarli_nisasta_su_tutma_orani",
    suKorelasyon: "hasarli_nisasta.su_absorpsiyon_kapasitesi_korelasyonu",
    hacim: "hasarli_nisasta.artan_hasarla_ekmek_ozgul_hacim_kaybi",
    olculu: "hasarli_nisasta.olculu_hasar_araligi_ve_ekmek_kalitesi",
    seker: "amilaz.fermantasyonda_seker_uretim_payi",
    dusme: "amilaz.ekmeklik_un_optimum_dusme_sayisi_araligi",
  },
  /** Ağırlığının yüzdesi olarak emilen su. */
  saglam: { en: 39, cok: 87 },
  kirik: { en: 200, cok: 430 },
  sekerPay: 56,
  olculu: { en: "12,2", cok: "21,9" },
  dusme: { en: 200, cok: 350 },
  gorseller: {
    kapak: "the_grinding_of_flour",
    tavlama: "114821_kfar_yanoh_grinding_wheat_grains_into_flour_pikiw",
    tas: "hattem_windkorenmolen_de_fortuin_13_09_2021_actm_01",
    polarize: "potato_starch_polarized_light_100x",
    iyot: "testing_seed_for_starch",
  },
} as const;

/**
 * "Yoğurma tezgahında" bayrak sahnesi: yoğur (sürt), örülen ağ, kopan köprüler, gözenek, una göre süre.
 * Her sayı ilgili bilginin metninde geçer (bilim.check.test.ts).
 */
export const YOGURMA = {
  an: "yogurma_tezgahinda",
  bilgiler: {
    evre: "yogurma.evre_sureleri_una_gore",
    iskelet: "gluten.disulfit_bagli_glutenin_iskeleti",
    makro: "disulfit.glutenin_makropolimeri",
    uzun: "disulfit.uzun_karistirma_suresi_disulfit_baglarini_yikar",
    gaz: "yogurma.asiri_yogurma_gaz_tutulmasini_zayiflatir",
    denge: "reoloji.viskoz_elastik_denge",
    hacim: "gluten.elastiklik_hacim_optimum",
    cwrs: "yogurma.cwrs_ekmek_icin_yogurma_suresi",
    tokat: "yogurma.tokat_ekmegi_yogurma_sure_ve_sicakligi",
  },
  /** Aynı yoğurucuda evrelere ulaşılan dakika. */
  yuksek: { gelisme: 4, tepe: 8, cokme: 12 },
  dusuk: { gelisme: 6, tepe: 11, cokme: 16 },
  asiri: 20,
  uzunDakika: 15,
  cwrs: { rafine: "3,26", tam: "4,36" },
  tokat: { en: 45, cok: 60, sicaklik: "25–30" },
  gorseller: {
    kapak: "kneading_chapati_dough_01",
    gluten: "gluten_and_carbon_nanotubes",
    nisasta: "photomicrograph_of_wheat_starch",
    tepe: "kneading_bread_by_hand",
  },
} as const;

/**
 * "Kabarırken doğan gaz ve koku" bayrak sahnesi: şekeri ver (sürükle), hacim sütunu, gaz ızgarası, Ehrlich kartları, esterler.
 * Her sayı ve ad ilgili bilginin metninde geçer (bilim.check.test.ts).
 */
export const GAZ = {
  an: "gaz_ve_kabarma",
  bilgiler: {
    donusum: "gaz.alkol_fermantasyonunda_sekerlerin_co2_ve_etanole_donusumu",
    baski: "scer.maltoz_alimi_ve_katabolit_baskisi",
    maltoz: "scer.yagsiz_hamurda_maltoz_ana_kaynak",
    tukenme: "gaz.sakkarozsuz_hamurda_co2_uretim_kinetigi_ve_seker_tukelmesi",
    hacim: "gaz.fermantasyon_sonunda_hacim_4_katindan_fazla_artar",
    sonGaz: "gaz.ekmekte_son_gaz_hacmi_yuzde70i_asabilir",
    gpd1: "gliserol.gpd1_yoksa_co2_azalir",
    ehrlichYol: "aroma.ehrlich_yolu_ve_fuzel_alkoller",
    oncul: "aroma_onculleri.aminoasitler_ehrlich_ucucu_oncul",
    ehrlich: "aroma.ehrlich_valin_izolosin_losin_donusumu",
    etkin: "aroma.ic_en_aktif_bilesikler",
    asetoin: "aroma.asetoin_ve_diasetil_tereyagimsi_koku",
    tdelFark: "aroma.torulaspora_ve_s_bayanus_farkli_aroma",
    ester: "tdel.ester_artisi_bayanus_delbrueckii",
    esterKayip: "aroma.esterler_pisirmede_kaybolur",
    etanol: "aroma_onculleri.etanol_pisirmede_12_dakika",
  },
  /** Mayanın hücreye aldığı şekerler; maltoz, glukoz ve fruktoz bitince alınır. */
  sekerler: ["glukoz", "fruktoz", "maltoz"],
  urunler: ["karbondioksit", "etanol", "gliserol", "organik asitler", "aroma bileşikleri"],
  hacimKat: "4,4",
  hacimSicaklik: 32,
  sonGazPay: 70,
  gpd1: { en: 30, cok: 50 },
  etanolDakika: 12,
  ehrlich: [
    { amino: "valin", bilesik: "2-metilpropanal" },
    { amino: "izolösin", bilesik: "2-metilbutanal" },
    { amino: "lösin", bilesik: "3-metilbutanal" },
  ],
  esterler: ["etil oktanoat", "2-feniletil asetat", "etil dekanoat", "etil dodekanoat"],
  gorseller: {
    kapak: "dough_rising_33376211891",
    hucre: "saccharomyces_cerevisiae_sem",
    tasan: "rising_dough_overflowing_its_container",
    torula: "torulaspora_delbrueckii_s_spores",
  },
} as const;

/**
 * "Gece dolapta" bayrak sahnesi: geceyi çevir (saat kolu), soğuyan sahne, topluluk bantları, sabaha kalan koku.
 * Her sayı ve ad ilgili bilginin metninde geçer (bilim.check.test.ts).
 */
export const GECE = {
  an: "gece_dolapta",
  bilgiler: {
    sicaklik: "sicaklik.endustriyel_35_ve_maya_optimumu",
    dolap: "soguk_ferm.geciktirmede_0_5_derece",
    deney: "sure.sicaklik_ve_maya_ile_sure",
    ph: "soguk_ferm.4_derece_18_saat_ph",
    fitik: "soguk_ferm.uzun_soguk_mayalanma_fitik_bugday",
    serin: "soguk_ferm.serin_eksimaya_sicaklik_araligi",
    labOptimum: "sicaklik.lactobacillaceae_optimum_buyume_sicakligi",
    ikiTur: "sicaklik.khumilis_ve_fsanfranciscensis_optimum_sicakliklari",
    birlikte: "khum.fsan_birlikte_bulunma",
    ester: "soguk_ferm.5_derecede_esterler_artar",
    esterYok: "fsan.ester_uretmez",
    durmaz: "soguk_ferm.dusuk_sicaklik_aroma_tamamen_durmaz",
    tazelik: "soguk_ferm.uzun_mayalanma_tazelik_lezzet",
    inanc: "sure.uzun_fermantasyon_aroma_inanci",
    duyusal: "sure.sure_duyusala_etkisiz",
  },
  endustriyel: 35,
  mayaOptimum: "25–30",
  geciktirme: 5,
  dolap: "0–5",
  /** Aynı deneyde iki koşul: hamurun 8 cm yüksekliğe ulaşma süresi. */
  deney: {
    yukseklik: 8,
    soguk: { sicaklik: 5, maya: 20, saat: 21 },
    sicak: { sicaklik: 35, maya: 60, dakika: 15 },
  },
  ph: { dolap: 4, saat: 18, once: [25, 35], degerler: ["4,18", "4,11"] },
  fitikAzalma: 75,
  serin: { en: 4, cok: 15 },
  labOptimum: { en: 30, cok: 40 },
  fsanOptimum: { en: 32, cok: 33 },
  khumOptimum: { en: 27, cok: 28 },
  esterler: ["etil asetat", "etil hekzanoat", "etil oktanoat"],
  esterKarsi: [15, 35],
  gorseller: {
    kapak: "bread_dough_in_baskets_01",
    soguk: "proofing_bread",
    topluluk: "s00284_025_04673_5_sekil_5a",
  },
} as const;

/**
 * "Kesik atılınca" bayrak sahnesi: kesiği at (çiz, fırına ver), basınç, kabuk bağlar, yüzeyin sıcaklık cetveli.
 * Her sayı ilgili bilginin metninde geçer (bilim.check.test.ts).
 */
export const KESIK = {
  an: "kesik_atilinca",
  bilgiler: {
    kisitli: "firin_kabarmasi.kisitli_kabarma_kabuk_yirtilmasi",
    hizli: "firin_kabarmasi.ilk_dakikalarda_hizli_sonra_durur",
    basinc: "firin_kabarmasi.kapali_gozenek_su_buhari_basinci",
    dortOlay: "firin_kabarmasi.hizli_hacim_genlesmesinin_dort_nedeni",
    acilma: "firin_kabarmasi.gozenek_acilma_sicakligi_ve_genlesme",
    agi: "firin_kabarmasi.gaz_hucrelerinin_gozenek_agina_donusumu",
    kinetik: "firin_kabarmasi.kenar_ve_eksen_yukseklik_kinetigi",
    tanim: "kabuk.tanim",
    ikiBolge: "kabuk.buharlasma_cephesi_ve_iki_bolge",
    nem: "kabuk.dusuk_nem_orani_ve_ic_dehidrasyon_engeli",
    kalinlik: "kabuk.kalinlik_gelisimini_belirleyen_iki_etmen",
    olusum: "kabuk.kabuk_ve_renk_olusum_mekanizmasi",
    baslangic: "kabuk.esmerlesme_baslangici",
    kosul: "kabuk.renk_olusumu_asgari_kosullari",
    ideal: "kabuk.ideal_renk_142_160",
    hiz: "kabuk.esmerlesme_hizi_firin_sicakligi",
    sonHacim: "firin_kabarmasi.220_derecede_son_hacim_dusuk",
    gaz: "firin_kabarmasi.pismis_ekmek_hacimce_gaz",
    efsane: "firin_kabarmasi.eksi_maya_hacim_efsanesi",
    ozgul: "firin_kabarmasi.eksi_maya_ve_kontrol_ozgul_hacim_araligi",
  },
  /** Pişirmede yüksekliklerin sabitlendiği an ve değer. */
  kenar: { sn: 450, mm: 30 },
  eksen: { sn: 900, mm: 51 },
  kabukNem: { en: 5, cok: 10 },
  icSicaklik: 100,
  esmerlesme: { bazi: 120, digerleri: { en: 105, cok: 115 }, esas: 110 },
  renkKosul: { sicaklik: 120, aw: "0,6" },
  ideal: { en: 142, cok: 160, acik: "54–62" },
  ayarlar: [180, 200, 220],
  gazPay: { en: 75, cok: 85 },
  ozgul: { en: "3,46", cok: "3,93" },
  gorseller: {
    kapak: "sourdough_bread_with_decorative_scores",
    cavdar: "scored_loaves_of_rye_bread",
    somun: "sourdough_bread_loaf",
  },
} as const;

/** Ondalık sayıyı Türkçe yazar: 0.6 → "0,6". */
export const virgullu = (n: number) => String(n).replace(".", ",");

/** "Ekşi mayanın ilk 10 günü" bayrak sahnesi: hangi gün hangi cümle ve görsel. Cümle, içindeki bilgi kimliğiyle seçilir. */
export const ILK_ON_GUN = {
  an: "eksi_mayanin_ilk_10_gunu",
  gorseller: {
    kase: "mixing_sourdough_starter_into_the_flour",
    mercek: "pantoea_agglomerans",
    gun1: "leuconostoc_mesenteroides_in_wet_mount",
    kabarma: "carl_griffith_sourdough_starter_stiff_13_hours_above",
    devirSol: "pantoea_allii_400x",
    devirSag: "lactobacillus_staining",
  },
  serit: ["s00284_025_04673_5_sekil_5a", "s_cerevisiae_under_dic_microscopy", "lactobacillus_spp"],
  olaylar: [
    { gun: 0, ad: "Un ve su" },
    { gun: 1, ad: "Kalabalık" },
    { gun: 2, ad: "Sahte kabarma" },
    { gun: 3, ad: "Devir" },
    { gun: 6, ad: "Denge" },
    { gun: 9.5, ad: "Olgunluğa doğru" },
  ],
  durumlar: [
    { gun: 0, ad: "Un ve su", bilgi: "kaynak.ilk_gun_unla_gelen_bakteriler", gorsel: "mixing_sourdough_starter_into_the_flour" },
    { gun: 1, ad: "Kalabalık", bilgi: "entero.ilk_gun_baskin", gorsel: "pantoea_agglomerans" },
    { gun: 2, ad: "Sahte kabarma", bilgi: "sahte_kabarma.gun2_3_sicrama_sonra_durgunluk", gorsel: "carl_griffith_sourdough_starter_stiff_13_hours_above" },
    { gun: 3, ad: "Devir", bilgi: "ardisiklik.ucuncu_ve_besinci_gunler_arasi_degisim", gorsel: "lactobacillus_staining" },
    { gun: 6, ad: "Denge", bilgi: "ardisiklik.altinci_gunden_itibaren_kararli_topluluk", gorsel: "s00284_025_04673_5_sekil_5a" },
    { gun: 10, ad: "Olgunluk", bilgi: "besleme.olgunluk_yaklasik_10_gun", gorsel: "lactobacillus_spp" },
  ],
} as const;
