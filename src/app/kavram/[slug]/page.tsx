import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  ExternalLink,
  Layers,
  FlaskConical,
  GraduationCap,
  Hammer,
  ShieldCheck,
  Gamepad2,
} from "lucide-react";
import { GRAPH, type ConceptId, type ClaimId } from "@/lib/knowledge/registry";
import { claimsAbout, sourcesFor } from "@/lib/knowledge/query";
import { articleIndex } from "@/lib/editorial";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(GRAPH.concepts).map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const concept = GRAPH.concepts[slug as ConceptId];
  if (!concept) return {};

  return {
    title: `${concept.name} | EkmekLab Kavramlar Sözlüğü`,
    description: concept.layers.usta.slice(0, 160),
    openGraph: {
      title: `${concept.name} — EkmekLab`,
      description: concept.layers.usta.slice(0, 160),
      url: `${SITE_URL}/kavram/${slug}`,
    },
  };
}

export default async function ConceptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const concept = GRAPH.concepts[slug as ConceptId];
  if (!concept) notFound();

  const claims = claimsAbout(slug as ConceptId);
  // Find claim IDs
  const claimIds: ClaimId[] = [];
  for (const [id, c] of Object.entries(GRAPH.claims)) {
    if (c.about.includes(slug as ConceptId)) {
      claimIds.push(id as ClaimId);
    }
  }
  const sources = sourcesFor(claimIds);
  const relatedArticles = articleIndex().filter((a) =>
    a.concepts.includes(slug)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: concept.name,
    description: concept.layers.neden,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "EkmekLab Kavramlar Sözlüğü",
      url: `${SITE_URL}/kavram`,
    },
  };

  return (
    <article className="min-h-screen bg-surface text-foreground font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb / Top Navigation */}
      <nav className="border-b border-surface-border bg-surface-panel/40 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-foreground/60">
          <Link
            href="/kavram"
            className="inline-flex items-center gap-1.5 hover:text-artisan-gold transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kavramlar Sözlüğü</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-surface-elevated border border-surface-border">
              {concept.kind}
            </span>
            {concept.nick && (
              <span className="font-mono text-artisan-gold text-[11px]">
                @{concept.nick}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14 space-y-12">
        {/* Concept Header */}
        <header className="space-y-3 border-b border-surface-border pb-8">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            {concept.name}
          </h1>
          {concept.latin && (
            <p className="text-sm sm:text-base italic font-serif text-artisan-gold/90">
              {concept.latin}
            </p>
          )}
        </header>

        {/* 3-Layer Breakdown */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-artisan-gold">
            <Layers className="w-4 h-4" />
            <span>3 Katmanlı Anlatım</span>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* 1. Usta Katmanı */}
            <div className="p-6 rounded-2xl bg-surface-panel/80 border border-surface-border space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm">
                <Hammer className="w-4 h-4" />
                <span>1. Usta Katmanı — Ne Görüyorsun?</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-sans pl-6">
                {concept.layers.usta}
              </p>
            </div>

            {/* 2. Neden Katmanı */}
            <div className="p-6 rounded-2xl bg-surface-panel/80 border border-surface-border space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-serif font-bold text-sm">
                <FlaskConical className="w-4 h-4" />
                <span>2. Neden Katmanı — Mekanizma</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-sans pl-6">
                {concept.layers.neden}
              </p>
            </div>

            {/* 3. Bilim Katmanı */}
            <div className="p-6 rounded-2xl bg-surface-panel/80 border border-surface-border space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-serif font-bold text-sm">
                <GraduationCap className="w-4 h-4" />
                <span>3. Bilim Katmanı — Biyokimya & Mikrobiyoloji</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed font-sans pl-6">
                {concept.layers.bilim}
              </p>
            </div>
          </div>
        </section>

        {/* Identity Rows (if present) */}
        {concept.identity && concept.identity.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Karakteristik Özellikler
            </h2>
            <div className="rounded-2xl border border-surface-border overflow-hidden bg-surface-panel/60">
              <table className="w-full text-xs font-sans">
                <tbody>
                  {concept.identity.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-surface-border last:border-b-0"
                    >
                      <td className="py-3 px-4 font-semibold text-foreground/70 w-1/3">
                        {item.label}
                      </td>
                      <td className="py-3 px-4 text-foreground/90 font-medium">
                        {item.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Claims Section */}
        {claims.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
                <span>Doğrulanmış Bilimsel İddialar</span>
                <span className="text-xs font-sans font-normal text-artisan-gold/80 px-2 py-0.5 rounded-md bg-artisan-gold/10">
                  {claims.length}
                </span>
              </h2>
            </div>

            <div className="space-y-3">
              {claims.map((claim, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-surface-panel/60 border border-surface-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                      {claim.text}
                    </p>
                    {claim.review && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Tahsin Onaylı</span>
                      </span>
                    )}
                  </div>

                  {claim.evidence && claim.evidence.length > 0 && (
                    <div className="pt-2 border-t border-surface-border/40 flex flex-wrap items-center gap-2 text-[11px] text-foreground/60">
                      <span className="font-medium text-foreground/40">Kaynak:</span>
                      {claim.evidence.map((ev, eIdx) => {
                        const src = GRAPH.sources[ev.source as keyof typeof GRAPH.sources];
                        return (
                          <Link
                            key={eIdx}
                            href={`/kaynak/${ev.source}`}
                            className="hover:text-artisan-gold underline decoration-artisan-gold/30 hover:decoration-artisan-gold transition-colors"
                          >
                            {src ? `${src.authors[0]?.split(" ")[0]} et al. (${src.year})` : ev.source}
                            {ev.locator ? ` [${ev.locator}]` : ""}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sources Section */}
        {sources.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Dayanılan Akademik Kaynaklar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sources.map((src, idx) => {
                // Find source ID in GRAPH.sources
                const srcId = Object.entries(GRAPH.sources).find(
                  ([, s]) => s.title === src.title && s.year === src.year
                )?.[0];

                return (
                  <Link
                    key={idx}
                    href={`/kaynak/${srcId || ""}`}
                    className="group p-4 rounded-xl bg-surface-panel/50 hover:bg-surface-elevated border border-surface-border hover:border-artisan-gold/40 transition-all text-xs"
                  >
                    <div className="font-semibold text-foreground group-hover:text-artisan-gold transition-colors line-clamp-2">
                      {src.title}
                    </div>
                    <div className="text-[11px] text-foreground/60 mt-1">
                      {src.authors.join(", ")} ({src.year})
                    </div>
                    {src.venue && (
                      <div className="text-[10px] italic text-foreground/40 mt-0.5">
                        {src.venue}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-foreground">
              İlgili Kütüphane Yazıları
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {relatedArticles.map((art) => (
                <Link
                  key={art.slug}
                  href={`/kutuphane/${art.slug}`}
                  className="group p-5 rounded-2xl bg-surface-panel/60 hover:bg-surface-elevated border border-surface-border hover:border-artisan-gold/40 transition-all"
                >
                  <div className="font-serif text-base font-bold text-foreground group-hover:text-artisan-gold transition-colors">
                    {art.title}
                  </div>
                  <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                    {art.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* "Oyunda Gör" CTA */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-artisan-brown/30 via-surface-panel to-artisan-gold/10 border border-artisan-gold/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-serif font-bold text-foreground text-base">
              <Gamepad2 className="w-5 h-5 text-artisan-gold" />
              <span>Atölye Laboratuvarında Dene</span>
            </div>
            <p className="text-xs text-foreground/70">
              Bu kavramın fermantasyon sürecine ve ekmek yapısına etkisini simülasyonda interaktif olarak gözlemle.
            </p>
          </div>
          <Link
            href="/laboratuvar"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-artisan-gold hover:bg-artisan-gold-light text-stone-950 font-medium text-xs transition-colors shrink-0 font-sans shadow-md"
          >
            <span>Laboratuvara Git</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </section>
      </main>
    </article>
  );
}
