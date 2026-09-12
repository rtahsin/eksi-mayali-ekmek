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
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useJournal() {
  const [articles, setArticles] = useState<JournalArticle[]>(() => {
    if (typeof window !== "undefined") {
      return getStoredJournalArticles();
    }
    return JOURNAL_ARTICLES;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Load articles from localStorage and optionally Firestore
  useEffect(() => {
    // 1. Initial read from localStorage
    const local = getStoredJournalArticles();
    setArticles(local);
    setLoading(false);

    // 2. Try to sync from Firestore if available
    async function syncFirestore() {
      try {
        if (!db) return;
        const snapshot = await getDocs(collection(db, "journal_articles"));
        if (!snapshot.empty) {
          const remoteArticles: JournalArticle[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as JournalArticle;
            remoteArticles.push({ ...data, id: doc.id });
          });
          if (remoteArticles.length > 0) {
            setArticles(remoteArticles);
            saveStoredJournalArticles(remoteArticles);
          }
        }
      } catch {
        // Firestore may be in local dev or permissions restricted, fallback silently to local
      }
    }

    syncFirestore();

    // 3. Listen for internal and cross-tab storage events
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
  }, []);

  const saveArticle = useCallback((article: JournalArticle) => {
    const updated = upsertJournalArticle(article);
    setArticles(updated);
  }, []);

  const deleteArticle = useCallback((identifier: string) => {
    const updated = removeJournalArticle(identifier);
    setArticles(updated);
  }, []);

  const getArticleBySlug = useCallback(
    (slug: string) => {
      return articles.find((a) => a.slug === slug) || JOURNAL_ARTICLES.find((a) => a.slug === slug);
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
