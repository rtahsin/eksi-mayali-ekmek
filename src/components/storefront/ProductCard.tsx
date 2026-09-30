"use client";

import React, { useState } from "react";
import { ExtendedProduct } from "@/hooks/useProducts";
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

  const weightLabel =
    product.weight >= 1000 && product.weightUnit === "ml"
      ? `${product.weight / 1000}L`
      : `${product.weight}${product.weightUnit || "g"}`;

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group cursor-pointer rounded-xl sm:rounded-2xl bg-linen-surface border border-linen-border hover:border-artisan-terracotta/40 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden shadow-xs"
    >
      {/* Product Image: square on mobile, fixed height from sm up */}
      <div className="relative w-full aspect-square sm:aspect-auto sm:h-52 bg-linen-subtle overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
          decoding="async"
        />

        {product.madeToOrder && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 pointer-events-none">
            <span className="px-2 py-0.5 sm:px-2.5 rounded-full bg-artisan-terracotta-soft text-artisan-terracotta border border-artisan-terracotta/20 text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-wide">
              Ön Sipariş
            </span>
          </div>
        )}

        <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 text-[10px] sm:text-[11px] font-sans font-medium text-espresso px-1.5 sm:px-2 py-0.5 rounded-md bg-linen-surface/90 backdrop-blur-sm border border-linen-border shadow-2xs">
          {weightLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between gap-2 sm:gap-3">
        <div>
          <h3 className="font-serif font-bold text-espresso text-sm sm:text-lg leading-snug group-hover:text-artisan-terracotta transition-colors line-clamp-2 sm:line-clamp-1 min-h-[2.5rem] sm:min-h-0">
            <Link
              href={getProductUrl(product)}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {product.name}
            </Link>
          </h3>

          {/* Description is desktop-only: keeps mobile cards short */}
          <p className="hidden sm:block text-xs text-espresso-wheat line-clamp-2 mt-1 font-sans leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price + Add */}
        <div className="sm:pt-2.5 sm:border-t border-linen-border flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-lg sm:text-2xl font-bold text-espresso">
              {product.price}
            </span>
            <span className="text-[10px] sm:text-xs text-espresso-muted font-sans font-medium">TL</span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`${product.name} sepete ekle`}
            className={`touch-target-44 shrink-0 h-9 w-9 sm:w-auto sm:px-4 rounded-full sm:rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.95] ${
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
