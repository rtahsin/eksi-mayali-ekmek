import React from "react";
import type { Metadata } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/common/Navbar";
import { AtelierThresholdHero } from "@/components/atelier/AtelierThresholdHero";
import { ProductCatalog } from "@/components/storefront/ProductCatalog";
import { HowWeBake } from "@/components/storefront/HowWeBake";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";
import { Footer } from "@/components/common/Footer";
import { INITIAL_PRODUCTS, ExtendedProduct } from "@/hooks/useProducts";
import { normalizeCategory } from "@/lib/utils/productCategory";

export const revalidate = 60; // ISR: Revalidate catalog every 60 seconds

export const metadata: Metadata = {
  title: "EkmekLab | Taş Fırın Ekşi Mayalı Ekmek & Gurme Lezzetler",
  description:
    "Beylikdüzü'nde 36 saatlik soğuk fermantasyonla pişen taş fırın ekşi mayalı ekmekler ve doğal mandıra seçkisi. Günlük taze üretim.",
  openGraph: {
    title: "EkmekLab | Taş Fırın Ekşi Mayalı Ekmek & Gurme Lezzetler",
    description:
      "Beylikdüzü'nde 36 saatlik soğuk fermantasyonla pişen taş fırın ekşi mayalı ekmekler ve doğal mandıra seçkisi.",
    type: "website",
    locale: "tr_TR",
  },
};

function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !url.startsWith("https://")) return null;
  return createSupabaseClient(url, anonKey);
}

export default async function HomePage() {
  let products: ExtendedProduct[] = INITIAL_PRODUCTS;

  try {
    const supabase = getPublicSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("is_popular", { ascending: false });

      if (data && !error && data.length > 0) {
        products = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: Number(p.price),
          imageUrl:
            p.image_url ||
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
          category: normalizeCategory(p.category),
          stock: Number(p.stock) || 25,
          weight: Number(p.weight) || 800,
          weightUnit: p.weight_unit || "g",
          madeToOrder: Boolean(p.made_to_order),
          isPopular: Boolean(p.is_popular),
          isNew: Boolean(p.is_new),
          isAvailable: p.is_available !== false,
          isActive: true,
          ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
          flourTypes: Array.isArray(p.flour_types) ? p.flour_types : [],
          hydration: p.hydration ? Number(p.hydration) : undefined,
          atelierPlacement: p.atelier_placement || undefined,
          masterclass: p.masterclass || undefined,
        }));
      }
    }
  } catch (err) {
    console.warn("HomePage server product fetch notice, using static catalog:", err);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-artisan-amber/20 selection:text-artisan-gold font-sans">
      {/* 1. Header with Logo & Cart */}
      <Navbar />

      {/* 2. Main Storefront Flow */}
      <main className="flex-1 space-y-0">
        {/* Atölyenin Eşiği (Hero with atelier_threshold.png) */}
        <AtelierThresholdHero />

        {/* Ekmekler, Özel Ön Sipariş & Şarküteri Kataloğu (Pre-rendered RSC + client hydrated) */}
        <ProductCatalog initialProducts={products} />

        {/* Nasıl Üretiyoruz? (3 Sade Adım) */}
        <HowWeBake />
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* 4. Drawers & Modals (Client Islands) */}
      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
