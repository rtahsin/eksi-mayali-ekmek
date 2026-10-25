import type { Metadata } from "next";
import { FEATURES } from "@/lib/features";

// Bilim odası levha düzenindedir; yazıları levha bileşenleri yükler (components/bilim/levha/fontlar.ts).
// Açılışa kadar arama motorlarına kapalıydı (BILIM_PLATFORMU_PLANI: tek seferde açılış; FEATURES.bilimOdasi).
export const metadata: Metadata = {
  title: "Bilim odası | EkmekLab",
  ...(FEATURES.bilimOdasi ? {} : { robots: { index: false, follow: false } }),
};

export default function BilimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
