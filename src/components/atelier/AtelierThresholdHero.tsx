"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

export function AtelierThresholdHero() {
  return (
    <section className="relative w-full bg-[#16120F] overflow-hidden">
      {/* 1. Main Visual Hero Stage */}
      <div className="relative w-full flex items-end sm:items-center min-h-[64svh] sm:min-h-[500px] md:min-h-0 md:aspect-[16/9] md:max-h-[85vh] lg:max-h-[900px]">
        {/* Background: on mobile the focal point is set to 80% 30% */}
        <div
          style={{
            backgroundImage: "url('/atelier/atelier_threshold.png')",
            backgroundSize: "cover",
          }}
          className="absolute inset-0 w-full h-full bg-[80%_30%] md:bg-center opacity-90 md:opacity-60 filter brightness-95 md:brightness-90 contrast-110 md:contrast-125 sepia-[.15]"
        />

        {/* Desktop Gradient */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#16120F] via-[#16120F]/85 to-transparent pointer-events-none w-3/5" />

        {/* Mobile Gradient: lightened bottom-up fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16120F] via-[#16120F]/50 via-30% to-transparent md:bg-gradient-to-t md:from-[#16120F]/90 md:via-transparent md:to-transparent pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 md:py-20 w-full">
          <div className="max-w-2xl space-y-4 sm:space-y-6">
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.08] text-balance">
              İyi ekmek tesadüf değildir.
            </h1>

            <div className="pt-1 sm:pt-2">
              <a
                href="/kutuphane"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-artisan-gold/50 text-artisan-cream font-sans text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <span>İçeri gir</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dawn Ambient Light Bleed: thinner on mobile to cut dead space */}
      <div
        className="w-full h-5 sm:h-14 bg-gradient-to-b from-[#1C1713] via-[#2F241B] via-30% via-[#9E826B]/20 to-linen pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}
