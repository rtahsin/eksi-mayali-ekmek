"use client";

import React from "react";
import { AlertTriangle, CalendarCheck2, Clock, Hourglass } from "lucide-react";
import type { CariAccountAging } from "@/lib/cari/aging";
import { formatTrDate } from "@/lib/time/istanbul";

export interface CariAgingCardProps {
  aging: CariAccountAging;
}

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function calcSharePct(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export function CariAgingCard({ aging }: CariAgingCardProps) {
  const hasOpen = aging.totalOpenReceivable > 0;
  const hasOver30 = aging.over30 > 0;
  const hasMidRisk = aging.days16to30 > 0;

  const statusBadge = !hasOpen
    ? aging.netBalance < 0
      ? {
          label: "Avans / Alacaklı Bakiye",
          className: "border-emerald-300 bg-emerald-50 text-emerald-900",
        }
      : {
          label: "Açık Alacak Yok",
          className: "border-emerald-300 bg-emerald-50 text-emerald-900",
        }
    : hasOver30
      ? {
          label: "30+ Gün Gecikme Var",
          className: "border-[#E7B7AF] bg-[#FCECE9] text-[#7D2114]",
        }
      : hasMidRisk
        ? {
            label: "16–30 Gün Takip",
            className: "border-amber-300 bg-amber-50 text-amber-950",
          }
        : {
            label: "Güncel Vade",
            className: "border-[#E2D3BD] bg-[#F6EEDF] text-[#3B1E1A]",
          };

  const buckets = [
    {
      key: "0-7",
      label: "0–7 Gün",
      hint: "Güncel",
      amount: aging.current0to7,
      dotClass: "bg-[#C8A679]",
      barClass: "bg-[#C8A679]",
      cardClass: "border-[#E2D3BD] bg-[#FBF6EC]/70",
      amountClass: "text-[#3B1E1A]",
    },
    {
      key: "8-15",
      label: "8–15 Gün",
      hint: "Yakın vade",
      amount: aging.days8to15,
      dotClass: "bg-[#C98A4B]",
      barClass: "bg-[#C98A4B]",
      cardClass:
        aging.days8to15 > 0
          ? "border-[#D8B48A] bg-[#FBF6EC]"
          : "border-[#E2D3BD] bg-[#FBF6EC]/70",
      amountClass: aging.days8to15 > 0 ? "text-[#3B1E1A]" : "text-[#6E5148]",
    },
    {
      key: "16-30",
      label: "16–30 Gün",
      hint: "Takip gerekli",
      amount: aging.days16to30,
      dotClass: "bg-[#B4532A]",
      barClass: "bg-[#B4532A]",
      cardClass:
        aging.days16to30 > 0
          ? "border-[#B4532A]/45 bg-[#F6EEDF]"
          : "border-[#E2D3BD] bg-[#FBF6EC]/70",
      amountClass: aging.days16to30 > 0 ? "text-[#8E3D1B]" : "text-[#6E5148]",
    },
    {
      key: "30+",
      label: "30+ Gün",
      hint: "Gecikmiş alacak",
      amount: aging.over30,
      dotClass: "bg-[#7D2114]",
      barClass: "bg-[#7D2114]",
      cardClass:
        aging.over30 > 0
          ? "border-[#E7B7AF] bg-[#FCECE9]/75"
          : "border-[#E2D3BD] bg-[#FBF6EC]/70",
      amountClass: aging.over30 > 0 ? "text-[#7D2114]" : "text-[#6E5148]",
    },
  ] as const;

  return (
    <section
      aria-labelledby="cari-aging-card-title"
      className="rounded-2xl border border-[#E2D3BD] bg-white p-5 shadow-sm sm:p-6 space-y-4"
    >
      {/* Header & Key Indicators */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="cari-aging-card-title"
            className="inline-flex items-center gap-2 font-serif text-lg font-bold text-[#3B1E1A]"
          >
            <Hourglass className="h-4 w-4 text-[#B4532A]" aria-hidden="true" />
            Alacak Yaşlandırma (FIFO)
          </h2>
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${statusBadge.className}`}
          >
            {hasOver30 && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
            {statusBadge.label}
          </span>
        </div>

        <dl className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-[#B4532A]" aria-hidden="true" />
            <dt className="font-semibold text-[#6E5148]">En Eski Açık Borç:</dt>
            <dd className="font-mono font-bold tabular-nums text-[#3B1E1A]">
              {aging.oldestUnpaidDate
                ? `${aging.oldestUnpaidDays} gün (${formatTrDate(aging.oldestUnpaidDate)})`
                : "Yok"}
            </dd>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 py-1.5">
            <CalendarCheck2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            <dt className="font-semibold text-[#6E5148]">Son Tahsilat:</dt>
            <dd className="font-mono font-bold tabular-nums text-[#3B1E1A]">
              {aging.lastCollectionDate
                ? formatTrDate(aging.lastCollectionDate)
                : "Henüz yok"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Visual Stacked Distribution Bar */}
      {hasOpen && (
        <div
          aria-hidden="true"
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#F6EEDF]"
        >
          {buckets.map((bucket) => {
            if (bucket.amount <= 0) return null;
            const widthPct = (bucket.amount / aging.totalOpenReceivable) * 100;
            return (
              <div
                key={bucket.key}
                className={`h-full transition-all ${bucket.barClass}`}
                style={{ width: `${widthPct}%` }}
              />
            );
          })}
        </div>
      )}

      {/* 4 Aging Buckets */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {buckets.map((bucket) => {
          const pct = calcSharePct(bucket.amount, aging.totalOpenReceivable);
          return (
            <div
              key={bucket.key}
              className={`rounded-xl border p-3.5 transition ${bucket.cardClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${bucket.dotClass}`}
                  />
                  {bucket.label}
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-[#6E5148]">
                  %{pct}
                </span>
              </div>
              <p
                className={`mt-1.5 font-mono text-lg font-bold tabular-nums ${bucket.amountClass}`}
              >
                {formatMoney(bucket.amount)} ₺
              </p>
              <p className="mt-0.5 text-[11px] text-[#6E5148]">{bucket.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2D3BD]/70 pt-3 text-xs text-[#6E5148]">
        <span>
          {aging.netBalance < 0
            ? `Müşterinin ${formatMoney(Math.abs(aging.netBalance))} ₺ ön ödeme / avans bakiyesi bulunuyor.`
            : "Tahsilatlar en eski açık borçtan başlayarak (FIFO) mahsup edilir."}
        </span>
        <span className="font-mono font-bold tabular-nums text-[#3B1E1A]">
          Toplam Açık Alacak: {formatMoney(aging.totalOpenReceivable)} ₺
        </span>
      </div>
    </section>
  );
}

export default CariAgingCard;
