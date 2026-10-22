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
    tepe: "kneading_bread_dough",
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
