"use client";

import React from "react";
import { Wheat, Truck, ArrowRight, BookOpen, Mountain } from "lucide-react";

export function AtelierThresholdHero() {
  return (
    <section className="relative w-full bg-[#16120F] overflow-hidden">
      {/* 1. Main Visual Hero Stage */}
      <div className="relative w-full flex items-end sm:items-center min-h-[340px] sm:min-h-[500px] md:min-h-0 md:aspect-[16/9] md:max-h-[85vh] lg:max-h-[900px]">
        {/* Background: on mobile the focal point moves right so door light + hanging sign stay in frame */}
        <div
          style={{
            backgroundImage: "url('/atelier/atelier_threshold.png')",
            backgroundSize: "cover",
          }}
          className="absolute inset-0 w-full h-full bg-[88%_25%] md:bg-center opacity-90 md:opacity-60 filter brightness-95 md:brightness-90 contrast-110 md:contrast-125 sepia-[.15]"
        />

        {/* Desktop Gradient */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#16120F] via-[#16120F]/85 to-transparent pointer-events-none w-3/5" />

        {/* Mobile Gradient: bottom-up fade for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] via-[#16120F]/80 via-45% to-transparent/10 md:bg-gradient-to-t md:from-[#16120F]/90 md:via-transparent md:to-transparent pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-16 md:py-20 w-full">
          <div className="max-w-xl space-y-3 sm:space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card/90 backdrop-blur-md border border-artisan-gold/30 text-[11px] sm:text-xs font-sans text-artisan-cream">
              <span className="text-artisan-gold font-serif">✦</span>
              <span className="font-medium text-foreground">Beylikdüzü Taş Fırını</span>
              <span className="text-foreground/40">·</span>
              <span className="text-emerald-400 font-medium">Aynı Gün Teslimat</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08] text-balance">
              Taş fırından taze ekşi mayalı ekmek.
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-artisan-cream/90 font-sans leading-relaxed max-w-md">
              36 saat soğuk fermantasyon, ata tohumu unlar ve sıfır katkı. Fırından çıktığı gün kapınızda.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 sm:pt-2">
              <a
                href="#ekmekler"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-white font-serif text-sm font-bold shadow-lg shadow-artisan-terracotta/25 border border-artisan-gold/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Günün Taze Ekmekleri</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="/kutuphane"
                className="hidden sm:inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-surface-panel hover:bg-surface-elevated text-foreground/90 border border-surface-border text-xs font-sans font-medium transition-all"
              >
                <BookOpen className="w-4 h-4 text-artisan-gold" />
                <span>Zanaat & Bilim Bülteni</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Trust Ribbon */}
      <div className="w-full border-t border-[#33261C] bg-[#1C1713]/90 backdrop-blur-md py-3 sm:py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-2 sm:gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5">
            <Wheat className="w-4 h-4 text-artisan-gold shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground font-serif truncate">%100 Ekşi Maya</div>
              <div className="text-[11px] sm:text-xs text-foreground/80 font-sans truncate">Sıfır Katkı</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5">
            <Mountain className="w-4 h-4 text-artisan-gold shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground font-serif truncate">Taş Değirmen</div>
              <div className="text-[11px] sm:text-xs text-foreground/80 font-sans truncate">Ata Tohumu Un</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5">
            <Truck className="w-4 h-4 text-artisan-terracotta shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground font-serif truncate">Fırın Kuryesi</div>
              <div className="text-[11px] sm:text-xs text-foreground/80 font-sans">
                <span className="sm:hidden">1000 TL+ ücretsiz</span>
                <span className="hidden sm:inline">Beylikdüzü içi · 1000 TL üzeri ücretsiz</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dawn Ambient Light Bleed: thinner on mobile to cut dead space */}
      <div
        className="w-full h-5 sm:h-14 bg-gradient-to-b from-[#1C1713] via-[#2F241B] via-30% via-[#9E826B]/20 to-linen pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}
