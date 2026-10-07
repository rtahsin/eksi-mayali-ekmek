"use client";

import React from "react";
import Link from "next/link";
import { Microscope, BookOpen, Calculator, ArrowRight, Sparkles } from "lucide-react";

export function ScienceDiscoveryBridge() {
  const cards = [
    {
      href: "/laboratuvar",
      icon: Microscope,
      tag: "İnteraktif Simülasyon",
      title: "Laboratuvar & Mikroskop",
      desc: "Hamurun mikroskobik dünyasına inin. Sıcaklık, fermantasyon süresi ve un kalitesinin gluten ağına etkisini interaktif deneyimleyin.",
      actionText: "Simülasyonu Başlat",
    },
    {
      href: "/kutuphane",
      icon: BookOpen,
      tag: "Akademik Literatür & Kavramlar",
      title: "Bilim Kütüphanesi & Sözlük",
      desc: "Karakılçık ve siyez gibi ata tohumlarının genetik mirası, nişasta hasarı ve laktik asit bakterileri üzerine bağımsız araştırmalar.",
      actionText: "Yazıları Oku",
    },
    {
      href: "/arac",
      icon: Calculator,
      tag: "Atölye Standartları",
      title: "Profesyonel Fırıncı Araçları",
      desc: "Zanaatkar ekmek yapımında tahminle değil, ölçümle fırıncılık. Fırıncı yüzdesi, DDT su sıcaklığı ve maya besleme zamanlayıcısı.",
      actionText: "Araçları Kullan",
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-bg text-ink border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-cream-surface text-xs font-mono text-ink-muted">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Zanaatın Arkasındaki Bilim</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink">
            Daha derin merak edenler için.
          </h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed font-sans">
            EkmekLab yalnızca bir taş fırın değil; fermantasyon biyolojisi, buğday genetiği ve zanaat matematiğini
            şeffafça paylaşan açık bir fırıncılık atölyesidir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.href}
                className="group flex flex-col justify-between p-6 sm:p-7 rounded-2xl border border-line bg-cream-surface hover:border-accent/60 transition-all duration-200 shadow-xs hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-bg border border-line flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-accent font-semibold">
                      {c.tag}
                    </span>
                    <h3 className="font-serif text-xl font-bold text-ink mt-1 group-hover:text-accent transition-colors">
                      {c.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {c.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-line/60">
                  <Link
                    href={c.href}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-bg hover:bg-accent text-ink hover:text-white border border-line hover:border-accent text-xs font-semibold transition-all shadow-xs"
                  >
                    <span>{c.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
