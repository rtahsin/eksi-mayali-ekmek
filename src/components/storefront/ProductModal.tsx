"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ExtendedProduct } from "@/types";
import { productBadges } from "@/lib/products/badges";
import { useCartStore } from "@/lib/store/useCartStore";

function getFlourConceptSlug(flour: string): string | null {
  const f = flour.toLowerCase();
  if (f.includes("karakılçık") || f.includes("karakilcik")) return "karakilcik";
  if (f.includes("siyez")) return "siyez";
  if (f.includes("çavdar") || f.includes("cavdar")) return "cavdar_unu";
  if (f.includes("dinkel") || f.includes("kavulca")) return "dinkel_kavulca";
  if (f.includes("tam buğday") || f.includes("tam bugday")) return "tam_bugday";
  return null;
}
import {
  X,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  Wheat,
  Utensils,
  Flame,
  Droplets,
} from "lucide-react";

interface ProductModalProps {
  product: ExtendedProduct | null;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"story" | "pairing">("story");
  const addItem = useCartStore((state) => state.addItem);

  if (!product) return null;

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

  const masterclass = product.masterclass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-cream-surface border border-line overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh] text-ink">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="touch-target-44 absolute top-3.5 right-3.5 z-30 p-2 rounded-xl bg-bg hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Product Visual */}
        <div className="w-full md:w-5/12 relative min-h-[220px] md:min-h-[460px] bg-bg overflow-hidden shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-line">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:hidden" />

          {/* Top Badge */}
          <div className="relative z-10 p-4 flex flex-wrap gap-2">
            {product.madeToOrder ? (
              <span className="px-3 py-1 rounded-full bg-accent text-white text-[11px] font-sans font-semibold tracking-wide shadow-xs">
                Ön Sipariş
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-cream-surface/95 text-ink border border-line text-[11px] font-sans font-medium shadow-xs">
                Günlük Taze Fırın
              </span>
            )}
          </div>

          {/* Bottom Specs Strip (Hydration & Weight) */}
          <div className="relative z-10 p-4 space-y-1.5 hidden md:block">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cream-surface/95 backdrop-blur-sm border border-line text-xs font-sans text-ink shadow-xs">
              <span className="font-serif font-bold text-sm text-ink">
                {product.weight >= 1000 && product.weightUnit === "ml"
                  ? `${product.weight / 1000}L`
                  : `${product.weight}${product.weightUnit || "g"}`}
              </span>
              {product.hydration && (
                <>
                  <span className="text-line">|</span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                    <Droplets className="w-3 h-3 text-accent" />
                    %{product.hydration} Hidrasyon
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Masterclass Story & Deep Details */}
        <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between overflow-y-auto space-y-5 bg-cream-surface">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-mono text-accent font-semibold uppercase tracking-wider">
                {product.category === "pantry" ? "Şarküteri & Kiler" : "Fırın Zanaatı & Reçete"}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1 leading-snug">
                {product.name}
              </h2>
              <div className="font-serif text-2xl font-bold text-ink mt-1 flex items-baseline gap-1">
                <span>{product.price}</span>
                <span className="text-xs font-sans font-normal text-ink-muted">TL</span>
                {product.compareAtPrice ? (
                  <span className="text-sm font-sans font-normal text-ink-muted line-through ml-1">{product.compareAtPrice} TL</span>
                ) : null}
              </div>
              {productBadges(product).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {productBadges(product).map((b) => (
                    <span key={b.label} className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase">
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Specs Chips */}
            {product.hydration && (
              <div className="flex flex-wrap gap-2 text-xs font-sans">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-line text-ink-muted">
                  <Droplets className="w-3 h-3 text-accent" />
                  %{product.hydration} Hidrasyon
                </span>
              </div>
            )}

            {/* Sub-tabs for deep storytelling */}
            <div className="flex border-b border-line gap-4 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("story")}
                className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
                  activeTab === "story"
                    ? "text-ink border-b-2 border-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Zanaat & Un
              </button>
              <button
                type="button"
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

            {/* Tab 1: Un & Zanaat */}
            {activeTab === "story" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-bg border border-line space-y-1.5 shadow-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                    <Wheat className="w-3.5 h-3.5 text-accent" />
                    <span>Unun ve Mayanın Kökeni:</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {masterclass?.flourHeritage || product.description}
                  </p>
                </div>

                {masterclass?.technique && (
                  <div className="p-3.5 rounded-2xl bg-bg border border-line space-y-1.5 shadow-xs">
                    <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                      <Flame className="w-3.5 h-3.5 text-accent" />
                      <span>Fermantasyon ve Pişirme Tekniği:</span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      {masterclass.technique}
                    </p>
                  </div>
                )}

                {product.flourTypes && product.flourTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] font-sans text-ink-muted self-center mr-1">Un Seçkisi:</span>
                    {product.flourTypes.map((flour, idx) => {
                      const conceptSlug = getFlourConceptSlug(flour);
                      if (conceptSlug) {
                        return (
                          <Link
                            key={idx}
                            href={`/kavram/${conceptSlug}`}
                            className="px-2 py-0.5 rounded-md bg-bg hover:bg-cream-surface border border-line hover:border-accent/40 text-[11px] font-sans text-ink hover:text-accent transition-colors inline-flex items-center gap-1"
                          >
                            <span>{flour}</span>
                            <span className="text-[9px] text-accent">↗</span>
                          </Link>
                        );
                      }
                      return (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-bg border border-line text-[11px] font-sans text-ink">
                          {flour}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Tüketim & Saklama */}
            {activeTab === "pairing" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-ink-muted font-sans leading-relaxed">
                <div className="p-4 rounded-2xl bg-bg border border-line space-y-2 shadow-xs">
                  <div className="font-bold text-ink flex items-center gap-1.5 font-serif text-xs">
                    <Utensils className="w-4 h-4 text-accent" />
                    <span>Nasıl Tüketilmeli & Saklanmalı?</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {masterclass?.pairingStorage ||
                      "Oda sıcaklığında pamuklu bez torbada 5 gün boyunca tazeliğini korur. Dilimleyip dondurucuda 2 ay saklayabilirsiniz."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Add to Cart CTA */}
          <div className="pt-3 border-t border-line flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-bg border border-line overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="touch-target-44 w-9 h-11 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-surface transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-serif text-sm font-bold text-ink">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="touch-target-44 w-9 h-11 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-cream-surface transition-colors"
              >
                <Plus className="w-4 h-4" />
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
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Sepete Eklendi</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{product.isAvailable === false ? "Tükendi" : `Sepete Ekle · ${product.price * quantity} TL`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
