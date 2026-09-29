"use client";

import React, { useState } from "react";
import { ExtendedProduct } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import {
  X,
  ShoppingBag,
  Check,
  Plus,
  Minus,
  Wheat,
  ShieldCheck,
  Utensils,
  Flame,
  BookOpen,
  Clock,
  Droplets,
} from "lucide-react";

interface ProductModalProps {
  product: ExtendedProduct | null;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"story" | "health" | "pairing">("story");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-espresso/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-linen border border-linen-border overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="touch-target-44 absolute top-3.5 right-3.5 z-30 p-2 rounded-full bg-linen-surface/90 text-espresso-wheat hover:text-espresso border border-linen-border shadow-2xs transition-colors"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Product Visual */}
        <div className="w-full md:w-5/12 relative min-h-[220px] md:min-h-[460px] bg-linen-subtle overflow-hidden shrink-0 flex flex-col justify-between">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-linen/90 via-transparent to-transparent md:hidden" />

          {/* Top Badge */}
          <div className="relative z-10 p-4 flex flex-wrap gap-2">
            {product.madeToOrder ? (
              <span className="px-3 py-1 rounded-full bg-artisan-terracotta text-white text-[11px] font-sans font-semibold tracking-wide shadow-xs">
                Ön Sipariş
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-linen-surface/95 text-espresso border border-linen-border text-[11px] font-sans font-medium shadow-2xs">
                Günlük Taze Fırın
              </span>
            )}
          </div>

          {/* Bottom Specs Strip (Hydration & Weight) */}
          <div className="relative z-10 p-4 space-y-1.5 hidden md:block">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-linen-surface/95 backdrop-blur-sm border border-linen-border text-xs font-sans text-espresso shadow-xs">
              <span className="font-serif font-bold text-sm text-espresso">
                {product.weight >= 1000 && product.weightUnit === "ml"
                  ? `${product.weight / 1000}L`
                  : `${product.weight}${product.weightUnit || "g"}`}
              </span>
              {product.hydration && (
                <>
                  <span className="text-linen-border">|</span>
                  <span className="flex items-center gap-1 text-[11px] text-espresso-wheat">
                    <Droplets className="w-3 h-3 text-artisan-terracotta" />
                    %{product.hydration} Hidrasyon
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Masterclass Story & Deep Details */}
        <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between overflow-y-auto space-y-5 bg-linen">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-sans text-artisan-terracotta font-semibold uppercase tracking-wider">
                {product.category === "pantry" ? "Şarküteri & Kiler" : "Fırın Zanaatı & Reçete"}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-espresso mt-1 leading-snug">
                {product.name}
              </h2>
              <div className="font-serif text-2xl font-bold text-espresso mt-1 flex items-baseline gap-1">
                <span>{product.price}</span>
                <span className="text-xs font-sans font-normal text-espresso-muted">TL</span>
              </div>
            </div>

            {/* Quick Specs Chips */}
            <div className="flex flex-wrap gap-2 text-xs font-sans">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-linen-surface border border-linen-border text-espresso-wheat">
                <Clock className="w-3 h-3 text-artisan-terracotta" />
                36s Soğuk Fermantasyon
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-linen-surface border border-linen-border text-espresso-wheat">
                <Wheat className="w-3 h-3 text-artisan-terracotta" />
                Ata Tohumu Unlar
              </span>
              {product.hydration && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-linen-surface border border-linen-border text-espresso-wheat md:hidden">
                  <Droplets className="w-3 h-3 text-artisan-terracotta" />
                  %{product.hydration} Su Oranı
                </span>
              )}
            </div>

            {/* Sub-tabs for deep storytelling */}
            <div className="flex border-b border-linen-border gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("story")}
                className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
                  activeTab === "story"
                    ? "text-espresso border-b-2 border-artisan-terracotta"
                    : "text-espresso-wheat hover:text-espresso"
                }`}
              >
                🌾 Zanaat & Un
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("health")}
                className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
                  activeTab === "health"
                    ? "text-espresso border-b-2 border-artisan-terracotta"
                    : "text-espresso-wheat hover:text-espresso"
                }`}
              >
                🌱 Sindirim & Sağlık
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pairing")}
                className={`pb-2 text-xs font-sans font-semibold transition-colors relative ${
                  activeTab === "pairing"
                    ? "text-espresso border-b-2 border-artisan-terracotta"
                    : "text-espresso-wheat hover:text-espresso"
                }`}
              >
                🧀 Tüketim & Saklama
              </button>
            </div>

            {/* Tab 1: Un & Zanaat */}
            {activeTab === "story" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-espresso-wheat font-sans leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-linen-surface border border-linen-border space-y-1.5 shadow-2xs">
                  <div className="font-bold text-espresso flex items-center gap-1.5 font-serif text-xs">
                    <Wheat className="w-3.5 h-3.5 text-artisan-terracotta" />
                    <span>Unun ve Mayanın Kökeni:</span>
                  </div>
                  <p className="text-xs text-espresso-wheat">
                    {masterclass?.flourHeritage || product.description}
                  </p>
                </div>

                {masterclass?.technique && (
                  <div className="p-3.5 rounded-2xl bg-linen-surface border border-linen-border space-y-1.5 shadow-2xs">
                    <div className="font-bold text-espresso flex items-center gap-1.5 font-serif text-xs">
                      <Flame className="w-3.5 h-3.5 text-artisan-terracotta" />
                      <span>Fermantasyon ve Pişirme Tekniği:</span>
                    </div>
                    <p className="text-xs text-espresso-wheat">
                      {masterclass.technique}
                    </p>
                  </div>
                )}

                {product.flourTypes && product.flourTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] font-sans text-espresso-muted self-center mr-1">Un Seçkisi:</span>
                    {product.flourTypes.map((flour, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-linen-subtle border border-linen-border text-[11px] font-sans text-espresso">
                        {flour}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Sağlık & Sindirim */}
            {activeTab === "health" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-espresso-wheat font-sans leading-relaxed">
                <div className="p-4 rounded-2xl bg-linen-surface border border-linen-border space-y-2 shadow-2xs">
                  <div className="font-bold text-emerald-700 flex items-center gap-1.5 font-serif text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Neden Midede Şişkinlik Yapmaz?</span>
                  </div>
                  <p className="text-xs text-espresso-wheat leading-relaxed">
                    {masterclass?.healthBenefit ||
                      "36 saatlik soğuk fermantasyon sayesinde gluten ve fitik asit doğal olarak parçalanır, hazmı çok kolaydır."}
                  </p>
                </div>

                <div className="text-[11px] text-emerald-700 font-sans font-medium">
                  ✓ Hiçbir ticari maya, koruyucu, kabartıcı veya renklendirici içermez.
                </div>

                {/* Cross-Link to Science Library */}
                <a
                  href={`/kutuphane#${product.category === "bread" ? "gluten-proteoliz" : "fitik-asit-mineraller"}`}
                  className="p-3.5 rounded-2xl bg-linen-surface border border-linen-border hover:border-artisan-terracotta/40 flex items-center justify-between transition-all group mt-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linen-subtle border border-linen-border text-artisan-terracotta">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-xs font-bold text-espresso group-hover:text-artisan-terracotta transition-colors">
                        Bilim & Zanaat Kütüphanesi'nde İnceleyin
                      </div>
                      <div className="text-[10px] text-espresso-wheat font-sans">
                        Gluten proteolizi ve enzim aktivitesinin akademik temelleri
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-artisan-terracotta group-hover:translate-x-1 transition-transform font-bold">
                    →
                  </span>
                </a>
              </div>
            )}

            {/* Tab 3: Tüketim & Saklama */}
            {activeTab === "pairing" && (
              <div className="space-y-3 animate-fadeIn text-xs sm:text-sm text-espresso-wheat font-sans leading-relaxed">
                <div className="p-4 rounded-2xl bg-linen-surface border border-linen-border space-y-2 shadow-2xs">
                  <div className="font-bold text-espresso flex items-center gap-1.5 font-serif text-xs">
                    <Utensils className="w-4 h-4 text-artisan-terracotta" />
                    <span>Nasıl Tüketilmeli & Saklanmalı?</span>
                  </div>
                  <p className="text-xs text-espresso-wheat leading-relaxed">
                    {masterclass?.pairingStorage ||
                      "Oda sıcaklığında pamuklu bez torbada 5 gün boyunca tazeliğini korur. Dilimleyip dondurucuda 2 ay saklayabilirsiniz."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Add to Cart CTA */}
          <div className="pt-3 border-t border-linen-border flex items-center gap-3">
            <div className="flex items-center rounded-xl bg-linen-surface border border-linen-border overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="touch-target-44 w-9 h-11 flex items-center justify-center text-espresso-wheat hover:text-espresso hover:bg-linen-subtle transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-9 text-center font-serif text-sm font-bold text-espresso">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="touch-target-44 w-9 h-11 flex items-center justify-center text-espresso-wheat hover:text-espresso hover:bg-linen-subtle transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className={`touch-target-44 flex-1 h-11 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] ${
                isAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-artisan-terracotta hover:bg-artisan-terracotta-dark text-white"
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
                  <span>Sepete Ekle · {product.price * quantity} TL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
