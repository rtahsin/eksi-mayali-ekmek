import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const EDITORIAL_COLUMNS = [
  {
    no: "№ 01",
    rubric: "TAŞ FIRIN DERGİSİ · SAYI #05",
    title: "Sıcak Somun, Tereyağı, Yoğurt ve Sucuk: Sofranın Kimyası",
    excerpt:
      "34 °C'de eriyen köy tereyağı açık ekmek gözeneklerinde neden göl olmaz, ekşi maya doğal yoğurdun sulanmasını nasıl durdurur ve fermente sucukla ekmek neden aynı bakterilerin kardeşidir?",
    href: "/bilim/sayi/05",
    cta: "Sayı #05 Dergisini Oku",
  },
  {
    no: "№ 02",
    rubric: "CANLI DENEY · SAYI #02",
    title: "Çavdar Fiziği & +4 °C Buzdolabı Bayatlama Simülatörü",
    excerpt:
      "%100 çavdar hamuru neden yoğrulmaz, fırından çıkınca neden 24 saat bıçak vurulmaz ve +4 °C buzdolabı ekmeği oda sıcaklığından nasıl katbekat hızlı sertleştirir?",
    href: "/bilim/sayi/02#deney",
    cta: "Sayı #02 ve Simülatörü Aç",
  },
  {
    no: "№ 03",
    rubric: "TÜM SAYILAR & TEZGÂH ARAÇLARI",
    title: "Taş Fırın Dergisi (Sayı #01–#05) ve Hesaplayıcılar",
    excerpt:
      "Ekşi mayanın ilk 10 gününden 100:1 maltoz ortaklığına, pencere testi yanılsamasından fırıncı yüzdesi ve DDT su sıcaklığı hesaplayıcılarına kadar tek çatıda açık mutfak kütüphanesi.",
    href: "/bilim",
    cta: "Bilim Odası & Tüm Sayılar",
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
            <span>EKMEKLAB · TAŞ FIRIN DERGİSİ &amp; AÇIK MUTFAK LABORATUVARI</span>
            <span>WEB · KESE KÂĞIDI GAZETESİ · 45 SN VİDEO</span>
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
              mikrobiyolojisi ve açık tezgâh ölçümleri. Kese kâğıdı gazetesinden ekrana
              aynı sayıları paylaşıyoruz.
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
