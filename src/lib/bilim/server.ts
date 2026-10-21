import "server-only";
import * as fs from "node:fs";
import * as path from "node:path";
import type { z } from "zod";
import {
  anSchema,
  bilgiDugumuSchema,
  gorsellerSchema,
  kaynaklarSchema,
  karakterSchema,
  sozlukSchema,
  yolculukSchema,
  type An,
  type Bilgi,
  type BilgiDugumu,
  type Gorsel,
  type Gorseller,
  type Karakter,
  type Kaynaklar,
  type Sozluk,
  type Yolculuk,
} from "./schema";

// content/bilim/ okuyucusu. Dosyalar derleme anında okunur ve şemadan geçmeyen dosya derlemeyi durdurur.

const KOK = path.join(process.cwd(), "content", "bilim");
const bellek = new Map<string, unknown>();

function oku<T>(schema: z.ZodType<T>, ...parca: string[]): T {
  const yol = path.join(KOK, ...parca);
  if (!bellek.has(yol)) {
    bellek.set(yol, schema.parse(JSON.parse(fs.readFileSync(yol, "utf8"))));
  }
  return bellek.get(yol) as T;
}

function listele(klasor: string): string[] {
  return fs
    .readdirSync(path.join(KOK, klasor))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

export const getYolculuk = (): Yolculuk => oku(yolculukSchema, "yolculuk.json");
export const getSozluk = (): Sozluk => oku(sozlukSchema, "sozluk.json");
export const getKaynaklar = (): Kaynaklar => oku(kaynaklarSchema, "kaynaklar.json");
export const getGorseller = (): Gorseller => oku(gorsellerSchema, "gorseller.json");

/** Yolculuk sırasıyla anların kimlikleri. */
export function getAnKimlikleri(): string[] {
  return getYolculuk().duraklar.flatMap((d) => d.anlar.map((a) => a.id));
}

export const getAn = (id: string): An => oku(anSchema, "anlar", `${id}.json`);
export const getKarakter = (id: string): Karakter => oku(karakterSchema, "karakterler", `${id}.json`);
export const getKarakterKimlikleri = (): string[] => listele("karakterler");
export const getDugumKimlikleri = (): string[] => listele("bilgiler");
export const getDugum = (id: string): BilgiDugumu => oku(bilgiDugumuSchema, "bilgiler", `${id}.json`);

export function getBilgi(id: string): Bilgi | undefined {
  const dugum = id.split(".")[0];
  if (!getDugumKimlikleri().includes(dugum)) return undefined;
  return getDugum(dugum).bilgiler.find((b) => b.id === id);
}

export function getGorsel(id: string): Gorsel | undefined {
  return getGorseller()[id];
}

export type CozulmusAtif = { tur: "bilgi"; bilgi: Bilgi } | { tur: "sozluk"; id: string; metin: string };

/** [[…]] atfını bilgiye ya da sözlük tanımına çözer; çözülemeyen atıf undefined döner (src/app/__checks__/bilim.check.test.ts yakalar). */
export function resolveAtif(id: string): CozulmusAtif | undefined {
  if (id.startsWith("sozluk.")) {
    const metin = getSozluk()[id];
    return metin ? { tur: "sozluk", id, metin } : undefined;
  }
  const bilgi = getBilgi(id);
  return bilgi ? { tur: "bilgi", bilgi } : undefined;
}
