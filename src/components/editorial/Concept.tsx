import React from "react";
import { CONCEPTS, type ConceptId } from "@/lib/knowledge/registry";

interface ConceptProps {
  id: ConceptId;
  children?: React.ReactNode;
}

export function Concept({ id, children }: ConceptProps) {
  const concept = CONCEPTS[id];

  if (!concept) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-900/30 text-red-400 border border-red-800">
        [Kopuk Kavram: {id}]
      </span>
    );
  }

  const nick = "nick" in concept ? (concept as { nick?: string }).nick : undefined;

  return (
    <span className="inline group relative cursor-help">
      <span className="inline-flex items-center gap-1 font-medium text-[#D4A373] underline decoration-[#D4A373]/40 underline-offset-4 hover:decoration-[#B4532A] hover:text-[#E8E0D5] transition-colors">
        {children || concept.name}
      </span>

      {/* Tooltip / Katman Açıklaması */}
      <span className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3 rounded-lg bg-[#1C1815] border border-[#3D342E] shadow-2xl text-left block">
        <span className="block text-xs font-serif text-[#D4A373] font-semibold mb-1">
          {concept.name} {nick ? `(${nick})` : ""}
        </span>
        <span className="block text-xs text-[#E8E0D5] leading-relaxed mb-2 font-sans">
          {concept.layers.usta}
        </span>
        <span className="block pt-1.5 border-t border-[#3D342E]/60 text-[10px] text-[#A89F91]">
          <span className="font-semibold text-[#B4532A]">Neden: </span>
          {concept.layers.neden}
        </span>
      </span>
    </span>
  );
}
