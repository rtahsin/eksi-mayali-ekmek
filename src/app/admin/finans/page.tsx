"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Download,
  Loader2,
  PieChart,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { hasCapability } from "@/lib/security/capabilities";
import { getErrorMessage } from "@/lib/utils/error";
import {
  buildFinancialRecordsCsv,
  buildSuppliersCsv,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  FINANCIAL_PAYMENT_METHOD_LABELS,
  getExpenseCategoryLabel,
} from "@/lib/cari/finance";
import type {
  CfoPeriodSummary,
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  Supplier,
  SupplierTransaction,
} from "@/types/admin";

interface FinanceApiResponse {
  success?: boolean;
  summary?: CfoPeriodSummary;
  records?: FinancialRecord[];
  suppliers?: Supplier[];
  supplierTransactions?: SupplierTransaction[];
  error?: string;
}

function tl(n: number): string {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function getPreviousMonthRange(today: string): { from: string; to: string } {
  const [yStr, mStr] = today.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const lastDayPrevMonth = new Date(Date.UTC(y, m - 1, 0));
  return {
    from: prevMonthDate.toISOString().slice(0, 10),
    to: lastDayPrevMonth.toISOString().slice(0, 10),
  };
}

export default function AdminFinancePage() {
  const { adminUser } = useAdminAuth();
  const today = useIstanbulToday();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");

  const monthStart = `${today.slice(0, 7)}-01`;
  const [fromDate, setFromDate] = useState<string>(monthStart);
  const [toDate, setToDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<"ledger" | "suppliers">("ledger");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [summary, setSummary] = useState<CfoPeriodSummary | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierTxs, setSupplierTxs] = useState<SupplierTransaction[]>([]);

  // Gider / Gelir yeni kayıt formu
  const [recType, setRecType] = useState<"gider" | "gelir">("gider");
  const [recCategory, setRecCategory] = useState<ExpenseCategory>("hammadde_un");
  const [recAmount, setRecAmount] = useState<string>("");
  const [recPaymentMethod, setRecPaymentMethod] = useState<FinancialPaymentMethod>("havale");
  const [recDate, setRecDate] = useState<string>(today);
  const [recDescription, setRecDescription] = useState<string>("");
  const [recSubmitting, setRecSubmitting] = useState<boolean>(false);

  // Storno inline paneli (gider defteri veya tedarikçi hareketi için)
  const [stornoDraft, setStornoDraft] = useState<{
    kind: "record" | "supplier_tx";
    id: string;
    supplierId?: string;
    label: string;
    reason: string;
  } | null>(null);
  const [stornoBusy, setStornoBusy] = useState<boolean>(false);

  // Tedarikçi ekleme / düzenleme & hareket formu
  const [supFormOpen, setSupFormOpen] = useState<boolean>(false);
  const [supEditId, setSupEditId] = useState<string | null>(null);
  const [supName, setSupName] = useState<string>("");
  const [supCategory, setSupCategory] = useState<string>("Un & Tahıl");
  const [supContact, setSupContact] = useState<string>("");
  const [supPhone, setSupPhone] = useState<string>("");
  const [supAddress, setSupAddress] = useState<string>("");
  const [supSaving, setSupSaving] = useState<boolean>(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [txType, setTxType] = useState<"alis" | "odeme">("alis");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txInvoiceNo, setTxInvoiceNo] = useState<string>("");
  const [txDate, setTxDate] = useState<string>(today);
  const [txDescription, setTxDescription] = useState<string>("");
  const [txAlsoExpense, setTxAlsoExpense] = useState<boolean>(true);
  const [txExpenseCategory, setTxExpenseCategory] = useState<ExpenseCategory>("hammadde_un");
  const [txPaymentMethod, setTxPaymentMethod] = useState<FinancialPaymentMethod>("havale");
  const [txSaving, setTxSaving] = useState<boolean>(false);

  const loadFinanceData = useCallback(async () => {
    if (!canViewFinance) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/admin/finance?${qs.toString()}`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as FinanceApiResponse;
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      setSummary(body.summary ?? null);
      setRecords(Array.isArray(body.records) ? body.records : []);
      const nextSuppliers = Array.isArray(body.suppliers) ? body.suppliers : [];
      setSuppliers(nextSuppliers);
      setSupplierTxs(Array.isArray(body.supplierTransactions) ? body.supplierTransactions : []);
      if (nextSuppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(nextSuppliers[0].id);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Finans verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [canViewFinance, fromDate, selectedSupplierId, toDate]);

  useEffect(() => {
    void loadFinanceData();
  }, [loadFinanceData]);

  const categoryBreakdown = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.expensesByCategory)
      .filter(([, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [summary]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const s of suppliers) {
      map.set(s.id, s);
    }
    return map;
  }, [suppliers]);

  const selectedSupplier = selectedSupplierId ? supplierMap.get(selectedSupplierId) ?? null : null;

  const visibleSupplierTxs = useMemo(() => {
    if (!selectedSupplierId) return supplierTxs;
    return supplierTxs.filter((tx) => tx.supplierId === selectedSupplierId);
  }, [selectedSupplierId, supplierTxs]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recSubmitting) return;
    const numericAmount = Number(recAmount.replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setNotice({ tone: "error", text: "Lütfen sıfırdan büyük geçerli bir tutar girin." });
      return;
    }
    if (recDescription.trim().length < 2) {
      setNotice({ tone: "error", text: "Lütfen kısa bir gider/gelir açıklaması yazın." });
      return;
    }

    setRecSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_record",
          type: recType,
          category: recCategory,
          amount: numericAmount,
          paymentMethod: recPaymentMethod,
          date: recDate,
          description: recDescription.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      setRecAmount("");
      setRecDescription("");
      setNotice({
        tone: "success",
        text: `${recType === "gider" ? "Gider" : "Diğer gelir"} kaydı deftere işlendi (${tl(numericAmount)}).`,
      });
      await loadFinanceData();
    } catch (err: unknown) {
      setNotice({ tone: "error", text: getErrorMessage(err) || "Kayıt eklenemedi." });
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supSaving) return;
    if (supName.trim().length < 2) {
      setNotice({ tone: "error", text: "Tedarikçi adı en az 2 karakter olmalıdır." });
      return;
    }
    setSupSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_supplier",
          id: supEditId ?? undefined,
          name: supName.trim(),
          category: supCategory.trim() || "Un & Tahıl",
          contactPerson: supContact.trim(),
          phone: supPhone.trim(),
          address: supAddress.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { supplier?: Supplier; error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      if (body.supplier?.id) {
        setSelectedSupplierId(body.supplier.id);
      }
      setSupFormOpen(false);
      setSupEditId(null);
      setSupName("");
      setSupContact("");
      setSupPhone("");
      setSupAddress("");
      setNotice({ tone: "success", text: `Tedarikçi kartı kaydedildi (${body.supplier?.name ?? ""}).` });
      await loadFinanceData();
    } catch (err: unknown) {
      setNotice({ tone: "error", text: getErrorMessage(err) || "Tedarikçi kaydedilemedi." });
    } finally {
      setSupSaving(false);
    }
  };

  const handleRecordSupplierTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txSaving || !selectedSupplierId) return;
    const numericAmount = Number(txAmount.replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setNotice({ tone: "error", text: "Lütfen sıfırdan büyük geçerli bir hareket tutarı girin." });
      return;
    }

    setTxSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_transaction",
          supplierId: selectedSupplierId,
          type: txType,
          amount: numericAmount,
          invoiceNo: txInvoiceNo.trim() || null,
          description: txDescription.trim(),
          date: txDate,
          alsoRecordExpense: txType === "odeme" && txAlsoExpense,
          expenseCategory: txExpenseCategory,
          paymentMethod: txPaymentMethod,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        newBalance?: number;
        recordedExpenseId?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      setTxAmount("");
      setTxInvoiceNo("");
      setTxDescription("");
      setNotice({
        tone: "success",
        text: `Tedarikçi hareketi işlendi. Güncel tedarikçi borcu: ${tl(body.newBalance ?? 0)}${
          body.recordedExpenseId ? " (Gider defterine de işlendi)" : ""
        }.`,
      });
      await loadFinanceData();
    } catch (err: unknown) {
      setNotice({ tone: "error", text: getErrorMessage(err) || "Tedarikçi hareketi işlenemedi." });
    } finally {
      setTxSaving(false);
    }
  };

  const handleConfirmStorno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stornoDraft || stornoBusy) return;
    if (stornoDraft.reason.trim().length < 2) {
      setNotice({ tone: "error", text: "Lütfen storno (iptal) nedenini yazın." });
      return;
    }

    setStornoBusy(true);
    setNotice(null);
    try {
      const endpoint =
        stornoDraft.kind === "record" ? "/api/admin/finance" : "/api/admin/finance/suppliers";
      const payload =
        stornoDraft.kind === "record"
          ? {
              action: "storno_record",
              recordId: stornoDraft.id,
              reason: stornoDraft.reason.trim(),
            }
          : {
              action: "storno_transaction",
              supplierId: stornoDraft.supplierId,
              transactionId: stornoDraft.id,
              reason: stornoDraft.reason.trim(),
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);

      setStornoDraft(null);
      setNotice({ tone: "success", text: "Ters kayıt (storno) başarıyla muhasebeleştirildi." });
      await loadFinanceData();
    } catch (err: unknown) {
      setNotice({ tone: "error", text: getErrorMessage(err) || "Storno işlemi yapılamadı." });
    } finally {
      setStornoBusy(false);
    }
  };

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
      {/* Üst Başlık ve Tarih / CSV Araçları */}
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
              onClick={() => downloadCsvFile(`ekmeklab_gider_defteri_${today}.csv`, buildFinancialRecordsCsv(records))}
              disabled={records.length === 0}
              className="min-h-11 px-3.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
              <span>Gider CSV</span>
            </button>
            <button
              type="button"
              onClick={() => downloadCsvFile(`ekmeklab_tedarikciler_${today}.csv`, buildSuppliersCsv(suppliers))}
              disabled={suppliers.length === 0}
              className="min-h-11 px-3.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A] inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
              <span>Tedarikçi CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void loadFinanceData()}
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
              onClick={() => {
                setFromDate(monthStart);
                setToDate(today);
              }}
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
              onClick={() => {
                setFromDate(addDays(today, -6));
                setToDate(today);
              }}
              className={`min-h-11 px-3.5 rounded-xl border text-xs font-bold transition-colors ${
                fromDate === addDays(today, -6) && toDate === today
                  ? "bg-[#3B1E1A] text-white border-[#3B1E1A]"
                  : "bg-[#FBF6EC] hover:bg-[#F3E2D4] text-[#3B1E1A] border-[#E2D3BD]"
              }`}
            >
              Son 7 Gün
            </button>
            <button
              type="button"
              onClick={() => {
                const prev = getPreviousMonthRange(today);
                setFromDate(prev.from);
                setToDate(prev.to);
              }}
              className="min-h-11 px-3.5 rounded-xl border bg-[#FBF6EC] hover:bg-[#F3E2D4] text-[#3B1E1A] border-[#E2D3BD] text-xs font-bold transition-colors"
            >
              Geçen Ay
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate("2025-01-01");
                setToDate(today);
              }}
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
                onChange={(e) => setFromDate(e.target.value)}
                className="min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] font-mono text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold text-[#6E5148]">Bitiş</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] font-mono text-xs"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Bildirim / Hata Bannerları */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] px-4 py-3 text-sm text-[#7D2114] flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm flex items-center justify-between gap-2 ${
            notice.tone === "success"
              ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
              : "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.tone === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Bildirimi kapat"
            className="min-w-11 min-h-11 rounded-xl inline-flex items-center justify-center hover:bg-black/5"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

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
            Perakende: <strong className="font-mono tabular-nums text-[#3B1E1A]">{summary ? tl(summary.retailDeliveredSales) : "—"}</strong>{" "}
            · B2B: <strong className="font-mono tabular-nums text-[#3B1E1A]">{summary ? tl(summary.b2bNetSales) : "—"}</strong>
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
            Perakende: <strong className="font-mono tabular-nums text-[#3B1E1A]">{summary ? tl(summary.retailCollectedCash) : "—"}</strong>{" "}
            · B2B: <strong className="font-mono tabular-nums text-[#3B1E1A]">{summary ? tl(summary.b2bCollectedCash) : "—"}</strong>
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

      {/* Sekme Anahtarı */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`min-h-11 px-4 rounded-2xl text-sm font-bold border inline-flex items-center gap-2 transition-colors ${
            activeTab === "ledger"
              ? "bg-[#B4532A] border-[#9C4421] text-white shadow-xs"
              : "bg-[#FFFFFF] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#FBF6EC]"
          }`}
        >
          <Wallet className="w-4 h-4" aria-hidden="true" />
          <span>Gider &amp; Nakit Defteri ({records.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("suppliers")}
          className={`min-h-11 px-4 rounded-2xl text-sm font-bold border inline-flex items-center gap-2 transition-colors ${
            activeTab === "suppliers"
              ? "bg-[#B4532A] border-[#9C4421] text-white shadow-xs"
              : "bg-[#FFFFFF] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#FBF6EC]"
          }`}
        >
          <Truck className="w-4 h-4" aria-hidden="true" />
          <span>Tedarikçi Carileri ({suppliers.length})</span>
        </button>
      </div>

      {/* Inline Storno Onay Kutusu */}
      {stornoDraft && (
        <form
          onSubmit={(e) => void handleConfirmStorno(e)}
          className="rounded-3xl bg-[#FEF3D6] border border-[#E8C587] p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-base font-bold text-[#7A4A0B]">
                Ters Kayıt (Storno) Onayı
              </h2>
              <p className="text-xs text-[#3B1E1A] mt-0.5">
                Muhasebe kaydı silinmez; seçilen işlem (<strong>{stornoDraft.label}</strong>) için zıt yönlü storno kaydı oluşturulur.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStornoDraft(null)}
              aria-label="Storno formunu kapat"
              className="min-w-11 min-h-11 rounded-xl hover:bg-black/5 inline-flex items-center justify-center"
            >
              <X className="w-4 h-4 text-[#7A4A0B]" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={stornoDraft.reason}
              onChange={(e) => setStornoDraft({ ...stornoDraft, reason: e.target.value })}
              placeholder="İptal / düzeltme nedenini yazın (ör. çift fatura girişi)…"
              required
              className="flex-1 min-h-11 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8C587] text-sm text-[#3B1E1A]"
            />
            <button
              type="submit"
              disabled={stornoBusy}
              className="min-h-11 px-4 rounded-xl bg-[#7A4A0B] hover:bg-[#5E3807] text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {stornoBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Ters Kaydı Kes</span>
            </button>
          </div>
        </form>
      )}

      {/* SEKME 1: Gider & Nakit Defteri */}
      {activeTab === "ledger" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sol: Hızlı Gider / Gelir Formu ve Kategori Dağılımı */}
          <div className="lg:col-span-4 space-y-4">
            <form
              onSubmit={(e) => void handleCreateRecord(e)}
              className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 space-y-3 shadow-sm"
            >
              <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
                Hızlı Gider / Gelir Kaydı
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecType("gider")}
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
                  onClick={() => setRecType("gelir")}
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
                  onChange={(e) => setRecCategory(e.target.value as ExpenseCategory)}
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
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono tabular-nums text-sm text-[#3B1E1A]"
                  />
                </label>
                <label className="block space-y-1 text-xs">
                  <span className="font-semibold text-[#6E5148]">Ödeme Yöntemi</span>
                  <select
                    value={recPaymentMethod}
                    onChange={(e) => setRecPaymentMethod(e.target.value as FinancialPaymentMethod)}
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
                  onChange={(e) => setRecDate(e.target.value)}
                  required
                  className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono text-sm text-[#3B1E1A]"
                />
              </label>

              <label className="block space-y-1 text-xs">
                <span className="font-semibold text-[#6E5148]">Açıklama</span>
                <input
                  type="text"
                  value={recDescription}
                  onChange={(e) => setRecDescription(e.target.value)}
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
                    const total = summary?.totalOperatingExpenses || 1;
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
                          Ödeme: {FINANCIAL_PAYMENT_METHOD_LABELS[rec.paymentMethod as FinancialPaymentMethod] ?? rec.paymentMethod}
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
                              setStornoDraft({
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
      )}

      {/* SEKME 2: Tedarikçi Carileri */}
      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sol: Tedarikçi Listesi & Yeni Tedarikçi Formu */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">Tedarikçiler</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSupEditId(null);
                    setSupName("");
                    setSupCategory("Un & Tahıl");
                    setSupContact("");
                    setSupPhone("");
                    setSupAddress("");
                    setSupFormOpen((prev) => !prev);
                  }}
                  className="min-h-11 px-3.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Yeni Tedarikçi</span>
                </button>
              </div>

              {supFormOpen && (
                <form
                  onSubmit={(e) => void handleSaveSupplier(e)}
                  className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-3.5 space-y-2.5"
                >
                  <div className="text-xs font-bold text-[#8E3D1B]">
                    {supEditId ? "Tedarikçiyi Düzenle" : "Yeni Tedarikçi Kartı"}
                  </div>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="Firma / Değirmen Adı (ör. Anadolu Taş Değirmen)"
                    required
                    className="w-full min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={supCategory}
                      onChange={(e) => setSupCategory(e.target.value)}
                      placeholder="Kategori (Un, Süt, Ambalaj)"
                      className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                    />
                    <input
                      type="text"
                      value={supContact}
                      onChange={(e) => setSupContact(e.target.value)}
                      placeholder="Yetkili Adı"
                      className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      placeholder="Telefon"
                      className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                    />
                    <input
                      type="text"
                      value={supAddress}
                      onChange={(e) => setSupAddress(e.target.value)}
                      placeholder="İlçe / Adres"
                      className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSupFormOpen(false)}
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
                            onClick={() => setSelectedSupplierId(sup.id)}
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
                              onClick={() => {
                                setSupEditId(sup.id);
                                setSupName(sup.name);
                                setSupCategory(sup.category);
                                setSupContact(sup.contactPerson);
                                setSupPhone(sup.phone);
                                setSupAddress(sup.address);
                                setSupFormOpen(true);
                              }}
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
              onSubmit={(e) => void handleRecordSupplierTx(e)}
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
                      onClick={() => setTxType("alis")}
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
                      onClick={() => setTxType("odeme")}
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
                        onChange={(e) => setTxAmount(e.target.value)}
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
                        onChange={(e) => setTxInvoiceNo(e.target.value)}
                        placeholder="Opsiyonel"
                        className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span className="font-semibold text-[#6E5148]">Tarih</span>
                      <input
                        type="date"
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        required
                        className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] font-mono text-sm"
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="Açıklama (ör. 15 çuval siyez ve tam buğday)"
                    className="w-full min-h-11 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm"
                  />

                  {txType === "odeme" && (
                    <div className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] p-3 space-y-2.5">
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#3B1E1A] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={txAlsoExpense}
                          onChange={(e) => setTxAlsoExpense(e.target.checked)}
                          className="w-4 h-4 accent-[#B4532A]"
                        />
                        <span>Gider defterine de işletme nakit çıkışı olarak işle</span>
                      </label>
                      {txAlsoExpense && (
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={txExpenseCategory}
                            onChange={(e) => setTxExpenseCategory(e.target.value as ExpenseCategory)}
                            className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                          >
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {EXPENSE_CATEGORY_LABELS[cat]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={txPaymentMethod}
                            onChange={(e) => setTxPaymentMethod(e.target.value as FinancialPaymentMethod)}
                            className="min-h-11 px-3 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-xs"
                          >
                            {(Object.keys(FINANCIAL_PAYMENT_METHOD_LABELS) as FinancialPaymentMethod[]).map(
                              (pm) => (
                                <option key={pm} value={pm}>
                                  {FINANCIAL_PAYMENT_METHOD_LABELS[pm]}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

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
                          <span
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
                          </span>
                          {!isStorno && !tx.isReversed && (
                            <button
                              type="button"
                              onClick={() =>
                                setStornoDraft({
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
      )}
    </div>
  );
}
