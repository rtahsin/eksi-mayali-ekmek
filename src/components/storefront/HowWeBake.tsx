"use client";

import React from "react";
import Image from "next/image";

export function HowWeBake() {
  return (
    <section id="nasil-uretiyoruz" className="relative py-16 md:py-24 bg-cream-surface text-ink border-b border-line overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* 1. Üç Basit Adım (Nasıl Çalışır?) */}
        <div className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent font-semibold">
              SİPARİŞ RİTMİ & ÇALIŞMA MODELİ
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              Nasıl çalışıyoruz?
            </h2>
            <p className="text-sm text-ink-muted">
              Rafta bayatlayan ekmek yok. Her somun, sizin seçtiğiniz gün için özel yoğrulur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                num: "01",
                title: "Günü Seç",
                desc: "Sepetini doldur, sana uygun teslim gününü belirle. Önceden üyelik açman gerekmez.",
              },
              {
                num: "02",
                title: "Siparişine Göre Pişer",
                desc: "Hamur gelen sipariş adedine göre yoğrulur ve taş fırında taze pişer; israf ve bayatlama olmaz.",
              },
              {
                num: "03",
                title: "Kapına Gelir",
                desc: "Beylikdüzü içinde fırından çıktığı gün kendi kuryemizle getiririz; ödemeni kapıda yaparsın.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-2xl border border-line bg-bg space-y-3 relative group hover:border-accent/50 transition-colors shadow-xs"
              >
                <span className="font-serif text-4xl sm:text-5xl font-bold text-accent/80 block">
                  {step.num}
                </span>
                <h3 className="font-serif text-lg font-bold text-ink">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Ekmek Anatomisi & Zanaat İlkeleri */}
        <div className="space-y-8 pt-4">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-accent font-semibold">
              EKMEK ANATOMİSİ · KÖY EKMEĞİ
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
              Bir ekmeğin dört kararı.
            </h2>
            <p className="text-sm text-ink-muted">
              Standart endüstriyel fırıncılığın hızlandırdığı her adımı, biz olması gerektiği gibi yavaşlatıyoruz.
            </p>
          </div>

          {/* Blueprint Canvas */}
          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] max-h-[75vh] bg-bg rounded-2xl sm:rounded-3xl border border-line overflow-hidden shadow-sm flex items-center justify-center">
            <Image
              src="/atelier/bread_anatomy_real.webp"
              alt="Ekmek Anatomisi ve Kesit Yapısı"
              fill
              className="object-cover opacity-95 filter brightness-100 contrast-105"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />

            {/* Central Overlay Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Annotations */}
            <div className="absolute inset-0 w-full h-full p-4 md:p-8">
              {/* Annotation 1: Kültür */}
              <div className="absolute top-[12%] left-[4%] md:top-[16%] md:left-[8%] flex flex-col items-start">
                <div className="text-amber-200 font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-1.5 font-bold">
                  <span className="w-6 md:w-12 h-[1px] bg-amber-200/60" />
                  01. KÜLTÜR
                </div>
                <div className="font-mono text-white text-xs md:text-xs bg-black/70 backdrop-blur-md px-3 py-1 border border-white/20 rounded-lg">
                  MAYA: CANLI KÜLTÜR
                </div>
                <p className="font-serif italic text-white/90 text-xs md:text-sm mt-1.5 max-w-[150px] md:max-w-[200px] leading-snug">
                  Her gün aynı saatte beslenir; endüstriyel maya girmez.
                </p>
              </div>

              {/* Annotation 2: Hidrasyon */}
              <div className="absolute top-[12%] right-[4%] md:top-[16%] md:right-[8%] flex flex-col items-end text-right">
                <div className="text-amber-200 font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-1.5 font-bold justify-end">
                  02. HİDRASYON
                  <span className="w-6 md:w-12 h-[1px] bg-amber-200/60" />
                </div>
                <div className="font-mono text-white text-xs md:text-xs bg-black/70 backdrop-blur-md px-3 py-1 border border-white/20 rounded-lg">
                  SU ORANI: %78 - %82
                </div>
                <p className="font-serif italic text-white/90 text-xs md:text-sm mt-1.5 max-w-[150px] md:max-w-[200px] leading-snug">
                  Yüksek su tutma kapasitesi sayesinde içi nemli ve yumuşak.
                </p>
              </div>

              {/* Annotation 3: Zaman */}
              <div className="absolute bottom-[14%] left-[4%] md:bottom-[16%] md:left-[8%] flex flex-col items-start">
                <div className="text-amber-200 font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-1.5 font-bold">
                  <span className="w-6 md:w-12 h-[1px] bg-amber-200/60" />
                  03. ZAMAN
                </div>
                <div className="font-mono text-white text-xs md:text-xs bg-black/70 backdrop-blur-md px-3 py-1 border border-white/20 rounded-lg">
                  UZUN SOĞUK MAYALAMA
                </div>
                <p className="font-serif italic text-white/90 text-xs md:text-sm mt-1.5 max-w-[160px] md:max-w-[220px] leading-snug">
                  Enzimatik aktivite ve derin aroma gelişimi için 24-36 saat.
                </p>
              </div>

              {/* Annotation 4: Ateş */}
              <div className="absolute bottom-[14%] right-[4%] md:bottom-[16%] md:right-[8%] flex flex-col items-end text-right">
                <div className="text-amber-200 font-serif text-xs md:text-sm tracking-widest flex items-center gap-2 mb-1.5 font-bold justify-end">
                  04. ATEŞ
                  <span className="w-6 md:w-12 h-[1px] bg-amber-200/60" />
                </div>
                <div className="font-mono text-white text-xs md:text-xs bg-black/70 backdrop-blur-md px-3 py-1 border border-white/20 rounded-lg">
                  TAŞ TABAN: 240°C
                </div>
                <p className="font-serif italic text-white/90 text-xs md:text-sm mt-1.5 max-w-[160px] md:max-w-[220px] leading-snug">
                  Buhar şokuyla mühürlenen çıtır karamelize kabuk.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
