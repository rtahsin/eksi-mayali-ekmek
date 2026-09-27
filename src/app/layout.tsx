import type { Metadata } from "next";
import { Fraunces, Lora, Caveat, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport = {
  themeColor: "#120E0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ekmeklab.com"),
  title: "EkmekLab | Taş Fırından Ekşi Mayalı Ekmekler & Şarküteri",
  description:
    "Beylikdüzü'nde ata tohumu unlar ve 8 yıllık ekşi mayayla 36 saatte demlenen katkısız artisan ekmekler ve doğal şarküteri lezzetleri. Fırından çıktığı gün kapınızda.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EkmekLab",
  },
  keywords: [
    "ekşi mayalı ekmek",
    "Beylikdüzü fırın",
    "karakılçık ekmeği",
    "artisan ekmek",
    "şarküteri",
    "EkmekLab",
  ],
  authors: [{ name: "EkmekLab" }],
  openGraph: {
    title: "EkmekLab | Taş Fırından Ekşi Mayalı Ekmekler",
    description:
      "Ata tohumu taş değirmen unları ve 8 yıllık canlı ekşi maya. Beylikdüzü fırınından kapınıza.",
    url: "https://ekmeklab.com",
    siteName: "EkmekLab",
    locale: "tr_TR",
    type: "website",
  },
  icons: {
    icon: "/icons/Icon-192.png",
    apple: "/icons/Icon-192.png",
  },
};

const bakeryJsonLd = {
  "@context": "https://schema.org",
  "@type": "Bakery",
  "@id": "https://ekmeklab.com/#bakery",
  "name": "EkmekLab",
  "url": "https://ekmeklab.com",
  "logo": "https://ekmeklab.com/icons/Icon-512.png",
  "image": "https://ekmeklab.com/atelier/atelier_panorama.png",
  "description":
    "Beylikdüzü'nde ata tohumu unlar ve 8 yıllık canlı ekşi mayayla 36 saatte demlenen katkısız artisan ekmekler ve doğal şarküteri lezzetleri.",
  "telephone": "+905320000000",
  "priceRange": "₺₺",
  "servesCuisine": ["Ekşi Mayalı Ekmek", "Artisan Bakery", "Doğal Şarküteri"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Cumhuriyet Mah. E-5 Yan Yol No: 12",
    "addressLocality": "Beylikdüzü",
    "addressRegion": "İstanbul",
    "postalCode": "34520",
    "addressCountry": "TR",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 41.0025,
    "longitude": 28.6412,
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      "opens": "08:00",
      "closes": "20:00",
    },
  ],
  "sameAs": ["https://www.instagram.com/ekmeklab"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bakeryJsonLd) }}
        />
      </head>
      <body
        className={`${fraunces.variable} ${lora.variable} ${caveat.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased font-sans noise-bg selection:bg-artisan-terracotta/20 selection:text-artisan-wood`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
