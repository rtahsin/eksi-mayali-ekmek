import type { ExtendedProduct, ProductShowcaseMedia } from "@/types";
import { isAccompanimentCategory } from "./grouping";

export const MIN_SPIN_FRAMES = 12;
export const MAX_SPIN_FRAMES = 72;

const PLACEHOLDER_REGEX = /\{index\}|\{0+\}/;

function hasControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Vitrin medya URL'lerinin yalnızca `https://` veya göreli `/` yolu olmasını doğrular;
 * `javascript:`, `data:`, `http://` ve `//` protokol-göreli adresleri reddeder.
 */
export function isSafeShowcaseUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed) || hasControlChars(trimmed)) return false;

  if (/^https:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" && parsed.hostname.length > 0;
    } catch {
      return false;
    }
  }

  return trimmed.startsWith("/") && !trimmed.startsWith("//");
}

/**
 * 360° döndürme kare dizisini çözer:
 * 1) Geçerli `spinFrameUrls` dizisi varsa güvenli URL'leri korur (en fazla 72).
 * 2) Yoksa `12..72` aralığındaki `spinFrameCount` ile `{index}` veya `{00}` yer tutuculu
 *    `spinFramesUrlPattern` deseninden kare URL dizisi üretir.
 * 3) Geçersiz/eksik yapılandırmada boş dizi (`[]`) döner.
 */
export function resolveSpinFrameUrls(showcase?: ProductShowcaseMedia | null): string[] {
  if (!showcase) return [];

  if (Array.isArray(showcase.spinFrameUrls) && showcase.spinFrameUrls.length > 0) {
    const safeFrames = showcase.spinFrameUrls
      .filter((url): url is string => isSafeShowcaseUrl(url))
      .map((url) => url.trim())
      .slice(0, MAX_SPIN_FRAMES);

    if (safeFrames.length > 0) {
      return safeFrames;
    }
  }

  const count = showcase.spinFrameCount;
  const pattern = typeof showcase.spinFramesUrlPattern === "string" ? showcase.spinFramesUrlPattern.trim() : "";

  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < MIN_SPIN_FRAMES ||
    count > MAX_SPIN_FRAMES ||
    !isSafeShowcaseUrl(pattern) ||
    !PLACEHOLDER_REGEX.test(pattern)
  ) {
    return [];
  }

  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const resolved = pattern
      .replace(/\{0+\}/g, (token) => String(i).padStart(token.length - 2, "0"))
      .replace(/\{index\}/g, String(i));
    urls.push(resolved);
  }
  return urls;
}

/**
 * Negatif veya üst sınırı aşan 360° kare indeksini `0..total-1` aralığına modüler sarar.
 */
export function wrapSpinFrameIndex(index: number, total: number): number {
  if (!Number.isFinite(total)) return 0;
  const count = Math.floor(total);
  if (count <= 0 || !Number.isFinite(index)) return 0;

  const normalizedIndex = Math.floor(index);
  const wrapped = ((normalizedIndex % count) + count) % count;
  return wrapped === 0 ? 0 : wrapped;
}

/**
 * Ürün kartı/sahnesi speküler ışık tonunu çözer:
 * açık `showcase.specularTone` varsa onu, yoksa eşlikçide `"frost"`, ekmekte `"ember"` döner.
 */
export function resolveSpecularTone(
  product: Pick<ExtendedProduct, "category" | "masterclass">,
): "ember" | "frost" {
  const explicit = product.masterclass?.showcase?.specularTone;
  if (explicit === "ember" || explicit === "frost") {
    return explicit;
  }
  return isAccompanimentCategory(product.category) ? "frost" : "ember";
}

/**
 * Ürün vitrin sahnesinde hangi etkileşimli medya katmanlarının hazır olduğunu raporlar.
 */
export function hasShowcaseInteractiveMedia(showcase?: ProductShowcaseMedia | null): {
  hasCutout: boolean;
  hasCrumb: boolean;
  hasSpin: boolean;
  hasVideo: boolean;
} {
  return {
    hasCutout: isSafeShowcaseUrl(showcase?.cutoutUrl),
    hasCrumb: isSafeShowcaseUrl(showcase?.crumbUrl),
    hasSpin: resolveSpinFrameUrls(showcase).length > 0,
    hasVideo: isSafeShowcaseUrl(showcase?.ambientVideoUrl),
  };
}
