"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ShieldAlert, Truck, Wallet, X } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useFinanceDashboard } from "@/hooks/useFinanceDashboard";
import { hasCapability } from "@/lib/security/capabilities";
import { buildFinancialRecordsCsv, buildSuppliersCsv } from "@/lib/finance";
import { downloadCsvFile } from "@/components/admin/finans/format";
import { FinanceHeaderBar } from "@/components/admin/finans/FinanceHeaderBar";
import { CfoSummarySection } from "@/components/admin/finans/CfoSummarySection";
import { FinanceStornoBanner } from "@/components/admin/finans/FinanceStornoBanner";
import { FinancialLedgerTab } from "@/components/admin/finans/FinancialLedgerTab";
import { SuppliersLedgerTab } from "@/components/admin/finans/SuppliersLedgerTab";

export default function AdminFinancePage() {
  const { adminUser } = useAdminAuth();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");
  const vm = useFinanceDashboard(canViewFinance);

  if (!canViewFinance) {
    return (
      <div className="max-w-xl mx-auto my-12 rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-6 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Finansal Yetki Gerekli</h1>
        <p className="text-sm text-[#6E5148]">
          CFO Gider, Tedarikçi &amp; Net Marj Merkezi yalnızca yönetici (`admin` / `superadmin`) hesaplarına açıktır.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-sm font-bold transition-colors"
        >
          Yönetim Paneline Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-[#3B1E1A]">
      <FinanceHeaderBar
        today={vm.today}
        monthStart={vm.monthStart}
        fromDate={vm.fromDate}
        toDate={vm.toDate}
        loading={vm.loading}
        hasRecords={vm.records.length > 0}
        hasSuppliers={vm.suppliers.length > 0}
        onFromDateChange={vm.setFromDate}
        onToDateChange={vm.setToDate}
        onApplyThisMonth={vm.applyThisMonth}
        onApplyLast7Days={vm.applyLast7Days}
        onApplyPreviousMonth={vm.applyPreviousMonth}
        onApplyAllTime={vm.applyAllTime}
        onDownloadRecordsCsv={() =>
          downloadCsvFile(`ekmeklab_gider_defteri_${vm.today}.csv`, buildFinancialRecordsCsv(vm.records))
        }
        onDownloadSuppliersCsv={() =>
          downloadCsvFile(`ekmeklab_tedarikciler_${vm.today}.csv`, buildSuppliersCsv(vm.suppliers))
        }
        onRefresh={() => void vm.loadFinanceData()}
      />

      {vm.error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] px-4 py-3 text-sm text-[#7D2114] flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{vm.error}</span>
        </div>
      )}

      {vm.notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm flex items-center justify-between gap-2 ${
            vm.notice.tone === "success"
              ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
              : "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
          }`}
        >
          <div className="flex items-center gap-2">
            {vm.notice.tone === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{vm.notice.text}</span>
          </div>
          <button
            type="button"
            onClick={vm.clearNotice}
            aria-label="Bildirimi kapat"
            className="min-w-11 min-h-11 rounded-xl inline-flex items-center justify-center hover:bg-black/5"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <CfoSummarySection summary={vm.summary} categoryBreakdown={vm.categoryBreakdown} />

      {/* Sekme Anahtarı */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => vm.setActiveTab("ledger")}
          className={`min-h-11 px-4 rounded-2xl text-sm font-bold border inline-flex items-center gap-2 transition-colors ${
            vm.activeTab === "ledger"
              ? "bg-[#B4532A] border-[#9C4421] text-white shadow-xs"
              : "bg-[#FFFFFF] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#FBF6EC]"
          }`}
        >
          <Wallet className="w-4 h-4" aria-hidden="true" />
          <span>Gider &amp; Nakit Defteri ({vm.records.length})</span>
        </button>
        <button
          type="button"
          onClick={() => vm.setActiveTab("suppliers")}
          className={`min-h-11 px-4 rounded-2xl text-sm font-bold border inline-flex items-center gap-2 transition-colors ${
            vm.activeTab === "suppliers"
              ? "bg-[#B4532A] border-[#9C4421] text-white shadow-xs"
              : "bg-[#FFFFFF] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#FBF6EC]"
          }`}
        >
          <Truck className="w-4 h-4" aria-hidden="true" />
          <span>Tedarikçi Carileri ({vm.suppliers.length})</span>
        </button>
      </div>

      {vm.stornoDraft && (
        <FinanceStornoBanner
          draft={vm.stornoDraft}
          busy={vm.stornoBusy}
          onReasonChange={(reason) =>
            vm.setStornoDraft(vm.stornoDraft ? { ...vm.stornoDraft, reason } : null)
          }
          onClose={() => vm.setStornoDraft(null)}
          onSubmit={(e) => void vm.handleConfirmStorno(e)}
        />
      )}

      {vm.activeTab === "ledger" && (
        <FinancialLedgerTab
          fromDate={vm.fromDate}
          toDate={vm.toDate}
          loading={vm.loading}
          records={vm.records}
          totalOperatingExpenses={vm.summary?.totalOperatingExpenses ?? 0}
          categoryBreakdown={vm.categoryBreakdown}
          recType={vm.recType}
          recCategory={vm.recCategory}
          recAmount={vm.recAmount}
          recPaymentMethod={vm.recPaymentMethod}
          recDate={vm.recDate}
          recDescription={vm.recDescription}
          recSubmitting={vm.recSubmitting}
          onRecTypeChange={vm.setRecType}
          onRecCategoryChange={vm.setRecCategory}
          onRecAmountChange={vm.setRecAmount}
          onRecPaymentMethodChange={vm.setRecPaymentMethod}
          onRecDateChange={vm.setRecDate}
          onRecDescriptionChange={vm.setRecDescription}
          onSubmitRecord={(e) => void vm.handleCreateRecord(e)}
          onStartStorno={vm.setStornoDraft}
        />
      )}

      {vm.activeTab === "suppliers" && (
        <SuppliersLedgerTab
          suppliers={vm.suppliers}
          selectedSupplierId={vm.selectedSupplierId}
          selectedSupplier={vm.selectedSupplier}
          visibleSupplierTxs={vm.visibleSupplierTxs}
          supFormOpen={vm.supFormOpen}
          supEditId={vm.supEditId}
          supName={vm.supName}
          supCategory={vm.supCategory}
          supContact={vm.supContact}
          supPhone={vm.supPhone}
          supAddress={vm.supAddress}
          supSaving={vm.supSaving}
          txType={vm.txType}
          txAmount={vm.txAmount}
          txInvoiceNo={vm.txInvoiceNo}
          txDate={vm.txDate}
          txDescription={vm.txDescription}
          txAlsoExpense={vm.txAlsoExpense}
          txExpenseCategory={vm.txExpenseCategory}
          txPaymentMethod={vm.txPaymentMethod}
          txSaving={vm.txSaving}
          onSelectSupplier={vm.setSelectedSupplierId}
          onToggleNewSupplierForm={vm.toggleNewSupplierForm}
          onOpenEditSupplierForm={vm.openEditSupplierForm}
          onCloseSupplierForm={() => vm.setSupFormOpen(false)}
          onSupNameChange={vm.setSupName}
          onSupCategoryChange={vm.setSupCategory}
          onSupContactChange={vm.setSupContact}
          onSupPhoneChange={vm.setSupPhone}
          onSupAddressChange={vm.setSupAddress}
          onSaveSupplier={(e) => void vm.handleSaveSupplier(e)}
          onTxTypeChange={vm.setTxType}
          onTxAmountChange={vm.setTxAmount}
          onTxInvoiceNoChange={vm.setTxInvoiceNo}
          onTxDateChange={vm.setTxDate}
          onTxDescriptionChange={vm.setTxDescription}
          onTxAlsoExpenseChange={vm.setTxAlsoExpense}
          onTxExpenseCategoryChange={vm.setTxExpenseCategory}
          onTxPaymentMethodChange={vm.setTxPaymentMethod}
          onRecordSupplierTx={(e) => void vm.handleRecordSupplierTx(e)}
          onStartStorno={vm.setStornoDraft}
        />
      )}
    </div>
  );
}
