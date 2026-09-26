"use client";

import React from "react";
import Link from "next/link";
import { UserCheck, AlertTriangle } from "lucide-react";

interface CourierWorkloadItem {
  courierName: string;
  total: number;
  delivered: number;
  pending: number;
}

interface DagitimWorkloadRibbonProps {
  selectedDate: string;
  courierWorkloads: {
    couriersList: [string, CourierWorkloadItem][];
    unassignedCount: number;
  };
}

export function DagitimWorkloadRibbon({
  selectedDate,
  courierWorkloads,
}: DagitimWorkloadRibbonProps) {
  return (
    <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-2.5 print:hidden shadow-lg">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span className="font-serif font-bold text-stone-200">
            Kurye Görev Yükü Dağılımı ({selectedDate})
          </span>
        </div>
        <Link
          href="/admin/kurye/yonetim"
          className="text-[11px] text-amber-400 hover:underline"
        >
          Kuryeleri Yönet →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {courierWorkloads.couriersList.map(([cId, item]) => (
          <div
            key={cId}
            className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between text-xs"
          >
            <div className="min-w-0">
              <div className="font-bold text-stone-200 truncate">{item.courierName}</div>
              <div className="text-[10px] text-stone-400">
                {item.delivered} teslim · {item.pending} bekliyor
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400 text-xs shrink-0">
              {item.total}
            </div>
          </div>
        ))}

        {/* Unassigned count alert box */}
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
            courierWorkloads.unassignedCount > 0
              ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
              : "bg-stone-900/40 border-stone-800/60 text-stone-500"
          }`}
        >
          <div className="min-w-0">
            <div className="font-bold flex items-center gap-1">
              {courierWorkloads.unassignedCount > 0 && (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span>Atanmamış Paket</span>
            </div>
            <div className="text-[10px] opacity-80">Kurye bekliyor</div>
          </div>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
              courierWorkloads.unassignedCount > 0
                ? "bg-rose-500 text-stone-950"
                : "bg-stone-800 text-stone-400"
            }`}
          >
            {courierWorkloads.unassignedCount}
          </div>
        </div>
      </div>
    </div>
  );
}
