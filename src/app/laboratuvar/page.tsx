import type { Metadata } from "next";
import { LabGame } from "@/components/game/LabGame";

// Prototip: henüz arama motorlarına açılmıyor (docs/OYUN.md §7)
export const metadata: Metadata = {
  title: "Usta olabilir misin? · EkmekLab",
  description: "24 saatlik ekşi mayalı köy ekmeğini 3 dakikada sen yap.",
  robots: { index: false, follow: false },
};

export default function LaboratuvarPage() {
  return <LabGame />;
}
