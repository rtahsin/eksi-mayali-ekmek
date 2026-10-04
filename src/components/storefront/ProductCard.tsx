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
      className="group cursor-pointer rounded-xl sm:rounded-2xl bg-[#18130F] border border-[#261E17] hover:border-artisan-gold/40 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden shadow-sm"
    >
      {/* Product Image: square on mobile, fixed height from sm up */}
      <div className="relative w-full aspect-square sm:aspect-auto sm:h-52 bg-[#130F0C] overflow-hidden">
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
                className={`px-2 py-0.5 sm:px-2.5 rounded-full text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-wide shadow-sm ${
                  b.tone === "danger"
                    ? "bg-stone-800 text-stone-200"
                    : b.tone === "gold"
                    ? "bg-artisan-gold text-stone-950"
                    : "bg-artisan-terracotta text-white"
                }`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 text-[10px] sm:text-[11px] font-sans font-medium text-stone-300 px-1.5 sm:px-2 py-0.5 rounded-md bg-[#120E0B]/90 backdrop-blur-sm border border-[#261E17] shadow-sm">
          {weightLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between gap-2 sm:gap-3">
        <div>
          <h3 className="font-serif font-bold text-foreground text-sm sm:text-lg leading-snug group-hover:text-artisan-gold transition-colors line-clamp-2 sm:line-clamp-1 min-h-[2.5rem] sm:min-h-0">
            <Link
              href={getProductUrl(product)}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {product.name}
            </Link>
          </h3>

          {/* Description is desktop-only: keeps mobile cards short */}
          <p className="hidden sm:block text-xs text-stone-400 line-clamp-2 mt-1 font-sans leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price + Add */}
        <div className="sm:pt-2.5 sm:border-t border-[#261E17] flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-serif text-lg sm:text-2xl font-bold text-foreground">
              {product.price}
            </span>
            <span className="text-[10px] sm:text-xs text-stone-400 font-sans font-medium">TL</span>
            {product.compareAtPrice ? (
              <span className="text-[11px] sm:text-xs text-stone-500 line-through font-sans">{product.compareAtPrice} TL</span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={soldOut}
            aria-label={soldOut ? `${product.name} tükendi` : `${product.name} sepete ekle`}
            className={`touch-target-44 shrink-0 h-9 w-9 sm:w-auto sm:px-4 rounded-full sm:rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.95] disabled:opacity-40 disabled:cursor-not-allowed ${
              isAdded
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-artisan-terracotta hover:bg-artisan-terracotta-dark text-white shadow-xs"
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Eklendi</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Sepete Ekle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
