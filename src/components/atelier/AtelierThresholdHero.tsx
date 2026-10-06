"use client";

import React from "react";

export function AtelierThresholdHero() {
  return (
    <section className="relative w-full bg-[#16120F] overflow-hidden">
      {/* 1. Main Visual Hero Stage */}
      <div className="relative w-full flex items-end sm:items-center min-h-[64svh] sm:min-h-[500px] md:min-h-0 md:aspect-[16/9] md:max-h-[85vh] lg:max-h-[900px]">
        {/* Background: on mobile the focal point is set to 80% 30% */}
        <div
          style={{
            backgroundImage: "url('/atelier/atelier_threshold.webp')",
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
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 font-sans text-[11px] sm:text-xs font-semibold text-artisan-gold uppercase tracking-widest">
              <span>✦</span>
              <span>EkmekLab · Gastronomi & Fermantasyon Atölyesi</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.12] text-balance">
              Gerçek ekmeğin geleceğini, taş fırında yeniden kuruyoruz.
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-stone-300 font-sans leading-relaxed max-w-xl">
              Endüstriyel hıza karşı yavaş fermantasyon, yerel buğday mirası ve ödünsüz zanaat.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Seamless transition into the unified #120E0B catalog: zero color break */}
      <div
        className="w-full h-4 sm:h-8 bg-gradient-to-b from-[#16120F] to-[#120E0B] pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}
