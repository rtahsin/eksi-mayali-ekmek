import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, ExternalLink, ArrowRight, CheckCircle2 } from "lucide-react";
import { GRAPH, type SourceId } from "@/lib/knowledge/registry";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";

export const metadata: Metadata = {
  title: "Bilimsel Kaynaklar & Literatür | EkmekLab",
  description:
    "EkmekLab bilgi çekirdeğinin dayandığı hakemli bilimsel makaleler, akademik kitaplar ve atölye kayıtları.",
};

export default function SourcesIndexPage() {
  const sources = Object.entries(GRAPH.sources) as [SourceId, (typeof GRAPH.sources)[SourceId]][];

  // Sort by year descending
  const sorted = [...sources].sort((a, b) => b[1].year - a[1].year);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-accent">
      <Navbar />

      <header className="border-b border-line bg-cream-surface/60 py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-medium mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Akademik Literatür & Doğrulanmış Kaynaklar</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink mb-4">
            Dayandığımız <span className="text-accent italic font-normal">Kaynaklar</span>
          </h1>
          <p className="text-sm sm:text-base text-ink-muted max-w-2xl leading-relaxed">
            EkmekLab'da paylaştığımız her bilginin arkasında hakemli akademik araştırmalar, gıda biyokimyası literatürü ve atölye deneyleri yer alır.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <span>Toplam {sources.length} Akademik Kaynak</span>
            <span>·</span>
            <span>Crossref Doğrulamalı DOI Kayıtları</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(([id, source]) => {
            const citingCount = Object.values(GRAPH.claims).filter((c) =>
              c.evidence.some((ev) => ev.source === id)
            ).length;

            return (
              <Link
                key={id}
                href={`/kaynak/${id}`}
                className="group p-5 rounded-2xl bg-cream-surface hover:border-accent/50 border border-line transition-all flex flex-col justify-between shadow-xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="uppercase text-xs tracking-wider px-2 py-0.5 rounded-full bg-cream-surface border border-line font-medium text-accent">
                      {source.kind}
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      {source.year}
                    </span>
                  </div>

                  <h2 className="font-serif text-base font-bold text-ink group-hover:text-accent transition-colors leading-snug line-clamp-2">
                    {source.title}
                  </h2>

                  <p className="text-xs text-ink-muted mt-2 line-clamp-1">
                    {source.authors.join(", ")}
                  </p>
                  {source.venue && (
                    <p className="text-xs italic text-ink-muted/80 mt-0.5 line-clamp-1">
                      {source.venue}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span>{citingCount} iddia</span>
                    <span className="text-good flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{source.verified.via}</span>
                    </span>
                  </div>
                  <span className="group-hover:translate-x-1 group-hover:text-accent transition-all flex items-center gap-1 font-medium">
                    Detay <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
