"use client";

import React from "react";
import { Courier } from "@/types/courier";

interface DagitimBulkActionBarProps {
  selectedCount: number;
  couriers: Courier[];
  bulkAssignCourierId: string;
  onCourierChange: (id: string) => void;
  onBulkAssign: () => void;
  onClearSelection: () => void;
  isBatchUpdating: boolean;
}

export function DagitimBulkActionBar({
  selectedCount,
  couriers,
  bulkAssignCourierId,
  onCourierChange,
  onBulkAssign,
  onClearSelection,
  isBatchUpdating,
}: DagitimBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-4 z-30 p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 to-[#1e1712] border-2 border-amber-500/60 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold font-mono flex items-center justify-center">
          {selectedCount}
        </span>
        <span className="font-bold text-stone-100">sipariş seçildi</span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-[11px] text-stone-400 hover:text-stone-200 underline ml-2"
        >
          Seçimi Temizle
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={bulkAssignCourierId}
          onChange={(e) => onCourierChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
        >
          <option value="">Kurye Seçiniz...</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName} ({c.vehicleType === "motorcycle" ? "Moto" : "Araba"})
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!bulkAssignCourierId || isBatchUpdating}
          onClick={onBulkAssign}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-bold transition-all shadow"
        >
          Seçilenleri Ata & Yola Çıkar
        </button>
      </div>
    </div>
  );
}
