import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const EDITORIAL_COLUMNS = [
  {
    no: "№ 01",
    rubric: "CANLI DENEY LEVHASI",
    title: "Canlı Nişasta & Bayatlama Simülatörü",
    excerpt:
      "+4°C buzdolabı somunu neden oda sıcaklığından 3 kat hızlı sertleştirir? 200°C fırında 4 dakikalık ısıtma >60°C DSC eşiğinde amilopektin kristallerini nasıl çözer?",
    href: "/bilim/rafta_ilk_hafta",
    cta: "Simülatörü ve Levhayı Aç",
  },
  {
    no: "№ 02",
    rubric: "KAYNAKLI BİLİM ATLASI",
    title: "Bilim Odası: Tarladan Dilime 26 An",
    excerpt:
      "Buğday tanesinin anatomisinden ekşi maya bakterilerine, fırının ilk 8 dakikasından Efsane Dosyası'na kadar her cümlesi akademik kaynağa bağlı açık kütüphane.",
    href: "/bilim",
    cta: "Bilim Odasına Gir",
  },
  {
    no: "№ 03",
    rubric: "ATÖLYE TEZGÂH MATEMATİĞİ",
    title: "Fırıncı Hesaplayıcıları & DDT",
    excerpt:
      "Un = %100 fırıncı yüzdesi ölçekleyici, yoğurma sürtünmesi dahil istenen hamur sıcaklığı (DDT), Q10 ekşi maya besleme zamanlayıcısı ve tazelik eğrisi.",
    href: "/arac",
    cta: "Hesaplayıcıları Kullan",
  },
] as const;

export function ScienceDiscoveryBridge() {
  return (
    <section
      aria-labelledby="tas-firin-gazetesi-baslik"
      className="py-16 md:py-20 bg-bg text-ink border-b border-line"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-y-4 border-double border-line bg-cream-surface text-ink">
          {/* Üst Gazete Künyesi (Masthead) */}
          <div className="px-5 sm:px-8 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            <span>EKMEKLAB · TAŞ FIRIN GAZETESİ &amp; AÇIK MUTFAK LABORATUVARI</span>
            <span>BEYLİKDÜZÜ ATÖLYE BASKISI · ÖLÇÜM &amp; KAYNAK</span>
          </div>

          {/* Ana Gazete Manşeti */}
          <div className="px-5 sm:px-8 py-7 sm:py-9 border-b border-line grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-end">
            <div className="lg:col-span-7 space-y-2">
              <h2
                id="tas-firin-gazetesi-baslik"
                className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-ink leading-[1.08]"
              >
                Hamurda, fırında ve sofrada ne oluyor?
              </h2>
            </div>
            <p className="lg:col-span-5 text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
              Kulaktan dolma fırıncılık mitleri yerine tahıl kimyası, fermantasyon
              mikrobiyolojisi ve açık tezgâh ölçümleri. Öğrendiğimiz her şeyi kese
              kâğıdından ekrana şeffafça paylaşıyoruz.
            </p>
          </div>

          {/* 3 Numaralı Editoryal Sütun */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
            {EDITORIAL_COLUMNS.map((col) => (
              <article
                key={col.href}
                className="p-5 sm:p-8 flex flex-col justify-between space-y-6 hover:bg-bg/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-serif italic text-2xl sm:text-3xl text-accent font-normal">
                      {col.no}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {col.rubric}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink leading-snug">
                    {col.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
                    {col.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-line">
                  <Link
                    href={col.href}
                    className="group min-h-11 inline-flex items-center justify-between w-full font-mono text-xs sm:text-sm font-semibold text-ink hover:text-accent transition-colors"
                  >
                    <span className="underline underline-offset-4">{col.cta}</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
