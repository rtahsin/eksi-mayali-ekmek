import type { Metadata } from "next";
import { Fraunces, Lora, Caveat, JetBrains_Mono, Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-caveat",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport = {
  themeColor: "#F6EEDF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "EkmekLab | Taş Fırından Ekşi Mayalı Ekmekler & Şarküteri",
  description:
    "Beylikdüzü'nde ata tohumu unlar ve canlı ekşi mayayla, uzun fermantasyonla hazırlanan katkısız artisan ekmekler ve doğal şarküteri lezzetleri. Fırından çıktığı gün kapınızda.",
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
      "Ata tohumu taş değirmen unları ve canlı ekşi maya. Beylikdüzü fırınından kapınıza.",
    url: SITE_URL,
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
  "@type": "Organization",
  "@id": `${SITE_URL}/#bakery`,
  "name": "EkmekLab",
  "url": SITE_URL,
  "logo": `${SITE_URL}/icons/Icon-512.png`,
  "image": `${SITE_URL}/atelier/atelier_threshold.webp`,
  "description":
    "Beylikdüzü'nde ata tohumu unlar ve canlı ekşi mayayla, uzun fermantasyonla hazırlanan katkısız artisan ekmekler ve doğal şarküteri lezzetleri.",
  "areaServed": "Beylikdüzü, İstanbul",
  "sameAs": ["https://www.instagram.com/ekmeklabtr"],
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
        className={`${fraunces.variable} ${lora.variable} ${inter.variable} ${caveat.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased font-sans noise-bg selection:bg-artisan-terracotta/20 selection:text-artisan-wood`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
