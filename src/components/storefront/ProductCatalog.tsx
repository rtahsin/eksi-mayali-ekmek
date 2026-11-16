"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import type { ExtendedProduct, ProductCategoryInfo } from "@/types";
import { ProductCard } from "./ProductCard";
import { ProductModal } from "./ProductModal";
import type { ShowcaseMode } from "./ProductShowcaseStage";
import { QuickReorderCard } from "./QuickReorderCard";
import { Truck } from "lucide-react";
import { ShippingPolicyNote } from "./ShippingPolicyNote";
import { groupCatalog, sortProductsWithinGroup } from "@/lib/products/grouping";

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

function DesktopAtelierGroup({
  items,
  onOpenDetails,
  prioritizeFirst = false,
  allowFeaturedHero = true,
}: {
  items: ExtendedProduct[];
  onOpenDetails: (product: ExtendedProduct, initialMode?: ShowcaseMode) => void;
  prioritizeFirst?: boolean;
  allowFeaturedHero?: boolean;
}) {
  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <div className="pt-2">
        <ProductCard
          product={items[0]}
          featured
          priority={prioritizeFirst}
          onOpenDetails={onOpenDetails}
        />
      </div>
    );
  }

  if (items.length === 2) {
    return (
      <div className="grid md:grid-cols-2 gap-7 pt-2">
        {items.map((product, idx) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={prioritizeFirst && idx === 0}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    );
  }

  if (allowFeaturedHero) {
    const [lead, ...rest] = items;
    const gridColsClass = rest.length === 2 ? "md:grid-cols-2 gap-7" : "md:grid-cols-3 gap-6";

    return (
      <div className="space-y-8 pt-2">
        <ProductCard
          product={lead}
          featured
          priority={prioritizeFirst}
          onOpenDetails={onOpenDetails}
        />
        <div className={`grid ${gridColsClass}`}>
          {rest.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 pt-2">
      {items.map((product, idx) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={prioritizeFirst && idx === 0}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </div>
  );
}

export function ProductCatalog({ initialProducts, categories = [] }: ProductCatalogProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [modalSelection, setModalSelection] = useState<{
    product: ExtendedProduct;
    initialMode?: ShowcaseMode;
  } | null>(null);

  const { products, allProducts } = useProducts(selectedCategory, initialProducts);

  const grouped = useMemo(() => groupCatalog(allProducts), [allProducts]);

  // Yalnız içinde ürün olan kategoriler sekme olur
  const usedCategories = useMemo(
    () => new Set(allProducts.map((p) => p.category)),
    [allProducts],
  );
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
        if (usedCategories.has("gurme")) {
          setSelectedCategory("gurme");
          const el = document.getElementById("gurme-lezzetler");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        } else {
          setSelectedCategory("all");
          const shelf =
            document.getElementById("eslikci-rafi-masaustu")?.offsetParent !== null
              ? document.getElementById("eslikci-rafi-masaustu")
              : document.getElementById("eslikci-rafi-mobil") ??
                document.getElementById("sarkuteri");
          if (shelf) {
            shelf.scrollIntoView({ behavior: "smooth", block: "start" });
          }
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
  }, [usedCategories]);

  const isAll = selectedCategory === "all";
  const filteredSortedProducts = useMemo(
    () => sortProductsWithinGroup(products),
    [products],
  );

  const handleOpenDetails = (product: ExtendedProduct, initialMode?: ShowcaseMode) => {
    setModalSelection({ product, initialMode });
  };

  return (
    <section
      id="ekmekler"
      className="py-10 sm:py-16 bg-bg text-ink border-b border-line scroll-mt-16 sm:scroll-mt-24 overflow-x-clip"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Anchor targets for direct navigation */}
        <div id="gurme-lezzetler" className="scroll-mt-28" />
        <div id="sarkuteri" className="scroll-mt-28" />

        {/* Müdavim & Misafir Tek Tıkla Son Siparişi Tekrarla Kartı */}
        <QuickReorderCard products={allProducts} />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-4 md:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-ink-muted uppercase tracking-wider">
              <span className="text-accent" aria-hidden="true">✦</span>
              <span>Günlük taze taş fırın &amp; gurme seçkisi</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight text-balance">
              Taze Ekmeklerimiz &amp; Gurme Lezzetler
            </h2>
            <p className="hidden sm:block text-sm text-ink-muted font-sans max-w-lg leading-relaxed">
              Taş fırında taze pişen günlük ekmeklerimiz, ata tohumu ön sipariş çeşitlerimiz ve fırınımıza eşlik eden doğal mandıra &amp; kiler lezzetleri.
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
        <div className="md:hidden sticky top-14 z-30 -mx-4 px-4 py-2.5 mb-5 bg-bg/95 backdrop-blur border-b border-line">
          <CategoryChips
            tabs={tabs}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            className="flex gap-2 overflow-x-auto no-scrollbar"
          />
        </div>

        {/* ─── MOBILE VIEW (<768px): İki Yatay Raf (Ekmeklerimiz & Eşlikçiler) ─── */}
        <div className="md:hidden space-y-7">
          {isAll ? (
            <>
              {/* Raf 1: Ekmeklerimiz */}
              <div>
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-serif text-lg font-bold text-ink">Ekmeklerimiz</h3>
                    <span className="text-xs text-ink-muted font-sans font-medium">
                      ({grouped.breads.length})
                    </span>
                  </div>
                  <span className="text-xs text-ink-muted font-sans font-medium flex items-center gap-1">
                    Kaydır <span aria-hidden="true" className="text-accent">→</span>
                  </span>
                </div>

                <div className="-mx-4 px-4 pt-7 flex gap-3.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">
                  {grouped.breads.map((product, idx) => (
                    <div
                      key={product.id}
                      className="snap-start shrink-0 w-[78vw] max-w-[280px]"
                    >
                      <ProductCard
                        product={product}
                        priority={idx === 0}
                        onOpenDetails={handleOpenDetails}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Raf 2: Eşlikçiler (Mandıra, gurme, kiler) */}
              {grouped.accompaniments.length > 0 && (
                <div id="eslikci-rafi-mobil" className="scroll-mt-28">
                  <div className="flex items-center justify-between mb-1 px-0.5">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-serif text-lg font-bold text-ink">Eşlikçiler</h3>
                      <span className="text-xs text-ink-muted font-sans font-medium">
                        ({grouped.accompaniments.length})
                      </span>
                    </div>
                    <span className="text-xs text-ink-muted font-sans font-medium flex items-center gap-1">
                      Kaydır <span aria-hidden="true" className="text-accent">→</span>
                    </span>
                  </div>

                  <div className="-mx-4 px-4 pt-7 flex gap-3.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">
                    {grouped.accompaniments.map((product) => (
                      <div
                        key={product.id}
                        className="snap-start shrink-0 w-[78vw] max-w-[280px]"
                      >
                        <ProductCard
                          product={product}
                          onOpenDetails={handleOpenDetails}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Kategori filtresi seçilmişse filtrelenmiş ürünlerin görünümü */
            <div>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-serif text-lg font-bold text-ink">
                    {tabs.find((t) => t.id === selectedCategory)?.label || "Ürünler"}
                  </h3>
                  <span className="text-xs text-ink-muted font-sans font-medium">
                    ({filteredSortedProducts.length})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-6">
                {filteredSortedProducts.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={idx === 0}
                    onOpenDetails={handleOpenDetails}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── DESKTOP VIEW (≥768px): Editoryal Atölye Tezgâhı ─── */}
        <div className="hidden md:block space-y-14">
          {isAll ? (
            <>
              {/* Ekmeklerimiz Atölye Sahnesi */}
              <div>
                <div className="flex items-baseline justify-between mb-6 border-b border-line pb-2.5">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="font-serif text-2xl font-bold text-ink">Ekmeklerimiz</h3>
                    <span className="text-xs text-ink-muted font-sans">
                      Önce günlük taş fırın, ardından özel üretim ekmeklerimiz ({grouped.breads.length} çeşit)
                    </span>
                  </div>
                </div>
                <DesktopAtelierGroup
                  items={grouped.breads}
                  prioritizeFirst
                  allowFeaturedHero
                  onOpenDetails={handleOpenDetails}
                />
              </div>

              {/* Eşlikçiler & Kiler Tezgâhı */}
              {grouped.accompaniments.length > 0 && (
                <div id="eslikci-rafi-masaustu" className="scroll-mt-28">
                  <div className="flex items-baseline justify-between mb-6 border-b border-line pb-2.5">
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="font-serif text-2xl font-bold text-ink">Eşlikçiler &amp; Kiler</h3>
                      <span className="text-xs text-ink-muted font-sans">
                        Fırınımıza eşlik eden doğal mandıra ve gurme lezzetler ({grouped.accompaniments.length} çeşit)
                      </span>
                    </div>
                  </div>
                  <DesktopAtelierGroup
                    items={grouped.accompaniments}
                    allowFeaturedHero={false}
                    onOpenDetails={handleOpenDetails}
                  />
                </div>
              )}
            </>
          ) : (
            <DesktopAtelierGroup
              items={filteredSortedProducts}
              prioritizeFirst
              allowFeaturedHero={filteredSortedProducts.length === 1}
              onOpenDetails={handleOpenDetails}
            />
          )}
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
          <div className="text-ink font-semibold font-sans shrink-0 px-3 py-1.5 rounded-lg bg-bg border border-line text-xs">
            <ShippingPolicyNote />
          </div>
        </div>

        {/* Product Detail Masterclass Modal */}
        <ProductModal
          product={modalSelection?.product ?? null}
          initialMode={modalSelection?.initialMode}
          onClose={() => setModalSelection(null)}
        />
      </div>
    </section>
  );
}
