"use client";

import React from "react";
import Link from "next/link";
import { Building2, PieChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getExpenseCategoryLabel, type CfoPeriodSummary } from "@/lib/finance";
import { tl } from "./format";

interface CfoSummarySectionProps {
  summary: CfoPeriodSummary | null;
  categoryBreakdown: [string, number][];
}

export function CfoSummarySection({ summary, categoryBreakdown }: CfoSummarySectionProps) {
  return (
    <>
      {/* 4 Ana CFO KPI Kartı */}
      <section aria-label="Dönem finans özeti" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 shadow-sm space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
            <span>Brüt Satış Cirosu</span>
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-[#3B1E1A]">
            {summary ? tl(summary.totalGrossSales) : "—"}
          </div>
          <p className="text-xs text-[#6E5148]">
            Perakende:{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.retailDeliveredSales) : "—"}
            </strong>{" "}
            · B2B:{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.b2bNetSales) : "—"}
            </strong>
          </p>
        </div>

        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 shadow-sm space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148] flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#1D5130]" aria-hidden="true" />
            <span>Kasaya Giren Tahsilat</span>
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-[#1D5130]">
            {summary ? tl(summary.totalCashIn) : "—"}
          </div>
          <p className="text-xs text-[#6E5148]">
            Perakende:{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.retailCollectedCash) : "—"}
            </strong>{" "}
            · B2B:{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.b2bCollectedCash) : "—"}
            </strong>
          </p>
        </div>

        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 shadow-sm space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148] flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-[#7D2114]" aria-hidden="true" />
            <span>İşletme Giderleri</span>
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-[#7D2114]">
            {summary ? tl(summary.totalOperatingExpenses) : "—"}
          </div>
          <p className="text-xs text-[#6E5148]">
            {categoryBreakdown.length > 0
              ? `En büyük: ${getExpenseCategoryLabel(categoryBreakdown[0][0])} (${tl(categoryBreakdown[0][1])})`
              : "Bu dönemde kayıtlı işletme gideri yok"}
          </p>
        </div>

        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
              <span>Net İşletme Kârı</span>
            </div>
            {summary && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                  summary.netOperatingProfit >= 0
                    ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                    : "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                }`}
              >
                %{summary.netOperatingMarginPct.toFixed(1)} marj
              </span>
            )}
          </div>
          <div
            className={`font-mono tabular-nums text-2xl font-black ${
              (summary?.netOperatingProfit ?? 0) >= 0 ? "text-[#1D5130]" : "text-[#7D2114]"
            }`}
          >
            {summary ? tl(summary.netOperatingProfit) : "—"}
          </div>
          <p className="text-xs text-[#6E5148]">
            Net nakit akışı (Tahsilat − Gider):{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.netCashFlow) : "—"}
            </strong>
          </p>
        </div>
      </section>

      {/* Bilanço Özeti Şeridi */}
      <section className="rounded-3xl bg-[#FBF6EC] border border-[#E2D3BD] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              Açık B2B Alacaklarımız
            </div>
            <div className="font-mono tabular-nums text-lg font-extrabold text-[#1D5130]">
              {summary ? tl(summary.totalB2BReceivables) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              Tedarikçi Borç Bakiyemiz
            </div>
            <div className="font-mono tabular-nums text-lg font-extrabold text-[#7D2114]">
              {summary ? tl(summary.totalSupplierPayables) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              Net Ticari Pozisyon (Alacak − Borç)
            </div>
            <div
              className={`font-mono tabular-nums text-lg font-extrabold ${
                (summary?.netWorkingCapital ?? 0) >= 0 ? "text-[#3B1E1A]" : "text-[#7D2114]"
              }`}
            >
              {summary ? tl(summary.netWorkingCapital) : "—"}
            </div>
          </div>
        </div>
        <Link
          href="/admin/cariler"
          className="min-h-11 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-2 shrink-0 transition-colors"
        >
          <Building2 className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
          <span>B2B Carilere Git</span>
        </Link>
      </section>
    </>
  );
}
