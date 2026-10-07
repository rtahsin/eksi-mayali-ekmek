import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { articleIndex } from "@/lib/editorial";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Kütüphane | EkmekLab Bilim & Zanaat",
  description: "Ekşi mayalı ekmekçiliğin biyokimyası, kadim tahıllar ve fırıncılık mekanikleri.",
};

const LEVEL_LABELS: Record<1 | 2 | 3, { label: string; badge: string }> = {
  1: { label: "1. Usta & Sofra", badge: "bg-bg text-ink border-line" },
  2: { label: "2. Hamur & Neden", badge: "bg-accent/10 text-accent border-accent/30" },
  3: { label: "3. Molekül & Bilim", badge: "bg-good/10 text-good border-good/30" },
};

export default function LibraryIndexPage() {
  const articles = articleIndex().filter((a) => a.status !== "arsiv");

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-accent relative overflow-hidden">
      {/* Arka Plan Dokusu */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5 filter brightness-95 bg-cover bg-center"
        style={{
          backgroundImage: "url('/atelier/atelier_threshold.webp')",
        }}
      />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-12 w-full">
        {/* Başlık ve Künye */}
        <header className="space-y-4 border-b border-line pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono tracking-widest uppercase text-accent gap-2">
            <span>EKMEKLAB · BİLİM & ZANAAT KÜTÜPHANESİ</span>
            <span className="text-ink-muted">KANIT TEMELLİ EKMEKÇİLİK</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink tracking-tight font-bold">
            Hamurun Biyokimyası ve Fırın Zanaatı
          </h1>
          <p className="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl">
            Sağlık vaatleri ve kulaktan dolma şehir efsaneleri yerine; hakemli literatür,
            laboratuvar verileri ve atölye deneyleriyle doğrulanan araştırma dosyaları.
          </p>
        </header>

        {/* Yazı Listesi */}
        <section className="space-y-6">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="group p-6 sm:p-8 rounded-2xl bg-cream-surface border border-line hover:border-accent/60 transition-all duration-200 shadow-xs hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {article.levels.map((lvl) => {
                  const info = LEVEL_LABELS[lvl];
                  return (
                    <span
                      key={lvl}
                      className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${info.badge}`}
                    >
                      {info.label}
                    </span>
                  );
                })}
                <span className="text-xs text-ink-muted flex items-center gap-1 font-mono ml-auto">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>{article.readingMinutes} dk okuma</span>
                </span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl text-ink group-hover:text-accent transition-colors mb-3">
                <Link href={`/kutuphane/${article.slug}`} className="focus:outline-none">
                  {article.title}
                </Link>
              </h2>

              <p className="text-sm sm:text-base text-ink-muted leading-relaxed mb-6">
                {article.summary}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-line/60">
                <div className="flex items-center gap-2 text-xs font-mono text-accent">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{article.claimsUsed.length} Doğrulanmış Kanıt</span>
                </div>
                <Link
                  href={`/kutuphane/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-ink group-hover:text-accent transition-colors font-medium"
                >
                  <span>Dosyayı İncele</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
