"use client";

import React from "react";
import { Package, Truck, CheckCircle2, DollarSign } from "lucide-react";

interface DagitimStatsBarProps {
  totalPackages: number;
  pendingDeliveryCount: number;
  deliveredCount: number;
  totalCashToCollect: number;
}

export function DagitimStatsBar({
  totalPackages,
  pendingDeliveryCount,
  deliveredCount,
  totalCashToCollect,
}: DagitimStatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
      <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
          <Package className="w-3.5 h-3.5 text-artisan-gold" />
          <span>Toplam Paket</span>
        </div>
        <div className="font-serif text-xl font-bold text-foreground mt-0.5">{totalPackages}</div>
      </div>

      <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
          <Truck className="w-3.5 h-3.5 text-blue-400" />
          <span>Kalan Teslimat</span>
        </div>
        <div className="font-serif text-xl font-bold text-blue-400 mt-0.5">
          {pendingDeliveryCount}
        </div>
      </div>

      <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Teslim Edilen</span>
        </div>
        <div className="font-serif text-xl font-bold text-emerald-400 mt-0.5">
          {deliveredCount}
        </div>
      </div>

      <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
        <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          <span>Kapıda Tahsilat (Nakit)</span>
        </div>
        <div className="font-serif text-xl font-bold text-amber-400 mt-0.5 font-mono">
          {totalCashToCollect.toLocaleString("tr-TR")} ₺
        </div>
      </div>
    </div>
  );
}
