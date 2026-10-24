// QR köprüsü (BILIM_PLATFORMU_PLANI §3): dükkândaki bir ekmekten bilim odasında o ekmekte olan anlara.
// Seçim yalnız ürünün kendi kaydına (içindekiler, un cinsi) dayanır. Kayıtta geçmeyen bir yöntem
// (gece dolapta bekletme, kesik) varsayılmaz; ekşi maya geçmeyen ürüne (yoğurt, süt) köprü kurulmaz.

export interface KopruUrunu {
  ingredients?: string[];
  flourTypes?: string[];
}

// "karabuğday" buğday değildir; olgun buğday tanesi anına onu sokmayız.
const BUGDAY = /(?<!kara)buğday|siyez|karakılçık|kavılca|gernik|einkorn|spelt/;

/** Yolculuk sırasıyla adaylar; koşulu olmayan an, ekşi mayalı her ekmekte olur. */
const ADAYLAR: readonly { an: string; kosul?: RegExp }[] = [
  { an: "olgun_tanenin_ici", kosul: BUGDAY },
  { an: "atalik_bugdayin_hasadi", kosul: /atalık|siyez|karakılçık|kavılca|gernik|einkorn|spelt/ },
  { an: "degirmen_tasinda", kosul: /taş ?değirmen/ },
  { an: "kepek_una_karisinca", kosul: /kepek|tam buğday|tam tahıl/ },
  { an: "su_ve_tuz_bulusunca", kosul: /tuz/ },
  { an: "cavdar_unu_suyla_bulusunca", kosul: /çavdar/ },
  { an: "yogurma_tezgahinda" },
  { an: "eksi_mayanin_ilk_10_gunu" },
  { an: "gaz_ve_kabarma" },
  { an: "asitler_ve_ph" },
  { an: "firinin_ilk_8_dakikasi" },
  { an: "kabugun_kizarmasi" },
  { an: "rafta_ilk_hafta" },
];

export const KOPRU_ADAYLARI: readonly string[] = ADAYLAR.map((a) => a.an);

export function ekmeginAnlari(urun: KopruUrunu): string[] {
  const kayit = [...(urun.ingredients ?? []), ...(urun.flourTypes ?? [])].join(" · ").toLocaleLowerCase("tr");
  // Admin'de yazım değişebilir: "ekşimaya", "Ekşi Maya", "EKŞİ MAYA" aynı sayılır.
  if (!/ekşi ?maya/.test(kayit)) return [];
  return ADAYLAR.filter((a) => !a.kosul || a.kosul.test(kayit)).map((a) => a.an);
}
