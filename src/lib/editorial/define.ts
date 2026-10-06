export type AudienceLevel = 1 | 2 | 3;

export interface ArticleMetaInput {
  title: string;
  summary: string;
  levels: readonly AudienceLevel[];
  concepts: readonly string[];
  status: "taslak" | "inceleme" | "yayinda" | "arsiv";
  updatedAt: `${number}-${number}-${number}`;
  publishedAt?: `${number}-${number}-${number}`;
  hero?: string;
  video?: string;
  products?: readonly string[];
  series?: string;
  fromInbox?: string;
}

export const defineArticle = <const T extends ArticleMetaInput>(meta: T): T => meta;
