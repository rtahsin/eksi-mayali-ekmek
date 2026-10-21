import type { Metadata } from "next";
import Link from "next/link";
import { Azeret_Mono, Crimson_Pro, Plus_Jakarta_Sans } from "next/font/google";
import s from "@/components/bilim/bilim.module.css";

const crimson = Crimson_Pro({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jakarta",
  display: "swap",
});

const azeret = Azeret_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-azeret",
  display: "swap",
});

// Yayına kadar arama motorlarına kapalı (BILIM_PLATFORMU_PLANI: tek seferde açılış).
export const metadata: Metadata = {
  title: "Bilim odası | EkmekLab",
  robots: { index: false, follow: false },
};

export default function BilimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${s.oda} ${crimson.variable} ${jakarta.variable} ${azeret.variable}`}>
      <header className={s.serit}>
        <Link href="/bilim" className={s.marka}>
          EkmekLab · Bilim odası
        </Link>
        <Link href="/">Fırına dön</Link>
      </header>
      {children}
    </div>
  );
}
