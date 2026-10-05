import type { Metadata, Viewport } from "next";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeFooter } from "@/components/home/HomeFooter";
import {
  HomeFaq,
  HomeHero,
  HomeLab,
  HomeLibrary,
  HomeProducts,
  HomeStockists,
  HomeStory,
  HomeWholesale,
} from "@/components/home/HomeSections";
import { getCatalog } from "@/lib/products/server";
import { groupHomeProducts } from "@/lib/products/homeSections";
import { getStoreSettings } from "@/lib/settings/server";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { CONTACT } from "@/lib/site";

export const revalidate = 60; // ISR: katalog ve ayarlar dakikada bir tazelenir

const TITLE = "EkmekLab · Mahallenin ekmek laboratuvarı";
const DESCRIPTION =
  "Beylikdüzü'nde ekşi mayayla, taş tabanlı fırında pişen ekmek. Un, su, tuz ve yaklaşık 24 saat. Sen günü seç, kapına getirelim.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "tr_TR",
    images: [{ url: "/images/products/koy-ekmegi.jpg", width: 848, height: 1131, alt: "EkmekLab köy ekmeği" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F6EEDF",
};

export default async function HomePage() {
  const [{ products }, settings] = await Promise.all([getCatalog(), getStoreSettings()]);
  const groups = groupHomeProducts(products);

  return (
    <div className="min-h-screen flex flex-col bg-krem-paper text-krem-ink font-sans [color-scheme:light] selection:bg-krem-accent/20">
      <a
        href="#ekmekler"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-krem-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Ekmeklere geç
      </a>
      <HomeHeader />

      {settings.announcementText && (
        <p className="border-b border-krem-line bg-krem-card px-4 py-2.5 text-center text-sm text-krem-ink">
          {settings.announcementText}
        </p>
      )}

      <main className="flex-1">
        <HomeHero settings={settings} />
        <HomeProducts groups={groups} settings={settings} />
        <HomeStory />
        <HomeLab />
        <HomeStockists />
        <HomeLibrary />
        <HomeWholesale settings={settings} />
        <HomeFaq settings={settings} />
      </main>

      <HomeFooter whatsappE164={toWhatsAppNumber(settings.whatsappPhone || CONTACT.phoneDisplay)} />

      {/* Sepet ve sipariş (istemci adaları) */}
      <MobileCartBar />
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
