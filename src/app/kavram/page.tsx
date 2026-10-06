import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Sparkles, ArrowRight, Dna } from "lucide-react";
import { GRAPH, type ConceptId } from "@/lib/knowledge/registry";
import { claimsAbout } from "@/lib/knowledge/query";
import type { ConceptKind } from "@/lib/knowledge/types";

export const metadata: Metadata = {
  title: "Kavramlar Sözlüğü | EkmekLab Bilim & Zanaat",
  description:
    "Ekşi maya biyolojisi, un kimyası ve fırıncılık mekaniği: canlılar, enzimler, olaylar ve atalık tahıllar sözlüğü.",
};

const KIND_LABELS: Record<ConceptKind, { title: string; desc: string }> = {
  canli: { title: "Canlılar & Mayalar", desc: "Ekşi mayayı yaşatan yabani mayalar ve laktik asit bakterileri" },
  molekul: { title: "Moleküller & Şekerler", desc: "Nişasta, gluten, maltoz ve fermantasyon yakıtları" },
  enzim: { title: "Enzimler", desc: "Nişastayı ve proteini parçalayan biyolojik katalizörler" },
  olay: { title: "Olaylar & Mekanizmalar", desc: "Otolizden kabarmaya hamurda gerçekleşen dönüşümler" },
  tahil: { title: "Kadim Tahıllar", desc: "Karakılçık, siyez ve Anadolu'nun bin yıllık buğday mirası" },
  un: { title: "Unlar & Değirmen", desc: "Taş değirmen tam buğday ve unun tane yapısı" },
  katki: { title: "Doğal Bileşenler", desc: "Su, tuz ve mineral dengesi" },
  teknik: { title: "Zanaat Teknikleri", desc: "Katlama, dinlendirme ve fırınlama metotları" },
  efsane: { title: "Efsaneler & Yanılgılar", desc: "Kulaktan dolma bilgilerin bilimsel düzeltmeleri" },
  tarih: { title: "Tarih & Miras", desc: "Ekmekçiliğin bin yıllık kültürel kökleri" },
};

const KIND_ORDER: ConceptKind[] = [
  "canli",
  "olay",
  "molekul",
  "enzim",
  "tahil",
  "un",
  "katki",
  "teknik",
  "efsane",
  "tarih",
];

export default function ConceptsIndexPage() {
  const allConcepts = Object.entries(GRAPH.concepts) as [ConceptId, (typeof GRAPH.concepts)[ConceptId]][];

  // Group concepts by kind
  const grouped: Partial<Record<ConceptKind, typeof allConcepts>> = {};
  for (const item of allConcepts) {
    const kind = item[1].kind;
    if (!grouped[kind]) grouped[kind] = [];
    grouped[kind]!.push(item);
  }

  return (
    <div className="min-h-screen bg-surface text-foreground font-sans">
      {/* Hero Header */}
      <header className="border-b border-surface-border bg-surface-panel/40 py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-artisan-gold/10 border border-artisan-gold/30 text-artisan-gold text-xs font-medium mb-4">
            <Dna className="w-3.5 h-3.5" />
            <span>Fırıncılık & Fermantasyon Sözlüğü</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Bilim & Zanaat <span className="text-artisan-gold italic">Kavramları</span>
          </h1>
          <p className="text-sm sm:text-base text-foreground/70 max-w-2xl leading-relaxed">
            Ekşi mayanın canlı ekosisteminden taş değirmende unun öğütülmesine kadar atölyede gözlemlediğimiz her olgunun bilimsel karşılığı. Kulaktan dolma inanışlar yerine doğrulanmış kanıtlar.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-foreground/50">
            <span>Toplam {allConcepts.length} Kavram</span>
            <span>·</span>
            <span>3 Katmanlı Anlatım (Usta / Neden / Bilim)</span>
            <span>·</span>
            <span>Doğrulanmış Literatür Kaynakları</span>
          </div>
        </div>
      </header>

      {/* Grouped Concepts Section */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {KIND_ORDER.map((kind) => {
          const items = grouped[kind];
          if (!items || items.length === 0) return null;
          const meta = KIND_LABELS[kind];

          return (
            <section key={kind} className="space-y-4">
              <div className="border-b border-surface-border pb-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                  <span>{meta.title}</span>
                  <span className="text-xs font-sans font-normal text-artisan-gold/80 px-2 py-0.5 rounded-md bg-artisan-gold/10">
                    {items.length}
                  </span>
                </h2>
                <p className="text-xs text-foreground/60 mt-1">{meta.desc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(([slug, concept]) => {
                  const claims = claimsAbout(slug);
                  const hasReviewed = claims.some((c) => c.review !== null);

                  return (
                    <Link
                      key={slug}
                      href={`/kavram/${slug}`}
                      className="group p-5 rounded-2xl bg-surface-panel/70 hover:bg-surface-elevated border border-surface-border hover:border-artisan-gold/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-serif text-lg font-bold text-foreground group-hover:text-artisan-gold transition-colors">
                            {concept.name}
                          </span>
                          {concept.nick && (
                            <span className="text-[11px] font-mono text-artisan-gold/90 px-2 py-0.5 rounded-full bg-artisan-brown/20 border border-artisan-gold/20">
                              {concept.nick}
                            </span>
                          )}
                        </div>

                        {concept.latin && (
                          <div className="text-xs italic text-foreground/50 mb-2 font-serif">
                            {concept.latin}
                          </div>
                        )}

                        <p className="text-xs text-foreground/75 leading-relaxed line-clamp-2">
                          {concept.layers.usta}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-foreground/50">
                        <div className="flex items-center gap-2">
                          <span>{claims.length} iddia</span>
                          {hasReviewed && (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <Sparkles className="w-3 h-3" />
                              <span>Onaylı</span>
                            </span>
                          )}
                        </div>
                        <span className="group-hover:translate-x-1 group-hover:text-artisan-gold transition-all flex items-center gap-1 font-medium">
                          İncele <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
