"use client";

import React from "react";
import { Wheat, Truck, ArrowRight, BookOpen, Clock } from "lucide-react";

export function AtelierThresholdHero() {
  return (
    <section className="relative w-full bg-background overflow-hidden border-b border-surface-border">
      {/* 1. Main Visual Hero Stage */}
      <div className="relative w-full flex items-end sm:items-center min-h-[460px] sm:min-h-[520px] md:min-h-0 md:aspect-[16/9] md:max-h-[85vh] lg:max-h-[900px]">
        {/* Background Image: Crisp & appetizing on mobile, balanced on desktop */}
        <div
          style={{
            backgroundImage: "url('/atelier/atelier_threshold.png')",
            backgroundSize: "cover",
          }}
          className="absolute inset-0 w-full h-full bg-[center_35%] md:bg-center opacity-85 sm:opacity-75 md:opacity-60 filter brightness-95 md:brightness-90 contrast-110 md:contrast-125 sepia-[.15]"
        />

        {/* Desktop Gradient: Left-to-right fade leaving right side visual clear */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent pointer-events-none w-3/5" />

        {/* Mobile Gradient: Bottom-up fade protecting text legibility while revealing top hero photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 via-50% to-transparent/15 md:bg-gradient-to-t md:from-background/90 md:via-transparent md:to-transparent pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 md:py-20 w-full">
          <div className="max-w-xl space-y-4 sm:space-y-6">
            {/* Subtle Tag - Hand Notes & Delivery Timing */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-artisan-terracotta text-sm font-hand">
                <span className="font-serif text-artisan-gold">✦</span>
                <span className="text-base sm:text-lg">Beylikdüzü Taş Fırını</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[11px] font-sans text-emerald-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Bugün 14:00 - 18:00 Arası Kapınızda</span>
              </div>
            </div>

            {/* Headline in Fraunces */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08]">
              Atölyenin eşiği.
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-artisan-cream/90 font-sans leading-relaxed max-w-lg">
              36 saatlik soğuk fermantasyonla pişen taş fırın ekmekleri ve fırınımıza eşlik eden doğal gurme lezzetler.
              Fırından çıktığı gün kapınızda.
            </p>

            {/* Action CTAs: Focused single action on mobile, full actions on desktop */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 sm:pt-2">
              <a
                href="#ekmekler"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-serif text-sm font-bold shadow-lg shadow-artisan-terracotta/25 border border-artisan-gold/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>🍞 Günün Taze Ekmekleri</span>
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

      {/* 2. Trust Ribbon: Clean, uncrowded strip anchoring the hero */}
      <div className="w-full border-t border-surface-border bg-surface-card/60 backdrop-blur-md py-3.5 sm:py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-2 sm:gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5">
            <Wheat className="w-4 h-4 text-artisan-gold shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground font-serif truncate">%100 Ekşi Maya</div>
              <div className="text-[10px] sm:text-xs text-foreground/70 font-sans truncate">Sıfır Katkı</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5">
            <span className="text-artisan-terracotta font-serif text-sm shrink-0 leading-none mt-0.5">✦</span>
            <div>
              <div className="text-xs font-bold text-foreground font-serif truncate">Taş Değirmen</div>
              <div className="text-[10px] sm:text-xs text-foreground/70 font-sans truncate">Ata Tohumu Un</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2.5">
            <Truck className="w-4 h-4 text-artisan-terracotta shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-foreground font-serif truncate">Fırın Kuryesi</div>
              <div className="text-[10px] sm:text-xs text-foreground/70 font-sans truncate">Beylikdüzü İçi</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
