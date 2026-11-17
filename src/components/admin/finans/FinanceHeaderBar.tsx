"use client";

import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { addDays } from "@/lib/time/istanbul";

interface FinanceHeaderBarProps {
  today: string;
  monthStart: string;
  fromDate: string;
  toDate: string;
  loading: boolean;
  hasRecords: boolean;
  hasSuppliers: boolean;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApplyThisMonth: () => void;
  onApplyLast7Days: () => void;
  onApplyPreviousMonth: () => void;
  onApplyAllTime: () => void;
  onDownloadRecordsCsv: () => void;
  onDownloadSuppliersCsv: () => void;
  onRefresh: () => void;
}

export function FinanceHeaderBar({
  today,
  monthStart,
  fromDate,
  toDate,
  loading,
  hasRecords,
  hasSuppliers,
  onFromDateChange,
  onToDateChange,
  onApplyThisMonth,
  onApplyLast7Days,
  onApplyPreviousMonth,
  onApplyAllTime,
  onDownloadRecordsCsv,
  onDownloadSuppliersCsv,
  onRefresh,
}: FinanceHeaderBarProps) {
  const last7Start = addDays(today, -6);

  return (
    <header className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8E3D1B]">
            CFO Yönetim Kokpiti · Simetrik Ön Muhasebe
          </div>
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#3B1E1A] mt-0.5">
            Finans, Gider &amp; Net Marj Merkezi
          </h1>
          <p className="text-xs text-[#6E5148] mt-1">
            Perakende ve B2B cari gelirlerinden hammadde, ambalaj, enerji ve tedarikçi maliyetlerini düşerek gerçek net işletme kârını izleyin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownloadRecordsCsv}
            disabled={!hasRecords}
            className="min-h-11 px-3.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
            <span>Gider CSV</span>
          </button>
          <button
            type="button"
            onClick={onDownloadSuppliersCsv}
            disabled={!hasSuppliers}
            className="min-h-11 px-3.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
            <span>Tedarikçi CSV</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Finans verilerini yenile"
            className="min-h-11 px-3.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Hızlı Dönem Hapları ve Özel Tarih Seçimi */}
      <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-[#E2D3BD]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onApplyThisMonth}
            className={`min-h-11 px-3.5 rounded-xl border text-xs font-bold transition-colors ${
              fromDate === monthStart && toDate === today
                ? "bg-[#3B1E1A] text-white border-[#3B1E1A]"
                : "bg-[#FBF6EC] hover:bg-[#F3E2D4] text-[#3B1E1A] border-[#E2D3BD]"
            }`}
          >
            Bu Ay
          </button>
          <button
            type="button"
            onClick={onApplyLast7Days}
            className={`min-h-11 px-3.5 rounded-xl border text-xs font-bold transition-colors ${
              fromDate === last7Start && toDate === today
                ? "bg-[#3B1E1A] text-white border-[#3B1E1A]"
                : "bg-[#FBF6EC] hover:bg-[#F3E2D4] text-[#3B1E1A] border-[#E2D3BD]"
            }`}
          >
            Son 7 Gün
          </button>
          <button
            type="button"
            onClick={onApplyPreviousMonth}
            className="min-h-11 px-3.5 rounded-xl border bg-[#FBF6EC] hover:bg-[#F3E2D4] text-[#3B1E1A] border-[#E2D3BD] text-xs font-bold transition-colors"
          >
            Geçen Ay
          </button>
          <button
            type="button"
            onClick={onApplyAllTime}
            className={`min-h-11 px-3.5 rounded-xl border text-xs font-bold transition-colors ${
              fromDate === "2025-01-01" && toDate === today
                ? "bg-[#3B1E1A] text-white border-[#3B1E1A]"
                : "bg-[#FBF6EC] hover:bg-[#F3E2D4] text-[#3B1E1A] border-[#E2D3BD]"
            }`}
          >
            Tüm Zamanlar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-[#6E5148]">Başlangıç</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] font-mono text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-[#6E5148]">Bitiş</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] font-mono text-xs"
            />
          </label>
        </div>
      </div>
    </header>
  );
}
