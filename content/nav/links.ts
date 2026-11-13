export interface NavLink {
  href: string;
  label: string;
  description?: string;
}

export const MAIN_NAV_LINKS: readonly NavLink[] = [
  { href: "/#ekmekler", label: "Ekmeklerimiz" },
  { href: "/#gurme-lezzetler", label: "Gurme Lezzetler" },
  { href: "/bilim", label: "Bilim odası" },
  { href: "/arac", label: "Fırıncı Araçları" },
];

/**
 * Atelier Menü Çekmecesi: Sipariş Bölümü (I-02)
 */
export const DRAWER_ORDER_LINKS: readonly NavLink[] = [
  { href: "/#ekmekler", label: "Ekmekler", description: "Taş fırından günlük çıkan artisan ekşi mayalı somunlar" },
  { href: "/#gurme-lezzetler", label: "Eşlikçiler", description: "Tereyağı, mandıra ve gurme şarküteri lezzetleri" },
  { href: "#delivery-info", label: "Teslimat Bölgesi ve Ücret", description: "Beylikdüzü geneli teslimat koşulları ve saatleri" },
  { href: "#where-to-find", label: "Nerede Bulunur?", description: "Bahçe atölyemiz ve anlaşmalı teslim noktaları" },
];

/**
 * Atelier Menü Çekmecesi: Keşfet Bölümü (I-02)
 */
export const DRAWER_DISCOVERY_LINKS: readonly NavLink[] = [
  { href: "#manifesto", label: "Biz Kimiz?", description: "Ata tohumu buğday mirası ve zanaat manifestomuz" },
  { href: "/bilim", label: "Bilim odası", description: "Ekmeğin içindeki 26 an, kaynaklarıyla" },
  { href: "/arac", label: "Fırıncı Araçları", description: "Fırıncı yüzdesi, DDT ve maya besleme planlayıcı" },
];

export const FOOTER_NAV_LINKS: readonly NavLink[] = [
  { href: "/#ekmekler", label: "Taze Ekmeklerimiz" },
  { href: "/#nasil-uretiyoruz", label: "Nasıl Üretiyoruz?" },
  { href: "/bilim", label: "Ekmeğin Bilimi" },
  { href: "/bilim/efsaneler", label: "Efsane Dosyası" },
  { href: "/arac", label: "Fırıncı Araçları" },
  { href: "/siparislerim", label: "Sipariş Sorgula" },
];
