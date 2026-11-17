"use client";

import { formatMoney } from "@/lib/format/currency";
import { storefrontAction } from "@/lib/design/storefront";
import React, { useEffect, useState } from "react";
import { ExtendedProduct } from "@/hooks/useProducts";
import { useCartStore } from "@/lib/store/useCartStore";
import { isAccompaniment } from "@/lib/products/grouping";
import { ShoppingBag, Plus, Minus, Check, MessageCircle, ArrowRight } from "lucide-react";
import { CONTACT } from "@/lib/site";
import { captureRef } from "@/lib/track";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { getSaleScheduleBadge } from "@/lib/ordering/saleDates";
import { formatProductAmount } from "@/lib/products/format";

interface ProductDetailClientActionsProps {
  product: ExtendedProduct;
}

export function ProductDetailClientActions({ product }: ProductDetailClientActionsProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const itemCount = useCartStore((state) => state.getItemCount());
  const subtotal = useCartStore((state) => state.getSubtotal());
  const cartOpen = useCartStore((state) => state.isOpen);
  const today = useIstanbulToday();
  const schedule = getSaleScheduleBadge(product, today);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    captureRef();
  }, []);

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(100, prev + 1));
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

  const isAvailable = product.isAvailable !== false;
  const isAccompanimentItem = isAccompaniment(product);
  const whatsappMessage = encodeURIComponent(
    `Merhaba EkmekLab! "${product.name}" ürünü hakkında bilgi almak ve sipariş vermek istiyorum.`
  );

  return (
    <div id="siparis" className="space-y-4 pt-2 scroll-mt-24">
      {/* Mobil yapışkan sipariş çubuğu: her zaman (ürün sayfasında alt sepet barı yok) */}
      {mounted && isAvailable && !cartOpen && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-30 px-3 pt-2 pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <button
            type="button"
            onClick={itemCount > 0 ? openCart : handleAddToCart}
            className={storefrontAction({ variant: "primary", className: "sf-cart-bar pointer-events-auto w-full" })}
          >
            <span>{itemCount > 0 ? `Sepeti aç (${itemCount} adet)` : `${quantity} adet sepete ekle`}</span>
            <span className="sf-price font-serif text-base">{formatMoney(itemCount > 0 ? subtotal : product.price * quantity)}</span>
          </button>
        </div>
      )}

      {/* Price & Quantity & Add To Cart Box */}
      <div className="sf-panel p-4 sm:p-5 rounded-2xl bg-cream-surface border border-line space-y-4 shadow-xl text-ink">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-sans text-ink-muted uppercase tracking-wider block">
              Birim Fiyat
            </span>
            <div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
              <span className="sf-price font-serif text-3xl font-bold text-ink">{formatMoney(product.price)}</span>
              <span className="text-sm text-ink-muted whitespace-nowrap">
                / {formatProductAmount(product)}
              </span>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <span className="text-xs font-sans text-ink-muted block">Teslimat</span>
            {isAvailable ? (
              <span className="sf-success inline-flex items-center gap-1.5 text-xs sf-success font-semibold mt-0.5">
                <span className="w-2 h-2 rounded-full bg-good animate-pulse" aria-hidden="true" />
                {schedule || "Teslim günü sepette seçilir"}
              </span>
            ) : (
              <span className="sf-error text-xs sf-error font-semibold mt-0.5 block">
                Tükendi / Stokta Yok
              </span>
            )}
          </div>
        </div>

        {/* Stepper and Add To Cart */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Stepper */}
          <div className="flex items-center justify-between sm:justify-start rounded-xl bg-bg border border-line overflow-hidden px-1 py-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1 || !isAvailable}
              className={storefrontAction({ variant: "secondary", size: "icon", className: "inline-flex items-center justify-center disabled:opacity-40" })}
              aria-label="Adet azalt"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="w-12 text-center font-mono font-bold text-sm text-ink tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={!isAvailable || quantity >= 100}
              className={storefrontAction({ variant: "secondary", size: "icon", className: "inline-flex items-center justify-center disabled:opacity-40" })}
              aria-label="Adet artır"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className={storefrontAction({ variant: "primary", className: "flex-1" })}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Sepete eklendi ({quantity} adet)</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>Sepete ekle ({formatMoney(product.price * quantity)})</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Direct Checkout / Cart Drawer Trigger */}
        <button
          type="button"
          onClick={openCart}
          className={storefrontAction({ variant: "secondary", size: "default", className: "w-full flex items-center justify-center gap-2 disabled:opacity-50" })}
        >
          <span>Sepeti aç{itemCount > 0 ? ` (${itemCount} adet)` : ""}</span>
          <ArrowRight className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
        </button>
      </div>

      {/* WhatsApp Support Bar */}
      <a
        href={`https://wa.me/${CONTACT.phoneE164}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center justify-center gap-2" })}
      >
        <MessageCircle className="sf-success w-4 h-4 sf-success shrink-0" aria-hidden="true" />
        <span>
          {isAccompanimentItem
            ? "Toplu sipariş & teslimat günü için atölyeye yaz"
            : "Özel gramaj & toplu sipariş için fırın ustasına yaz"}
        </span>
      </a>
    </div>
  );
}
