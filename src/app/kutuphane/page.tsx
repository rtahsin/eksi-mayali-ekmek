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
  1: { label: "1. Usta & Sofra", badge: "bg-[#2C2521] text-[#D4A373] border-[#3D342E]" },
  2: { label: "2. Hamur & Neden", badge: "bg-[#3D261E] text-[#B4532A] border-[#6E3019]" },
  3: { label: "3. Molekül & Bilim", badge: "bg-[#1E263D] text-[#8EA7E9] border-[#2A3B66]" },
};

export default function LibraryIndexPage() {
  const articles = articleIndex().filter((a) => a.status !== "arsiv");

  return (
    <div className="min-h-screen flex flex-col bg-[#120E0B] text-[#E8E0D5] font-sans selection:bg-[#B4532A]/30 selection:text-[#D4A373] relative overflow-hidden">
      {/* Arka Plan Dokusu */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 filter brightness-90 contrast-125 sepia-[.15] bg-cover bg-center"
        style={{
          backgroundImage: "url('/atelier/atelier_threshold.webp')",
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#120E0B]/90 via-[#14100D]/85 to-[#120E0B]/95" />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-12 w-full">
        {/* Başlık ve Künye */}
        <header className="space-y-4 border-b border-[#3D342E] pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono tracking-widest uppercase text-[#D4A373] gap-2">
            <span>EKMEKLAB · BİLİM & ZANAAT KÜTÜPHANESİ</span>
            <span className="text-[#A89F91]">KANIT TEMELLİ EKMEKÇİLİK</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#E8E0D5] tracking-tight">
            Hamurun Biyokimyası ve Fırın Zanaatı
          </h1>
          <p className="text-sm sm:text-base text-[#A89F91] leading-relaxed max-w-2xl">
            Sağlık vaatleri ve kulaktan dolma şehir efsaneleri yerine; hakemli literatür,
            laboratuvar verileri ve atölye deneyleriyle doğrulanan araştırma dosyaları.
          </p>
        </header>

        {/* Yazı Listesi */}
        <section className="space-y-6">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="group p-6 sm:p-8 rounded-2xl bg-[#1C1815]/90 border border-[#3D342E] hover:border-[#B4532A]/60 transition-all duration-200 shadow-lg hover:shadow-2xl"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {article.levels.map((lvl) => {
                  const info = LEVEL_LABELS[lvl];
                  return (
                    <span
                      key={lvl}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${info.badge}`}
                    >
                      {info.label}
                    </span>
                  );
                })}
                <span className="text-xs text-[#A89F91] flex items-center gap-1 font-mono ml-auto">
                  <Clock className="w-3.5 h-3.5 text-[#B4532A]" />
                  <span>{article.readingMinutes} dk okuma</span>
                </span>
              </div>

              <h2 className="font-serif text-xl sm:text-2xl text-[#E8E0D5] group-hover:text-[#D4A373] transition-colors mb-3">
                <Link href={`/kutuphane/${article.slug}`} className="focus:outline-none">
                  {article.title}
                </Link>
              </h2>

              <p className="text-sm text-[#A89F91] leading-relaxed mb-6">
                {article.summary}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[#3D342E]/60">
                <div className="flex items-center gap-2 text-xs font-mono text-[#D4A373]">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{article.claimsUsed.length} Doğrulanmış Kanıt</span>
                </div>
                <Link
                  href={`/kutuphane/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#E8E0D5] group-hover:text-[#B4532A] transition-colors font-medium"
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
