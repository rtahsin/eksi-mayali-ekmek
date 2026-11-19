"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import {
  fetchFinanceDashboardData,
  getPreviousMonthRange,
  parsePositiveAmountInput,
  submitFinancialRecord,
  submitFinancialRecordStorno,
  submitSupplierTransaction,
  submitSupplierTransactionStorno,
  submitSupplierUpsert,
} from "@/lib/finance/client";
import {
  summarizeSupplierBalanceByDate,
  type CfoPeriodSummary,
  type ExpenseCategory,
  type FinancialPaymentMethod,
  type FinancialRecord,
  type Supplier,
  type SupplierDateBalanceSummary,
  type SupplierTransaction,
} from "@/lib/finance";

export interface FinanceNotice {
  tone: "success" | "error";
  text: string;
}

export interface StornoDraft {
  kind: "record" | "supplier_tx";
  id: string;
  supplierId?: string;
  label: string;
  reason: string;
}

function formatMoneyText(n: number): string {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

export function useFinanceDashboard(enabled: boolean) {
  const today = useIstanbulToday();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [fromDate, setFromDate] = useState<string>(monthStart);
  const [toDate, setToDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<"ledger" | "suppliers">("ledger");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FinanceNotice | null>(null);

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

  // Storno inline paneli
  const [stornoDraft, setStornoDraft] = useState<StornoDraft | null>(null);
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
  const [txExpenseCategory, setTxExpenseCategory] = useState<ExpenseCategory>("hammadde_un");
  const [txPaymentMethod, setTxPaymentMethod] = useState<FinancialPaymentMethod>("havale");
  const [txSaving, setTxSaving] = useState<boolean>(false);

  const loadFinanceData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = await fetchFinanceDashboardData({ from: fromDate, to: toDate });
      setSummary(body.summary ?? null);
      setRecords(Array.isArray(body.records) ? body.records : []);
      const nextSuppliers = Array.isArray(body.suppliers) ? body.suppliers : [];
      setSuppliers(nextSuppliers);
      setSupplierTxs(Array.isArray(body.supplierTransactions) ? body.supplierTransactions : []);
      if (nextSuppliers.length > 0) {
        setSelectedSupplierId((prev) => prev || nextSuppliers[0].id);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Finans verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [enabled, fromDate, toDate]);

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

  const selectedSupplierPeriodSummary = useMemo<SupplierDateBalanceSummary | null>(() => {
    if (!selectedSupplierId) return null;
    return summarizeSupplierBalanceByDate(supplierTxs, selectedSupplierId, fromDate, toDate);
  }, [selectedSupplierId, supplierTxs, fromDate, toDate]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recSubmitting) return;
    const numericAmount = parsePositiveAmountInput(recAmount);
    if (numericAmount === null) {
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
      await submitFinancialRecord({
        type: recType,
        category: recCategory,
        amount: numericAmount,
        paymentMethod: recPaymentMethod,
        date: recDate,
        description: recDescription.trim(),
      });

      setRecAmount("");
      setRecDescription("");
      setNotice({
        tone: "success",
        text: `${recType === "gider" ? "Gider" : "Diğer gelir"} kaydı deftere işlendi (${formatMoneyText(numericAmount)}).`,
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
      const body = await submitSupplierUpsert({
        id: supEditId ?? undefined,
        name: supName.trim(),
        category: supCategory.trim() || "Un & Tahıl",
        contactPerson: supContact.trim(),
        phone: supPhone.trim(),
        email: "",
        address: supAddress.trim(),
      });

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
    const numericAmount = parsePositiveAmountInput(txAmount);
    if (numericAmount === null) {
      setNotice({ tone: "error", text: "Lütfen sıfırdan büyük geçerli bir hareket tutarı girin." });
      return;
    }

    setTxSaving(true);
    setNotice(null);
    try {
      const body = await submitSupplierTransaction({
        supplierId: selectedSupplierId,
        type: txType,
        amount: numericAmount,
        invoiceNo: txInvoiceNo.trim() || null,
        description: txDescription.trim(),
        date: txDate,
        alsoRecordExpense: false,
        expenseCategory: txType === "alis" ? txExpenseCategory : null,
        paymentMethod: txType === "odeme" ? txPaymentMethod : null,
      });

      setTxAmount("");
      setTxInvoiceNo("");
      setTxDescription("");
      setNotice({
        tone: "success",
        text: `Tedarikçi hareketi işlendi. Güncel tedarikçi borcu: ${formatMoneyText(body.newBalance ?? 0)}.`,
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
      if (stornoDraft.kind === "record") {
        await submitFinancialRecordStorno({
          recordId: stornoDraft.id,
          reason: stornoDraft.reason.trim(),
        });
      } else {
        await submitSupplierTransactionStorno({
          supplierId: stornoDraft.supplierId ?? "",
          transactionId: stornoDraft.id,
          reason: stornoDraft.reason.trim(),
        });
      }

      setStornoDraft(null);
      setNotice({ tone: "success", text: "Ters kayıt (storno) başarıyla muhasebeleştirildi." });
      await loadFinanceData();
    } catch (err: unknown) {
      setNotice({ tone: "error", text: getErrorMessage(err) || "Storno işlemi yapılamadı." });
    } finally {
      setStornoBusy(false);
    }
  };

  const applyThisMonth = () => {
    setFromDate(monthStart);
    setToDate(today);
  };

  const applyLast7Days = () => {
    setFromDate(addDays(today, -6));
    setToDate(today);
  };

  const applyPreviousMonth = () => {
    const prev = getPreviousMonthRange(today);
    setFromDate(prev.from);
    setToDate(prev.to);
  };

  const applyAllTime = () => {
    setFromDate("2025-01-01");
    setToDate(today);
  };

  const toggleNewSupplierForm = () => {
    setSupEditId(null);
    setSupName("");
    setSupCategory("Un & Tahıl");
    setSupContact("");
    setSupPhone("");
    setSupAddress("");
    setSupFormOpen((prev) => !prev);
  };

  const openEditSupplierForm = (sup: Supplier) => {
    setSupEditId(sup.id);
    setSupName(sup.name);
    setSupCategory(sup.category);
    setSupContact(sup.contactPerson);
    setSupPhone(sup.phone);
    setSupAddress(sup.address);
    setSupFormOpen(true);
  };

  return {
    today,
    monthStart,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    applyThisMonth,
    applyLast7Days,
    applyPreviousMonth,
    applyAllTime,
    activeTab,
    setActiveTab,
    loading,
    error,
    notice,
    clearNotice: () => setNotice(null),
    summary,
    records,
    suppliers,
    categoryBreakdown,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedSupplier,
    visibleSupplierTxs,
    selectedSupplierPeriodSummary,
    loadFinanceData,
    recType,
    setRecType,
    recCategory,
    setRecCategory,
    recAmount,
    setRecAmount,
    recPaymentMethod,
    setRecPaymentMethod,
    recDate,
    setRecDate,
    recDescription,
    setRecDescription,
    recSubmitting,
    handleCreateRecord,
    stornoDraft,
    setStornoDraft,
    stornoBusy,
    handleConfirmStorno,
    supFormOpen,
    setSupFormOpen,
    supEditId,
    supName,
    setSupName,
    supCategory,
    setSupCategory,
    supContact,
    setSupContact,
    supPhone,
    setSupPhone,
    supAddress,
    setSupAddress,
    supSaving,
    toggleNewSupplierForm,
    openEditSupplierForm,
    handleSaveSupplier,
    txType,
    setTxType,
    txAmount,
    setTxAmount,
    txInvoiceNo,
    setTxInvoiceNo,
    txDate,
    setTxDate,
    txDescription,
    setTxDescription,
    txExpenseCategory,
    setTxExpenseCategory,
    txPaymentMethod,
    setTxPaymentMethod,
    txSaving,
    handleRecordSupplierTx,
  };
}
