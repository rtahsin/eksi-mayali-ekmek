"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, BookOpen, Layers, AlertCircle, ArrowRight } from "lucide-react";
import {
  getSearchIndex,
  searchIndex,
  type SearchResult,
  type SearchDocKind,
} from "@/lib/editorial/search";

interface SearchProps {
  initialQuery?: string;
  autoFocus?: boolean;
  className?: string;
}

const KIND_CONFIG: Record<
  SearchDocKind,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  yazi: {
    label: "Yazı",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: BookOpen,
  },
  kavram: {
    label: "Kavram",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: Layers,
  },
  efsane: {
    label: "Efsane",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: AlertCircle,
  },
};

const SUGGESTIONS = [
  "Otoliz",
  "Karakılçık",
  "Gluten",
  "Sanfranciscensis",
  "Çavdar",
  "Fitik Asit",
  "Havadan Maya",
];

export function Search({ initialQuery = "", autoFocus = false, className = "" }: SearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const index = useMemo(() => {
    if (!mounted) return null;
    return getSearchIndex();
  }, [mounted]);

  const results: SearchResult[] = useMemo(() => {
    if (!index || !query.trim()) return [];
    return searchIndex(index, query.trim(), 20);
  }, [index, query]);

  return (
    <div className={`w-full max-w-3xl mx-auto space-y-6 ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-4 w-5 h-5 text-foreground/40 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kütüphanede ara (yazı, kavram, efsane, ata buğdayı...)"
          autoFocus={autoFocus}
          className="w-full pl-12 pr-11 py-3.5 bg-surface-panel/80 hover:bg-surface-panel focus:bg-surface-panel text-foreground placeholder:text-foreground/40 text-sm sm:text-base rounded-2xl border border-surface-border focus:border-artisan-gold/60 focus:outline-none focus:ring-2 focus:ring-artisan-gold/20 transition-all font-sans"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 p-1 rounded-full text-foreground/40 hover:text-foreground hover:bg-surface-elevated transition-colors"
            aria-label="Aramayı temizle"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions if no query */}
      {!query && (
        <div className="flex items-center gap-2 flex-wrap text-xs font-sans text-foreground/60 px-1">
          <span className="text-foreground/40">Önerilen aramalar:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="px-2.5 py-1 rounded-lg bg-surface-panel hover:bg-surface-elevated border border-surface-border text-foreground/80 hover:text-artisan-gold transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Results List */}
      {query.trim() && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-foreground/50 px-1">
            <span>
              {results.length > 0
                ? `${results.length} sonuç bulundu`
                : "Sonuç bulunamadı"}
            </span>
            {query && <span className="italic">“{query}” için</span>}
          </div>

          {results.length > 0 ? (
            <div className="space-y-2.5">
              {results.map(({ doc }) => {
                const config = KIND_CONFIG[doc.kind];
                const Icon = config.icon;

                return (
                  <Link
                    key={doc.id}
                    href={doc.url}
                    className="group block p-4 rounded-2xl bg-surface-panel/70 hover:bg-surface-panel border border-surface-border hover:border-artisan-gold/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{config.label}</span>
                          </span>
                          <h3 className="font-serif font-bold text-sm sm:text-base text-foreground group-hover:text-artisan-gold transition-colors truncate">
                            {doc.title}
                          </h3>
                        </div>

                        <p className="text-xs sm:text-sm text-foreground/70 font-sans line-clamp-2 leading-relaxed">
                          {doc.snippet}
                        </p>

                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            {doc.tags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-foreground/50"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="self-center p-2 rounded-xl text-foreground/30 group-hover:text-artisan-gold group-hover:translate-x-1 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-surface-border bg-surface-panel/30 space-y-2">
              <p className="text-sm text-foreground/60 font-sans">
                Aramanızla eşleşen bir yazı veya kavram bulunamadı.
              </p>
              <p className="text-xs text-foreground/40 font-mono">
                Farklı bir anahtar kelime deneyebilir veya yukarıdaki önerilerden birini seçebilirsiniz.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
