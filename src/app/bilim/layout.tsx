import type { Metadata } from "next";
import { Onest, Unbounded } from "next/font/google";
import { FEATURES } from "@/lib/features";

const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-unbounded",
  display: "swap",
});

const onest = Onest({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-onest",
  display: "swap",
});

// Açılışa kadar arama motorlarına kapalı (BILIM_PLATFORMU_PLANI: tek seferde açılış; FEATURES.bilimOdasi).
export const metadata: Metadata = {
  title: "Bilim odası | EkmekLab",
  ...(FEATURES.bilimOdasi ? {} : { robots: { index: false, follow: false } }),
};

export default function BilimLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${unbounded.variable} ${onest.variable}`}>{children}</div>;
}
