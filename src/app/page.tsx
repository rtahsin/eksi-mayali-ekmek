import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/common/Navbar";
import { AtelierThresholdHero } from "@/components/atelier/AtelierThresholdHero";
import { ProductCatalog } from "@/components/storefront/ProductCatalog";
import { HowWeBake } from "@/components/storefront/HowWeBake";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { Footer } from "@/components/common/Footer";
import { getCatalog } from "@/lib/products/server";

export const revalidate = 60; // ISR: Revalidate catalog every 60 seconds

export const metadata: Metadata = {
  title: "EkmekLab | Taş Fırın Ekşi Mayalı Ekmek & Gurme Lezzetler",
  description:
    "Beylikdüzü'nde ata tohumu unlar ve canlı ekşi mayayla, uzun fermantasyonla hazırlanan katkısız ekmekler ve doğal mandıra seçkisi. Günlük taze üretim.",
  openGraph: {
    title: "EkmekLab | Taş Fırın Ekşi Mayalı Ekmek & Gurme Lezzetler",
    description:
      "Beylikdüzü'nde ata tohumu unlar ve canlı ekşi mayayla, uzun fermantasyonla hazırlanan katkısız ekmekler ve doğal mandıra seçkisi.",
    type: "website",
    locale: "tr_TR",
  },
};

export default async function HomePage() {
  const { products, categories } = await getCatalog();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-artisan-amber/20 selection:text-artisan-gold font-sans">
      {/* 1. Header with Logo & Cart */}
      <Navbar />

      {/* 2. Main Storefront Flow */}
      <main className="flex-1 space-y-0">
        {/* Atölyenin Eşiği (Hero with atelier_threshold.png) */}
        <AtelierThresholdHero />

        {/* Ekmekler, Özel Ön Sipariş & Şarküteri Kataloğu (Pre-rendered RSC + client hydrated) */}
        <ProductCatalog initialProducts={products} categories={categories} />

        {/* Nasıl Üretiyoruz? (3 Sade Adım) */}
        <HowWeBake />
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* 3b. Mobile sticky cart bar (md altında) */}
      <MobileCartBar />

      {/* 4. Drawers & Modals (Client Islands) */}
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
