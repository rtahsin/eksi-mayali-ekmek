import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import {
  articleIndex,
  getArticleMeta,
  getArticleComponent,
} from "@/lib/editorial";
import { Sources } from "@/components/editorial/Sources";
import { LearningTracker } from "@/components/editorial/LearningTracker";
import { SITE_URL } from "@/lib/site";
import { Clock, ArrowLeft, ShieldCheck } from "lucide-react";

export const dynamicParams = false;

export function generateStaticParams() {
  return articleIndex().map((article) => ({
    slug: article.slug,
  }));
}

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleMeta(slug);

  if (!article) {
    return {
      title: "Araştırma Dosyası | EkmekLab Bilim & Zanaat",
    };
  }

  return {
    title: `${article.title} | EkmekLab Bilim & Zanaat`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      url: `${SITE_URL}/kutuphane/${article.slug}`,
      siteName: "EkmekLab",
      locale: "tr_TR",
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: ["EkmekLab Araştırma Masası"],
      images: [
        {
          url: article.hero || "/atelier/atelier_threshold.webp",
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleMeta(slug);

  if (!article) {
    notFound();
  }

  const PostComponent = await getArticleComponent(slug);
  if (!PostComponent) {
    notFound();
  }

  // Schema.org Article JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt || article.updatedAt,
    dateModified: article.updatedAt,
    author: [
      {
        "@type": "Organization",
        name: "EkmekLab",
        url: SITE_URL,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "EkmekLab",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/kutuphane/${article.slug}`,
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-accent/20 selection:text-accent relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Arka Plan Atmosferi */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5 filter brightness-95 bg-cover bg-center"
        style={{
          backgroundImage: "url('/atelier/atelier_threshold.webp')",
        }}
      />

      <Navbar />
      <LearningTracker path={`/kutuphane/${article.slug}`} />

      <main className="relative z-10 flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 w-full">
        {/* Geri Dönüş Linki */}
        <div className="mb-8">
          <Link
            href="/kutuphane"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-muted hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kütüphaneye Dön</span>
          </Link>
        </div>

        {/* Makale Başlığı */}
        <header className="space-y-4 border-b border-line pb-8 mb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-accent">
            <span className="px-2.5 py-0.5 rounded-full bg-cream-surface border border-line text-ink">
              Araştırma Dosyası
            </span>
            <span className="flex items-center gap-1 text-ink-muted ml-auto">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{article.readingMinutes} dakika okuma</span>
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl text-ink tracking-tight leading-tight font-bold">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-ink-muted font-serif italic leading-relaxed">
            {article.summary}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs font-mono text-ink-muted">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>{article.claimsUsed.length} Doğrulanmış Literatür Kanıtı</span>
            <span>·</span>
            <span>Güncelleme: {article.updatedAt}</span>
          </div>
        </header>

        {/* MDX Makale Gövdesi */}
        <article className="prose max-w-none text-ink leading-relaxed font-sans text-base sm:text-lg prose-headings:font-serif prose-headings:text-ink prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-p:my-4 prose-a:text-accent prose-strong:text-ink">
          <PostComponent />
        </article>

        {/* Kaynakça Bölümü */}
        <Sources ids={article.sourcesUsed} />
      </main>

      <Footer />
    </div>
  );
}
