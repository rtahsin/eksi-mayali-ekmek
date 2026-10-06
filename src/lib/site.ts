/**
 * Site genelindeki sabitler: alan adı ve iletişim bilgileri TEK yerden gelir.
 * (İşletme WhatsApp hattı admin ayarlarından da değiştirilebilir; bu dosyadaki
 * değer ayar okunamadığında kullanılan varsayılandır.)
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ekmeklab.tr").replace(/\/+$/, "");

export const SITE_NAME = "EkmekLab";

export const CONTACT = {
  /** Görünen biçim */
  phoneDisplay: "0501 012 66 53",
  /** tel: ve wa.me biçimi */
  phoneE164: "905010126653",
  email: "ekmeklab@gmail.com",
  area: "Beylikdüzü, İstanbul",
} as const;

/** Instagram hesabı (yalnız kullanıcı adı). */
export const INSTAGRAM_HANDLE = "ekmeklabtr";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;

/**
 * EkmekLab ekmeği satan şarküteriler ("Nerede bulunur?", docs/MARKA.md §6).
 * Ad ve adresler Tahsin'den gelince buraya eklenir; liste boşken ana sayfadaki bölüm hiç görünmez.
 * Örnek: { name: "…", area: "Yakuplu", address: "…", mapUrl: "https://maps.app.goo.gl/…" }
 */
export interface Stockist {
  name: string;
  /** Mahalle / semt */
  area: string;
  address?: string;
  /** Google Haritalar bağlantısı */
  mapUrl?: string;
  /** Instagram kullanıcı adı (@ olmadan) */
  instagram?: string;
}
export const STOCKISTS: readonly Stockist[] = [];

/**
 * YouTube kanalı. Video yokken null; dolunca ana sayfadaki Kütüphane bölümünde bağlantı çıkar.
 */
export const YOUTUBE_URL: string | null = null;

/** wa.me bağlantısı (numara verilmezse işletme hattı). */
export function whatsappLink(text?: string, phoneE164: string = CONTACT.phoneE164): string {
  const base = `https://wa.me/${phoneE164}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Sipariş takip sayfasının tam adresi (token varsa tam görünüm açar). */
export function trackingUrl(orderNumberOrId: string, token?: string | null): string {
  const path = `${SITE_URL}/siparis-takip/${encodeURIComponent(orderNumberOrId)}`;
  return token ? `${path}?t=${encodeURIComponent(token)}` : path;
}
