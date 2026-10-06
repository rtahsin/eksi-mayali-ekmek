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
    <div className="min-h-screen flex flex-col bg-[#120E0B] text-[#E8E0D5] font-sans selection:bg-[#B4532A]/30 selection:text-[#D4A373] relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Arka Plan Atmosferi */}
      <div
        className="fixed inset-0 pointer-events-none opacity-15 filter brightness-90 contrast-125 sepia-[.15] bg-cover bg-center"
        style={{
          backgroundImage: "url('/atelier/atelier_threshold.webp')",
        }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-[#120E0B]/90 via-[#14100D]/85 to-[#120E0B]/95" />

      <Navbar />
      <LearningTracker path={`/kutuphane/${article.slug}`} />

      <main className="relative z-10 flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14 w-full">
        {/* Geri Dönüş Linki */}
        <div className="mb-8">
          <Link
            href="/kutuphane"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A89F91] hover:text-[#D4A373] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kütüphaneye Dön</span>
          </Link>
        </div>

        {/* Makale Başlığı */}
        <header className="space-y-4 border-b border-[#3D342E] pb-8 mb-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#D4A373]">
            <span className="px-2 py-0.5 rounded-full bg-[#2C2521] border border-[#3D342E]">
              Araştırma Dosyası
            </span>
            <span className="flex items-center gap-1 text-[#A89F91] ml-auto">
              <Clock className="w-3.5 h-3.5 text-[#B4532A]" />
              <span>{article.readingMinutes} dakika okuma</span>
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl text-[#E8E0D5] tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-base sm:text-lg text-[#A89F91] font-serif italic leading-relaxed">
            {article.summary}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#A89F91]">
            <ShieldCheck className="w-4 h-4 text-[#B4532A]" />
            <span>{article.claimsUsed.length} Doğrulanmış Literatür Kanıtı</span>
            <span>·</span>
            <span>Güncelleme: {article.updatedAt}</span>
          </div>
        </header>

        {/* MDX Makale Gövdesi */}
        <article className="prose prose-invert prose-stone max-w-none text-[#E8E0D5] leading-relaxed font-sans text-base sm:text-lg prose-headings:font-serif prose-headings:text-[#E8E0D5] prose-h2:text-2xl sm:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-p:my-4 prose-a:text-[#D4A373] prose-strong:text-[#E8E0D5]">
          <PostComponent />
        </article>

        {/* Kaynakça Bölümü */}
        <Sources ids={article.sourcesUsed} />
      </main>

      <Footer />
    </div>
  );
}
