"use client";

import React, { useState, useEffect } from "react";
import { useProducts, ExtendedProduct } from "@/hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { ProductModal } from "./ProductModal";
import { Sparkles, Truck } from "lucide-react";
interface ProductCatalogProps {
  initialProducts?: ExtendedProduct[];
}

export function ProductCatalog({ initialProducts }: ProductCatalogProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [modalProduct, setModalProduct] = useState<ExtendedProduct | null>(null);
  const { products } = useProducts(selectedCategory, initialProducts);

  const categories = [
    { id: "all", label: "Tüm Ürünler" },
    { id: "bread", label: "🍞 Taş Fırın Ekmekleri" },
    { id: "specialty", label: "🌾 Özel & Ön Sipariş" },
    { id: "gurme", label: "🧈 Gurme Lezzetler" },
  ];

  // URL hash navigation listener (#gurme-lezzetler, #sarkuteri, #ekmekler)
  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash.toLowerCase();
      if (
        hash === "#gurme-lezzetler" ||
        hash === "#gurme" ||
        hash === "#sarkuteri"
      ) {
        setSelectedCategory("gurme");
        const el = document.getElementById("gurme-lezzetler");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (hash === "#ekmekler") {
        const el = document.getElementById("ekmekler");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }

    // Run on initial load if hash is present
    if (window.location.hash) {
      handleHash();
    }

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <section id="ekmekler" className="py-14 sm:py-20 bg-linen text-espresso border-b border-linen-border scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Anchor targets for direct navigation */}
        <div id="gurme-lezzetler" className="scroll-mt-28" />
        <div id="sarkuteri" className="scroll-mt-28" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-artisan-terracotta uppercase tracking-wider">
              <span>✦</span>
              <span>GÜNLÜK TAZE FIRIN & GURME SEÇKİSİ</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-espresso tracking-tight">
              Taze Ekmeklerimiz & Gurme Lezzetler
            </h2>
            <p className="text-xs sm:text-sm text-espresso-wheat font-sans max-w-lg leading-relaxed">
              Taş fırında taze pişen günlük ekmeklerimiz, ata tohumu ön sipariş çeşitlerimiz ve fırınımıza eşlik eden doğal mandıra & kiler lezzetleri.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-sans transition-all ${
                  selectedCategory === cat.id
                    ? "bg-artisan-terracotta text-white font-semibold shadow-xs"
                    : "bg-linen-surface text-espresso-wheat hover:text-espresso border border-linen-border hover:border-artisan-terracotta/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetails={(p) => setModalProduct(p)}
            />
          ))}
        </div>

        {/* Delivery & Assurance Banner */}
        <div className="mt-12 p-4 sm:p-5 rounded-2xl bg-linen-surface border border-linen-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-espresso-wheat shadow-xs">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-artisan-terracotta shrink-0" />
            <span>
              <strong className="text-espresso font-serif font-bold">Kendi Fırın Kuryemizle Teslimat:</strong>{" "}
              Beylikdüzü içi aynı gün veya seçtiğiniz tarihte kapınıza ulaştırıyoruz.
            </span>
          </div>
          <div className="text-artisan-terracotta font-semibold font-sans shrink-0 px-3 py-1 rounded-lg bg-artisan-terracotta-soft border border-artisan-terracotta/20 text-xs">
            1000 TL Üzeri Kurye ÜCRETSİZ · Altında 150 TL
          </div>
        </div>

        {/* Product Detail Masterclass Modal */}
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
        />
      </div>
    </section>
  );
}
