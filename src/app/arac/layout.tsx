import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, Thermometer, Clock, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Profesyonel Fırıncı Araçları | EkmekLab Atölye",
  description:
    "Zanaatkar ekmek yapımı için hassas fırıncı yüzdesi, istenen hamur sıcaklığı (DDT) ve ekşi maya besleme zamanlayıcı hesaplayıcıları.",
  openGraph: {
    title: "Profesyonel Fırıncı Araçları | EkmekLab",
    description:
      "Fırıncı yüzdesi, DDT su sıcaklığı ve ekşi maya besleme planlayıcı.",
    type: "website",
  },
};

export default function AracLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Üst Başlık & Gezinme Sekmeleri */}
      <header className="border-b border-line bg-cream-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-ink-muted uppercase tracking-wider font-mono">
                <Link href="/" className="hover:text-accent transition-colors">
                  EkmekLab
                </Link>
                <span>/</span>
                <Link href="/arac" className="hover:text-accent transition-colors">
                  Atölye Araçları
                </Link>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink mt-0.5">
                Profesyonel Fırıncı Araçları
              </h1>
            </div>

            {/* Hızlı Araç Geçiş Butonları */}
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs sm:text-sm font-medium">
              <Link
                href="/arac"
                className="px-3 py-1.5 rounded-lg border border-line hover:border-accent hover:bg-bg transition-colors flex items-center gap-1.5 whitespace-nowrap text-ink-muted hover:text-ink"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Genel Bakış</span>
              </Link>
              <Link
                href="/arac/firinci-yuzdesi"
                className="px-3 py-1.5 rounded-lg border border-line hover:border-accent hover:bg-bg transition-colors flex items-center gap-1.5 whitespace-nowrap text-ink-muted hover:text-ink"
              >
                <Calculator className="w-3.5 h-3.5 text-accent" />
                <span>Fırıncı Yüzdesi</span>
              </Link>
              <Link
                href="/arac/ddt"
                className="px-3 py-1.5 rounded-lg border border-line hover:border-accent hover:bg-bg transition-colors flex items-center gap-1.5 whitespace-nowrap text-ink-muted hover:text-ink"
              >
                <Thermometer className="w-3.5 h-3.5 text-accent" />
                <span>DDT (Hamur Isısı)</span>
              </Link>
              <Link
                href="/arac/maya-planlayici"
                className="px-3 py-1.5 rounded-lg border border-line hover:border-accent hover:bg-bg transition-colors flex items-center gap-1.5 whitespace-nowrap text-ink-muted hover:text-ink"
              >
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>Maya Planlayıcı</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Ana İçerik */}
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
