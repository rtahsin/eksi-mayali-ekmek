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
];

export const FOOTER_NAV_LINKS: readonly NavLink[] = [
  { href: "/#ekmekler", label: "Taze Ekmeklerimiz" },
  { href: "/#gurme-lezzetler", label: "Gurme Lezzetler" },
  { href: "/kutuphane", label: "Kütüphane" },
  { href: "/kavram", label: "Kavramlar Sözlüğü" },
  { href: "/#nasil-uretiyoruz", label: "Nasıl Üretiyoruz?" },
];
