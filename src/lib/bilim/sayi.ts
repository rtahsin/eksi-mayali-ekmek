import type { DergiSayiKodu } from "./dergi";

export interface GazeteSayi {
  /** İki haneli gazete/dergi sayısı kodu ("01".."05"). */
  kod: DergiSayiKodu;
  /** Doğrudan Taş Fırın Dergisi tam metin rotası (/bilim/sayi/<kod>). */
  dergiHref: `/bilim/sayi/${DergiSayiKodu}`;
  /** İlgili teknik bilim levhası kimliği (/bilim/<anId>). */
  anId: string;
  /** Basılı gazete ve dergi sayısının başlığı. */
  baslik: string;
  /** K006 uyumlu kısa tanıtım metni (sağlık beyanı içermez). */
  alt: string;
}

const GAZETE_SAYILARI: Record<string, GazeteSayi> = {
  "01": {
    kod: "01",
    dergiHref: "/bilim/sayi/01",
    anId: "eksi_mayanin_ilk_10_gunu",
    baslik: "Kavanozdaki Görünmez Savaş: Ekşi Mayanın İlk 10 Günü",
    alt: "Un ve suyun ilk karşılaşmasından kararlı 100:1 dengesine kadar pH düşüşü ve mikrobiyal seçilim.",
  },
  "02": {
    kod: "02",
    dergiHref: "/bilim/sayi/02",
    anId: "cavdar_unu_suyla_bulusunca",
    baslik: "Çavdar Hamuru Neden Yoğrulmaz?",
    alt: "Pentozanlar, su tutma kapasitesi ve kalıp çavdar ekmeğinde nişasta jelatinleşmesi.",
  },
  "03": {
    kod: "03",
    dergiHref: "/bilim/sayi/03",
    anId: "ayni_sofrada",
    baslik: "100 Bakteriye 1 Maya: Aynı Sofrada",
    alt: "Maltoz fosforilaz iş bölümü ile laktik asit bakterileri ve mayaların birbirini besleme düzeni.",
  },
  "04": {
    kod: "04",
    dergiHref: "/bilim/sayi/04",
    anId: "yogurma_tezgahinda",
    baslik: "Hamur Yoğruldukça Nasıl Güçlenir?",
    alt: "Glutenin makro-polimeri, disülfid bağları ve yoğurma tezgâhında ağın kurulup çözülme eşiği.",
  },
  "05": {
    kod: "05",
    dergiHref: "/bilim/sayi/05",
    anId: "rafta_ilk_hafta",
    baslik: "Sıcak Somun, Tereyağı, Yoğurt, Yumurta ve Sucuk: Sofranın Fizikokimyası",
    alt: "32–35 °C süt yağı erimesi, pH 4,6 yoğurt kazein kilidi, lesitin kalkanı ve kabuk pirazinlerinin yağda çözünmesi.",
  },
};

/**
 * Basılı Taş Fırın Gazetesi QR kodlarından gelen `?sayi=` parametresini
 * ilgili dergi sayısına çözer. Geçersiz veya boş girdide `null` döner.
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
