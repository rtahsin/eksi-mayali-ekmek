"use client";



import { formatMoney } from "@/lib/format/currency";
import { storefrontAction } from "@/lib/design/storefront";
import React, { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export function MobileCartBar() {
  // Avoid SSR/localStorage hydration mismatch: render only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const itemCount = useCartStore((s) => s.getItemCount());
  const subtotal = useCartStore((s) => s.getSubtotal());
  const isOpen = useCartStore((s) => s.isOpen);
  const openCart = useCartStore((s) => s.openCart);
  const { settings } = useStoreSettings();

  if (!mounted || itemCount === 0) return null;

  const minRemaining = settings.minBasketAmount - subtotal;
  const freeRemaining = settings.freeShippingThreshold - subtotal;
  const hint =
    minRemaining > 0
      ? `Minimum sipariş için ${formatMoney(minRemaining)} daha`
      : settings.shippingFee === 0 || (settings.freeShippingThreshold > 0 && freeRemaining <= 0)
      ? "Teslimat ücretsiz"
      : settings.freeShippingThreshold > 0
      ? `Ücretsiz teslimata ${formatMoney(freeRemaining)} kaldı`
      : `Teslimat ${formatMoney(settings.shippingFee)}`;

  return (
    <>
      {/* Spacer so the footer is never hidden behind the bar */}
      <div className="h-24 md:hidden" aria-hidden="true" />

      {!isOpen && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-30 px-3 pt-2 pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <button
            type="button"
            onClick={openCart}
            className={storefrontAction({ variant: "primary", className: "sf-cart-bar w-full pointer-events-auto" })}
          >
            <span className="flex items-center gap-3 text-left">
              <span className="relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="sf-count absolute -top-2 -right-2">
                  {itemCount}
                </span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="sf-price font-serif text-base font-bold">{formatMoney(subtotal)}</span>
                <span className="font-sans text-xs">{hint}</span>
              </span>
            </span>

            <span className="font-sans text-sm font-semibold">
              Sepeti aç
            </span>
          </button>
        </div>
      )}
    </>
  );
}
