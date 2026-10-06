import { meta as karakilcikMeta } from "@content/articles/karakilcik-bugdayi/meta";
import type { ArticleMetaInput } from "./define";
import type { ClaimId, SourceId } from "@/lib/knowledge/registry";
import type { ContentRef } from "@/lib/knowledge/refs";

export interface ArticleIndexEntry extends ArticleMetaInput {
  slug: string;
  claimsUsed: ClaimId[];
  sourcesUsed: SourceId[];
  readingMinutes: number;
}

const ARTICLES: readonly ArticleIndexEntry[] = [
  {
    slug: "karakilcik-bugdayi",
    ...karakilcikMeta,
    claimsUsed: [
      "claim_damaged_starch",
      "claim_gluten_structure",
      "claim_autolyse_effect",
    ],
    sourcesUsed: ["delcour_2010", "calvel_1974"],
    readingMinutes: 3,
  },
];

export function articleIndex(): readonly ArticleIndexEntry[] {
  return ARTICLES;
}

export function getArticleMeta(slug: string): ArticleIndexEntry | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export async function getArticleComponent(slug: string) {
  switch (slug) {
    case "karakilcik-bugdayi": {
      const mod = await import("@content/articles/karakilcik-bugdayi/index.mdx");
      return mod.default;
    }
    default:
      return null;
  }
}

export function toContentRefs(): ContentRef[] {
  return ARTICLES.map((article) => ({
    kind: "yazi",
    id: article.slug,
    status: article.status,
    surface: article.products && article.products.length > 0 ? "urun" : "icerik",
    claimIds: article.claimsUsed,
    conceptIds: article.concepts,
    mediaIds: [],
    summary: article.summary,
    levels: article.levels,
  }));
}
