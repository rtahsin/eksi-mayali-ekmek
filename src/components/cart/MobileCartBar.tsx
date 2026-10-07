"use client";

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
      ? `Minimum sipariş için ${minRemaining.toLocaleString("tr-TR")} ₺ daha`
      : settings.shippingFee === 0 || (settings.freeShippingThreshold > 0 && freeRemaining <= 0)
      ? "Teslimat ücretsiz"
      : settings.freeShippingThreshold > 0
      ? `Ücretsiz teslimata ${freeRemaining.toLocaleString("tr-TR")} ₺ kaldı`
      : `Teslimat ${settings.shippingFee.toLocaleString("tr-TR")} ₺`;

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
            className="w-full flex items-center justify-between gap-3 pl-4 pr-3 py-2.5 rounded-2xl bg-espresso border border-white/10 pointer-events-auto text-white shadow-lg shadow-black/40 active:scale-[0.99] transition-transform"
          >
            <span className="flex items-center gap-3 text-left">
              <span className="relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D2B48C] text-stone-950 text-xs font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-serif text-base font-bold">{subtotal.toLocaleString("tr-TR")} ₺</span>
                <span className="font-sans text-xs text-white/70">{hint}</span>
              </span>
            </span>

            <span className="font-sans text-xs font-semibold px-4 py-2.5 rounded-xl bg-artisan-terracotta">
              Sepete Git
            </span>
          </button>
        </div>
      )}
    </>
  );
}
