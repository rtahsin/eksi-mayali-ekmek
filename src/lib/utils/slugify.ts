/**
 * EkmekLab Slugify & Product URL Utilities
 * Generates Turkish-friendly, SEO-optimized canonical slugs.
 */

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/%/g, "yuzde-")
    .replace(/&/g, "ve")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductSlug(product: {
  id: string;
  name: string;
  slug?: string | null;
}): string {
  if (product.slug && product.slug.trim().length > 0 && !product.slug.startsWith("-")) {
    return product.slug.trim();
  }
  return slugify(product.name) || product.id;
}

export function getProductUrl(product: {
  id: string;
  name: string;
  slug?: string | null;
}): string {
  return `/urun/${getProductSlug(product)}`;
}
