import { z } from "zod";

// content/bilim/ dosyalarının şeması. Dosyalar bilim hattından üretilir (arastirma/bilim_isler/siteye_aktar.py) ve
// elle düzenlenmez: düzeltme hattın girdisinde yapılıp yeniden üretilir. Bütünlük: src/app/__checks__/bilim.check.test.ts.

const kimlik = z.string().regex(/^[a-z0-9_]+$/);
const bilgiKimligi = z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/);
const metin = z.string().trim().min(1);

export const KANIT_DURUMLARI = ["uzlasi", "tek_kaynak", "ikincil", "tartismali", "belirsiz"] as const;
export const kanitDurumuSchema = z.enum(KANIT_DURUMLARI);

export const yolculukSchema = z.object({
  duraklar: z
    .array(
      z.object({
        id: kimlik,
        ad: metin,
        anlar: z
          .array(
            z.object({
              id: kimlik,
              baslik: metin,
              soru: metin,
              ozet: metin,
              bayrak: z.boolean(),
              karakterler: z.array(kimlik),
            })
          )
          .min(1),
      })
    )
    .min(1),
  karakterler: z.array(z.object({ id: kimlik, ad: metin, tur: metin })),
  zaman_seridi: z.array(z.object({ id: kimlik, baslik: metin })),
});

export const anSchema = z.object({
  id: kimlik,
  durak: kimlik,
  baslik: metin,
  soru: metin,
  bayrak: z.boolean(),
  gor: z.object({
    tur: metin,
    adimlar: z.array(z.object({ metin, gorsel: kimlik.nullable(), vurgu: z.string() })).min(1),
  }),
  anla: z.array(z.object({ baslik: metin, paragraflar: z.array(metin).min(1) })).min(1),
  yuzlesme: z.array(z.object({ inanc: metin, cevap: metin })),
  kanit: z.object({ cekirdek: z.array(bilgiKimligi), cekmece: z.array(bilgiKimligi) }),
  baglar: z.array(
    z.object({ kaldirac: metin, mekanizma: metin, sonuc: metin, bilgiler: z.array(bilgiKimligi).min(1) })
  ),
  karakterler: z.array(kimlik),
  ayrisan_kaynaklar: z.array(z.object({ konu: metin, bilgiler: z.array(bilgiKimligi).min(1) })),
});

export const karakterSchema = z.object({
  id: kimlik,
  ad: metin,
  eski_ad: metin.nullable(),
  tur: metin,
  tek_cumle: metin,
  bolumler: z.array(z.object({ baslik: metin, cumleler: z.array(metin).min(1) })).min(1),
  efsane: metin.nullable(),
  anlar: z.array(kimlik),
  gorseller: z.array(kimlik),
});

export const bilgiSchema = z.object({
  id: bilgiKimligi,
  metin,
  kosul: z.string(),
  kanit: kanitDurumuSchema,
  bolum: metin,
  cekirdek: z.boolean(),
  kaynaklar: z.array(z.object({ kaynak: metin, yer: z.string() })).min(1),
});

export const bilgiDugumuSchema = z.object({ id: kimlik, ad: metin, bilgiler: z.array(bilgiSchema).min(1) });

export const sozlukSchema = z.record(z.string().regex(/^sozluk\.[a-z0-9_]+$/), metin);

export const kaynaklarSchema = z.record(
  metin,
  z.object({ baslik: metin, yil: z.number().int().nullable(), dergi: z.string(), doi: z.string().nullable() })
);

export const gorselSchema = z.object({
  dosya: z.string().regex(/^\/bilim\/gorsel\/[a-z0-9_]+\.webp$/),
  alt: metin,
  tur: z.enum(["foto", "mikroskop", "sekil"]),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  renk_haritasi: z.boolean(),
  lisans: metin,
  lisans_url: z.url().nullable(),
  yazar: z.string(),
  kaynak_sayfa: z.url(),
  panel: z.string().nullable().optional(),
  makale: z.object({ baslik: metin, dergi: z.string(), yil: z.string(), doi: metin }).optional(),
});

export const gorsellerSchema = z.record(kimlik, gorselSchema);

export type KanitDurumu = z.infer<typeof kanitDurumuSchema>;
export type Yolculuk = z.infer<typeof yolculukSchema>;
export type An = z.infer<typeof anSchema>;
export type Karakter = z.infer<typeof karakterSchema>;
export type Bilgi = z.infer<typeof bilgiSchema>;
export type BilgiDugumu = z.infer<typeof bilgiDugumuSchema>;
export type Sozluk = z.infer<typeof sozlukSchema>;
export type Kaynaklar = z.infer<typeof kaynaklarSchema>;
export type Gorsel = z.infer<typeof gorselSchema>;
export type Gorseller = z.infer<typeof gorsellerSchema>;
