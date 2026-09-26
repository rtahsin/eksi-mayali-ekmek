"use client";

import React from "react";
import { CheckSquare, Square, ListOrdered, Layers, Compass, Send } from "lucide-react";

interface DagitimToolbarProps {
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
  viewMode: "sequence" | "grouped";
  onViewModeChange: (mode: "sequence" | "grouped") => void;
  onAutoSortBeylikduzu: () => void;
  onOpenDispatchModal: () => void;
  isBatchUpdating: boolean;
}

export function DagitimToolbar({
  selectedCount,
  totalCount,
  onToggleSelectAll,
  viewMode,
  onViewModeChange,
  onAutoSortBeylikduzu,
  onOpenDispatchModal,
  isBatchUpdating,
}: DagitimToolbarProps) {
  return (
    <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shadow-lg">
      {/* View Mode Switcher + Select All */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-medium"
          title="Tümünü Seç / Seçimi Kaldır"
        >
          {selectedCount === totalCount && totalCount > 0 ? (
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Square className="w-3.5 h-3.5 text-stone-500" />
          )}
          <span>Tümü ({totalCount})</span>
        </button>

        <div className="flex items-center gap-1 bg-[#120E0B] p-1 rounded-xl border border-[#2A201A]">
          <button
            type="button"
            onClick={() => onViewModeChange("sequence")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "sequence"
                ? "bg-amber-500 text-stone-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Sıralı Rota (1, 2, 3...)</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange("grouped")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "grouped"
                ? "bg-amber-500 text-stone-950 shadow"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mahalle Grupları</span>
          </button>
        </div>
      </div>

      {/* Optimization & Batch Actions */}
      <div className="flex items-center gap-2">
        {viewMode === "sequence" && (
          <button
            type="button"
            onClick={onAutoSortBeylikduzu}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Beylikdüzü coğrafi güzergahına göre otomatik sırala"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>🧭 Beylikdüzü Rota Sırasına Göre Diz</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenDispatchModal}
          disabled={isBatchUpdating}
          className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Hazırlanan tüm siparişleri kurye seçerek yola çıkar"
        >
          <Send className="w-3.5 h-3.5 text-blue-400" />
          <span>🚀 Hepsini Yola Çıkar</span>
        </button>
      </div>
    </div>
  );
}
