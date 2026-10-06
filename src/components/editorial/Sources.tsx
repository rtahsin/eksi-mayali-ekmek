import React from "react";
import { SOURCES, type SourceId } from "@/lib/knowledge/registry";

interface SourcesProps {
  ids?: readonly SourceId[];
}

export function Sources({ ids }: SourcesProps) {
  // ids verilmişse onları göster, verilmemişse boş dön (sayfa bazında kaynaklar doldurulabilir)
  if (!ids || ids.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-[#3D342E]">
      <h3 className="font-serif text-lg text-[#E8E0D5] mb-4 flex items-center gap-2">
        <span className="text-[#B4532A]">📚</span>
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
              className="text-xs text-[#A89F91] leading-relaxed p-3 rounded-lg bg-[#1C1815] border border-[#3D342E]/60"
            >
              <div className="font-sans font-medium text-[#E8E0D5]">
                {src.authors.join(", ")} ({src.year})
              </div>
              <div className="italic text-[#D4A373] mt-0.5">{src.title}</div>
              <div className="text-[11px] text-[#A89F91] mt-1 flex flex-wrap gap-x-3">
                {venue && <span>{venue}</span>}
                {doi && (
                  <a
                    href={`https://doi.org/${doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#B4532A] hover:underline"
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
