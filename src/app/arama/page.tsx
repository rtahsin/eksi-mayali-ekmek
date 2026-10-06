import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Search } from "@/components/editorial/Search";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Arama | EkmekLab Bilim & Zanaat",
  description:
    "EkmekLab Kütüphanesi ve Kavramlar sözlüğünde arama yapın. Ata buğdayları, fermantasyon biyolojisi ve ekmek bilimi.",
};

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#120E0B] text-[#E8E0D5] font-sans relative overflow-hidden">
      <Navbar />

      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8 w-full">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/kutuphane"
            className="inline-flex items-center gap-1.5 text-xs text-foreground/60 hover:text-artisan-gold transition-colors font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kütüphane'ye Dön</span>
          </Link>
        </div>

        {/* Header */}
        <header className="space-y-3 border-b border-[#3D342E] pb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4A373] tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>EKMEKLAB BİLGİ MERKEZİ</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Kütüphane ve Kavram Arama
          </h1>
          <p className="text-sm text-foreground/70 font-sans max-w-xl leading-relaxed">
            Ata tohumları, fermantasyon biyolojisi, doğru bilinen yanlışlar ve artisan fırıncılık teknikleri arasında arama yapın.
          </p>
        </header>

        {/* Search Component with Suspense */}
        <Suspense
          fallback={
            <div className="w-full h-48 rounded-2xl bg-surface-panel/40 animate-pulse flex items-center justify-center text-xs text-foreground/40 font-mono">
              Arama indeksi yükleniyor...
            </div>
          }
        >
          <Search autoFocus />
        </Suspense>
      </main>
    </div>
  );
}
