import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ExternalLink,
  BookMarked,
  ShieldCheck,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { GRAPH, type SourceId } from "@/lib/knowledge/registry";
import { SITE_URL } from "@/lib/site";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(GRAPH.sources).map((id) => ({ id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const source = GRAPH.sources[id as SourceId];
  if (!source) return {};

  return {
    title: `${source.title} (${source.year}) | EkmekLab Bilimsel Kaynaklar`,
    description: `${source.authors.join(", ")}. ${source.venue || ""} (${source.year}).`,
    openGraph: {
      title: `${source.title} — EkmekLab`,
      description: `${source.authors.join(", ")} (${source.year})`,
      url: `${SITE_URL}/kaynak/${id}`,
    },
  };
}

export default async function SourceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const source = GRAPH.sources[id as SourceId];
  if (!source) notFound();

  // Find all claims citing this source
  const citingClaims = Object.entries(GRAPH.claims).filter(([, claim]) =>
    claim.evidence.some((ev) => ev.source === id)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": source.kind === "kitap" ? "Book" : "ScholarlyArticle",
    headline: source.title,
    author: source.authors.map((name) => ({ "@type": "Person", name })),
    datePublished: String(source.year),
    ...(source.doi ? { identifier: `https://doi.org/${source.doi}` } : {}),
    ...(source.venue ? { publisher: { "@type": "Organization", name: source.venue } } : {}),
  };

  return (
    <article className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-accent">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      {/* Breadcrumb Navigation */}
      <nav className="border-b border-line bg-cream-surface/60 py-3.5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-ink-muted">
          <Link
            href="/kavram"
            className="inline-flex items-center gap-1.5 hover:text-accent transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kavramlar ve Kaynaklar</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider text-xs px-2.5 py-0.5 rounded-full bg-cream-surface border border-line text-ink font-medium">
              {source.kind}
            </span>
            <span className="font-mono text-accent text-xs">
              {source.year}
            </span>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14 space-y-12 w-full">
        {/* Source Header */}
        <header className="space-y-4 border-b border-line pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-medium">
            <BookMarked className="w-3.5 h-3.5" />
            <span className="capitalize">{source.kind}</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-ink leading-snug">
            {source.title}
          </h1>

          <div className="text-xs sm:text-sm text-ink-muted space-y-1">
            <div className="font-medium text-ink">
              {source.authors.join(", ")}
            </div>
            {source.venue && (
              <div className="italic text-ink-muted">
                {source.venue} ({source.year})
              </div>
            )}
          </div>

          {/* DOI / External Link & Verification Badges */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            {source.doi && (
              <a
                href={`https://doi.org/${source.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-surface hover:border-accent/50 border border-line text-accent transition-colors font-mono shadow-xs"
              >
                <span>doi:{source.doi}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {source.isbn && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-surface border border-line text-ink-muted font-mono">
                <span>ISBN: {source.isbn}</span>
              </span>
            )}

            {source.url && !source.doi && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-surface hover:border-accent/50 border border-line text-accent transition-colors shadow-xs"
              >
                <span>Bağlantı</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-good/10 border border-good/30 text-good text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {source.verified.via === "crossref" ? "Crossref API Doğrulamalı" : "Doğrulanmış Kaynak"} ({source.verified.at})
              </span>
            </div>
          </div>
        </header>

        {/* Citing Claims Section */}
        <section className="space-y-6">
          <div className="border-b border-line pb-2 flex items-center justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-accent" />
              <span>Bu Kaynağa Dayanan İddialarımız</span>
              <span className="text-xs font-sans font-normal text-accent px-2 py-0.5 rounded-md bg-accent/10">
                {citingClaims.length}
              </span>
            </h2>
          </div>

          {citingClaims.length === 0 ? (
            <p className="text-xs text-ink-muted italic">
              Bu kaynağa bağlı henüz aktif iddia bulunmamaktadır.
            </p>
          ) : (
            <div className="space-y-4">
              {citingClaims.map(([claimId, claim]) => {
                const evidenceItem = claim.evidence.find((e) => e.source === id);

                return (
                  <div
                    key={claimId}
                    className="p-5 rounded-2xl bg-cream-surface border border-line space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                        {claim.text}
                      </p>
                      {claim.review && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-good bg-good/10 border border-good/30 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Tahsin Onaylı</span>
                        </span>
                      )}
                    </div>

                    {evidenceItem?.locator && (
                      <div className="text-xs text-ink-muted font-mono">
                        Konum: {evidenceItem.locator}
                      </div>
                    )}

                    {/* Related Concepts */}
                    {claim.about.length > 0 && (
                      <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-xs text-ink-muted">İlgili Kavramlar:</span>
                        {claim.about.map((cptId) => {
                          const concept = GRAPH.concepts[cptId as keyof typeof GRAPH.concepts];
                          return (
                            <Link
                              key={cptId}
                              href={`/kavram/${cptId}`}
                              className="px-2 py-0.5 rounded-md bg-bg hover:bg-cream-surface text-ink hover:text-accent border border-line transition-colors text-xs"
                            >
                              {concept ? concept.name : cptId}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </article>
  );
}
