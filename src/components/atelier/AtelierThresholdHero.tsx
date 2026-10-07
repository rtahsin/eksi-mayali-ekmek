"use client";

import React from "react";
import Image from "next/image";
import { Truck, Sparkles, ShieldCheck } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export function AtelierThresholdHero() {
  const { settings } = useStoreSettings();
  const threshold = settings.freeShippingThreshold || 1000;
  const fee = settings.shippingFee || 150;

  return (
    <section className="relative w-full bg-bg text-ink overflow-hidden border-b border-line">
      {/* 1. Main Visual Hero Stage */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 sm:pb-16 grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Text & CTAs (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-cream-surface text-xs font-mono text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>Beylikdüzü · Ekşi Mayalı Taş Fırın</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink leading-[1.08] text-balance">
            Siparişe göre pişen <em className="italic text-accent font-normal">ekşi mayalı</em> ekmek.
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-xl font-sans">
            Ata tohumu taş değirmen unları, canlı ekşi maya ve sabırlı soğuk fermantasyon.
            Sen günü seç; fırından çıktığı gün Beylikdüzü&apos;nde kendi kuryemizle kapına getirelim.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#ekmekler"
              className="px-6 py-3.5 rounded-full bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all shadow-sm hover:shadow"
            >
              Taze Ekmekleri İncele
            </a>
            <a
              href="#nasil-uretiyoruz"
              className="px-6 py-3.5 rounded-full bg-cream-surface border border-line text-ink font-semibold text-sm hover:border-accent hover:bg-bg transition-all"
            >
              Nasıl Üretiyoruz?
            </a>
          </div>
        </div>

        {/* Right Column: Hero Visual (5 cols) */}
        <div className="md:col-span-5 relative">
          <div className="relative aspect-[4/5] sm:aspect-[1/1] md:aspect-[4/5] rounded-[24px] sm:rounded-[28px] overflow-hidden border border-line bg-cream-surface shadow-md">
            <Image
              src="/atelier/atelier_threshold.webp"
              alt="EkmekLab Taş Fırın Atölyesi"
              fill
              priority
              className="object-cover filter contrast-[1.05]"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            {/* Subtle paper vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Logo badge floating in corner */}
          <div className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-cream-surface p-2 border border-line shadow-lg hidden sm:flex items-center justify-center">
            <img src="/logo/logo.png" alt="EkmekLab" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* 2. Delivery & Trust Strip */}
      <div className="border-t border-line bg-cream-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs sm:text-sm text-ink-muted">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-accent shrink-0" />
            <span>Beylikdüzü içi kendi teslimatımız</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <span>
              <strong>{threshold.toLocaleString("tr-TR")} ₺</strong> üzeri teslimat ücretsiz
              (altında {fee.toLocaleString("tr-TR")} ₺)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <span>Kapıda nakit veya kartla güvenli ödeme</span>
          </div>
        </div>
      </div>
    </section>
  );
}
