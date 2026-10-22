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
