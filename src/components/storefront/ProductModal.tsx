"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ExtendedProduct } from "@/types";
import { productBadges } from "@/lib/products/badges";
import { isAccompaniment } from "@/lib/products/grouping";
import { getProductPlaceholder } from "@/lib/products/map";
import { getDefaultStorageGuidance } from "@/lib/products/foodCompliance";
import { SafeProductImage } from "@/components/storefront/SafeProductImage";
import { FoodComplianceNotice } from "@/components/storefront/FoodComplianceNotice";
import { useCartStore } from "@/lib/store/useCartStore";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { getSaleScheduleBadge } from "@/lib/ordering/saleDates";
import {
  X,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  Wheat,
  Milk,
  Utensils,
  Flame,
  Droplets,
  CalendarDays,
} from "lucide-react";

interface ProductModalProps {
  product: ExtendedProduct | null;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [mounted, setMounted] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"story" | "pairing">("story");
  const addItem = useCartStore((state) => state.addItem);
  const today = useIstanbulToday();
  const scheduleBadge = product ? getSaleScheduleBadge(product, today) : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuantity(1);
    setIsAdded(false);
    setActiveTab("story");
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [product, onClose]);

  if (!product || !mounted) return null;

  const accompaniment = isAccompaniment(product);
  const masterclass = product.masterclass;
  const storageGuidance =
    masterclass?.pairingStorage?.trim() || getDefaultStorageGuidance(product);
  const badges = productBadges(product);

  const handleAddToCart = () => {
    const success = addItem(product, null, quantity);
    if (success) {
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        onClose();
      }, 1000);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-cream-surface border border-line overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh] text-ink">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="touch-target-44 absolute top-3.5 right-3.5 z-30 w-9 h-9 flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
          title="Kapat"
          aria-label="Kapat"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>

        {/* Left: Product Visual */}
        <div className="w-full md:w-5/12 relative min-h-[220px] md:min-h-[460px] bg-bg overflow-hidden shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-line">
          <SafeProductImage
            src={product.imageUrl}
            fallbackSrc={getProductPlaceholder(product.category)}
            alt={product.name}
            isAccompanimentItem={accompaniment}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:hidden pointer-events-none" />

          {/* Top Badge */}
          <div className="relative z-10 p-4 flex flex-wrap gap-2 pointer-events-none">
            {product.saleWeekdays &&
            product.saleWeekdays.length > 0 &&
            product.saleWeekdays.length < 7 &&
            scheduleBadge ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white border border-accent/80 text-xs font-sans font-bold tracking-wide shadow-md">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>{scheduleBadge}</span>
              </span>
            ) : accompaniment ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-surface text-ink border border-line text-xs font-sans font-bold tracking-wide shadow-md">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-good" />
                <span>
                  {product.madeToOrder
                    ? "Sipariş Üzerine Hazırlanır"
                    : "Günlük Taze Mandıra & Şarküteri"}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-surface text-ink border border-line text-xs font-sans font-bold tracking-wide shadow-md">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-good animate-pulse"
                />
                <span>
                  {product.madeToOrder ? "Ön Siparişle Taze Pişer" : "Bugün fırında"}
                </span>
              </span>
            )}
          </div>

          {/* Bottom Specs Strip (Weight & Bread Hydration) */}
          {product.weight > 0 && (
            <div className="relative z-10 p-4 space-y-1.5 hidden md:block">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cream-surface text-ink border border-line text-xs font-sans shadow-md">
                <span className="font-serif font-bold text-sm text-ink">
                  {product.weight >= 1000 && product.weightUnit === "ml"
                    ? `${product.weight / 1000}L`
                    : `${product.weight}${product.weightUnit || "g"}`}
                </span>
                {!accompaniment && product.hydration ? (
                  <>
                    <span className="text-line">|</span>
                    <span className="flex items-center gap-1 text-xs text-ink-muted font-medium">
                      <Droplets aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                      %{product.hydration} Hidrasyon
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Right: Story, Food Compliance & Add to Cart */}
        <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between overflow-y-auto space-y-5 bg-cream-surface">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-accent font-semibold uppercase tracking-wider">
                {accompaniment
                  ? "Üretim & Kaynak Notları"
                  : "Fırın Zanaatı & Reçete"}
              </div>
              <h2
                id="product-modal-title"
                className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1 leading-snug"
              >
                {product.name}
              </h2>
              <div className="font-serif text-2xl font-bold text-ink mt-1 flex items-baseline gap-1">
                <span>{product.price}</span>
                <span className="text-xs font-sans font-normal text-ink-muted">TL</span>
                {product.compareAtPrice ? (
                  <span className="text-sm font-sans font-normal text-ink-muted line-through ml-1">
                    {product.compareAtPrice} TL
                  </span>
                ) : null}
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {badges.map((b) => (
                    <span
                      key={b.label}
                      className="px-2 py-0.5 rounded-full bg-accent/15 text-ink border border-accent/30 text-xs font-bold uppercase"
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sale Schedule Info */}
            {scheduleBadge && (
              <div className="p-3.5 rounded-2xl bg-bg border border-line flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <CalendarDays aria-hidden="true" className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs font-semibold text-ink font-sans">
                    {scheduleBadge}
                  </span>
                </div>
                <span className="text-xs text-ink-muted font-sans font-medium">
                  {accompaniment
                    ? "Taze Tedarik Günü"
                    : product.saleWeekdays && product.saleWeekdays.length > 0
                    ? "Özel Fırın Günü"
                    : "Taş Fırın"}
                </span>
              </div>
            )}

            {/* Quick Specs Chips (Breads only) */}
            {!accompaniment && product.hydration ? (
              <div className="flex flex-wrap gap-2 text-xs font-sans">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-line text-ink-muted">
                  <Droplets aria-hidden="true" className="w-3 h-3 text-accent" />
                  %{product.hydration} Hidrasyon
                </span>
              </div>
            ) : null}

            {/* Sub-tabs */}
            <div className="flex border-b border-line gap-4 pt-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "story"}
                onClick={() => setActiveTab("story")}
                className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
                  activeTab === "story"
                    ? "text-ink border-b-2 border-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {accompaniment ? "Üretici & Kaynak" : "Zanaat & Un"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "pairing"}
                onClick={() => setActiveTab("pairing")}
                className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
                  activeTab === "pairing"
                    ? "text-ink border-b-2 border-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Tüketim & Saklama
              </button>
            </div>

            {/* Tab 1 */}
            {activeTab === "story" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-bg border border-line space-y-1.5 shadow-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                    {accompaniment ? (
                      <>
                        <Milk aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                        <span>Üretici & Kaynak:</span>
                      </>
                    ) : (
                      <>
                        <Wheat aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                        <span>Unun ve Mayanın Kökeni:</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">
                    {masterclass?.flourHeritage || product.description}
                  </p>
                </div>

                {masterclass?.technique && (
                  <div className="p-3.5 rounded-2xl bg-bg border border-line space-y-1.5 shadow-xs">
                    <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                      <Flame aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                      <span>
                        {accompaniment
                          ? "Üretim & Kaynak Notları:"
                          : "Fermantasyon ve Pişirme Tekniği:"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">{masterclass.technique}</p>
                  </div>
                )}

                {!accompaniment && product.flourTypes && product.flourTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs font-sans text-ink-muted self-center mr-1">
                      Un Seçkisi:
                    </span>
                    {product.flourTypes.map((flour, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-bg border border-line text-xs font-sans font-medium text-ink"
                      >
                        {flour}
                      </span>
                    ))}
                  </div>
                )}

                {accompaniment && product.ingredients && product.ingredients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs font-sans text-ink-muted self-center mr-1">
                      İçindekiler:
                    </span>
                    {product.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-bg border border-line text-xs font-sans font-medium text-ink"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Tüketim & Saklama */}
            {activeTab === "pairing" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                <div className="p-4 rounded-2xl bg-bg border border-line space-y-2 shadow-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                    <Utensils aria-hidden="true" className="w-4 h-4 text-accent" />
                    <span>Nasıl Tüketilmeli & Saklanmalı?</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {storageGuidance}
                  </p>
                </div>
              </div>
            )}

            {/* Mandatory TGK Raw Milk Shield & Allergen Notice (always visible before CTA) */}
            <FoodComplianceNotice product={product} variant="full" />
          </div>

          {/* Bottom Add to Cart CTA */}
          <div className="pt-3 border-t border-line flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-bg border border-line overflow-hidden shadow-xs">
              <button
                type="button"
                aria-label="Miktarı azalt"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="touch-target-44 w-9 h-11 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-surface transition-colors"
              >
                <Minus aria-hidden="true" className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-serif text-sm font-bold text-ink">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Miktarı artır"
                onClick={() => setQuantity((q) => q + 1)}
                className="touch-target-44 w-9 h-11 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-surface transition-colors"
              >
                <Plus aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.isAvailable === false}
              className={`touch-target-44 disabled:opacity-40 disabled:cursor-not-allowed flex-1 h-11 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] ${
                isAdded
                  ? "bg-good text-white"
                  : "bg-accent hover:bg-accent/90 text-white"
              }`}
            >
              {isAdded ? (
                <>
                  <Check aria-hidden="true" className="w-4 h-4 stroke-[2.5]" />
                  <span>Sepete Eklendi</span>
                </>
              ) : (
                <>
                  <ShoppingBag aria-hidden="true" className="w-4 h-4" />
                  <span>
                    {product.isAvailable === false
                      ? "Tükendi"
                      : `Sepete Ekle · ${product.price * quantity} TL`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
