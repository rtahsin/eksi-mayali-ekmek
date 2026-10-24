// Dergi düzeni taslağı: "Soğuma anı" grafiklerinin sayıları ve dayandıkları bilgiler.
// Her sayı, bağlı olduğu bilginin metninde aynen geçer (veri.test.ts). Yeni bilimsel cümle yok; grafik
// başlıkları ve açıklamaları anın kendi cümlelerindeki koşulları tekrarlar.

export const DERGI_AN = "soguma_ani";

export const SOGUMA = {
  taze: { bilgi: "nem_gocu.taze_ic_kabuk_nemi", ic: 41.2, kabuk: 15.0 },
  sogumus: { bilgi: "nem_gocu.sogumus_ekmek_ic_kabuk_nemi", ic: [35, 40], kabuk: [3, 7] },
  firin: { bilgi: "nem_gocu.pisirme_sicakligi_nem_kaybi", sicaklik: [180, 200, 220], kayip: [11, 15, 17] },
  merkez: { bilgi: "nem_gocu.pisirmede_merkez_nem_kazanir", sicaklik: 200, artis: 4.2 },
  kaynama: { bilgi: "nem_gocu.merkez_100_derece", sicaklik: 100 },
  esik: {
    erken: { bilgi: "nem_gocu.merkez_nem_artisi_65c_altinda", sicaklik: 65, kim: "Wagner vd., 2007" },
    gec: { bilgi: "nem_gocu.core_nem_70c_esigi", sicaklik: 70, pay: 5, kim: "Thorvaldsson ve Skjöldebrand, 1998" },
  },
  torba: { bilgi: "nem_gocu.kagit_torba_agirlik_kaybi", sicaklik: 23, bagilNem: 65, olcum: [[4, 12.5], [14, 29.7]] },
  nmr: {
    bilgi: "nem_gocu.nmr_a_azalir_b_artar",
    gun: 7,
    suProtein: { once: [28, 29], sonra: [21, 23.5] },
    nisasta: { once: [67, 68], sonra: [71, 73] },
  },
  sogutma: { bilgi: "nem_gocu.vakumlu_sogutmada_kutle_kaybi_ve_nem_degisimi", konvansiyonel: [3, 5], vakum: 7 },
} as const;

/** 41.2 → "41,2"; tam sayılar olduğu gibi. Ondalık hanesi istenirse sabitlenir (15.0 → "15,0"). */
export function tr(n: number, hane?: number): string {
  return (hane === undefined ? String(n) : n.toFixed(hane)).replace(".", ",");
}
