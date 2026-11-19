"use client";

import React, { useState } from "react";
import { AlertTriangle, CalendarRange, ChevronDown, ChevronUp } from "lucide-react";
import type { CariDateBalanceSummary } from "@/lib/cari/balanceSummary";
import { formatTrDate } from "@/lib/time/istanbul";

export interface CariDateBalanceSummaryCardProps {
  summary: CariDateBalanceSummary;
  periodLabel: string;
  accountType?: "musteri" | "gider";
  onSelectDate?: (isoDate: string) => void;
}

const DEFAULT_VISIBLE_DAYS = 10;

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedMoney(n: number): string {
  if (n === 0) return "0,00 ₺";
  const sign = n > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(n))} ₺`;
}

export function CariDateBalanceSummaryCard({
  summary,
  periodLabel,
  accountType = "musteri",
  onSelectDate,
}: CariDateBalanceSummaryCardProps) {
  const [dailyOpen, setDailyOpen] = useState(true);
  const [showAllDays, setShowAllDays] = useState(false);

  const debtLabel = accountType === "gider" ? "Dönem Masraf (+)" : "Dönem Borç (+)";
  const creditLabel = accountType === "gider" ? "Dönem Ödeme (−)" : "Dönem Alacak (−)";
  const openingHint = summary.range.startDate
    ? `${formatTrDate(summary.range.startDate)} öncesi`
    : "Hesap başlangıcı";

  const visibleRows = showAllDays
    ? summary.dailyRows
    : summary.dailyRows.slice(0, DEFAULT_VISIBLE_DAYS);
  const hiddenCount = Math.max(0, summary.dailyRows.length - visibleRows.length);

  return (
    <div className="rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-serif text-base font-bold text-[#3B1E1A]">
            <CalendarRange className="h-4 w-4 text-[#B4532A]" />
            Tarihe Göre Bakiye Özeti
          </span>
          <span className="rounded-lg border border-[#E2D3BD] bg-white px-2.5 py-0.5 text-xs font-bold text-[#6E5148]">
            {periodLabel}
          </span>
        </div>
        <span className="font-mono text-xs text-[#6E5148]">
          {summary.transactionCount} hareket · Devir + Borç − Alacak = Dönem Sonu
        </span>
      </div>

      {summary.isInvalidRange ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-950"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          Başlangıç tarihi bitiş tarihinden sonra olamaz. Lütfen tarih aralığını düzeltin.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E2D3BD] bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                Dönem Başı Devir
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#3B1E1A]">
                {formatMoney(summary.openingBalance)} ₺
              </p>
              <p className="mt-0.5 text-[11px] text-[#6E5148]">{openingHint}</p>
            </div>

            <div className="rounded-xl border border-[#E2D3BD] bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                {debtLabel}
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#8E3D1B]">
                +{formatMoney(summary.periodDebt)} ₺
              </p>
              <p className="mt-0.5 text-[11px] text-[#6E5148]">Dönem içi borç artışı</p>
            </div>

            <div className="rounded-xl border border-[#E2D3BD] bg-white p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                {creditLabel}
              </p>
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-800">
                −{formatMoney(summary.periodCredit)} ₺
              </p>
              <p className="mt-0.5 text-[11px] text-[#6E5148]">Dönem içi tahsilat / alacak</p>
            </div>

            <div className="rounded-xl border border-[#B4532A]/40 bg-white p-3.5 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                Dönem Sonu Bakiye
              </p>
              <p
                className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                  summary.closingBalance > 0
                    ? "text-[#8E3D1B]"
                    : summary.closingBalance < 0
                      ? "text-emerald-800"
                      : "text-[#3B1E1A]"
                }`}
              >
                {formatMoney(summary.closingBalance)} ₺
              </p>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#6E5148]">
                Dönem net: {formatSignedMoney(summary.periodNet)}
              </p>
            </div>
          </div>

          {summary.dailyRows.length > 0 && (
            <div className="rounded-xl border border-[#E2D3BD] bg-white">
              <button
                type="button"
                onClick={() => setDailyOpen((prev) => !prev)}
                aria-expanded={dailyOpen}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
              >
                <span>Günlük Bakiye Dökümü ({summary.dailyRows.length} gün)</span>
                {dailyOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#6E5148]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#6E5148]" />
                )}
              </button>

              {dailyOpen && (
                <div className="border-t border-[#E2D3BD]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FBF6EC] text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                        <tr>
                          <th className="px-3.5 py-2.5">Tarih</th>
                          <th className="px-3 py-2.5 text-right">İşlem</th>
                          <th className="px-3 py-2.5 text-right">Borç (+)</th>
                          <th className="px-3 py-2.5 text-right">Alacak (−)</th>
                          <th className="px-3 py-2.5 text-right">Günlük Net</th>
                          <th className="px-3.5 py-2.5 text-right">Gün Sonu Bakiye</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2D3BD]/70">
                        {visibleRows.map((row) => (
                          <tr
                            key={row.date}
                            className="transition hover:bg-[#FBF6EC]/70"
                          >
                            <td className="whitespace-nowrap px-3.5 py-2.5">
                              {onSelectDate ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectDate(row.date)}
                                  title={`${row.date} tarihli hareketleri filtrele`}
                                  className="text-left font-semibold text-[#3B1E1A] underline-offset-2 hover:text-[#8E3D1B] hover:underline"
                                >
                                  <span>{formatTrDate(row.date)}</span>
                                  <span className="ml-1.5 font-mono text-[11px] font-normal text-[#6E5148]">
                                    {row.date}
                                  </span>
                                </button>
                              ) : (
                                <span className="font-semibold text-[#3B1E1A]">
                                  {formatTrDate(row.date)}
                                  <span className="ml-1.5 font-mono text-[11px] font-normal text-[#6E5148]">
                                    {row.date}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-[#6E5148]">
                              {row.transactionCount}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-[#8E3D1B]">
                              {row.debt > 0 ? `+${formatMoney(row.debt)} ₺` : "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-emerald-800">
                              {row.credit > 0 ? `−${formatMoney(row.credit)} ₺` : "—"}
                            </td>
                            <td
                              className={`whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                                row.net > 0
                                  ? "text-[#8E3D1B]"
                                  : row.net < 0
                                    ? "text-emerald-800"
                                    : "text-[#6E5148]"
                              }`}
                            >
                              {formatSignedMoney(row.net)}
                            </td>
                            <td
                              className={`whitespace-nowrap px-3.5 py-2.5 text-right font-mono font-bold tabular-nums ${
                                row.closingBalance > 0
                                  ? "text-[#3B1E1A]"
                                  : row.closingBalance < 0
                                    ? "text-emerald-800"
                                    : "text-[#6E5148]"
                              }`}
                            >
                              {formatMoney(row.closingBalance)} ₺
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {summary.dailyRows.length > DEFAULT_VISIBLE_DAYS && (
                    <div className="border-t border-[#E2D3BD] px-3.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setShowAllDays((prev) => !prev)}
                        className="min-h-9 rounded-lg px-3 text-xs font-bold text-[#8E3D1B] transition hover:bg-[#FBF6EC]"
                      >
                        {showAllDays
                          ? "Daha az göster"
                          : `Tüm ${summary.dailyRows.length} günü göster (+${hiddenCount} gün)`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
