"use client";

import React from "react";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { formatTrDate } from "@/lib/time/istanbul";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  FINANCIAL_PAYMENT_METHOD_LABELS,
  getExpenseCategoryLabel,
  type ExpenseCategory,
  type FinancialPaymentMethod,
  type Supplier,
  type SupplierDateBalanceSummary,
  type SupplierTransaction,
} from "@/lib/finance";
import type { StornoDraft } from "@/hooks/useFinanceDashboard";
import { tl } from "./format";

function formatSignedTl(value: number): string {
  if (value > 0) return `+${tl(value)}`;
  if (value < 0) return `−${tl(Math.abs(value))}`;
  return tl(0);
}

interface SuppliersLedgerTabProps {
  fromDate: string;
  toDate: string;
  suppliers: Supplier[];
  selectedSupplierId: string;
  selectedSupplier: Supplier | null;
  visibleSupplierTxs: SupplierTransaction[];
  selectedSupplierPeriodSummary: SupplierDateBalanceSummary | null;
  supFormOpen: boolean;
  supEditId: string | null;
  supName: string;
  supCategory: string;
  supContact: string;
  supPhone: string;
  supAddress: string;
  supSaving: boolean;
  txType: "alis" | "odeme";
  txAmount: string;
  txInvoiceNo: string;
  txDate: string;
  txDescription: string;
  txExpenseCategory: ExpenseCategory;
  txPaymentMethod: FinancialPaymentMethod;
  txSaving: boolean;
  onSelectSupplier: (id: string) => void;
  onToggleNewSupplierForm: () => void;
  onOpenEditSupplierForm: (sup: Supplier) => void;
  onCloseSupplierForm: () => void;
  onSupNameChange: (v: string) => void;
  onSupCategoryChange: (v: string) => void;
  onSupContactChange: (v: string) => void;
  onSupPhoneChange: (v: string) => void;
  onSupAddressChange: (v: string) => void;
  onSaveSupplier: (e: React.FormEvent) => void;
  onTxTypeChange: (v: "alis" | "odeme") => void;
  onTxAmountChange: (v: string) => void;
  onTxInvoiceNoChange: (v: string) => void;
  onTxDateChange: (v: string) => void;
  onTxDescriptionChange: (v: string) => void;
  onTxExpenseCategoryChange: (v: ExpenseCategory) => void;
  onTxPaymentMethodChange: (v: FinancialPaymentMethod) => void;
  onRecordSupplierTx: (e: React.FormEvent) => void;
  onStartStorno: (draft: StornoDraft) => void;
}

export function SuppliersLedgerTab({
  fromDate,
  toDate,
  suppliers,
  selectedSupplierId,
  selectedSupplier,
  visibleSupplierTxs,
  selectedSupplierPeriodSummary,
  supFormOpen,
  supEditId,
  supName,
  supCategory,
  supContact,
  supPhone,
  supAddress,
  supSaving,
  txType,
  txAmount,
  txInvoiceNo,
  txDate,
  txDescription,
  txExpenseCategory,
  txPaymentMethod,
  txSaving,
  onSelectSupplier,
  onToggleNewSupplierForm,
  onOpenEditSupplierForm,
  onCloseSupplierForm,
  onSupNameChange,
  onSupCategoryChange,
  onSupContactChange,
  onSupPhoneChange,
  onSupAddressChange,
  onSaveSupplier,
  onTxTypeChange,
  onTxAmountChange,
  onTxInvoiceNoChange,
  onTxDateChange,
  onTxDescriptionChange,
  onTxExpenseCategoryChange,
  onTxPaymentMethodChange,
  onRecordSupplierTx,
  onStartStorno,
}: SuppliersLedgerTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Sol: Tedarikçi Listesi & Yeni Tedarikçi Formu */}
      <div className="lg:col-span-5 space-y-4">
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">Tedarikçiler</h2>
            <button
              type="button"
              onClick={onToggleNewSupplierForm}
              className="min-h-11 px-3.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Yeni Tedarikçi</span>
            </button>
          </div>

          {supFormOpen && (
            <form
              onSubmit={onSaveSupplier}
              className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-3.5 space-y-2.5"
            >
              <div className="text-xs font-bold text-[#8E3D1B]">
                {supEditId ? "Tedarikçiyi Düzenle" : "Yeni Tedarikçi Kartı"}
              </div>
              <input
                type="text"
                value={supName}
                onChange={(e) => onSupNameChange(e.target.value)}
                placeholder="Firma / Değirmen Adı (ör. Anadolu Taş Değirmen)"
                required
                className="w-full min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={supCategory}
                  onChange={(e) => onSupCategoryChange(e.target.value)}
                  placeholder="Kategori (Un, Süt, Ambalaj)"
                  className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                />
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => onSupContactChange(e.target.value)}
                  placeholder="Yetkili Adı"
                  className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={supPhone}
                  onChange={(e) => onSupPhoneChange(e.target.value)}
                  placeholder="Telefon"
                  className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                />
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => onSupAddressChange(e.target.value)}
                  placeholder="İlçe / Adres"
                  className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseSupplierForm}
                  className="min-h-11 px-3 rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={supSaving}
                  className="min-h-11 px-4 rounded-xl bg-[#3B1E1A] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {supSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          )}

          {suppliers.length === 0 ? (
            <p className="text-xs text-[#6E5148] py-4">
              Henüz kayıtlı tedarikçi yok. Un değirmeni, süt çiftliği veya ambalajcı ekleyip alım/ödemeleri izleyebilirsiniz.
            </p>
          ) : (
            <div className="space-y-2">
              {suppliers.map((sup) => {
                const selected = sup.id === selectedSupplierId;
                return (
                  <div
                    key={sup.id}
                    className={`rounded-2xl border p-3.5 transition-colors ${
                      selected
                        ? "bg-[#FBF6EC] border-[#B4532A]"
                        : "bg-[#FFFFFF] border-[#E2D3BD] hover:bg-[#FBF6EC]/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectSupplier(sup.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm font-bold text-[#3B1E1A] truncate">{sup.name}</div>
                        <div className="text-xs text-[#6E5148] truncate">
                          {sup.category} {sup.contactPerson ? `· ${sup.contactPerson}` : ""}
                        </div>
                      </button>
                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono tabular-nums text-sm font-extrabold ${
                            sup.balance > 0 ? "text-[#7D2114]" : "text-[#1D5130]"
                          }`}
                        >
                          {tl(sup.balance)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenEditSupplierForm(sup)}
                          className="text-[11px] font-semibold text-[#6E5148] hover:text-[#3B1E1A] underline"
                        >
                          Düzenle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sağ: Seçili Tedarikçi Hareket Girişi & Geçmişi */}
      <div className="lg:col-span-7 space-y-4">
        <form
          onSubmit={onRecordSupplierTx}
          className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 space-y-3 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
                {selectedSupplier ? `${selectedSupplier.name} — Hareket İşle` : "Tedarikçi Hareketi"}
              </h2>
              <p className="text-xs text-[#6E5148]">
                Mal alım faturası borcu artırır (+); yapılan ödeme borcu düşer (−).
              </p>
            </div>
            {selectedSupplier && (
              <span className="font-mono tabular-nums text-sm font-extrabold px-3 py-1.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD]">
                Borç: {tl(selectedSupplier.balance)}
              </span>
            )}
          </div>

          {!selectedSupplier ? (
            <p className="text-xs text-[#6E5148]">
              Önce sol panelden bir tedarikçi seçin veya yeni tedarikçi ekleyin.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onTxTypeChange("alis")}
                  className={`min-h-11 rounded-xl border text-xs font-bold transition-colors ${
                    txType === "alis"
                      ? "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148]"
                  }`}
                >
                  Mal Alım Faturası (+)
                </button>
                <button
                  type="button"
                  onClick={() => onTxTypeChange("odeme")}
                  className={`min-h-11 rounded-xl border text-xs font-bold transition-colors ${
                    txType === "odeme"
                      ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148]"
                  }`}
                >
                  Ödeme Çıkışı (−)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-[#6E5148]">Tutar (₺)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={txAmount}
                    onChange={(e) => onTxAmountChange(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono text-sm"
                  />
                </label>
                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-[#6E5148]">Fatura / Dekont No</span>
                  <input
                    type="text"
                    value={txInvoiceNo}
                    onChange={(e) => onTxInvoiceNoChange(e.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm"
                  />
                </label>
                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-[#6E5148]">Tarih</span>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => onTxDateChange(e.target.value)}
                    required
                    className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono text-sm"
                  />
                </label>
              </div>

              <input
                type="text"
                value={txDescription}
                onChange={(e) => onTxDescriptionChange(e.target.value)}
                placeholder="Açıklama (ör. 15 çuval siyez ve tam buğday)"
                className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm"
              />

              <div className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-3 space-y-2.5">
                {txType === "alis" ? (
                  <label className="block space-y-1 text-xs">
                    <span className="font-semibold text-[#6E5148]">Gider Kategorisi</span>
                    <select
                      value={txExpenseCategory}
                      onChange={(e) => onTxExpenseCategoryChange(e.target.value as ExpenseCategory)}
                      className="w-full min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs text-[#3B1E1A]"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {EXPENSE_CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="block space-y-1 text-xs">
                    <span className="font-semibold text-[#6E5148]">Ödeme Kanalı</span>
                    <select
                      value={txPaymentMethod}
                      onChange={(e) => onTxPaymentMethodChange(e.target.value as FinancialPaymentMethod)}
                      className="w-full min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs text-[#3B1E1A]"
                    >
                      {(Object.keys(FINANCIAL_PAYMENT_METHOD_LABELS) as FinancialPaymentMethod[]).map(
                        (pm) => (
                          <option key={pm} value={pm}>
                            {FINANCIAL_PAYMENT_METHOD_LABELS[pm]}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                )}
                <p className="text-[11px] text-[#6E5148]">
                  Alışlar tahakkuk P&amp;L&apos;e, ödemeler nakit akışına otomatik ve çifte sayımsız yansır.
                </p>
              </div>

              <button
                type="submit"
                disabled={txSaving}
                className="w-full min-h-11 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {txSaving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>Tedarikçi Hareketini Kaydet</span>
              </button>
            </>
          )}
        </form>

        {/* Seçili Tedarikçi Dönem Bakiye Özeti */}
        {selectedSupplier && selectedSupplierPeriodSummary && (
          <section
            aria-label="Tedarikçi dönem bakiye özeti"
            className="rounded-3xl bg-[#FBF6EC] border border-[#E2D3BD] p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-sm font-bold text-[#3B1E1A]">
                Dönem Bakiye Özeti — {selectedSupplier.name}
              </h3>
              <span className="font-mono text-[11px] text-[#6E5148]">
                {formatTrDate(fromDate)} – {formatTrDate(toDate)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E5148]">
                  Dönem Başı Devir
                </div>
                <div className="font-mono tabular-nums text-sm font-extrabold text-[#3B1E1A]">
                  {tl(selectedSupplierPeriodSummary.openingBalance)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E5148]">
                  Dönem Alış (+)
                </div>
                <div
                  className={`font-mono tabular-nums text-sm font-extrabold ${
                    selectedSupplierPeriodSummary.periodPurchases < 0
                      ? "text-[#1D5130]"
                      : "text-[#7D2114]"
                  }`}
                >
                  {formatSignedTl(selectedSupplierPeriodSummary.periodPurchases)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E5148]">
                  Dönem Ödeme (−)
                </div>
                <div
                  className={`font-mono tabular-nums text-sm font-extrabold ${
                    selectedSupplierPeriodSummary.periodPayments < 0
                      ? "text-[#7D2114]"
                      : "text-[#1D5130]"
                  }`}
                >
                  {formatSignedTl(-selectedSupplierPeriodSummary.periodPayments)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E5148]">
                  Dönem Sonu Bakiye
                </div>
                <div
                  className={`font-mono tabular-nums text-sm font-extrabold ${
                    selectedSupplierPeriodSummary.closingBalance > 0
                      ? "text-[#7D2114]"
                      : "text-[#1D5130]"
                  }`}
                >
                  {tl(selectedSupplierPeriodSummary.closingBalance)}
                </div>
                <div className="font-mono tabular-nums text-[10px] text-[#6E5148]">
                  Net: {formatSignedTl(selectedSupplierPeriodSummary.periodNet)}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tedarikçi Hareket Geçmişi */}
        <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] overflow-hidden shadow-sm">
          <div className="p-4 bg-[#FBF6EC] border-b border-[#E2D3BD] flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#3B1E1A]">
              {selectedSupplier ? `${selectedSupplier.name} Hareketleri` : "Son Tedarikçi Hareketleri"}
            </h3>
            <span className="text-xs font-mono text-[#6E5148]">{visibleSupplierTxs.length} kayıt</span>
          </div>

          {visibleSupplierTxs.length === 0 ? (
            <p className="p-8 text-center text-xs text-[#6E5148]">
              Bu tedarikçi için henüz alım veya ödeme hareketi bulunmuyor.
            </p>
          ) : (
            <div className="divide-y divide-[#E2D3BD]">
              {visibleSupplierTxs.map((tx) => {
                const isStorno = tx.type === "storno_alis" || tx.type === "storno_odeme";
                return (
                  <div
                    key={tx.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      tx.isReversed ? "bg-[#FBF6EC]/60 opacity-70" : ""
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[#6E5148]">{formatTrDate(tx.date)}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            isStorno
                              ? "bg-[#FEF3D6] border-[#E8C587] text-[#7A4A0B]"
                              : tx.type === "alis"
                                ? "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                                : "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                          }`}
                        >
                          {tx.type === "alis"
                            ? "Mal Alımı (+Borç)"
                            : tx.type === "odeme"
                              ? "Ödeme (−Borç)"
                              : tx.type === "storno_alis"
                                ? "Storno Alım"
                                : "Storno Ödeme"}
                        </span>
                        {tx.expenseCategory && (
                          <span className="px-2 py-0.5 rounded-md bg-[#F6EEDF] border border-[#E2D3BD] text-[11px] font-semibold text-[#3B1E1A]">
                            {getExpenseCategoryLabel(tx.expenseCategory)}
                          </span>
                        )}
                        {tx.paymentMethod && (
                          <span className="px-2 py-0.5 rounded-md bg-[#F6EEDF] border border-[#E2D3BD] text-[11px] font-semibold text-[#6E5148]">
                            {FINANCIAL_PAYMENT_METHOD_LABELS[tx.paymentMethod as FinancialPaymentMethod] ??
                              tx.paymentMethod}
                          </span>
                        )}
                        {tx.invoiceNo && (
                          <span className="font-mono text-[11px] text-[#6E5148]">{tx.invoiceNo}</span>
                        )}
                        {tx.isReversed && (
                          <span className="px-2 py-0.5 rounded-md bg-[#FEF3D6] border border-[#E8C587] text-[11px] font-bold text-[#7A4A0B]">
                            İptal Edildi
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-medium text-[#3B1E1A] ${tx.isReversed ? "line-through" : ""}`}>
                        {tx.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-mono tabular-nums text-base font-extrabold ${
                            tx.isReversed
                              ? "line-through text-[#6E5148]"
                              : tx.delta > 0
                                ? "text-[#7D2114]"
                                : "text-[#1D5130]"
                          }`}
                        >
                          {tx.delta > 0 ? "+" : "−"}
                          {tl(tx.amount)}
                        </div>
                        {tx.balanceAfter !== null && (
                          <div className="font-mono tabular-nums text-[11px] text-[#6E5148]">
                            Bakiye: {tl(tx.balanceAfter)}
                          </div>
                        )}
                      </div>
                      {!isStorno && !tx.isReversed && (
                        <button
                          type="button"
                          onClick={() =>
                            onStartStorno({
                              kind: "supplier_tx",
                              id: tx.id,
                              supplierId: tx.supplierId,
                              label: `${tx.description} (${tl(tx.amount)})`,
                              reason: "",
                            })
                          }
                          className="min-h-11 px-3 rounded-xl bg-[#FBF6EC] hover:bg-[#FEF3D6] border border-[#E2D3BD] text-xs font-bold text-[#6E5148] hover:text-[#7A4A0B] inline-flex items-center gap-1.5"
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
    </div>
  );
}
