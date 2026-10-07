"use client";

import React, { useState } from "react";
import type { ExtendedProduct } from "@/types";
import { productBadges } from "@/lib/products/badges";
import { useCartStore } from "@/lib/store/useCartStore";
import { Plus, Check } from "lucide-react";
import Link from "next/link";
import { getProductUrl } from "@/lib/utils/slugify";

interface ProductCardProps {
  product: ExtendedProduct;
  onOpenDetails: (product: ExtendedProduct) => void;
}

export function ProductCard({ product, onOpenDetails }: ProductCardProps) {
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = addItem(product, null, 1);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1200);
    }
  };

  const badges = productBadges(product);
  const soldOut = product.isAvailable === false;

  const weightLabel =
    product.weight >= 1000 && product.weightUnit === "ml"
      ? `${product.weight / 1000}L`
      : `${product.weight}${product.weightUnit || "g"}`;

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group cursor-pointer rounded-2xl bg-cream-surface border border-line hover:border-accent/60 hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden shadow-xs"
    >
      {/* Product Image */}
      <div className="relative w-full aspect-square sm:aspect-auto sm:h-56 bg-bg overflow-hidden border-b border-line/60">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
          decoding="async"
        />

        {badges.length > 0 && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 flex flex-col items-start gap-1 pointer-events-none">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`px-2 py-0.5 sm:px-2.5 rounded-full text-xs sm:text-xs font-sans font-bold uppercase tracking-wide shadow-xs ${
                  b.tone === "danger"
                    ? "bg-bad text-white"
                    : b.tone === "gold"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-accent text-white"
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 text-xs sm:text-xs font-mono font-medium text-ink-muted px-2 py-0.5 rounded-md bg-cream-surface/90 backdrop-blur-sm border border-line shadow-xs">
          {weightLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-ink text-base sm:text-lg leading-snug group-hover:text-accent transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-0">
            <Link
              href={getProductUrl(product)}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {product.name}
            </Link>
          </h3>

          <p className="hidden sm:block text-xs text-ink-muted line-clamp-2 mt-1.5 font-sans leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price + Add to cart */}
        <div className="pt-2 sm:pt-3 border-t border-line/60 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-ink-muted line-through font-mono">
                {product.compareAtPrice.toLocaleString("tr-TR")} ₺
              </span>
            )}
            <span className="font-serif text-lg sm:text-2xl font-bold text-ink">
              {product.price.toLocaleString("tr-TR")} ₺
            </span>
          </div>

          <button
            type="button"
            disabled={soldOut}
            onClick={handleAddToCart}
            aria-label={`${product.name} sepete ekle`}
            className={`touch-target-44 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              soldOut
                ? "bg-line text-ink-muted cursor-not-allowed"
                : isAdded
                ? "bg-good text-white"
                : "bg-accent text-white hover:bg-accent/90 active:scale-95"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eklendi</span>
              </>
            ) : soldOut ? (
              <span>Tükendi</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ekle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
