"use client";

import React from "react";
import { ShoppingBag, MessageSquare, BookOpen } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";

export function Navbar() {
  const itemCount = useCartStore((state) => state.getItemCount());
  const openCart = useCartStore((state) => state.openCart);

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-surface-border shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href="/" className="flex items-center gap-3 group py-2">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#F7EBD3] p-1 flex items-center justify-center shrink-0 shadow-md">
            <img
              src="/logo/logo_mark.png"
              alt="EkmekLab"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <div className="font-serif text-xl font-bold tracking-wide text-foreground flex items-center gap-1">
              Ekmek<span className="text-artisan-gold font-normal italic">Lab</span>
            </div>
            <div className="text-[10px] font-sans text-artisan-gold/80 tracking-wider uppercase">
              Artisan Fırın · Beylikdüzü
            </div>
          </div>
        </a>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-sans">
          <a
            href="/#ekmekler"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.location.pathname === "/") {
                e.preventDefault();
                window.location.hash = "ekmekler";
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }
            }}
            className="text-foreground/80 hover:text-foreground transition-colors font-medium tracking-wide"
          >
            Ekmeklerimiz
          </a>
          <a
            href="/#gurme-lezzetler"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.location.pathname === "/") {
                e.preventDefault();
                window.location.hash = "gurme-lezzetler";
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }
            }}
            className="text-foreground/80 hover:text-foreground transition-colors font-medium tracking-wide"
          >
            Gurme Lezzetler
          </a>
          <a
            href="/kutuphane"
            className="text-artisan-gold hover:text-foreground flex items-center gap-1.5 font-semibold transition-colors tracking-wide bg-surface-panel px-3 py-1.5 rounded-xl border border-surface-border"
          >
            <BookOpen className="w-3.5 h-3.5 text-artisan-gold" />
            <span>Bilim & Zanaat</span>
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/905010126653?text=Merhaba%2C%20EkmekLab%20ta%C5%9F%20f%C4%B1r%C4%B1n%C4%B1ndan%20taze%20ek%C5%9Fi%20mayal%C4%B1%20ekmek%20ve%20gurme%20lezzetler%20sipari%C5%9Fi%20vermek%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-sans transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Sipariş</span>
          </a>

          <button
            type="button"
            onClick={openCart}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-sans text-xs transition-all ${
              itemCount > 0
                ? "bg-artisan-terracotta text-foreground font-bold shadow-lg shadow-artisan-terracotta/30 hover:bg-artisan-terracotta/90"
                : "bg-surface-panel hover:bg-surface-elevated text-foreground/80/80 border border-surface-border"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-artisan-gold" />
            <span>Sepetim</span>
            <span
              className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${
                itemCount > 0
                  ? "bg-[#D2B48C] text-stone-950"
                  : "bg-[#3D2E22] text-foreground/80/60"
              }`}
            >
              {itemCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
