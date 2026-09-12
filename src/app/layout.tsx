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

export const metadata: Metadata = {
  metadataBase: new URL("https://ekmeklab.com"),
  title: "EkmekLab | Taş Fırından Ekşi Mayalı Ekmekler & Şarküteri",
  description:
    "Beylikdüzü'nde ata tohumu unlar ve 8 yıllık ekşi mayayla 36 saatte demlenen katkısız artisan ekmekler ve doğal şarküteri lezzetleri. Fırından çıktığı gün kapınızda.",
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
    icon: "/logo/logo_512.png",
    apple: "/logo/logo_512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark scroll-smooth">
      <body
        className={`${fraunces.variable} ${lora.variable} ${caveat.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased font-sans noise-bg selection:bg-artisan-terracotta/20 selection:text-artisan-wood`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
