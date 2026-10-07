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
