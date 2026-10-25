// Levha düzeninin grafik tanımları: her anın sayıları, bağlı oldukları bilgilerle (src/lib/bilim/levhalar.ts).
// Kural: ekranda görünen her sayı `etiket` içinde yazılır ve bağlı bilginin metninde geçer; çizilen değer
// etiketteki sayıdan gelir (gerekirse `carpan` ile birim çevrilir). Denetim: src/app/__checks__/levha.check.test.ts.

export type GrafikRengi = "ic" | "kabuk" | "vurgu" | "notr";

/** Grafiğin anın neresinde durduğu: bir Anla bölümünün altında ya da bir Yüzleşme maddesinin yanında. */
export type GrafikYeri = { bolum: number } | { yuzlesme: number };

/** Satırlı ölçekte bir satır: nokta, aralık, eksenin başından bir değere (kadar) ya da bir değerden sonuna (den) bant. */
export interface OlcekSatiri {
  ad: string;
  etiket: string;
  bilgi?: string;
  nokta?: number;
  pay?: number;
  aralik?: readonly [number, number];
  kadar?: number;
  den?: number;
  cizgi?: number;
  carpan?: number;
  renk?: GrafikRengi;
}

interface Ortak {
  baslik: string;
  bilgi: string;
  not?: string;
  yer: GrafikYeri;
}

export type Grafik =
  | (Ortak & {
      tur: "sutun";
      birim: string;
      ogeler: readonly { ad: string; deger: number; etiket: string; bilgi?: string }[];
    })
  | (Ortak & {
      tur: "olcek";
      birim: string;
      alt?: number;
      ust: number;
      adim: number;
      log?: boolean;
      satirlar: readonly OlcekSatiri[];
      lejant?: { nokta?: string; aralik?: string };
    })
  | (Ortak & {
      tur: "pay";
      birim: string;
      toplam: { ad: string; deger: number; etiket: string };
      parcalar: readonly { ad: string; deger: number; etiket: string }[];
    })
  | (Ortak & {
      tur: "cizgi";
      xBirim: string;
      yBirim: string;
      xUst: number;
      yUst: number;
      yAdim: number;
      /** Başlangıç noktası (0, 0) ölçüm değil tanımdır: "başlangıca göre kayıp" gibi. */
      sifirdan?: boolean;
      noktalar: readonly { x: number; y: number; etiket: string; xEtiket: string }[];
    })
  | (Ortak & {
      tur: "once_sonra";
      ust: number;
      xEtiket: readonly [string, string];
      paneller: readonly { ad: string; once: { deger: readonly [number, number]; etiket: string }; sonra: { deger: readonly [number, number]; etiket: string } }[];
    })
  | (Ortak & { tur: "sema"; sema: "nem_kesiti" });

export interface LevhaRakami {
  deger: string;
  birim: string;
  aciklama: string;
  bilgi: string;
  renk?: GrafikRengi;
}

export interface LevhaTanimi {
  rakamlar: readonly LevhaRakami[];
  grafikler: readonly Grafik[];
}

/** 41.2 → "41,2"; ekseni ve etiketleri Türkçe ondalıkla yazar. */
export function trSayi(n: number): string {
  return String(n).replace(".", ",");
}

/** Bir grafiğin dayandığı bütün bilgi kimlikleri. */
export function grafikBilgileri(g: Grafik): string[] {
  const ek: (string | undefined)[] =
    g.tur === "sutun" ? g.ogeler.map((o) => o.bilgi) : g.tur === "olcek" ? g.satirlar.map((s) => s.bilgi) : [];
  return [...new Set([g.bilgi, ...ek.filter((x): x is string => !!x)])];
}
