import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bilim & Zanaat Kütüphanesi | EkmekLab",
  description:
    "Unun, sütün ve zamanın biyokimyası. Ata tohumları, 36 saatlik soğuk fermantasyon, fitik asit kırılımı ve geleneksel mandıra araştırmaları.",
  keywords: [
    "ekşi maya biyokimyası",
    "karakılçık buğdayı",
    "fitik asit",
    "çiğ süt fermantasyonu",
    "mihaliç peyniri",
    "EkmekLab Kütüphane",
  ],
  openGraph: {
    title: "Bilim & Zanaat Kütüphanesi | EkmekLab",
    description:
      "Gıdanın hücresel kökenine inen, zanaatkârın tezgâhı ile bilimin kesiştiği bağımsız araştırma bülteni.",
    url: "https://ekmeklab.com/kutuphane",
    siteName: "EkmekLab",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/atelier/atelier_panorama.png",
        width: 1536,
        height: 1024,
        alt: "EkmekLab Taş Fırın & Zanaat Tezgâhı",
      },
    ],
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
