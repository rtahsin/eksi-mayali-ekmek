import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, BookOpen, Film, Flame } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { StalingSimulator } from "@/components/bilim/StalingSimulator";
import {
  DERGI_SAYILARI,
  getDergiSayi,
  getKomsuDergiSayilari,
} from "@/lib/bilim/dergi";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return DERGI_SAYILARI.map((s) => ({ kod: s.kod }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kod: string }>;
}): Promise<Metadata> {
  const { kod } = await params;
  const sayi = getDergiSayi(kod);
  if (!sayi) {
    return { title: "Sayı Bulunamadı · EkmekLab" };
  }

  const title = `Sayı #${sayi.kod}: ${sayi.baslik} | EkmekLab Taş Fırın Dergisi`;
  return {
    title,
    description: sayi.ozet,
    alternates: {
      canonical: `${SITE_URL}/bilim/sayi/${sayi.kod}`,
    },
    openGraph: {
      title,
      description: sayi.ozet,
      type: "article",
      locale: "tr_TR",
      url: `${SITE_URL}/bilim/sayi/${sayi.kod}`,
    },
  };
}

export default async function DergiSayiPage({
  params,
}: {
  params: Promise<{ kod: string }>;
}) {
  const { kod } = await params;
  const sayi = getDergiSayi(kod);
  if (!sayi) {
    notFound();
  }

  const { onceki, sonraki } = getKomsuDergiSayilari(sayi.kod);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-ink">
      <Navbar />

      <main className="flex-1 py-8 sm:py-12">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
          {/* 1. Üst Gazete Künyesi */}
          <div className="pb-4 border-b-4 border-double border-line flex flex-wrap items-center justify-between gap-3 text-xs font-mono uppercase tracking-wider text-ink-muted">
            <Link
              href="/bilim"
              className="min-h-11 inline-flex items-center gap-1.5 text-ink hover:text-accent transition-colors font-semibold"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Bilim Odası &amp; Tüm Sayılar</span>
            </Link>
            <div className="flex items-center gap-3">
              <span>TAŞ FIRIN DERGİSİ · {sayi.konuKodu}</span>
              <span aria-hidden="true">·</span>
              <span>~{sayi.okumaDakika} DK OKUMA</span>
            </div>
          </div>

          {/* 2. Kapak Başlığı & Soru */}
          <header className="space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent font-semibold">
              {sayi.ustEtiket}
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.08] text-balance">
              {sayi.baslik}
            </h1>
            <p className="font-serif italic text-lg sm:text-2xl text-ink-muted leading-snug max-w-3xl">
              {sayi.kancaSoru}
            </p>

            {/* Bölüm Atlama Çubuğu */}
            <nav
              aria-label="Bu sayıdaki bölümler"
              className="pt-2 flex flex-wrap gap-2"
            >
              {sayi.bolumler.map((b) => (
                <a
                  key={b.id}
                  href={`#${b.id}`}
                  className="px-3 py-1.5 rounded-lg bg-cream-surface border border-line text-xs font-mono text-ink-muted hover:text-ink hover:border-accent transition-colors"
                >
                  {b.baslik.split(":")[0]}
                </a>
              ))}
              {sayi.simulatorBreadType && (
                <a
                  href="#deney"
                  className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs font-mono font-semibold text-accent hover:bg-accent/15 transition-colors"
                >
                  Canlı Deney Simülatörü
                </a>
              )}
              <a
                href="#kese-kagidi-kurallari"
                className="px-3 py-1.5 rounded-lg bg-cream-surface border border-line text-xs font-mono text-ink-muted hover:text-ink hover:border-accent transition-colors"
              >
                3 Tezgâh Kuralı
              </a>
            </nav>
          </header>

          {/* 3. Üç Anahtar Ölçüm Şeridi */}
          <section
            aria-label="Temel ölçümler"
            className="rounded-2xl border border-line bg-cream-surface divide-y md:divide-y-0 md:divide-x divide-line grid grid-cols-1 md:grid-cols-3 overflow-hidden"
          >
            {sayi.rakamlar.map((rakam) => (
              <div key={rakam.deger} className="p-5 sm:p-6 space-y-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-serif text-3xl sm:text-4xl font-bold text-accent tabular-nums">
                    {rakam.deger}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    {rakam.birim}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  {rakam.aciklama}
                </p>
              </div>
            ))}
          </section>

          {/* 4. Giriş Anlatısı */}
          <div className="space-y-4 text-base sm:text-lg text-ink leading-relaxed max-w-[68ch]">
            {sayi.giris.map((paragraf, idx) => (
              <p
                key={idx}
                className={
                  idx === 0
                    ? "first-letter:float-left first-letter:mr-3 first-letter:font-serif first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-accent"
                    : ""
                }
              >
                {paragraf}
              </p>
            ))}
          </div>

          {/* 5. Ana Bölümler */}
          <div className="space-y-10 sm:space-y-12 border-t border-line pt-8 sm:pt-10">
            {sayi.bolumler.map((bolum) => (
              <section
                key={bolum.id}
                id={bolum.id}
                className="scroll-mt-24 space-y-4 max-w-[68ch]"
              >
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink leading-snug">
                  {bolum.baslik}
                </h2>

                {bolum.formul && (
                  <div className="px-4 py-3 rounded-xl bg-cream-surface border border-line font-mono text-xs sm:text-sm text-ink overflow-x-auto">
                    {bolum.formul}
                  </div>
                )}

                <div className="space-y-4 text-base text-ink/90 leading-relaxed">
                  {bolum.paragraflar.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* 6. Canlı Simülatör veya Hesaplayıcı Köprüsü */}
          {sayi.simulatorBreadType && (
            <section id="deney" className="scroll-mt-24 space-y-3 pt-4 border-t border-line">
              <div className="space-y-1">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                  ETKİLEŞİMLİ TEZGÂH DENEYİ
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  Oda Sıcaklığı vs. +4 °C Buzdolabı Bayatlama Simülatörü
                </h2>
                <p className="text-sm text-ink-muted">
                  Saklama ortamını ve günü değiştirerek nişasta kristalleşmesini ve 200 °C fırında 4 dakikalık yenileme etkisini dene.
                </p>
              </div>
              <StalingSimulator initialProfile={sayi.simulatorBreadType} />
            </section>
          )}

          {sayi.ilgiliArac && (
            <div className="p-5 sm:p-6 rounded-2xl border border-line bg-cream-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
                  TEZGÂH HESAPLAYICISI
                </p>
                <p className="font-serif text-lg sm:text-xl font-bold text-ink">
                  Bu sayının matematiğini kendi hamurunda uygula
                </p>
              </div>
              <Link
                href={sayi.ilgiliArac.href}
                className="min-h-11 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-ink text-bg font-mono text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
              >
                {sayi.ilgiliArac.baslik}
              </Link>
            </div>
          )}

          {/* 7. Efsane Mahkemesi */}
          <section
            aria-labelledby="efsane-mahkemesi-baslik"
            className="rounded-2xl border-2 border-line bg-cream-surface overflow-hidden"
          >
            <div className="px-5 sm:px-6 py-3 border-b border-line bg-bg/60 font-mono text-xs uppercase tracking-wider text-ink-muted font-semibold">
              <span id="efsane-mahkemesi-baslik">EFSANE MAHKEMESİ · ŞEHİR EFSANESİ VS. LABORATUVAR ÖLÇÜMÜ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line">
              <div className="p-5 sm:p-6 space-y-2">
                <p className="font-mono text-xs uppercase tracking-wider text-bad font-semibold">
                  ✕ YAYGIN İNANIŞ
                </p>
                <p className="font-serif italic text-base sm:text-lg text-ink leading-relaxed">
                  &ldquo;{sayi.efsane.yanlis}&rdquo;
                </p>
              </div>
              <div className="p-5 sm:p-6 space-y-2">
                <p className="font-mono text-xs uppercase tracking-wider text-good font-semibold">
                  ✓ ÖLÇÜMÜN SÖYLEDİĞİ
                </p>
                <p className="text-sm sm:text-base text-ink leading-relaxed">
                  {sayi.efsane.gercek}
                </p>
              </div>
            </div>
          </section>

          {/* 8. Kese Kâğıdı Özeti: Tezgâhta ve Sofrada 3 Altın Kural */}
          <section
            id="kese-kagidi-kurallari"
            className="scroll-mt-24 rounded-2xl border border-line bg-cream-surface p-6 sm:p-8 space-y-5"
          >
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent font-semibold">
                KESE KÂĞIDI ÖZETİ · UYGULANABİLİR 3 ADIM
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Tezgâhta ve Sofrada Net Kurallar
              </h2>
            </div>

            <ol className="space-y-3.5">
              {sayi.tezgahKurallari.map((kural, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3.5 p-4 rounded-xl bg-bg border border-line"
                >
                  <span className="font-mono text-sm font-bold text-accent shrink-0 pt-0.5">
                    0{idx + 1}
                  </span>
                  <p className="text-sm sm:text-base text-ink leading-relaxed">
                    {kural}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* 9. Taş Fırın & Mandıra Sipariş Köprüsü */}
          <section
            aria-label="Fırın ve eşlikçi sepet önerisi"
            className="rounded-2xl border-2 border-accent/35 bg-cream-surface p-6 sm:p-8 space-y-4"
          >
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              <Flame className="w-4 h-4" aria-hidden="true" />
              <span>TAŞ FIRINDAN SOFRANA</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
              {sayi.sepetOnerisi.baslik}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl">
              {sayi.sepetOnerisi.aciklama}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link
                href={sayi.sepetOnerisi.birincilCta.href}
                className="min-h-11 inline-flex items-center justify-center px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs"
              >
                {sayi.sepetOnerisi.birincilCta.etiket}
              </Link>
              <Link
                href={sayi.sepetOnerisi.ikincilCta.href}
                className="min-h-11 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line hover:border-accent font-mono text-xs transition-colors"
              >
                {sayi.sepetOnerisi.ikincilCta.etiket}
              </Link>
            </div>
          </section>

          {/* 10. Birleşik Video & Kese Kâğıdı Mutfak Kartı (Native <details>) */}
          <details className="group rounded-2xl border border-line bg-cream-surface overflow-hidden">
            <summary className="min-h-12 px-5 sm:px-6 py-4 cursor-pointer flex items-center justify-between gap-3 font-mono text-xs uppercase tracking-wider text-ink hover:text-accent transition-colors list-none">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Film className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <span>
                  Bu Sayının 45 Saniyelik Video Senaryosu &amp; Teknik Levha Bağlantısı ({sayi.reels.toplamSure})
                </span>
              </span>
              <span className="text-ink-muted group-open:rotate-180 transition-transform" aria-hidden="true">
                ▾
              </span>
            </summary>

            <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-line space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <p className="font-serif font-bold text-base text-ink">
                  {sayi.reels.baslik}
                </p>
                <span className="font-mono">
                  Kese Kâğıdı QR Hedefi: {SITE_URL}/bilim?sayi={sayi.kod}
                </span>
              </div>

              <div className="space-y-2.5">
                {sayi.reels.sahneler.map((sahne) => (
                  <div
                    key={sahne.sure}
                    className="p-3.5 rounded-xl bg-bg border border-line grid grid-cols-1 md:grid-cols-12 gap-2.5 text-xs sm:text-sm"
                  >
                    <div className="md:col-span-2 font-mono text-xs font-bold text-accent">
                      {sahne.sure}
                    </div>
                    <div className="md:col-span-4 text-ink-muted">
                      <span className="font-mono text-[10px] uppercase tracking-wider block text-ink/70">
                        Kamera / Sahne
                      </span>
                      {sahne.cekim}
                    </div>
                    <div className="md:col-span-6 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider block text-accent font-semibold">
                        [{sahne.ekranYazisi}]
                      </span>
                      <p className="text-ink font-medium leading-relaxed">
                        &ldquo;{sahne.metin}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line text-xs font-mono">
                <Link
                  href={`/bilim/${sayi.anId}`}
                  className="inline-flex items-center gap-1.5 text-ink hover:text-accent underline underline-offset-4"
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Bu konunun grafikli teknik referans fişini aç (/bilim/{sayi.anId}) →</span>
                </Link>
              </div>
            </div>
          </details>

          {/* 11. Hakemli Kaynakça */}
          <section aria-labelledby="kaynakca-baslik" className="space-y-3 pt-4 border-t border-line">
            <h2
              id="kaynakca-baslik"
              className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted font-semibold"
            >
              HAKEMLİ LİTERATÜR &amp; DOĞRULANMIŞ KAYNAKLAR
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-ink-muted">
              {sayi.kaynaklar.map((k, i) => (
                <li key={i} className="leading-relaxed">
                  <strong className="text-ink font-medium">{k.yazarYil}.</strong>{" "}
                  {k.baslik}. <cite className="italic">{k.dergi}</cite>.
                  {k.doi && (
                    <>
                      {" "}
                      <a
                        href={`https://doi.org/${k.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
                      >
                        <span>DOI: {k.doi}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* 12. Önceki / Sonraki Sayı Gezintisi */}
          <nav
            aria-label="Diğer dergi sayıları"
            className="pt-6 border-t-4 border-double border-line grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {onceki ? (
              <Link
                href={`/bilim/sayi/${onceki.kod}`}
                className="p-4 rounded-2xl border border-line bg-cream-surface hover:border-accent transition-colors space-y-1"
              >
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Önceki Sayı · #{onceki.kod}</span>
                </span>
                <span className="block font-serif text-base sm:text-lg font-bold text-ink leading-snug">
                  {onceki.baslik}
                </span>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}

            {sonraki ? (
              <Link
                href={`/bilim/sayi/${sonraki.kod}`}
                className="p-4 rounded-2xl border border-line bg-cream-surface hover:border-accent transition-colors space-y-1 sm:text-right"
              >
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-muted flex items-center sm:justify-end gap-1">
                  <span>Sonraki Sayı · #{sonraki.kod}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="block font-serif text-base sm:text-lg font-bold text-ink leading-snug">
                  {sonraki.baslik}
                </span>
              </Link>
            ) : null}
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  );
}
