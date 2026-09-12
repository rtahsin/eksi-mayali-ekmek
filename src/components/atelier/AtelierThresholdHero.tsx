"use client";

import React from "react";
import { Wheat, Truck, ArrowRight, BookOpen, Clock } from "lucide-react";

export function AtelierThresholdHero() {
  return (
    <section className="relative w-full bg-background flex items-center overflow-hidden border-b border-surface-border min-h-[540px] md:min-h-0 md:aspect-[16/9] md:max-h-[85vh] lg:max-h-[900px]">
      {/* Background Image: Dark Espresso Tint */}
      <div
        style={{
          backgroundImage: "url('/atelier/atelier_threshold.png')",
          backgroundPosition: "center center",
          backgroundSize: "cover",
        }}
        className="absolute inset-0 w-full h-full opacity-60 filter brightness-90 contrast-125 sepia-[.2]"
      />

      {/* Dark Gradient Overlay for Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none w-full md:w-3/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 w-full">
        <div className="max-w-xl space-y-6">
          {/* Subtle Tag - Hand Notes & Delivery Timing */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 text-artisan-terracotta text-sm font-hand">
              <span className="font-serif">✦</span>
              <span className="text-lg">Beylikdüzü Taş Fırını & Gurme Lezzetler</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[11px] font-sans text-emerald-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bugün 14:00 - 18:00 Arası Kapınızda</span>
            </div>
          </div>

          {/* Headline in Fraunces */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
            Atölyenin eşiği.
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-foreground/80 font-sans leading-relaxed max-w-lg">
            36 saatlik soğuk fermantasyonla pişen taş fırın ekmekleri ve fırınımıza eşlik eden doğal gurme lezzetler.
            Fırından çıktığı gün kapınızda.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#ekmekler"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-serif text-sm font-bold shadow-lg shadow-artisan-terracotta/25 border border-artisan-gold/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🍞 Günün Taze Ekmekleri</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/kutuphane"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-surface-panel hover:bg-surface-elevated text-foreground/90 border border-surface-border text-xs font-sans font-medium transition-all"
            >
              <BookOpen className="w-4 h-4 text-artisan-gold" />
              <span>Zanaat & Bilim Bülteni</span>
            </a>
          </div>

          {/* 3 Simple Trust Highlights - Minimal lines */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-8 border-t border-surface-border text-left">
            <div className="space-y-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 font-serif">
                <Wheat className="w-3.5 h-3.5 text-artisan-gold shrink-0" />
                <span className="truncate">%100 Ekşi Maya</span>
              </div>
              <div className="text-[11px] text-foreground/60 truncate font-sans">Sıfır Katkı</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 font-serif">
                <span className="text-artisan-terracotta font-serif text-xs">✦</span>
                <span className="truncate">Taş Değirmen</span>
              </div>
              <div className="text-[11px] text-foreground/60 truncate font-sans">Ata Tohumu Un</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 font-serif">
                <Truck className="w-3.5 h-3.5 text-artisan-terracotta shrink-0" />
                <span className="truncate">Fırın Kuryesi</span>
              </div>
              <div className="text-[11px] text-foreground/60 truncate font-sans">Beylikdüzü İçi</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
