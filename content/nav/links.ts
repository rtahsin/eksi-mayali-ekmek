export interface NavLink {
  href: string;
  label: string;
  description?: string;
}

export const MAIN_NAV_LINKS: readonly NavLink[] = [
  { href: "/#ekmekler", label: "Ekmeklerimiz" },
  { href: "/#gurme-lezzetler", label: "Gurme Lezzetler" },
  { href: "/kutuphane", label: "Kütüphane" },
  { href: "/kavram", label: "Kavramlar" },
  { href: "/laboratuvar", label: "Laboratuvar" },
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
  { href: "/kutuphane", label: "Kütüphane", description: "Fermantasyon bilimi, un biyolojisi ve araştırmalar" },
  { href: "/laboratuvar", label: "Laboratuvar", description: "Mikroskobik hamur simülasyonu ve ekşi maya motoru" },
  { href: "/arac", label: "Fırıncı Araçları", description: "Fırıncı yüzdesi, DDT ve maya besleme planlayıcı" },
];

export const FOOTER_NAV_LINKS: readonly NavLink[] = [
  { href: "/#ekmekler", label: "Taze Ekmeklerimiz" },
  { href: "/#gurme-lezzetler", label: "Gurme Lezzetler" },
  { href: "/kutuphane", label: "Kütüphane" },
  { href: "/kavram", label: "Kavramlar Sözlüğü" },
  { href: "/laboratuvar", label: "Laboratuvar Simülasyonu" },
  { href: "/arac", label: "Profesyonel Araçlar" },
  { href: "/arama", label: "Arama" },
  { href: "/#nasil-uretiyoruz", label: "Nasıl Üretiyoruz?" },
];
