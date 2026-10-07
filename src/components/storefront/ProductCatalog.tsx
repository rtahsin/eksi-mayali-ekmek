"use client";

import React, { useState, useEffect } from "react";
import { useProducts } from "@/hooks/useProducts";
import type { ExtendedProduct, ProductCategoryInfo } from "@/types";
import { ProductCard } from "./ProductCard";
import { ProductModal } from "./ProductModal";
import { Truck } from "lucide-react";
import { ShippingPolicyNote } from "./ShippingPolicyNote";

interface ProductCatalogProps {
  initialProducts?: ExtendedProduct[];
  /** Admin'den yönetilen kategoriler (görünür olanlar) */
  categories?: ProductCategoryInfo[];
}

function CategoryChips({
  tabs,
  selected,
  onSelect,
  className = "",
}: {
  tabs: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {tabs.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-sans transition-all ${
            selected === cat.id
              ? "bg-accent text-white font-semibold shadow-xs"
              : "bg-cream-surface text-ink-muted hover:text-ink border border-line hover:border-accent/40"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

export function ProductCatalog({ initialProducts, categories = [] }: ProductCatalogProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [modalProduct, setModalProduct] = useState<ExtendedProduct | null>(null);
  const { products, allProducts } = useProducts(selectedCategory, initialProducts);

  // Yalnız içinde ürün olan kategoriler sekme olur
  const usedCategories = new Set(allProducts.map((p) => p.category));
  const tabs = [
    { id: "all", label: "Tüm Ürünler" },
    ...categories.filter((c) => usedCategories.has(c.id)).map((c) => ({ id: c.id, label: c.name })),
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

    if (window.location.hash) {
      handleHash();
    }

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <section
      id="ekmekler"
      className="py-10 sm:py-16 bg-bg text-ink border-b border-line scroll-mt-16 sm:scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Anchor targets for direct navigation */}
        <div id="gurme-lezzetler" className="scroll-mt-28" />
        <div id="sarkuteri" className="scroll-mt-28" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-4 md:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-sans text-xs sm:text-xs font-semibold text-accent uppercase tracking-wider">
              <span>✦</span>
              <span>Günlük taze taş fırın & gurme seçkisi</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight text-balance">
              Taze Ekmeklerimiz & Gurme Lezzetler
            </h2>
            <p className="hidden sm:block text-sm text-ink-muted font-sans max-w-lg leading-relaxed">
              Taş fırında taze pişen günlük ekmeklerimiz, ata tohumu ön sipariş çeşitlerimiz ve fırınımıza eşlik eden doğal mandıra & kiler lezzetleri.
            </p>
          </div>

          {/* Desktop: chips sit to the right of the heading */}
          <CategoryChips
            tabs={tabs}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            className="hidden md:flex flex-wrap gap-2"
          />
        </div>

        {/* Mobile: one-row, horizontally scrollable, sticky under the header */}
        <div className="md:hidden sticky top-14 z-30 -mx-4 px-4 py-2.5 mb-4 bg-bg/95 backdrop-blur border-b border-line">
          <CategoryChips
            tabs={tabs}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            className="flex gap-2 overflow-x-auto no-scrollbar"
          />
        </div>

        {/* Products Grid: 2 columns on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetails={(p) => setModalProduct(p)}
            />
          ))}
        </div>

        {/* Delivery & Assurance Banner */}
        <div className="mt-8 sm:mt-12 p-4 sm:p-5 rounded-2xl bg-cream-surface border border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-ink-muted shadow-xs">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-accent shrink-0" />
            <span>
              <strong className="text-ink font-serif font-bold">Kendi Fırın Kuryemizle Teslimat:</strong>{" "}
              Beylikdüzü içinde seçtiğiniz gün kapınıza ulaştırıyoruz.
            </span>
          </div>
          <div className="text-accent font-semibold font-sans shrink-0 px-3 py-1.5 rounded-lg bg-bg border border-line text-xs">
            <ShippingPolicyNote />
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
