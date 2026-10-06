import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, ExternalLink, ArrowRight, CheckCircle2 } from "lucide-react";
import { GRAPH, type SourceId } from "@/lib/knowledge/registry";

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
    <div className="min-h-screen bg-surface text-foreground font-sans">
      <header className="border-b border-surface-border bg-surface-panel/40 py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-artisan-gold/10 border border-artisan-gold/30 text-artisan-gold text-xs font-medium mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Akademik Literatür & Doğrulanmış Kaynaklar</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Dayandığımız <span className="text-artisan-gold italic">Kaynaklar</span>
          </h1>
          <p className="text-sm sm:text-base text-foreground/70 max-w-2xl leading-relaxed">
            EkmekLab'da paylaştığımız her bilginin arkasında hakemli akademik araştırmalar, gıda biyokimyası literatürü ve atölye deneyleri yer alır.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-foreground/50">
            <span>Toplam {sources.length} Akademik Kaynak</span>
            <span>·</span>
            <span>Crossref Doğrulamalı DOI Kayıtları</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map(([id, source]) => {
            const citingCount = Object.values(GRAPH.claims).filter((c) =>
              c.evidence.some((ev) => ev.source === id)
            ).length;

            return (
              <Link
                key={id}
                href={`/kaynak/${id}`}
                className="group p-5 rounded-2xl bg-surface-panel/70 hover:bg-surface-elevated border border-surface-border hover:border-artisan-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-surface-elevated border border-surface-border font-medium text-artisan-gold">
                      {source.kind}
                    </span>
                    <span className="font-mono text-xs text-foreground/50">
                      {source.year}
                    </span>
                  </div>

                  <h2 className="font-serif text-base font-bold text-foreground group-hover:text-artisan-gold transition-colors leading-snug line-clamp-2">
                    {source.title}
                  </h2>

                  <p className="text-xs text-foreground/60 mt-2 line-clamp-1">
                    {source.authors.join(", ")}
                  </p>
                  {source.venue && (
                    <p className="text-[11px] italic text-foreground/40 mt-0.5 line-clamp-1">
                      {source.venue}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-foreground/50">
                  <div className="flex items-center gap-2">
                    <span>{citingCount} iddia</span>
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{source.verified.via}</span>
                    </span>
                  </div>
                  <span className="group-hover:translate-x-1 group-hover:text-artisan-gold transition-all flex items-center gap-1 font-medium">
                    Detay <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
