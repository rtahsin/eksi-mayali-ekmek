"use client";

import { useState, useEffect, useCallback } from "react";
import { JournalArticle } from "@/types/journal";
import { JOURNAL_ARTICLES } from "@/data/journalArticles";
import {
  getStoredJournalArticles,
  saveStoredJournalArticles,
  upsertJournalArticle,
  removeJournalArticle,
  resetJournalArticlesToDefaults,
} from "@/lib/journal/journalStorage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function useJournal() {
  const [articles, setArticles] = useState<JournalArticle[]>(() => {
    if (typeof window !== "undefined") {
      return getStoredJournalArticles();
    }
    return JOURNAL_ARTICLES;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = createClient();

  // Load articles from Supabase or localStorage
  useEffect(() => {
    const local = getStoredJournalArticles();
    setArticles(local);
    setLoading(false);

    async function syncSupabase() {
      if (!supabase || !isSupabaseConfigured()) return;
      try {
        const { data, error } = await (supabase as any)
          .from("journal_articles")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: JournalArticle[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            slug: d.slug,
            excerpt: d.excerpt || "",
            content: d.content || "",
            category: d.category || "fermentation",
            readTime: d.read_time || "5 dk",
            author: d.author || "Tahsin Usta",
            imageUrl: d.image_url,
            published: d.published !== false,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
          setArticles(mapped);
          saveStoredJournalArticles(mapped);
        }
      } catch {
        // Fallback silently to local storage
      }
    }

    syncSupabase();

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<JournalArticle[]>;
      if (customEvent.detail) {
        setArticles(customEvent.detail);
      } else {
        setArticles(getStoredJournalArticles());
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "ekmeklab_journal_articles_v1") {
        setArticles(getStoredJournalArticles());
      }
    };

    window.addEventListener("ekmeklab-journal-updated", handleCustomUpdate);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("ekmeklab-journal-updated", handleCustomUpdate);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [supabase]);

  const saveArticle = useCallback(
    async (article: JournalArticle) => {
      const updated = upsertJournalArticle(article);
      setArticles(updated);

      if (supabase) {
        try {
          await (supabase as any).from("journal_articles").upsert({
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || "",
            content: article.content,
            category: article.category || "fermentation",
            read_time: article.readTime || "5 dk",
            author: article.author || "Tahsin Usta",
            image_url: article.imageUrl || null,
            published: article.published !== false,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("Supabase save article notice:", e);
        }
      }
    },
    [supabase]
  );

  const deleteArticle = useCallback(
    async (identifier: string) => {
      const updated = removeJournalArticle(identifier);
      setArticles(updated);

      if (supabase) {
        try {
          await (supabase as any)
            .from("journal_articles")
            .delete()
            .or(`id.eq.${identifier},slug.eq.${identifier}`);
        } catch (e) {
          console.warn("Supabase delete article notice:", e);
        }
      }
    },
    [supabase]
  );

  const getArticleBySlug = useCallback(
    (slug: string) => {
      return (
        articles.find((a) => a.slug === slug) ||
        JOURNAL_ARTICLES.find((a) => a.slug === slug)
      );
    },
    [articles]
  );

  const resetToDefaults = useCallback(() => {
    const reset = resetJournalArticlesToDefaults();
    setArticles(reset);
  }, []);

  return {
    articles,
    loading,
    saveArticle,
    deleteArticle,
    getArticleBySlug,
    resetToDefaults,
  };
}
