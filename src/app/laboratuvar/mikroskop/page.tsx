import type { Metadata } from "next";
import { MicroPreview } from "@/components/game/micro/MicroPreview";

// Ekip için büyüteç önizlemesi (arama motorlarına kapalı)
export const metadata: Metadata = {
  title: "Lab Büyüteci · EkmekLab",
  robots: { index: false, follow: false },
};

export default function MikroskopPage() {
  return <MicroPreview />;
}
