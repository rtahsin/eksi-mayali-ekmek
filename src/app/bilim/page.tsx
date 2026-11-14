import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Flame, FlaskConical, Scale } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { DERGI_SAYILARI } from "@/lib/bilim/dergi";
import { LEVHALAR } from "@/lib/bilim/levhalar";
import { resolveGazeteSayi } from "@/lib/bilim/sayi";
import { getAn, getYolculuk } from "@/lib/bilim/server";

export const metadata: Metadata = {
  title: "Taş Fırın Dergisi & Bilim Odası | EkmekLab",
  description:
    "Ekşi maya ekolojisi, çavdar ve buğday hamuru fiziği, sofralık mandıra-şarküteri kimyası ve etkileşimli fırıncı deneyleri. Kese kâğıdından ekrana tek kaynaklı açık mutfak dergisi.",
};

const ROMA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

interface BilimDiziniProps {
  searchParams: Promise<{ sayi?: string | string[] }>;
}

export default async function BilimDizini({ searchParams }: BilimDiziniProps) {
  const params = await searchParams;
  const gazeteSayi = resolveGazeteSayi(params?.sayi);
  const yolculuk = getYolculuk();
  const toplam = yolculuk.duraklar.reduce((n, d) => n + d.anlar.length, 0);
  const inancSayisi = yolculuk.duraklar.reduce(
    (n, d) => n + d.anlar.reduce((m, a) => m + getAn(a.id).yuzlesme.length, 0),
    0
  );

  // En güncel sayı vitrin kapağında, diğerleri 2x2 dergi rafında gösterilir
  const kapakSayisi = DERGI_SAYILARI[4]; // Sayı #05 (Sofranın Fizikokimyası)
  const rafSayilari = DERGI_SAYILARI.slice(0, 4); // Sayı #01..#04

  let levhaNo = 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-ink">
      <Navbar />

      <main className="flex-1 py-8 sm:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
          {/* Kese Kâğıdı QR (?sayi=01..05) Karşılama Kartı */}
          {gazeteSayi && (
            <section
              aria-label={`Taş Fırın Gazetesi Sayı ${gazeteSayi.kod}`}
              className="rounded-2xl border-2 border-accent bg-cream-surface p-6 sm:p-8 shadow-xs space-y-3"
            >
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">
                KESE KÂĞIDI GAZETESİ · SAYI #{gazeteSayi.kod}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink leading-snug">
                {gazeteSayi.baslik}
              </h2>
              <p className="text-sm sm:text-base text-ink-muted max-w-3xl leading-relaxed">
                {gazeteSayi.alt}
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href={gazeteSayi.dergiHref}
                  className="min-h-11 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-xs sm:text-sm transition-colors"
                >
                  Sayı #{gazeteSayi.kod} Dergisini Oku →
                </Link>
                <Link
                  href="/#ekmekler"
                  className="min-h-11 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line hover:border-accent font-mono text-xs transition-colors"
                >
                  Taze Somun &amp; Eşlikçi Sepetini Gör →
                </Link>
              </div>
            </section>
          )}

          {/* 1. Üst Gazete Künyesi & Başlık */}
          <header className="border-y-4 border-double border-line bg-cream-surface px-5 sm:px-8 py-7 sm:py-9 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
              <span>EKMEKLAB · TAŞ FIRIN DERGİSİ &amp; BİLİM ODASI</span>
              <span>WEB · KESE KÂĞIDI GAZETESİ · 45 SN VİDEO TEK ÇATI</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-end pt-1">
              <div className="lg:col-span-8 space-y-2">
                <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.06]">
                  Hamurda, fırında ve sofrada ne oluyor?
                </h1>
              </div>
              <p className="lg:col-span-4 text-xs sm:text-sm text-ink-muted leading-relaxed">
                Her sayıda tek bir mutfak sorusunu tam metin hakemli deneylerle açıyor;
                tezgâhta ve sofrada doğrudan işine yarayacak net kurallara bağlıyoruz.
              </p>
            </div>
          </header>

          {/* 2. YAYINLANAN DERGİ SAYILARI (Sayı #01 – #05) */}
          <section aria-labelledby="dergi-rafi-baslik" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                  TAŞ FIRIN DERGİSİ · YAYINLANAN 5 SAYI
                </p>
                <h2
                  id="dergi-rafi-baslik"
                  className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1"
                >
                  Okumaya Hazır Sayılar
                </h2>
              </div>
              <span className="font-mono text-xs text-ink-muted">
                Her sayıda: Tam makale + 3 tezgâh kuralı + 45 sn video özeti
              </span>
            </div>

            {/* Öne Çıkan Sayı (#05 — Sofranın Fizikokimyası) */}
            {kapakSayisi && (
              <Link
                href={`/bilim/sayi/${kapakSayisi.kod}`}
                className="group block rounded-2xl border-2 border-accent/35 bg-cream-surface hover:border-accent p-6 sm:p-8 transition-colors space-y-5 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs uppercase tracking-wider">
                  <span className="text-accent font-bold">
                    ÖNE ÇIKAN SAYI · {kapakSayisi.ustEtiket}
                  </span>
                  <span className="text-ink-muted">~{kapakSayisi.okumaDakika} dk okuma</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 space-y-2.5">
                    <h3 className="font-serif text-2xl sm:text-4xl font-bold text-ink group-hover:text-accent transition-colors leading-tight">
                      {kapakSayisi.baslik}
                    </h3>
                    <p className="font-serif italic text-base sm:text-lg text-ink-muted leading-snug">
                      {kapakSayisi.kancaSoru}
                    </p>
                  </div>

                  <div className="lg:col-span-4 grid grid-cols-3 gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-line">
                    {kapakSayisi.rakamlar.map((r) => (
                      <div
                        key={r.deger}
                        className="p-3 rounded-xl bg-bg border border-line text-center space-y-0.5"
                      >
                        <div className="font-serif text-base sm:text-lg font-bold text-accent tabular-nums">
                          {r.deger}
                        </div>
                        <div className="font-mono text-[10px] text-ink-muted leading-tight">
                          {r.birim}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between text-xs sm:text-sm font-mono font-semibold text-ink group-hover:text-accent">
                  <span>Sayı #{kapakSayisi.kod} Dergisini &amp; Canlı Simülatörü Aç</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            )}

            {/* Sayı #01 .. #04 Izgarası */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {rafSayilari.map((sayi) => (
                <Link
                  key={sayi.kod}
                  href={`/bilim/sayi/${sayi.kod}`}
                  className="group rounded-2xl border border-line bg-cream-surface hover:border-accent p-6 flex flex-col justify-between space-y-5 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider">
                      <span className="text-accent font-semibold">{sayi.ustEtiket}</span>
                      <span className="text-ink-muted">~{sayi.okumaDakika} dk</span>
                    </div>

                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink group-hover:text-accent transition-colors leading-snug">
                      {sayi.baslik}
                    </h3>

                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                      {sayi.kancaSoru}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-line">
                    <div className="flex flex-wrap gap-2">
                      {sayi.rakamlar.map((r) => (
                        <span
                          key={r.deger}
                          className="px-2.5 py-1 rounded-lg bg-bg border border-line font-mono text-[11px] text-ink"
                        >
                          <strong className="text-accent">{r.deger}</strong> {r.birim}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs font-semibold text-ink group-hover:text-accent">
                      <span className="underline underline-offset-4">
                        Sayı #{sayi.kod} Tam Metnini Oku
                      </span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 3. ETKİLEŞİMLİ DENEYLER & TEZGÂH ARAÇLARI */}
          <section aria-labelledby="etkilesimli-araclar-baslik" className="space-y-5 pt-4 border-t border-line">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                UYGULAMALI LABORATUVAR
              </p>
              <h2
                id="etkilesimli-araclar-baslik"
                className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1"
              >
                Simülatörler, Hesaplayıcılar ve Efsane Dosyası
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Link
                href="/bilim/sayi/02#deney"
                className="group p-5 sm:p-6 rounded-2xl border border-line bg-cream-surface hover:border-accent transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <FlaskConical className="w-5 h-5 text-accent" aria-hidden="true" />
                  <h3 className="font-serif text-xl font-bold text-ink group-hover:text-accent transition-colors">
                    Bayatlama &amp; +4 °C Simülatörü
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    Oda sıcaklığı, +4 °C buzdolabı ve -18 °C derin dondurucuda nişasta kristalleşmesini gün gün karşılaştır.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-ink group-hover:text-accent underline underline-offset-4">
                  Deneyi Başlat →
                </span>
              </Link>

              <Link
                href="/arac"
                className="group p-5 sm:p-6 rounded-2xl border border-line bg-cream-surface hover:border-accent transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <Calculator className="w-5 h-5 text-accent" aria-hidden="true" />
                  <h3 className="font-serif text-xl font-bold text-ink group-hover:text-accent transition-colors">
                    Fırıncı Hesaplayıcıları
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    Un = %100 fırıncı yüzdesi ölçekleyici, yoğurma sürtünmesi dahil DDT su sıcaklığı ve Q10 maya takvimi.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-ink group-hover:text-accent underline underline-offset-4">
                  Araçları Aç →
                </span>
              </Link>

              <Link
                href="/bilim/efsaneler"
                className="group p-5 sm:p-6 rounded-2xl border border-line bg-cream-surface hover:border-accent transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <Scale className="w-5 h-5 text-accent" aria-hidden="true" />
                  <h3 className="font-serif text-xl font-bold text-ink group-hover:text-accent transition-colors">
                    Efsane Dosyası ({inancSayisi} Madde)
                  </h3>
                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    Fırıncılıkta kulaktan kulağa yayılan {inancSayisi} şehir efsanesi ve hakemli ölçümlerin gerçek yanıtları.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-ink group-hover:text-accent underline underline-offset-4">
                  Dosyayı İncele →
                </span>
              </Link>
            </div>
          </section>

          {/* 4. İKİNCİL TEKNİK REFERANS DİZİNİ (Native <details> ile sadeleştirildi) */}
          <section className="pt-4 border-t border-line">
            <details className="group rounded-2xl border border-line bg-cream-surface overflow-hidden">
              <summary className="min-h-14 px-5 sm:px-7 py-4 cursor-pointer flex flex-wrap items-center justify-between gap-3 list-none">
                <div className="space-y-0.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
                    TEKNİK REFERANS ATLASI · {toplam} GRAFİKLİ KISA FİŞ
                  </p>
                  <p className="font-serif text-lg sm:text-xl font-bold text-ink">
                    Tarladan Dilime 26 Teknik Levha Dizini (Tümünü Gör)
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-ink-muted group-hover:text-accent inline-flex items-center gap-1.5">
                  <span className="group-open:hidden">Dizini Aç</span>
                  <span className="hidden group-open:inline">Dizini Kapat</span>
                  <span className="group-open:rotate-180 transition-transform" aria-hidden="true">
                    ▾
                  </span>
                </span>
              </summary>

              <div className="px-5 sm:px-7 pb-7 pt-3 border-t border-line space-y-8">
                {yolculuk.duraklar.map((durak, i) => (
                  <div key={durak.id} className="space-y-3">
                    <h3 className="font-serif text-xl font-bold text-ink pb-2 border-b border-line">
                      <span className="italic text-accent mr-2">{ROMA[i]}.</span>
                      {durak.ad}
                    </h3>
                    <ol className="divide-y divide-line">
                      {durak.anlar.map((a) => {
                        levhaNo += 1;
                        const ilk = LEVHALAR[a.id]?.rakamlar[0];
                        return (
                          <li key={a.id}>
                            <Link
                              href={`/bilim/${a.id}`}
                              className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 hover:text-accent transition-colors"
                            >
                              <div className="flex items-baseline gap-3">
                                <span className="font-mono text-xs text-ink-muted tabular-nums">
                                  {String(levhaNo).padStart(2, "0")}
                                </span>
                                <div>
                                  <span className="font-serif font-bold text-base text-ink hover:text-accent">
                                    {a.baslik}
                                  </span>
                                  <span className="block text-xs italic text-ink-muted">
                                    {a.soru}
                                  </span>
                                </div>
                              </div>
                              <span className="font-mono text-xs text-ink-muted pl-7 sm:pl-0 shrink-0">
                                {ilk ? (
                                  <>
                                    <strong className="text-ink font-semibold">{ilk.deger}</strong>{" "}
                                    {ilk.birim}
                                  </>
                                ) : (
                                  "etkileşimli şema"
                                )}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {/* Alt Fırın Çağrısı */}
          <div className="p-6 rounded-2xl border border-line bg-cream-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
              <p className="text-sm text-ink">
                <strong>Beylikdüzü Taş Fırın Atölyesi:</strong> Okuduğun tüm fermantasyon ve
                sofra prensiplerini günlük taze somunlarımızda ve mandıra seçkimizde deneyimle.
              </p>
            </div>
            <Link
              href="/#ekmekler"
              className="min-h-11 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-xs sm:text-sm shrink-0 transition-colors"
            >
              Fırın Vitrini →
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
