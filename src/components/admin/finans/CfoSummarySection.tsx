"use client";

import React from "react";
import Link from "next/link";
import { Building2, Landmark, PieChart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { getExpenseCategoryLabel, type CfoPeriodSummary } from "@/lib/finance";
import { tl } from "./format";

interface CfoSummarySectionProps {
  summary: CfoPeriodSummary | null;
  categoryBreakdown: [string, number][];
}

export function CfoSummarySection({ summary, categoryBreakdown }: CfoSummarySectionProps) {
  const visibleChannels = React.useMemo(() => {
    if (!summary) return [];
    return summary.cashFlowByChannel.filter(
      (ch) => ch.channel !== "diger" || ch.cashIn !== 0 || ch.cashOut !== 0
    );
  }, [summary]);

  const aging = summary?.b2bReceivablesAging ?? null;

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
            <span>İşletme Giderleri (Tahakkuk)</span>
          </div>
          <div className="font-mono tabular-nums text-2xl font-black text-[#7D2114]">
            {summary ? tl(summary.totalOperatingExpenses) : "—"}
          </div>
          <p className="text-xs text-[#6E5148]">
            Direkt:{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.directOperatingExpenses) : "—"}
            </strong>{" "}
            + Tedarikçi Alış:{" "}
            <strong className="font-mono tabular-nums text-[#3B1E1A]">
              {summary ? tl(summary.supplierAccrualPurchases) : "—"}
            </strong>
          </p>
          {categoryBreakdown.length > 0 && (
            <p className="text-[11px] text-[#6E5148] truncate">
              En büyük: {getExpenseCategoryLabel(categoryBreakdown[0][0])} ({tl(categoryBreakdown[0][1])})
            </p>
          )}
        </div>

        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
              <span>Net İşletme Kârı (P&amp;L)</span>
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
          <div className="space-y-0.5 text-xs text-[#6E5148]">
            <p>
              Nakit Çıkışı:{" "}
              <strong className="font-mono tabular-nums text-[#3B1E1A]">
                {summary ? tl(summary.totalCashOut) : "—"}
              </strong>{" "}
              <span className="text-[11px]">
                (Direkt {summary ? tl(summary.directOperatingExpenses) : "—"} + Tedarikçi Ödeme{" "}
                {summary ? tl(summary.supplierCashPayments) : "—"})
              </span>
            </p>
            <p>
              Net Nakit Akışı:{" "}
              <strong
                className={`font-mono tabular-nums ${
                  (summary?.netCashFlow ?? 0) >= 0 ? "text-[#1D5130]" : "text-[#7D2114]"
                }`}
              >
                {summary ? tl(summary.netCashFlow) : "—"}
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* Ödeme Kanalı Bazlı Kasa Şeridi */}
      {summary && visibleChannels.length > 0 && (
        <section
          aria-label="Ödeme kanalı bazlı nakit akışı"
          className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 shadow-sm space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#6E5148] flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
              <span>Ödeme Kanalı Bazlı Kasa Akışı</span>
            </div>
            <div className="text-xs text-[#6E5148] font-mono tabular-nums">
              Giren <strong className="text-[#1D5130]">{tl(summary.totalCashIn)}</strong> · Çıkan{" "}
              <strong className="text-[#7D2114]">{tl(summary.totalCashOut)}</strong> · Net{" "}
              <strong className={summary.netCashFlow >= 0 ? "text-[#1D5130]" : "text-[#7D2114]"}>
                {tl(summary.netCashFlow)}
              </strong>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              visibleChannels.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
            } gap-2.5`}
          >
            {visibleChannels.map((ch) => (
              <div
                key={ch.channel}
                className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] px-3.5 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#3B1E1A]">{ch.label}</span>
                  <span
                    className={`font-mono tabular-nums text-xs font-extrabold ${
                      ch.net >= 0 ? "text-[#1D5130]" : "text-[#7D2114]"
                    }`}
                  >
                    Net {ch.net > 0 ? "+" : ""}
                    {tl(ch.net)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#6E5148]">
                  <span>
                    Giren: <strong className="text-[#1D5130]">{tl(ch.cashIn)}</strong>
                  </span>
                  <span>
                    Çıkan: <strong className="text-[#7D2114]">{tl(ch.cashOut)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bilanço Özeti & B2B Alacak Yaşlandırma Şeridi */}
      <section className="rounded-3xl bg-[#FBF6EC] border border-[#E2D3BD] p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
              {summary && summary.totalSupplierAdvances > 0 && (
                <div className="text-[11px] font-mono tabular-nums text-[#1D5130]">
                  Tedarikçi Avansı: {tl(summary.totalSupplierAdvances)}
                </div>
              )}
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
        </div>

        {/* B2B Alacak Yaşlandırma (FIFO) Rozetleri */}
        {aging && (
          <div className="pt-3 border-t border-[#E2D3BD] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
              B2B Alacak Yaşlandırma (FIFO)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs font-mono tabular-nums text-[#3B1E1A]">
                0–7g: <strong>{tl(aging.current0to7)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] text-xs font-mono tabular-nums text-[#3B1E1A]">
                8–15g: <strong>{tl(aging.days8to15)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#FEF3D6] border border-[#E8C587] text-xs font-mono tabular-nums text-[#7A4A0B]">
                16–30g: <strong>{tl(aging.days16to30)}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs font-mono tabular-nums text-[#7D2114]">
                30+g: <strong>{tl(aging.over30)}</strong>
              </span>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
