"use client";

import React from "react";
import { Wheat, Truck, ArrowRight, BookOpen, Clock } from "lucide-react";

export function AtelierThresholdHero() {
  return (
    <section className="relative w-full bg-background overflow-hidden border-b border-surface-border">
      {/* 1. Main Visual Hero Stage */}
      <div className="relative w-full flex items-end sm:items-center min-h-[420px] sm:min-h-[500px] md:min-h-0 md:aspect-[16/9] md:max-h-[85vh] lg:max-h-[900px]">
        {/* Background Image: Original atelier_threshold.png with mobile-tuned focus on the door opening & warm light */}
        <div
          style={{
            backgroundImage: "url('/atelier/atelier_threshold.png')",
            backgroundSize: "cover",
          }}
          className="absolute inset-0 w-full h-full bg-[70%_25%] md:bg-center opacity-90 md:opacity-60 filter brightness-95 md:brightness-90 contrast-110 md:contrast-125 sepia-[.15]"
        />

        {/* Desktop Gradient: Left-to-right fade leaving right side visual clear */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent pointer-events-none w-3/5" />

        {/* Mobile Gradient: Bottom-up fade protecting text legibility while revealing top door photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 via-45% to-transparent/10 md:bg-gradient-to-t md:from-background/90 md:via-transparent md:to-transparent pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-16 md:py-20 w-full">
          <div className="max-w-xl space-y-3 sm:space-y-5">
            {/* Minimal & Elegant Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card/90 backdrop-blur-md border border-artisan-gold/30 text-[11px] sm:text-xs font-sans text-artisan-cream">
              <span className="text-artisan-gold font-serif">✦</span>
              <span className="font-medium text-foreground">Beylikdüzü Taş Fırını</span>
              <span className="text-foreground/40">·</span>
              <span className="text-emerald-400 font-medium">Aynı Gün Teslimat</span>
            </div>

            {/* Direct, Appetizing Headline */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.08]">
              Taş fırından taze ekşi maya.
            </h1>

            {/* Single crisp line: zero fluff */}
            <p className="text-xs sm:text-sm md:text-base text-artisan-cream/90 font-sans leading-relaxed max-w-md">
              36 saat soğuk fermantasyon, ata tohumu unlar ve sıfır katkı. Fırından çıktığı gün kapınızda.
            </p>

            {/* Action CTA: Focused single action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 sm:pt-2">
              <a
                href="#ekmekler"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-serif text-sm font-bold shadow-lg shadow-artisan-terracotta/25 border border-artisan-gold/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
