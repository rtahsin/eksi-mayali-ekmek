export type JournalCategory = "tahil" | "mandira" | "et" | "metabolizma" | "felsefe";

export interface JournalCitation {
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi?: string;
  finding: string;
}

export interface JournalDiagram {
  type: "wheat_anatomy" | "dairy_fermentation" | "custom";
  caption: string;
  altText: string;
}

export interface JournalVideo {
  youtubeId?: string;
  videoUrl?: string;
  posterUrl: string;
  title: string;
  caption: string;
  duration: string;
}

export interface JournalSection {
  id: string;
  heading: string;
  paragraphs: string[];
  pullQuote?: string;
  diagram?: JournalDiagram;
  video?: JournalVideo;
  practicalTips?: string[];
}

export interface JournalArticle {
  id: string;
  slug: string;
  volumeNumber: number;
  volumeTitle: string;
  category: JournalCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  publishedDate: string;
  readingTimeMinutes: number;
  thirtySecondTakeaway: string;
  dropCapLetter: string;
  leadParagraph: string;
  sections: JournalSection[];
  citations: JournalCitation[];
  relatedProductId: string;
  nextArticle?: {
    slug: string;
    title: string;
    categoryLabel: string;
  };
  excerpt?: string;
  content?: string;
  readTime?: string;
  author?: string;
  imageUrl?: string;
  published?: boolean;
}
