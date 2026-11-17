"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Calendar,
  Download,
  Edit3,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Receipt,
  RotateCcw,
  Scale,
  ShieldAlert,
  Tag,
  Trash2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useCariProfile } from "@/hooks/useCariProfile";
import { useCariler } from "@/hooks/useCariler";
import { useCouriers } from "@/hooks/useCouriers";
import { useProducts } from "@/hooks/useProducts";
import B2BSlipModal from "@/components/admin/cariler/B2BSlipModal";
import B2BCollectionModal from "@/components/admin/cariler/B2BCollectionModal";
import { CariEditModal } from "@/components/admin/cariler/CariEditModal";
import BalanceAdjustModal from "@/components/admin/cariler/BalanceAdjustModal";
import TransactionReceiptModal from "@/components/admin/cariler/TransactionReceiptModal";
import { B2BHotSaleModal } from "@/components/admin/cariler/B2BHotSaleModal";
import { CariQuickOrderModal } from "@/components/admin/cariler/CariQuickOrderModal";
import { revokeCariShareLinksClient } from "@/lib/cari/client";
import { LEDGER_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/cari/ledger";
import { ekstreMessage, shareViaWhatsApp } from "@/lib/cari/whatsapp";
import { buildCsvContent, sanitizeCsvCell } from "@/lib/security/csv";
import { addDays, formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import type { CariAccount, CariTransaction } from "@/types/admin";

type DateFilter = "all" | "this_month" | "last_month" | "last_30" | "custom";
type TypeFilter = "all" | "debt" | "credit";

function formatMoney(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPaymentLabel(method?: string): string {
  if (!method) return "";
  if (method === "havale") return "Havale / EFT";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export default function CariDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const { cari, transactions, activeProducts, loading, error, refetch } = useCariProfile(id);
  const { archiveCari, deleteCari, addTransaction } = useCariler();
  const { products } = useProducts();
  const { assignableCouriers } = useCouriers();

  const [activeModal, setActiveModal] = useState<"slip" | "collection" | "edit" | "adjust_balance" | null>(null);
  const [editModalTab, setEditModalTab] = useState<"info" | "prices">("info");
  const [hotSaleOpen, setHotSaleOpen] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<CariTransaction | null>(null);

  const [busyTxId, setBusyTxId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Accessible <dialog> confirmations & storno reason modal (no native alert/confirm/prompt)
  const [confirmKind, setConfirmKind] = useState<"delete" | "archive" | "revoke_link" | null>(null);
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);

  const [stornoTarget, setStornoTarget] = useState<CariTransaction | null>(null);
  const [stornoReason, setStornoReason] = useState("");
  const stornoDialogRef = useRef<HTMLDialogElement | null>(null);

  const effectiveCari = cari;

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "fis") setActiveModal("slip");
    else if (action === "tahsilat") setActiveModal("collection");
    else if (action === "sicak-satis") setHotSaleOpen(true);
    else if (action === "siparis") setQuickOrderOpen(true);
  }, [searchParams]);

  // Sync confirm & storno dialogs
  useEffect(() => {
    const el = confirmDialogRef.current;
    if (!el) return;
    if (confirmKind && !el.open) el.showModal();
    else if (!confirmKind && el.open) el.close();
  }, [confirmKind]);

  useEffect(() => {
    const el = confirmDialogRef.current;
    if (!el) return;
    const onClose = () => {
      el.returnValue = "";
      setConfirmKind(null);
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  useEffect(() => {
    const el = stornoDialogRef.current;
    if (!el) return;
    if (stornoTarget && !el.open) el.showModal();
    else if (!stornoTarget && el.open) el.close();
  }, [stornoTarget]);

  useEffect(() => {
    const el = stornoDialogRef.current;
    if (!el) return;
    const onClose = () => {
      el.returnValue = "";
      setStornoTarget(null);
      setStornoReason("");
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const today = istanbulToday();
  const thisMonth = today.slice(0, 7);
  const lastMonthDate = addDays(today, -Number(today.slice(8, 10)));
  const lastMonth = lastMonthDate.slice(0, 7);
  const last30Cutoff = addDays(today, -30);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter === "debt" && !(tx.delta > 0)) return false;
      if (typeFilter === "credit" && !(tx.delta < 0)) return false;

      if (dateFilter === "this_month" && tx.date.slice(0, 7) !== thisMonth) return false;
      if (dateFilter === "last_month" && tx.date.slice(0, 7) !== lastMonth) return false;
      if (dateFilter === "last_30" && tx.date < last30Cutoff) return false;
      if (dateFilter === "custom") {
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, dateFilter, thisMonth, lastMonth, last30Cutoff, startDate, endDate]);

  const canDelete = useMemo(
    () => transactions.every((tx) => tx.type === "storno" || Boolean(tx.reversedById)),
    [transactions],
  );

  const customPriceRows = useMemo(() => {
    const prices = effectiveCari?.customPrices ?? {};
    return Object.entries(prices)
      .filter(([, price]) => typeof price === "number" && price > 0)
      .map(([productId, customPrice]) => {
        const product = activeProducts.find((p) => p.id === productId) ?? products.find((p) => p.id === productId);
        return {
          productId,
          productName: product?.name ?? productId,
          catalogPrice: product?.price ?? null,
          customPrice,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName, "tr-TR"));
  }, [effectiveCari?.customPrices, activeProducts, products]);

  const refreshAll = refetch;

  const handleExportCSV = () => {
    if (!effectiveCari || filteredTransactions.length === 0) return;

    const headers = [
      "Tarih",
      "Fiş No",
      "İşlem Türü",
      "Açıklama",
      "Ödeme Şekli",
      "Borç (+)",
      "Alacak (-)",
      "Kalan Bakiye",
    ];

    const rows = filteredTransactions.map((tx) => {
      const dateStr = formatTrDate(tx.date);
      const slip = tx.slipNumber || tx.id.slice(0, 8).toUpperCase();
      const typeStr = LEDGER_TYPE_LABELS[tx.type] ?? tx.type;
      const desc = tx.description || "";
      const payMethod = getPaymentLabel(tx.paymentMethod);
      const debtAmount = tx.delta > 0 ? tx.delta.toFixed(2).replace(".", ",") : "";
      const creditAmount = tx.delta < 0 ? Math.abs(tx.delta).toFixed(2).replace(".", ",") : "";
      const balanceStr = tx.balanceAfter !== undefined ? tx.balanceAfter.toFixed(2).replace(".", ",") : "";

      return [dateStr, slip, typeStr, desc, payMethod, debtAmount, creditAmount, balanceStr];
    });

    // sanitizeCsvCell & buildCsvContent enforce UTF-8 BOM, semicolon delimiter, and formula-injection escaping
    const safeSample = sanitizeCsvCell(effectiveCari.businessName).replace(/"/g, "");
    const csvContent = buildCsvContent(headers, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const safeName = safeSample.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_-]/g, "_");

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${safeName}_hesap_ekstresi_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmAction = async () => {
    if (!effectiveCari || !confirmKind) return;
    setBusyAction(true);
    setNotice(null);

    try {
      if (confirmKind === "delete") {
        const res = await deleteCari(effectiveCari.id);
        if (!res.success) throw new Error(res.error || "Cari silinemedi.");
        confirmDialogRef.current?.close();
        router.push("/admin/cariler");
        return;
      }

      if (confirmKind === "archive") {
        const res = await archiveCari(effectiveCari.id, true);
        if (!res.success) throw new Error(res.error || "Cari arşivlenemedi.");
        setNotice({ tone: "success", text: `"${effectiveCari.businessName}" arşivlendi.` });
        confirmDialogRef.current?.close();
        await refreshAll();
        return;
      }

      if (confirmKind === "revoke_link") {
        const data = await revokeCariShareLinksClient(effectiveCari.id);
        setNotice({
          tone: "success",
          text: `Eski ekstre ve fiş linkleri iptal edildi. Yeni link sürümü: v${data.shareTokenVersion ?? "?"}`,
        });
        confirmDialogRef.current?.close();
        await refreshAll();
      }
    } catch (err: unknown) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "İşlem sırasında bir hata oluştu.",
      });
      confirmDialogRef.current?.close();
    } finally {
      setBusyAction(false);
    }
  };

  const handleUnarchive = async () => {
    if (!effectiveCari) return;
    setBusyAction(true);
    setNotice(null);
    const res = await archiveCari(effectiveCari.id, false);
    if (res.success) {
      setNotice({ tone: "success", text: `"${effectiveCari.businessName}" yeniden aktif edildi.` });
      await refreshAll();
    } else {
      setNotice({ tone: "error", text: res.error || "Cari aktif edilemedi." });
    }
    setBusyAction(false);
  };

  const handleStornoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCari || !stornoTarget) return;
    const trimmed = stornoReason.trim();
    if (!trimmed) {
      setNotice({ tone: "error", text: "Ters kayıt (storno) gerekçesi girmelisiniz." });
      return;
    }

    setBusyTxId(stornoTarget.id);
    setNotice(null);
    const res = await addTransaction(effectiveCari.id, {
      kind: "storno",
      reversesId: stornoTarget.id,
      description: trimmed,
    });
    setBusyTxId(null);

    if (!res.success) {
      setNotice({ tone: "error", text: res.error || "Ters kayıt işlenemedi." });
      return;
    }

    stornoDialogRef.current?.close();
    setNotice({ tone: "success", text: "Ters kayıt (storno) başarıyla deftere işlendi." });
    await refreshAll();
  };

  if (loading && !effectiveCari) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#E2D3BD] bg-white py-20 text-sm text-[#6E5148]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#B4532A]" />
        Cari hesap defteri yükleniyor...
      </div>
    );
  }

  if (!effectiveCari) {
    return (
      <div className="rounded-2xl border border-[#E2D3BD] bg-white p-10 text-center text-[#3B1E1A]">
        <p className="font-serif text-xl font-bold">Cari hesap bulunamadı</p>
        <p className="mt-1 text-sm text-[#6E5148]">{error || "Kayıt silinmiş veya erişilemiyor olabilir."}</p>
        <Link
          href="/admin/cariler"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Carilere Dön
        </Link>
      </div>
    );
  }

  const creditLimit = effectiveCari.creditLimit ?? 0;
  const overLimit = creditLimit > 0 && effectiveCari.balance > creditLimit;
  const limitPct = creditLimit > 0 ? Math.min(100, Math.max(0, Math.round((effectiveCari.balance / creditLimit) * 100))) : 0;

  return (
    <div className="space-y-6 text-[#3B1E1A]">
      {/* Top Nav & Lifecycle Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/cariler"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm Cariler
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditModalTab("prices");
              setActiveModal("edit");
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
          >
            <Tag className="h-4 w-4 text-[#B4532A]" />
            Özel Fiyatlar ({customPriceRows.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setEditModalTab("info");
              setActiveModal("edit");
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
          >
            <Edit3 className="h-4 w-4 text-[#6E5148]" />
            Kartı Düzenle
          </button>

          <button
            type="button"
            onClick={() => setConfirmKind("revoke_link")}
            disabled={busyAction}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 text-xs font-bold text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4 text-amber-800" />
            Eski Paylaşım Linklerini İptal Et
          </button>

          {!effectiveCari.archivedAt && effectiveCari.accountType !== "gider" && (
            <button
              type="button"
              onClick={() => setActiveModal("slip")}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-xs font-bold text-[#6E5148] transition hover:bg-[#FBF6EC] hover:text-[#3B1E1A]"
            >
              <Receipt className="h-4 w-4" />
              Devir / Manuel Fiş
            </button>
          )}

          {effectiveCari.archivedAt ? (
            <button
              type="button"
              onClick={() => void handleUnarchive()}
              disabled={busyAction}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <ArchiveRestore className="h-4 w-4" />
              Aktif Et
            </button>
          ) : canDelete ? (
            <button
              type="button"
              onClick={() => setConfirmKind("delete")}
              disabled={busyAction}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3.5 text-xs font-bold text-red-900 transition hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Kalıcı Sil
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmKind("archive")}
              disabled={busyAction}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3.5 text-xs font-bold text-[#6E5148] transition hover:bg-[#FBF6EC] disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              Arşivle
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-950"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Bildirimi kapat"
            className="flex min-h-9 min-w-9 items-center justify-center rounded-lg hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cari Profile + Balance Hero Card */}
      <section className="rounded-2xl border border-[#E2D3BD] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Corporate Profile */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[#3B1E1A] sm:text-3xl">
                {effectiveCari.businessName}
              </h1>
              {effectiveCari.archivedAt && (
                <span className="rounded-lg bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-800">
                  Arşivlenmiş Hesap
                </span>
              )}
              <span className="rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#6E5148]">
                Link v{effectiveCari.shareTokenVersion ?? 1}
              </span>
            </div>

            {effectiveCari.companyTitle && (
              <p className="text-sm font-semibold text-[#6E5148]">
                Resmi Unvan: <span className="text-[#3B1E1A]">{effectiveCari.companyTitle}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6E5148]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#B4532A]" />
                {effectiveCari.district || "Beylikdüzü"} · {effectiveCari.neighborhood}
                {effectiveCari.address ? ` — ${effectiveCari.address}` : ""}
              </span>
              {effectiveCari.phone && (
                <a
                  href={`tel:${effectiveCari.phone}`}
                  className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#3B1E1A] hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 text-[#B4532A]" />
                  {effectiveCari.phone}
                </a>
              )}
              {(effectiveCari.taxOffice || effectiveCari.taxNumber) && (
                <span className="font-mono">
                  {effectiveCari.taxOffice ? `${effectiveCari.taxOffice} · ` : ""}
                  {effectiveCari.taxNumber ? `VKN/TCKN: ${effectiveCari.taxNumber}` : ""}
                </span>
              )}
            </div>

            {effectiveCari.notes && (
              <p className="rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 py-2.5 text-xs text-[#6E5148]">
                Not: <span className="text-[#3B1E1A]">{effectiveCari.notes}</span>
              </p>
            )}

            {/* Custom Prices Quick Summary */}
            {customPriceRows.length > 0 && (
              <div className="rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6E5148]">
                    Anlaşmalı Özel Fiyatlar
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditModalTab("prices");
                      setActiveModal("edit");
                    }}
                    className="text-xs font-bold text-[#8E3D1B] hover:underline"
                  >
                    Düzenle
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customPriceRows.slice(0, 6).map((row) => (
                    <span
                      key={row.productId}
                      className="rounded-lg border border-[#E2D3BD] bg-white px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold text-[#3B1E1A]">{row.productName}:</span>{" "}
                      <strong className="font-mono text-[#8E3D1B]">{formatMoney(row.customPrice)} ₺</strong>
                    </span>
                  ))}
                  {customPriceRows.length > 6 && (
                    <span className="self-center text-xs text-[#6E5148]">+{customPriceRows.length - 6} ürün daha</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Balance & Primary Actions */}
          <div className="w-full shrink-0 space-y-3 rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4 lg:w-96">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6E5148]">
                  Güncel Cari Bakiye
                </p>
                <p
                  className={`mt-1 font-mono text-3xl font-bold tabular-nums ${
                    effectiveCari.balance > 0
                      ? "text-[#8E3D1B]"
                      : effectiveCari.balance < 0
                        ? "text-emerald-800"
                        : "text-[#3B1E1A]"
                  }`}
                >
                  {formatMoney(effectiveCari.balance)} ₺
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal("adjust_balance")}
                className="flex min-h-10 items-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
              >
                <Scale className="h-3.5 w-3.5 text-[#B4532A]" />
                Bakiye Düzelt
              </button>
            </div>

            {creditLimit > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#6E5148]">Kredi Limiti Kullanımı</span>
                  <span className={`font-mono font-bold tabular-nums ${overLimit ? "text-red-700" : "text-[#3B1E1A]"}`}>
                    {formatMoney(effectiveCari.balance)} / {formatMoney(creditLimit)} ₺
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2D3BD]">
                  <div
                    className={`h-full transition-all ${overLimit ? "bg-red-700" : "bg-[#B4532A]"}`}
                    style={{ width: `${limitPct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {!effectiveCari.archivedAt && effectiveCari.accountType !== "gider" && (
                <>
                  <button
                    type="button"
                    onClick={() => setQuickOrderOpen(true)}
                    className="sm:col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#9C4421]"
                  >
                    <Package className="h-4 w-4" />
                    Sipariş Planla &amp; Haftalık Rutin
                  </button>
                  <button
                    type="button"
                    onClick={() => setHotSaleOpen(true)}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#B4532A]/40 bg-white px-3 text-xs font-bold text-[#8E3D1B] transition hover:bg-[#F6EEDF]"
                  >
                    <Zap className="h-4 w-4 text-[#B4532A]" />
                    Sıcak Satış
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal("collection")}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800"
                  >
                    <Wallet className="h-4 w-4" />
                    Tahsilat Al
                  </button>
                </>
              )}

              {!effectiveCari.archivedAt && effectiveCari.accountType === "gider" && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveModal("slip")}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                  >
                    <Receipt className="h-4 w-4 text-[#B4532A]" />
                    Masraf / İşlem Ekle
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal("collection")}
                    className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800"
                  >
                    <Wallet className="h-4 w-4" />
                    Ödeme / Tahsilat
                  </button>
                </>
              )}

              {effectiveCari.phone && effectiveCari.accountType !== "gider" && (
                <button
                  type="button"
                  onClick={() =>
                    void shareViaWhatsApp(
                      effectiveCari.phone,
                      { accountId: effectiveCari.id },
                      ekstreMessage(effectiveCari.businessName, effectiveCari.balance),
                    )
                  }
                  className="sm:col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-950 transition hover:bg-emerald-100"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-700" />
                  WhatsApp Canlı Ekstre Paylaş
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ledger History & Filters */}
      <section className="rounded-2xl border border-[#E2D3BD] bg-white p-5 shadow-sm sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">Hesap Hareketleri</h2>
            <p className="text-xs text-[#6E5148]">
              Gösterilen: {filteredTransactions.length} / {transactions.length} işlem (Simetrik bakiye = Σ delta)
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[#B4532A]" />
            Excel / CSV İndir
          </button>
        </div>

        {/* Period + Type Filters */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6E5148] mr-1">
              <Calendar className="h-3.5 w-3.5" />
              Dönem:
            </span>
            {[
              { id: "all" as const, label: "Tümü" },
              { id: "this_month" as const, label: "Bu Ay" },
              { id: "last_month" as const, label: "Geçen Ay" },
              { id: "last_30" as const, label: "Son 30 Gün" },
              { id: "custom" as const, label: "Özel Tarih" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDateFilter(item.id)}
                className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition ${
                  dateFilter === item.id
                    ? "border-[#B4532A] bg-[#B4532A] text-white"
                    : "border-[#E2D3BD] bg-white text-[#3B1E1A] hover:bg-[#F6EEDF]"
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {[
                { id: "all" as const, label: "Hepsi" },
                { id: "debt" as const, label: "Satış / Borç (+)" },
                { id: "credit" as const, label: "Tahsilat / Alacak (−)" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTypeFilter(item.id)}
                  className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition ${
                    typeFilter === item.id
                      ? "border-[#3B1E1A] bg-[#3B1E1A] text-white"
                      : "border-[#E2D3BD] bg-white text-[#3B1E1A] hover:bg-[#F6EEDF]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 gap-3 border-t border-[#E2D3BD] pt-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cari-filter-start" className="mb-1 block text-xs font-bold text-[#6E5148]">
                  Başlangıç Tarihi
                </label>
                <input
                  id="cari-filter-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-sm text-[#3B1E1A]"
                />
              </div>
              <div>
                <label htmlFor="cari-filter-end" className="mb-1 block text-xs font-bold text-[#6E5148]">
                  Bitiş Tarihi
                </label>
                <input
                  id="cari-filter-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-sm text-[#3B1E1A]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E2D3BD] bg-[#FBF6EC]/60 py-12 text-center text-sm text-[#6E5148]">
            Seçili filtrelere uyan cari hareketi bulunamadı.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => {
              const isDebt = tx.delta > 0;
              const isReversed = Boolean(tx.reversedById);
              const isStorno = tx.type === "storno";
              const typeLabel = LEDGER_TYPE_LABELS[tx.type] ?? tx.type;
              const returnCount = (tx.items ?? []).filter((it) => it.isReturn || it.quantity < 0).length;

              return (
                <div
                  key={tx.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                    isReversed
                      ? "border-[#E2D3BD] bg-stone-100/70 opacity-75"
                      : "border-[#E2D3BD] bg-[#FBF6EC]/50 hover:border-[#B4532A]/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          isStorno
                            ? "bg-stone-200 text-stone-800"
                            : tx.type === "tahsilat"
                              ? "bg-emerald-100 text-emerald-900"
                              : tx.type === "devir"
                                ? "bg-sky-100 text-sky-900"
                                : "bg-[#F6EEDF] text-[#8E3D1B] border border-[#E2D3BD]"
                        }`}
                      >
                        {typeLabel}
                      </span>
                      {tx.slipNumber && (
                        <span className="font-mono text-xs font-bold text-[#3B1E1A]">{tx.slipNumber}</span>
                      )}
                      <span className="text-xs text-[#6E5148]">{formatTrDate(tx.date)}</span>
                      {tx.paymentMethod && (
                        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6E5148] border border-[#E2D3BD]">
                          {getPaymentLabel(tx.paymentMethod)}
                        </span>
                      )}
                      {returnCount > 0 && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                          {returnCount} İade Kalemi
                        </span>
                      )}
                      {isReversed && (
                        <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-900">
                          İptal Edildi (Storno)
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm font-medium text-[#3B1E1A] ${isReversed ? "line-through" : ""}`}>
                      {tx.description || typeLabel}
                    </p>
                  </button>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <p
                        className={`font-mono text-base font-bold tabular-nums ${
                          isDebt ? "text-[#8E3D1B]" : "text-emerald-800"
                        }`}
                      >
                        {isDebt ? "+" : "−"}
                        {formatMoney(Math.abs(tx.delta))} ₺
                      </p>
                      {tx.balanceAfter !== undefined && (
                        <p className="font-mono text-xs tabular-nums text-[#6E5148]">
                          Kalan: {formatMoney(tx.balanceAfter)} ₺
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(tx)}
                        className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F6EEDF]"
                      >
                        Fiş
                      </button>
                      {!isReversed && !isStorno && (
                        <button
                          type="button"
                          onClick={() => {
                            setStornoReason("");
                            setStornoTarget(tx);
                          }}
                          disabled={busyTxId === tx.id}
                          aria-label={`${tx.slipNumber || "İşlem"} için ters kayıt`}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#6E5148] transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
                        >
                          {busyTxId === tx.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Destructive / Revoke Confirmation <dialog> */}
      <dialog
        ref={confirmDialogRef}
        closedby="closerequest"
        onCancel={(e) => {
          if (busyAction) e.preventDefault();
        }}
        aria-labelledby="cari-confirm-dialog-title"
        className="m-auto w-full max-w-md rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-5 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45"
      >
        {confirmKind && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[#B4532A]" />
              <div>
                <h2 id="cari-confirm-dialog-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                  {confirmKind === "delete"
                    ? "Deneme Carisini Kalıcı Sil"
                    : confirmKind === "archive"
                      ? "Cariyi Arşivle"
                      : "Eski Paylaşım Linklerini İptal Et"}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#6E5148]">
                  {confirmKind === "delete"
                    ? `"${effectiveCari.businessName}" kalıcı olarak silinecek. Yalnız gerçek hareketi olmayan deneme carisi için geçerlidir; geri alınamaz.`
                    : confirmKind === "archive"
                      ? `"${effectiveCari.businessName}" listeden kalkar ve yeni fiş kesilemez (bakiyesi 0 ₺ olmalıdır). Geçmiş fişler ve ekstre korunur.`
                      : `"${effectiveCari.businessName}" için müşteriye daha önce gönderilen tüm ekstre ve fiş paylaşım linkleri geçersiz kılınacak. Yeni üretilen linkler güncel sürümle çalışacaktır.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => confirmDialogRef.current?.close()}
                disabled={busyAction}
                className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A] hover:bg-[#F6EEDF]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={busyAction}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${
                  confirmKind === "delete" ? "bg-red-700 hover:bg-red-800" : "bg-[#B4532A] hover:bg-[#9C4421]"
                }`}
              >
                {busyAction && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmKind === "delete"
                  ? "Evet, Kalıcı Sil"
                  : confirmKind === "archive"
                    ? "Evet, Arşivle"
                    : "Linkleri İptal Et"}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Storno Reason <dialog> */}
      <dialog
        ref={stornoDialogRef}
        closedby="closerequest"
        onCancel={(e) => {
          if (busyTxId) e.preventDefault();
        }}
        aria-labelledby="storno-dialog-title"
        className="m-auto w-full max-w-md rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-5 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45"
      >
        {stornoTarget && (
          <form onSubmit={handleStornoSubmit} className="space-y-4">
            <div>
              <h2 id="storno-dialog-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                Ters Kayıt (Storno) Oluştur
              </h2>
              <p className="mt-1 text-xs text-[#6E5148]">
                {stornoTarget.slipNumber || stornoTarget.id} ·{" "}
                <strong className="font-mono">{formatMoney(Math.abs(stornoTarget.delta))} ₺</strong> tutarındaki
                hareket defterden silinmeden ters kayıtla sıfırlanacaktır.
              </p>
            </div>

            <div>
              <label htmlFor="storno-reason-input" className="mb-1.5 block text-xs font-bold text-[#6E5148]">
                İptal / Ters Kayıt Gerekçesi *
              </label>
              <input
                id="storno-reason-input"
                type="text"
                required
                value={stornoReason}
                onChange={(e) => setStornoReason(e.target.value)}
                placeholder="Örn. Hatalı fiş, müşteri iade..."
                className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => stornoDialogRef.current?.close()}
                disabled={Boolean(busyTxId)}
                className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-bold text-[#3B1E1A] hover:bg-[#F6EEDF]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={Boolean(busyTxId) || !stornoReason.trim()}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busyTxId && <Loader2 className="h-4 w-4 animate-spin" />}
                Ters Kaydı İşle
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Modals */}
      {activeModal === "slip" && (
        <B2BSlipModal
          cariId={effectiveCari.id}
          cariName={effectiveCari.businessName}
          customPrices={effectiveCari.customPrices}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void refreshAll();
          }}
        />
      )}

      {activeModal === "collection" && (
        <B2BCollectionModal
          cariId={effectiveCari.id}
          cariName={effectiveCari.businessName}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void refreshAll();
          }}
        />
      )}

      {activeModal === "edit" && (
        <CariEditModal
          cari={effectiveCari}
          initialTab={editModalTab}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            setNotice({ tone: "success", text: "Cari kartı ve özel fiyatlar güncellendi." });
            void refreshAll();
          }}
        />
      )}

      {activeModal === "adjust_balance" && (
        <BalanceAdjustModal
          cari={effectiveCari}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            void refreshAll();
          }}
        />
      )}

      {selectedTx && (
        <TransactionReceiptModal
          tx={selectedTx}
          cari={effectiveCari}
          onClose={() => setSelectedTx(null)}
        />
      )}

      <B2BHotSaleModal
        open={hotSaleOpen}
        onClose={() => setHotSaleOpen(false)}
        accounts={[effectiveCari]}
        products={products}
        initialAccountId={effectiveCari.id}
        lockAccount={true}
        isAdmin={true}
        onCompleted={() => {
          void refreshAll();
        }}
      />

      <CariQuickOrderModal
        open={quickOrderOpen}
        onClose={() => setQuickOrderOpen(false)}
        account={effectiveCari}
        products={products}
        couriers={assignableCouriers}
        isAdmin={true}
        onOrderCreated={({ orderNumber }) => {
          setNotice({
            tone: "success",
            text: `Yeni cari siparişi oluşturuldu (${orderNumber}).`,
          });
        }}
        onAccountUpdated={() => {
          void refreshAll();
        }}
      />
    </div>
  );
}
