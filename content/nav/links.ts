import { FEATURES } from "@/lib/features";
import type { StorefrontNavigationItem } from "@/types/storefront-ui";

export type { StorefrontNavigationItem as NavLink } from "@/types/storefront-ui";

export const STOREFRONT_LINKS = {
  bread: { key: "bread", href: "/#ekmekler", label: "Ekmeklerimiz", description: "Taş fırından çıkan ekşi mayalı ekmekler" },
  accompaniments: { key: "accompaniments", href: "/#gurme-lezzetler", label: "Mandıra & Şarküteri", description: "Ekmeğin yanına seçilmiş sofralık eşlikçiler" },
  production: { key: "production", href: "/#nasil-uretiyoruz", label: "Nasıl üretiyoruz?", description: "Undan fırına ekmeğin yolu", feature: "nasilUretiyoruz" },
  science: { key: "science", href: "/bilim", label: "Bilim odası", description: "Tarladan dilime, ekmeğin yolculuğu", feature: "bilimOdasi" },
  tools: { key: "tools", href: "/arac", label: "Fırıncı araçları", description: "Fırıncı yüzdesi, su sıcaklığı ve maya planlayıcı" },
  tracking: { key: "tracking", href: "/siparislerim", label: "Siparişi takip et" },
} as const satisfies Record<string, StorefrontNavigationItem>;

export const MAIN_NAV_LINKS: readonly StorefrontNavigationItem[] = [STOREFRONT_LINKS.bread, STOREFRONT_LINKS.accompaniments, STOREFRONT_LINKS.production, STOREFRONT_LINKS.science, STOREFRONT_LINKS.tools];
export const DRAWER_ORDER_LINKS: readonly StorefrontNavigationItem[] = [
  STOREFRONT_LINKS.bread, STOREFRONT_LINKS.accompaniments, STOREFRONT_LINKS.production,
  { key: "delivery", href: "#delivery-info", dialog: "delivery", label: "Teslimat bilgisi", description: "Beylikdüzü içi ücretsiz teslimat" },
  { key: "whereToFind", href: "#where-to-find", dialog: "whereToFind", label: "Nerede bulunur?", description: "Bahçe atölyemiz ve anlaşmalı şarküteriler" },
];
export const DRAWER_DISCOVERY_LINKS: readonly StorefrontNavigationItem[] = [
  { key: "manifesto", href: "#manifesto", dialog: "manifesto", label: "Biz kimiz?", description: "Ata tohumu mirasımız ve atölyenin hikâyesi" },
  STOREFRONT_LINKS.science, STOREFRONT_LINKS.tools,
];
export const FOOTER_NAV_LINKS: readonly StorefrontNavigationItem[] = [
  STOREFRONT_LINKS.bread, STOREFRONT_LINKS.accompaniments, STOREFRONT_LINKS.production, STOREFRONT_LINKS.science,
  { key: "myths", href: "/bilim/efsaneler", label: "Efsane dosyası", feature: "bilimOdasi" },
  STOREFRONT_LINKS.tools, STOREFRONT_LINKS.tracking,
];

export function isStorefrontNavVisible(link: StorefrontNavigationItem): boolean {
  return !link.feature || FEATURES[link.feature];
}
