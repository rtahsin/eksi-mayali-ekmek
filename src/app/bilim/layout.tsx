import type { Metadata } from "next";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { FEATURES } from "@/lib/features";

// Bilim odası levha düzenindedir; yazıları levha bileşenleri yükler (components/bilim/levha/fontlar.ts).
// Sitenin üst menüsü ve alt bilgisi diğer bölümlerdeki gibi levhanın çevresinde durur.
// Açılışa kadar arama motorlarına kapalıydı (BILIM_PLATFORMU_PLANI: tek seferde açılış; FEATURES.bilimOdasi).
export const metadata: Metadata = {
  title: "Bilim odası | EkmekLab",
  ...(FEATURES.bilimOdasi ? {} : { robots: { index: false, follow: false } }),
};

export default function BilimLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
