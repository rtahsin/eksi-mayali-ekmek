"use client";

import React from "react";

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
              Günün ekmeği her gün fırından çıkar; özel ekmekler kendi gününde.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                num: "01",
                title: "Ekmeğini ve Gününü Seç",
                desc: "Günün ekmeği her gün, özel ekmekler haftanın belli günlerinde. Üyelik gerekmez.",
              },
              {
                num: "02",
                title: "Taş Fırında Pişer",
                desc: "Ekşi mayayla, acele etmeden yoğrulur ve taş fırında pişer.",
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

      </div>
    </section>
  );
}
