export interface GazeteSayi {
  /** İki haneli gazete sayısı kodu ("01".."04"). */
  kod: "01" | "02" | "03" | "04";
  /** İlgili bilim levhası kimliği (/bilim/<anId>). */
  anId: string;
  /** Basılı gazete sayısının başlığı. */
  baslik: string;
  /** K006 uyumlu kısa tanıtım metni (sağlık beyanı içermez). */
  alt: string;
}

const GAZETE_SAYILARI: Record<string, GazeteSayi> = {
  "01": {
    kod: "01",
    anId: "eksi_mayanin_ilk_10_gunu",
    baslik: "Kavanozdaki Görünmez Savaş: Ekşi Mayanın İlk 10 Günü",
    alt: "Un ve suyun ilk karşılaşmasından kararlı 100:1 dengesine kadar pH düşüşü ve mikrobiyal seçilim.",
  },
  "02": {
    kod: "02",
    anId: "cavdar_unu_suyla_bulusunca",
    baslik: "Çavdar Hamuru Neden Yoğrulmaz?",
    alt: "Pentozanlar, su tutma kapasitesi ve kalıp çavdar ekmeğinde nişasta jelatinleşmesi.",
  },
  "03": {
    kod: "03",
    anId: "ayni_sofrada",
    baslik: "100 Bakteriye 1 Maya: Aynı Sofrada",
    alt: "Maltoz fosforilaz iş bölümü ile laktik asit bakterileri ve mayaların birbirini besleme düzeni.",
  },
  "04": {
    kod: "04",
    anId: "yogurma_tezgahinda",
    baslik: "Hamur Yoğruldukça Nasıl Güçlenir?",
    alt: "Glutenin makro-polimeri, disülfid bağları ve yoğurma tezgâhında ağın kurulup çözülme eşiği.",
  },
};

/**
 * Basılı Taş Fırın Gazetesi QR kodlarından gelen `?sayi=` parametresini
 * ilgili bilim levhasına çözer. Geçersiz veya boş girdide `null` döner.
 */
export function resolveGazeteSayi(param: string | string[] | undefined | null): GazeteSayi | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2 || !/^\d+$/.test(trimmed)) {
    return null;
  }

  const normalized = trimmed.padStart(2, "0");
  return GAZETE_SAYILARI[normalized] ?? null;
}
