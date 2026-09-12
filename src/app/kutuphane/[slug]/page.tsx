import React from "react";
import type { Metadata } from "next";
import { JOURNAL_ARTICLES } from "@/data/journalArticles";
import { DynamicArticleReader } from "@/components/journal/DynamicArticleReader";

export function generateStaticParams() {
  return JOURNAL_ARTICLES.map((art) => ({
    slug: art.slug,
  }));
}

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = JOURNAL_ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: "Araştırma Dosyası | EkmekLab Bilim & Zanaat",
    };
  }

  return {
    title: `${article.title} | EkmekLab Bilim & Zanaat`,
    description: article.subtitle,
    openGraph: {
      title: article.title,
      description: article.subtitle,
      url: `https://ekmeklab.com/kutuphane/${article.slug}`,
      siteName: "EkmekLab",
      locale: "tr_TR",
      type: "article",
      publishedTime: article.publishedDate,
      authors: ["EkmekLab Araştırma Masası"],
      images: [
        {
          url: "/atelier/atelier_panorama.png",
          width: 1536,
          height: 1024,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.subtitle,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const initialArticle = JOURNAL_ARTICLES.find((a) => a.slug === slug);

  return <DynamicArticleReader initialArticle={initialArticle} slug={slug} />;
}
