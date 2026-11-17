"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2, Plus, RotateCcw } from "lucide-react";
import { formatTrDate } from "@/lib/time/istanbul";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  FINANCIAL_PAYMENT_METHOD_LABELS,
  getExpenseCategoryLabel,
  type ExpenseCategory,
  type FinancialPaymentMethod,
  type FinancialRecord,
} from "@/lib/finance";
import type { StornoDraft } from "@/hooks/useFinanceDashboard";
import { tl } from "./format";

interface FinancialLedgerTabProps {
  fromDate: string;
  toDate: string;
  loading: boolean;
  records: FinancialRecord[];
  totalOperatingExpenses: number;
  categoryBreakdown: [string, number][];
  recType: "gider" | "gelir";
  recCategory: ExpenseCategory;
  recAmount: string;
  recPaymentMethod: FinancialPaymentMethod;
  recDate: string;
  recDescription: string;
  recSubmitting: boolean;
  onRecTypeChange: (value: "gider" | "gelir") => void;
  onRecCategoryChange: (value: ExpenseCategory) => void;
  onRecAmountChange: (value: string) => void;
  onRecPaymentMethodChange: (value: FinancialPaymentMethod) => void;
  onRecDateChange: (value: string) => void;
  onRecDescriptionChange: (value: string) => void;
  onSubmitRecord: (e: React.FormEvent) => void;
  onStartStorno: (draft: StornoDraft) => void;
}

export function FinancialLedgerTab({
  fromDate,
  toDate,
  loading,
  records,
  totalOperatingExpenses,
  categoryBreakdown,
  recType,
  recCategory,
  recAmount,
  recPaymentMethod,
  recDate,
  recDescription,
  recSubmitting,
  onRecTypeChange,
  onRecCategoryChange,
  onRecAmountChange,
  onRecPaymentMethodChange,
  onRecDateChange,
  onRecDescriptionChange,
  onSubmitRecord,
  onStartStorno,
}: FinancialLedgerTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Sol: Hızlı Gider / Gelir Formu ve Kategori Dağılımı */}
      <div className="lg:col-span-4 space-y-4">
        <form
          onSubmit={onSubmitRecord}
          className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 space-y-3 shadow-sm"
        >
          <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
            Hızlı Gider / Gelir Kaydı
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onRecTypeChange("gider")}
              className={`min-h-11 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                recType === "gider"
                  ? "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                  : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148]"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              <span>İşletme Gideri (−)</span>
            </button>
            <button
              type="button"
              onClick={() => onRecTypeChange("gelir")}
              className={`min-h-11 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                recType === "gelir"
                  ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                  : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148]"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
              <span>Diğer Gelir (+)</span>
            </button>
          </div>

          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-[#6E5148]">Kategori</span>
            <select
              value={recCategory}
              onChange={(e) => onRecCategoryChange(e.target.value as ExpenseCategory)}
              className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A]"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1 text-xs">
              <span className="font-semibold text-[#6E5148]">Tutar (₺)</span>
              <input
                type="text"
                inputMode="decimal"
                value={recAmount}
                onChange={(e) => onRecAmountChange(e.target.value)}
                placeholder="0.00"
                required
                className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono tabular-nums text-sm text-[#3B1E1A]"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-semibold text-[#6E5148]">Ödeme Yöntemi</span>
              <select
                value={recPaymentMethod}
                onChange={(e) => onRecPaymentMethodChange(e.target.value as FinancialPaymentMethod)}
                className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A]"
              >
                {(Object.keys(FINANCIAL_PAYMENT_METHOD_LABELS) as FinancialPaymentMethod[]).map((pm) => (
                  <option key={pm} value={pm}>
                    {FINANCIAL_PAYMENT_METHOD_LABELS[pm]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-[#6E5148]">İşlem Tarihi</span>
            <input
              type="date"
              value={recDate}
              onChange={(e) => onRecDateChange(e.target.value)}
              required
              className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono text-sm text-[#3B1E1A]"
            />
          </label>

          <label className="block space-y-1 text-xs">
            <span className="font-semibold text-[#6E5148]">Açıklama</span>
            <input
              type="text"
              value={recDescription}
              onChange={(e) => onRecDescriptionChange(e.target.value)}
              placeholder="Ör. 10 çuval taş değirmen tam buğday unu"
              required
              maxLength={280}
              className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A]"
            />
          </label>

          <button
            type="submit"
            disabled={recSubmitting}
            className="w-full min-h-11 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {recSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="w-4 h-4" aria-hidden="true" />
            )}
            <span>Deftere İşle</span>
          </button>
        </form>

        {/* Kategori Dağılım Çubukları */}
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 space-y-3 shadow-sm">
          <h3 className="font-serif text-base font-bold text-[#3B1E1A]">
            Dönem İçi Gider Dağılımı
          </h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-xs text-[#6E5148]">
              Seçili tarih aralığında gider dağılımı oluştuğunda kategori oranları burada görünür.
            </p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.map(([cat, amount]) => {
                const total = totalOperatingExpenses || 1;
                const pct = Math.min(100, Math.round((amount / total) * 100));
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#3B1E1A]">
                        {getExpenseCategoryLabel(cat)}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#6E5148]">
                        {tl(amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#F6EEDF] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#B4532A]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Kronolojik Gider & Gelir Hareketleri */}
      <div className="lg:col-span-8 rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 bg-[#FBF6EC] border-b border-[#E2D3BD] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
              Gider &amp; Nakit Hareketleri
            </h2>
            <p className="text-xs text-[#6E5148]">
              Kayıtlar silinmez; hatalı girişlerde simetrik storno (ters kayıt) kesilir.
            </p>
          </div>
          <span className="text-xs font-mono text-[#6E5148]">
            {formatTrDate(fromDate)} – {formatTrDate(toDate)}
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-[#6E5148]">
            <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" />
            <span>Defter kayıtları yükleniyor…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-[#3B1E1A]">Henüz gider veya diğer gelir kaydı yok.</p>
            <p className="text-xs text-[#6E5148]">
              Sol formdan ilk un, enerji, ambalaj veya yakıt giderini girerek net işletme marjını başlatabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2D3BD]">
            {records.map((rec) => {
              const isStorno = rec.type === "storno_gider" || rec.type === "storno_gelir";
              const isPositive = rec.signedEffect >= 0;
              return (
                <div
                  key={rec.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    rec.isReversed ? "bg-[#FBF6EC]/60 opacity-70" : ""
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[#6E5148]">{formatTrDate(rec.date)}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          isStorno
                            ? "bg-[#FEF3D6] border-[#E8C587] text-[#7A4A0B]"
                            : rec.type === "gelir"
                              ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                              : "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                        }`}
                      >
                        {rec.type === "gider"
                          ? "Gider"
                          : rec.type === "gelir"
                            ? "Gelir"
                            : rec.type === "storno_gider"
                              ? "Storno Gider"
                              : "Storno Gelir"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F6EEDF] border border-[#E2D3BD] text-[11px] font-semibold text-[#3B1E1A]">
                        {getExpenseCategoryLabel(rec.category)}
                      </span>
                      {rec.isReversed && (
                        <span className="px-2 py-0.5 rounded-md bg-[#FEF3D6] border border-[#E8C587] text-[11px] font-bold text-[#7A4A0B]">
                          İptal Edildi (Storno)
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium text-[#3B1E1A] ${
                        rec.isReversed ? "line-through" : ""
                      }`}
                    >
                      {rec.description}
                    </p>
                    <div className="text-xs text-[#6E5148]">
                      Ödeme:{" "}
                      {FINANCIAL_PAYMENT_METHOD_LABELS[rec.paymentMethod as FinancialPaymentMethod] ??
                        rec.paymentMethod}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div
                      className={`font-mono tabular-nums text-base font-extrabold ${
                        rec.isReversed
                          ? "line-through text-[#6E5148]"
                          : isPositive
                            ? "text-[#1D5130]"
                            : "text-[#7D2114]"
                      }`}
                    >
                      {isPositive ? "+" : "−"}
                      {tl(rec.amount)}
                    </div>

                    {!isStorno && !rec.isReversed && (
                      <button
                        type="button"
                        onClick={() =>
                          onStartStorno({
                            kind: "record",
                            id: rec.id,
                            label: `${rec.description} (${tl(rec.amount)})`,
                            reason: "",
                          })
                        }
                        className="min-h-11 px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#FEF3D6] border border-[#E2D3BD] text-xs font-bold text-[#6E5148] hover:text-[#7A4A0B] inline-flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Storno</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
