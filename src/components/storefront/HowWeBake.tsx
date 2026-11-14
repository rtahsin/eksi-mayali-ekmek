import React from "react";
import { FEATURES } from "@/lib/features";

/**
 * Taş fırın üretim videoları bölümü.
 * Tahsin gerçek atölye çekimlerini yükleyip `FEATURES.nasilUretiyoruz` bayrağını açana kadar gizlidir.
 */
export function HowWeBake() {
  if (!FEATURES.nasilUretiyoruz) {
    return null;
  }

  return (
    <section
      id="nasil-uretiyoruz"
      aria-labelledby="tas-firin-uretim-baslik"
      className="relative py-16 md:py-24 bg-cream-surface text-ink border-b border-line overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">
            ATÖLYE KAYITLARI · TAŞ FIRIN GÜNLÜĞÜ
          </p>
          <h2
            id="tas-firin-uretim-baslik"
            className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight leading-[1.1]"
          >
            Undan taş tabana üretim adımları
          </h2>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed font-sans">
            Beylikdüzü bahçe atölyemizde taş değirmen unlarının tartımı, canlı ekşi maya beslemesi,
            soğuk fermantasyon ve 120 × 80 cm taş tabanlı fırından çıkış anları.
          </p>
        </div>
      </div>
    </section>
  );
}
