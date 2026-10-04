"use client";

import React, { useState } from "react";
import { ExtendedProduct } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { ShoppingBag, Plus, Minus, Check, MessageCircle, ArrowRight } from "lucide-react";
import { CONTACT } from "@/lib/site";

interface ProductDetailClientActionsProps {
  product: ExtendedProduct;
}

export function ProductDetailClientActions({ product }: ProductDetailClientActionsProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = () => {
    const success = addItem(product, null, quantity);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    addItem(product, null, quantity);
    openCart();
  };

  const isAvailable = product.isAvailable !== false;
  const whatsappMessage = encodeURIComponent(
    `Merhaba EkmekLab! "${product.name}" ürünü hakkında bilgi almak ve sipariş vermek istiyorum.`
  );

  return (
    <div className="space-y-4 pt-2">
      {/* Price & Quantity & Add To Cart Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-surface-border space-y-4 shadow-xl">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs font-sans text-foreground/60 uppercase tracking-wider block">
              Birim Fiyat
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-serif text-3xl font-bold text-foreground">
                {product.price}
              </span>
              <span className="text-sm font-sans text-artisan-gold">TL</span>
              <span className="text-xs text-foreground/50 ml-1">
                / {product.weight} {product.weightUnit || "g"}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-sans text-foreground/60 block">Stok Durumu</span>
            {isAvailable ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Taze Üretimde / Mevcut
              </span>
            ) : (
              <span className="text-xs text-red-400 font-medium mt-0.5 block">
                Tükendi / Stokta Yok
              </span>
            )}
          </div>
        </div>

        {/* Stepper and Add To Cart */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Stepper */}
          <div className="flex items-center justify-between sm:justify-start rounded-xl bg-surface-panel border border-surface-border overflow-hidden px-1 py-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1 || !isAvailable}
              className="p-2.5 rounded-lg hover:bg-surface text-foreground/70 hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Adet azalt"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-mono font-bold text-sm text-foreground">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={!isAvailable}
              className="p-2.5 rounded-lg hover:bg-surface text-foreground/70 hover:text-foreground disabled:opacity-40 transition-colors"
              aria-label="Adet artır"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-sans font-bold text-sm transition-all duration-300 shadow-md ${
              isAdded
                ? "bg-emerald-600 text-white"
                : "bg-artisan-gold text-[#120E0B] hover:bg-artisan-gold/90 hover:shadow-artisan-gold/20"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Sepete Eklendi ({quantity} Adet)</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Sepete Ekle ({product.price * quantity} TL)</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Direct Checkout / Cart Drawer Trigger */}
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!isAvailable}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-panel hover:bg-surface-elevated border border-surface-border hover:border-artisan-gold/40 text-xs font-sans text-artisan-cream transition-all disabled:opacity-50"
        >
          <span>Hemen Sipariş Ver & Sepeti İncele</span>
          <ArrowRight className="w-3.5 h-3.5 text-artisan-gold" />
        </button>
      </div>

      {/* WhatsApp Support Bar */}
      <a
        href={`https://wa.me/${CONTACT.phoneE164}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface/60 hover:bg-surface border border-emerald-500/20 hover:border-emerald-500/50 text-xs text-emerald-400 font-sans transition-all"
      >
        <MessageCircle className="w-4 h-4 text-emerald-400" />
        <span>Özel Gramaj & Toplu Sipariş İçin Fırın Ustasına Yazın</span>
      </a>
    </div>
  );
}
