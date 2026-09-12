"use client";

import React from "react";
import { Navbar } from "@/components/common/Navbar";
import { AtelierThresholdHero } from "@/components/atelier/AtelierThresholdHero";
import { ProductCatalog } from "@/components/storefront/ProductCatalog";
import { HowWeBake } from "@/components/storefront/HowWeBake";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { Footer } from "@/components/common/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-artisan-amber/20 selection:text-artisan-gold font-sans">
      {/* 1. Header with Logo & Cart */}
      <Navbar />

      {/* 2. Main Storefront Flow */}
      <main className="flex-1 space-y-0">
        {/* Atölyenin Eşiği (Hero with atelier_threshold.png) */}
        <AtelierThresholdHero />

        {/* Ekmekler, Özel Ön Sipariş & Şarküteri Kataloğu */}
        <ProductCatalog />

        {/* Nasıl Üretiyoruz? (3 Sade Adım) */}
        <HowWeBake />
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* 4. Drawers & Modals */}
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
