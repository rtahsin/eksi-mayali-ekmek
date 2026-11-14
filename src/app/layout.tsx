import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";
import { SITE_URL, SOCIAL_LIST } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
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

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6EEDF" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0D0C" },
  ],
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
    statusBarStyle: "default",
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
  "sameAs": SOCIAL_LIST.map((s) => s.url),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');function sync(){var p=localStorage.getItem('ekmeklab_theme_preference');var v=localStorage.getItem('ekmeklab_dark_variant')||'b';var d=p==='dark'||((!p||p==='system')&&m.matches);var r=document.documentElement;if(d){r.classList.add('dark');r.setAttribute('data-theme','dark');r.setAttribute('data-dark-variant',v);}else{r.classList.remove('dark');r.setAttribute('data-theme','light');r.removeAttribute('data-dark-variant');}}sync();if(m.addEventListener){m.addEventListener('change',sync);}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(bakeryJsonLd) }}
        />
      </head>
      <body
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-bg text-ink antialiased font-sans noise-bg selection:bg-accent/20 selection:text-ink`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
