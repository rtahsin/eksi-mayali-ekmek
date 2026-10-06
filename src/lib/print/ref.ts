import { SITE_URL } from "@/lib/site";

/**
 * Etiketteki QR adresi ve satış noktası kodu.
 *
 * Adres bilerek kısa tutulur: QR'a giren metin kısaldıkça kare sayısı (sürüm) düşer, kareler büyür ve
 * kraft torbadaki küçük etiket telefonla kolay okunur.
 *   https://ekmeklab.tr/e/koy           → 25 karakter, QR sürüm 2 (25×25 kare)
 *   https://ekmeklab.tr/e/koy?n=kuzu    → 32 karakter, QR sürüm 3 (29×29 kare)
 *
 * `n` = satış noktası (şarküteri, kafe) kodu: 3–6 karakter, küçük harf/rakam, harfle başlar.
 * Kodlar `src/lib/stockists.ts` içindeki listeyle eşleşirse QR sayfası "Bu ekmeği … aldın" der.
 */

export const REF_MIN_LENGTH = 3;
export const REF_MAX_LENGTH = 6;

const REF_RE = /^[a-z][a-z0-9]{2,5}$/;

const TR_LETTERS: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Geçerli satış noktası kodu mu? (`kuzu`, `kafe2`) */
export function isValidRef(value: unknown): value is string {
  return typeof value === "string" && REF_RE.test(value);
}

/**
 * Elle yazılan kodu sadeleştirir: Türkçe harfleri çevirir, küçültür, harf/rakam dışını atar,
 * en fazla 6 karaktere kısaltır. Sonucun geçerli olup olmadığını `isValidRef` söyler.
 *   "Köşe 2" → "kose2", "  KUZU! " → "kuzu"
 */
export function normalizeRef(raw: string): string {
  return raw
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (ch) => TR_LETTERS[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, REF_MAX_LENGTH);
}

/** Site içi yol: `/e/koy` ya da `/e/koy?n=kuzu` (geçersiz kod yok sayılır). */
export function labelPath(slug: string, ref?: string | null): string {
  const path = `/e/${encodeURIComponent(slug)}`;
  return isValidRef(ref) ? `${path}?n=${ref}` : path;
}

/** QR'a basılan tam adres. `base` testler içindir; varsayılan `SITE_URL`. */
export function labelUrl(slug: string, ref?: string | null, base: string = SITE_URL): string {
  return `${base.replace(/\/+$/, "")}${labelPath(slug, ref)}`;
}

/** Etikette QR altına yazılacak kısa alan adı: "https://ekmeklab.tr" → "ekmeklab.tr". */
export function siteHost(base: string = SITE_URL): string {
  return base.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}
