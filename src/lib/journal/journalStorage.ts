import { JournalArticle } from "@/types/journal";
import { JOURNAL_ARTICLES } from "@/data/journalArticles";

const STORAGE_KEY = "ekmeklab_journal_articles_v1";

/**
 * Get initial articles from localStorage or fallback to default seed articles
 */
export function getStoredJournalArticles(): JournalArticle[] {
  if (typeof window === "undefined") {
    return JOURNAL_ARTICLES;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Initialize storage with default seed
      localStorage.setItem(STORAGE_KEY, JSON.stringify(JOURNAL_ARTICLES));
      return JOURNAL_ARTICLES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return JOURNAL_ARTICLES;
  } catch (err) {
    console.error("Error reading journal articles from storage:", err);
    return JOURNAL_ARTICLES;
  }
}

/**
 * Save all articles to storage
 */
export function saveStoredJournalArticles(articles: JournalArticle[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    // Dispatch custom event for cross-component reactive sync
    window.dispatchEvent(new CustomEvent("ekmeklab-journal-updated", { detail: articles }));
  } catch (err) {
    console.error("Error saving journal articles to storage:", err);
  }
}

/**
 * Add or update a single article
 */
export function upsertJournalArticle(article: JournalArticle): JournalArticle[] {
  const current = getStoredJournalArticles();
  const index = current.findIndex((a) => a.id === article.id || a.slug === article.slug);

  let updated: JournalArticle[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...updated[index], ...article };
  } else {
    updated = [article, ...current];
  }

  saveStoredJournalArticles(updated);
  return updated;
}

/**
 * Delete an article by ID or slug
 */
export function removeJournalArticle(identifier: string): JournalArticle[] {
  const current = getStoredJournalArticles();
  const updated = current.filter((a) => a.id !== identifier && a.slug !== identifier);
  saveStoredJournalArticles(updated);
  return updated;
}

/**
 * Reset articles back to original seed masterclasses
 */
export function resetJournalArticlesToDefaults(): JournalArticle[] {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(JOURNAL_ARTICLES));
    window.dispatchEvent(new CustomEvent("ekmeklab-journal-updated", { detail: JOURNAL_ARTICLES }));
  }
  return JOURNAL_ARTICLES;
}
