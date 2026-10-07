import type { Metadata } from "next";
import { LabGame } from "@/components/game/LabGame";

// Laboratuvar & Fırın Simülasyonu (P1-12)
export const metadata: Metadata = {
  title: "Laboratuvar & Fırın Simülasyonu · EkmekLab",
  description: "24 saatlik ekşi mayalı köy ekmeği fermantasyonunu ve fırın mekaniğini mikro düzeyde simüle edin.",
  openGraph: {
    title: "Laboratuvar & Fırın Simülasyonu · EkmekLab",
    description: "24 saatlik ekşi mayalı köy ekmeği fermantasyonunu ve fırın mekaniğini mikro düzeyde simüle edin.",
  },
};

export default function LaboratuvarPage() {
  return <LabGame />;
}
