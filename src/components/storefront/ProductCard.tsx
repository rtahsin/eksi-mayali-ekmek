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

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group cursor-pointer rounded-2xl bg-linen-surface border border-linen-border hover:border-artisan-terracotta/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs"
    >
      {/* Product Image */}
      <div className="relative h-48 sm:h-52 w-full bg-linen-subtle overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />

        {/* Minimal Single Badge: Only show if Made-to-order */}
        {product.madeToOrder && (
          <div className="absolute top-2.5 left-2.5 pointer-events-none">
            <span className="px-2.5 py-0.5 rounded-full bg-artisan-terracotta-soft text-artisan-terracotta border border-artisan-terracotta/20 text-[10px] font-sans font-bold uppercase tracking-wide">
              Ön Sipariş
            </span>
          </div>
        )}

        {/* Clean Weight / Volume Tag */}
        <div className="absolute bottom-2.5 right-2.5 text-[11px] font-sans font-medium text-espresso px-2 py-0.5 rounded-md bg-linen-surface/90 backdrop-blur-sm border border-linen-border shadow-2xs">
          {product.weight >= 1000 && product.weightUnit === "ml"
            ? `${product.weight / 1000}L`
            : `${product.weight}${product.weightUnit || "g"}`}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-serif font-bold text-espresso text-base sm:text-lg leading-snug group-hover:text-artisan-terracotta transition-colors line-clamp-1">
            <Link
              href={getProductUrl(product)}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {product.name}
            </Link>
          </h3>

          <p className="text-xs text-espresso-wheat line-clamp-2 mt-1 font-sans leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Bottom Price & Add Action: 36px visual + 44px hit-target */}
        <div className="pt-2.5 border-t border-linen-border flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-espresso">
              {product.price}
            </span>
            <span className="text-xs text-espresso-muted font-sans font-medium">TL</span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`touch-target-44 h-9 px-3.5 sm:px-4 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] ${
              isAdded
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-artisan-terracotta hover:bg-artisan-terracotta-dark text-white shadow-xs"
            }`}
            title="Sepete Ekle"
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Eklendi</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sepete Ekle</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
