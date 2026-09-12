"use client";

import React from "react";
import Image from "next/image";
import { BookOpen, ArrowRight } from "lucide-react";

export function HowWeBake() {
  return (
    <section id="nasil-uretiyoruz" className="relative py-16 md:py-32 border-t border-b border-surface-border bg-background overflow-hidden">
      
      {/* Background structural lines for laboratory aesthetic */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#E8E0D5 1px, transparent 1px), linear-gradient(90deg, #E8E0D5 1px, transparent 1px)', backgroundSize: '100px 100px' }}>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Minimal Editorial Header */}
        <div className="text-center mb-12 md:mb-20 space-y-4">
          <p className="font-serif text-xs md:text-sm text-artisan-gold tracking-[0.3em] uppercase">
            Ekmek Anatomisi
          </p>
          <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-foreground">
            Su, Un, Tuz ve Zaman.
          </h2>
          <p className="font-sans text-foreground/60 text-sm md:text-base max-w-xl mx-auto pt-4">
            Standart fırıncılığın hızlandırdığı her adımı, biz olması gerektiği gibi yavaşlatıyoruz. 
            İşte laboratuvarımızın temel reçetesi:
          </p>
        </div>

        {/* Blueprint Area */}
        <div className="relative w-full aspect-[4/3] md:aspect-[16/9] max-h-[85vh] bg-[#0A0908] rounded-2xl md:rounded-3xl border border-surface-border overflow-hidden shadow-clay-lg flex items-center justify-center">
          
          {/* Base Image generated via AI */}
          <Image 
            src="/atelier/bread_anatomy_real.jpg"
            alt="Bread Anatomy Photograph"
            fill
            className="object-cover opacity-85 filter brightness-105 contrast-105"
            sizes="(max-width: 1280px) 100vw, 1280px"
          />

          {/* Central Overlay Vignette for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0908]/90 via-transparent to-[#0A0908]/40 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0908]/80 via-transparent to-[#0A0908]/80 pointer-events-none" />

          {/* Annotations Container */}
          <div className="absolute inset-0 w-full h-full p-4 md:p-8">
            
            {/* Annotation 1: Starter (Top Left) */}
            <div className="absolute top-[15%] left-[5%] md:top-[20%] md:left-[10%] flex flex-col items-start">
              <div className="text-artisan-gold font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-2">
                <span className="w-8 md:w-16 h-[1px] bg-artisan-gold/50"></span>
                01. KÜLTÜR
              </div>
              <div className="font-mono text-foreground text-xs md:text-sm bg-surface/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-surface-border rounded">
                MAYA: 8 YILLIK CANLI
              </div>
              <p className="font-hand text-foreground/80 text-xl md:text-2xl mt-3 max-w-[150px] md:max-w-[220px] leading-tight rotate-[-2deg]">
                Her gün aynı saatte beslenir, endüstriyel maya girmez.
              </p>
            </div>

            {/* Annotation 2: Hydration (Top Right) */}
            <div className="absolute top-[15%] right-[5%] md:top-[20%] md:right-[10%] flex flex-col items-end text-right">
              <div className="text-artisan-gold font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-2 justify-end">
                02. HİDRASYON
                <span className="w-8 md:w-16 h-[1px] bg-artisan-gold/50"></span>
              </div>
              <div className="font-mono text-foreground text-xs md:text-sm bg-surface/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-surface-border rounded">
                SU ORANI: %78 - %82
              </div>
              <p className="font-hand text-foreground/80 text-xl md:text-2xl mt-3 max-w-[160px] md:max-w-[230px] leading-tight rotate-[2deg]">
                Yüksek su tutma kapasitesi sayesinde içi nemli ve yumuşak.
              </p>
            </div>

            {/* Annotation 3: Fermentation (Bottom Left) */}
            <div className="absolute bottom-[20%] left-[5%] md:bottom-[20%] md:left-[15%] flex flex-col items-start">
              <div className="text-artisan-gold font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-2">
                <span className="w-8 md:w-12 h-[1px] bg-artisan-gold/50"></span>
                03. ZAMAN
              </div>
              <div className="font-mono text-foreground text-xs md:text-sm bg-surface/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-surface-border rounded">
                SOĞUK MAYALAMA: 36 SAAT
              </div>
              <p className="font-hand text-foreground/80 text-xl md:text-2xl mt-3 max-w-[160px] md:max-w-[230px] leading-tight rotate-[-3deg]">
                Fitik asit parçalanır, demir ve mineraller serbest kalır.
              </p>
            </div>

            {/* Annotation 4: Crust/Oven (Bottom Right) */}
            <div className="absolute bottom-[20%] right-[5%] md:bottom-[20%] md:right-[15%] flex flex-col items-end text-right">
              <div className="text-artisan-gold font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-2 justify-end">
                04. ATEŞ
                <span className="w-8 md:w-12 h-[1px] bg-artisan-gold/50"></span>
              </div>
              <div className="font-mono text-foreground text-xs md:text-sm bg-surface/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 border border-surface-border rounded">
                TAŞ TABAN: 240°C
              </div>
              <p className="font-hand text-foreground/80 text-xl md:text-2xl mt-3 max-w-[160px] md:max-w-[220px] leading-tight rotate-[4deg]">
                Buhar şokuyla mühürlenen nar gibi çıtır karamelize kabuk.
              </p>
            </div>
            
          </div>
        </div>

        {/* Bridge to Science & Order */}
        <div className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-between p-6 sm:p-8 rounded-3xl bg-surface border border-surface-border shadow-xl gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="text-[11px] font-mono tracking-widest uppercase text-artisan-gold font-semibold">
              EKMEKLAB · FERMANTASYON BİYOLOJİSİ
            </div>
            <h4 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Zanaatın arkasındaki bilimi keşfedin.
            </h4>
            <p className="text-xs sm:text-sm text-foreground/70 font-sans max-w-lg leading-relaxed">
              36 saatlik laktik asit fermantasyonu neden midede şişkinlik yapmaz? Karakılçık buğdayı ve canlı çiğ süt kimyası.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="/kutuphane"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-panel hover:bg-surface-elevated text-artisan-gold border border-artisan-gold/30 text-xs font-sans font-semibold transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Bülteni Oku →</span>
            </a>
            <a
              href="#ekmekler"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-sans font-bold shadow-lg shadow-artisan-terracotta/25 border border-artisan-gold/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🍞 Fırından Sipariş Ver</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
