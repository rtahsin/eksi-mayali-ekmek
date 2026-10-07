import React from "react";
import { CLAIMS, SOURCES, type ClaimId } from "@/lib/knowledge/registry";

interface ClaimProps {
  id: ClaimId;
  children?: React.ReactNode;
}

export function Claim({ id, children }: ClaimProps) {
  const claim = CLAIMS[id];

  if (!claim) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-900/30 text-red-400 border border-red-800">
        [Kopuk İddia: {id}]
      </span>
    );
  }

  const isMyth = claim.status === "efsane";

  return (
    <span className="inline group relative cursor-help">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono transition-colors ${
          isMyth
            ? "bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/50"
            : "bg-[#2C2521] text-[#E8E0D5] border border-[#3D342E] hover:border-[#B4532A]/80 hover:text-white"
        }`}
        title={claim.text}
      >
        <span className="text-xs text-[#B4532A] font-bold">§</span>
        <span>{children || (isMyth ? "Efsane" : "Bilimsel Kanıt")}</span>
      </span>

      {/* Tooltip / Açılır Bilgi */}
      <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3 rounded-lg bg-[#1C1815] border border-[#3D342E] shadow-2xl text-left block">
        <span className="block text-xs font-serif text-[#B4532A] font-medium mb-1">
          {isMyth ? "Efsane / Yanılgı Analizi" : "Doğrulanmış Bilgi"}
        </span>
        <span className="block text-xs text-[#E8E0D5] leading-relaxed mb-2 font-sans">
          {claim.text}
        </span>
        {claim.evidence && claim.evidence.length > 0 && (
          <span className="block pt-1.5 border-t border-[#3D342E]/60 text-xs text-[#A89F91]">
            <span className="font-semibold text-[#D4A373]">Kaynak: </span>
            {claim.evidence.map((ev, idx) => {
              const src = SOURCES[ev.source as keyof typeof SOURCES];
              return (
                <span key={idx}>
                  {src ? `${src.authors[0]} (${src.year})` : ev.source}
                  {ev.locator ? `, ${ev.locator}` : ""}
                  {idx < claim.evidence.length - 1 ? "; " : ""}
                </span>
              );
            })}
          </span>
        )}
      </span>
    </span>
  );
}
