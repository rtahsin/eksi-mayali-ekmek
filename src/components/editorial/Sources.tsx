import React from "react";
import { SOURCES, type SourceId } from "@/lib/knowledge/registry";

interface SourcesProps {
  ids?: readonly SourceId[];
}

export function Sources({ ids }: SourcesProps) {
  // ids verilmişse onları göster, verilmemişse boş dön (sayfa bazında kaynaklar doldurulabilir)
  if (!ids || ids.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-line">
      <h3 className="font-serif text-lg text-ink mb-4 flex items-center gap-2">
        <span className="text-accent">📚</span>
        <span>Yazıda Yararlanılan Kaynaklar</span>
      </h3>
      <ul className="space-y-3">
        {ids.map((id) => {
          const src = SOURCES[id];
          if (!src) return null;
          const doi = "doi" in src ? (src as { doi?: string }).doi : undefined;
          const venue = "venue" in src ? (src as { venue?: string }).venue : undefined;

          return (
            <li
              key={id}
              className="text-xs text-ink-muted leading-relaxed p-3.5 rounded-xl bg-cream-surface border border-line"
            >
              <div className="font-sans font-medium text-ink">
                {src.authors.join(", ")} ({src.year})
              </div>
              <div className="italic text-accent mt-0.5">{src.title}</div>
              <div className="text-xs text-ink-muted mt-1.5 flex flex-wrap gap-x-3">
                {venue && <span>{venue}</span>}
                {doi && (
                  <a
                    href={`https://doi.org/${doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline font-mono"
                  >
                    doi:{doi}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
