"use client";

import React from "react";

interface CourierShiftRibbonProps {
  deliveredCount: number;
  totalCount: number;
  pendingCount: number;
  totalCashToCollect: number;
  totalCashCollected: number;
  totalPosToCollect: number;
  totalPosCollected: number;
}

export function CourierShiftRibbon({
  deliveredCount,
  totalCount,
  pendingCount,
  totalCashToCollect,
  totalCashCollected,
  totalPosToCollect,
  totalPosCollected,
}: CourierShiftRibbonProps) {
  return (
    <div className="max-w-xl mx-auto px-4 mt-3">
      <div className="grid grid-cols-3 gap-2 bg-stone-900 border border-stone-800 p-3 rounded-2xl text-center shadow-lg">
        <div>
          <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Teslimat</div>
          <div className="text-base font-bold font-mono text-stone-100 mt-0.5">
            <span className="text-emerald-400">{deliveredCount}</span>
            <span className="text-stone-500"> / </span>
            <span>{totalCount}</span>
          </div>
          <div className="text-[10px] text-stone-400 font-sans">
            {pendingCount} paket kaldı
          </div>
        </div>

        <div className="border-x border-stone-800">
          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Kalan Nakit</div>
          <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
            {totalCashToCollect.toLocaleString("tr-TR")} ₺
          </div>
          <div className="text-[10px] text-stone-400 font-sans">
            Alınan: {totalCashCollected} ₺
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Kalan POS</div>
          <div className="text-base font-bold font-mono text-blue-400 mt-0.5">
            {totalPosToCollect.toLocaleString("tr-TR")} ₺
          </div>
          <div className="text-[10px] text-stone-400 font-sans">
            Çekilen: {totalPosCollected} ₺
          </div>
        </div>
      </div>
    </div>
  );
}
