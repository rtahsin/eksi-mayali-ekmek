"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Wallet,
  Receipt,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Scale,
  Tag,
  Trash2,
  Download,
  Calendar,
} from "lucide-react";
import { useCariProfile } from "@/hooks/useCariProfile";
import { useCariler } from "@/hooks/useCariler";
import B2BSlipModal from "@/components/admin/finans/B2BSlipModal";
import B2BSlipEditModal from "@/components/admin/finans/B2BSlipEditModal";
import B2BCollectionModal from "@/components/admin/finans/B2BCollectionModal";
import CariEditModal from "@/components/admin/cariler/CariEditModal";
import BalanceAdjustModal from "@/components/admin/cariler/BalanceAdjustModal";
import TransactionReceiptModal from "@/components/admin/finans/TransactionReceiptModal";
import { CariTransaction } from "@/types/admin";

export default function IsolatedCariDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;

  const { cari, transactions, activeProducts, loading, refetch } = useCariProfile(id);
  const { deleteCari } = useCariler();

  const [activeModal, setActiveModal] = useState<"slip" | "collection" | "edit" | "adjust_balance" | null>(null);
  const [editModalTab, setEditModalTab] = useState<"info" | "prices">("info");
  const [selectedTx, setSelectedTx] = useState<CariTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<CariTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters for transactions
  const [dateFilter, setDateFilter] = useState<"all" | "this_month" | "last_month" | "last_30" | "custom">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "debt" | "credit">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const action = searchParams?.get("action");
    if (action === "fis") setActiveModal("slip");
    else if (action === "tahsilat") setActiveModal("collection");
  }, [searchParams]);

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Type filter
    if (typeFilter === "debt" && tx.type !== "satis" && tx.type !== "devir") return false;
    if (typeFilter === "credit" && tx.type !== "tahsilat" && tx.type !== "odeme") return false;

    // Date filter
    const txDate = new Date(tx.createdAt || tx.date);
    const now = new Date();

    if (dateFilter === "this_month") {
      if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
        return false;
      }
    } else if (dateFilter === "last_month") {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      if (txDate.getMonth() !== prevMonth.getMonth() || txDate.getFullYear() !== prevMonth.getFullYear()) {
        return false;
      }
    } else if (dateFilter === "last_30") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (txDate < thirtyDaysAgo) return false;
    } else if (dateFilter === "custom") {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }
    }

    return true;
  });

  const handleExportCSV = () => {
    if (!cari || filteredTransactions.length === 0) return;

    // Excel-compatible CSV with UTF-8 BOM and semicolon delimiters
    let csvContent = "\uFEFF";
    csvContent += "Tarih;Fiş No;İşlem Türü;Açıklama;Ödeme Şekli;Borç (+);Alacak (-);Kalan Bakiye\n";

    filteredTransactions.forEach((tx) => {
      const isDebt = tx.type === "satis" || tx.type === "devir";
      const dateStr = new Date(tx.createdAt || tx.date).toLocaleString("tr-TR");
      const slip = tx.slipNumber || "-";
      const typeStr =
        tx.type === "satis"
          ? "Toptan Satış"
          : tx.type === "tahsilat"
          ? "Tahsilat"
          : tx.type === "devir"
          ? "Açılış/Devir"
          : tx.type === "odeme"
          ? "Ödeme"
          : tx.type === "storno"
          ? "Storno"
          : "İşlem";
      const desc = (tx.description || "").replace(/;/g, ",");
      const payMethod = tx.paymentMethod
        ? tx.paymentMethod === "nakit"
          ? "Nakit"
          : tx.paymentMethod === "banka_havale"
          ? "Havale/EFT"
          : tx.paymentMethod === "kredi_karti"
          ? "Kredi Kartı"
          : tx.paymentMethod
        : "-";
      const debtAmount = isDebt ? tx.amount.toFixed(2).replace(".", ",") : "0,00";
      const creditAmount = !isDebt ? tx.amount.toFixed(2).replace(".", ",") : "0,00";
      const balanceStr =
        tx.balanceAfter !== undefined
          ? tx.balanceAfter.toFixed(2).replace(".", ",")
          : "-";

      csvContent += `"${dateStr}";"${slip}";"${typeStr}";"${desc}";"${payMethod}";"${debtAmount}";"${creditAmount}";"${balanceStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (cari.businessName || "cari").toLowerCase().replace(/[^a-z0-9]/gi, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `${safeName}_hesap_ekstresi_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCari = async () => {
    if (!cari) return;
    const confirmMsg = `"${cari.businessName}" adlı cari hesabı ve TÜM geçmiş hareketlerini tamamen silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    const res = await deleteCari(cari.id);
    if (res.success) {
      router.push("/admin/cariler");
    } else {
      alert(`Cari silinirken hata oluştu: ${res.error || "Bilinmeyen hata"}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  if (!cari) {
    return (
      <div className="p-8 text-center text-stone-400">
        <p>Müşteri hesabı bulunamadı.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-stone-800 rounded-xl"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/admin/cariler")}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-sm font-bold rounded-2xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Listeye Dön
        </button>

        <div className="flex items-center gap-2">
          {/* Custom Prices Quick Access Button */}
          <button
            onClick={() => {
              setEditModalTab("prices");
              setActiveModal("edit");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 border border-stone-800 hover:border-amber-500/40 hover:bg-stone-850 text-stone-300 hover:text-amber-400 text-xs sm:text-sm font-bold rounded-2xl transition-all"
            title="Özel Fiyat Tanımla / Düzenle"
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Özel Fiyatlar</span>
          </button>

          {/* Edit Cari Info */}
          <button
            onClick={() => {
              setEditModalTab("info");
              setActiveModal("edit");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-xs sm:text-sm font-bold rounded-2xl transition-all"
          >
            <Edit className="w-4 h-4" />
            <span>Düzenle</span>
          </button>

          {/* Delete Cari */}
          <button
            onClick={handleDeleteCari}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/40 border border-rose-900/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 text-xs sm:text-sm font-bold rounded-2xl transition-all disabled:opacity-50"
            title="Cariyi ve tüm hareketlerini kalıcı olarak sil"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Cariyi Sil</span>
          </button>
        </div>
      </div>

      {/* Cari Info Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 relative z-10">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black font-serif text-stone-100">
              {cari.businessName}
            </h1>
            <p className="text-stone-400 mt-2 max-w-xl text-sm leading-relaxed">
              {cari.address || "Adres bilgisi yok"} <br />
              {cari.phone || "Telefon bilgisi yok"}
            </p>

            {/* Custom Prices Badges Display */}
            {cari.customPrices && Object.keys(cari.customPrices).length > 0 ? (
              <div className="mt-4 pt-4 border-t border-stone-800/80">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tanımlı Özel Fiyatlar ({Object.keys(cari.customPrices).length} Ürün):</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditModalTab("prices");
                      setActiveModal("edit");
                    }}
                    className="text-[11px] text-stone-400 hover:text-amber-400 underline font-medium"
                  >
                    Düzenle
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(cari.customPrices).map(([productId, price]) => {
                    const prod = activeProducts.find((p) => p.id === productId);
                    return (
                      <span
                        key={productId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-stone-300"
                      >
                        <span className="font-sans text-stone-400">{prod?.name || "Ürün"}:</span>
                        <span className="font-bold text-amber-400">{price} ₺</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-stone-800/60 flex items-center justify-between">
                <span className="text-xs text-stone-500">Bu cari için özel toptan fiyat tanımlanmamış.</span>
                <button
                  onClick={() => {
                    setEditModalTab("prices");
                    setActiveModal("edit");
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <Tag className="w-3 h-3" /> + Özel Fiyat Belirle
                </button>
              </div>
            )}
          </div>

          <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 sm:min-w-[220px] flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">
                Güncel Bakiye
              </div>
              <div
                className={`text-3xl font-black font-mono ${
                  cari.balance > 0
                    ? "text-emerald-400"
                    : cari.balance < 0
                    ? "text-rose-400"
                    : "text-stone-400"
                }`}
              >
                {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
              </div>
              <div className="text-xs text-stone-500 mt-1 font-semibold">
                {cari.balance > 0
                  ? "Alacaklı (Müşteri Borçlu)"
                  : cari.balance < 0
                  ? "Borçlu (Biz Borçluyuz)"
                  : "Bakiye Yok"}
              </div>
            </div>

            {/* Direct Balance Adjustment Button */}
            <button
              onClick={() => setActiveModal("adjust_balance")}
              className="mt-3 py-2 px-3 bg-stone-900 hover:bg-stone-850 hover:border-amber-500/40 border border-stone-800 text-stone-300 hover:text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
              title="Bakiyeyi doğrudan el ile düzelt ve devir kaydı oluştur"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Bakiyeyi Düzelt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons — Mobile-friendly large touch targets */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveModal("slip")}
          className="bg-artisan-terracotta hover:bg-orange-600 text-white p-4 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-colors shadow-lg active:scale-95 min-h-[72px]"
        >
          <Receipt className="w-7 h-7" />
          <span className="text-sm">Fiş Kes</span>
        </button>

        <button
          onClick={() => setActiveModal("collection")}
          className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 p-4 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-colors shadow-lg active:scale-95 min-h-[72px]"
        >
          <Wallet className="w-7 h-7" />
          <span className="text-sm">Tahsilat Al</span>
        </button>
      </div>

      {/* Transactions List with Period/Type Filters and CSV Export */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-stone-800 bg-stone-950 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-serif">Hesap Hareketleri</h2>
              <span className="text-xs text-stone-500 font-mono">
                {filteredTransactions.length} / {transactions.length} hareket listeleniyor
              </span>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-stone-900 border border-stone-800 hover:border-emerald-500/40 hover:bg-stone-850 text-stone-300 hover:text-emerald-400 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
              title="Filtrelenen hareketleri Excel CSV olarak indir"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel / CSV İndir</span>
            </button>
          </div>

          {/* Filter Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Period Filter */}
            <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1">
              {(
                [
                  { id: "all", label: "Tümü" },
                  { id: "this_month", label: "Bu Ay" },
                  { id: "last_month", label: "Geçen Ay" },
                  { id: "last_30", label: "Son 30 Gün" },
                  { id: "custom", label: "Tarih Seç" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDateFilter(item.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    dateFilter === item.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1">
              {(
                [
                  { id: "all", label: "Hepsi" },
                  { id: "debt", label: "Fişler (+)" },
                  { id: "credit", label: "Tahsilatlar (-)" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTypeFilter(item.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    typeFilter === item.id
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-stone-200 text-xs focus:outline-none"
                />
                <span className="text-stone-600">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-stone-200 text-xs focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-stone-800/50 max-h-[500px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">
              {transactions.length === 0
                ? "Henüz hesap hareketi bulunmuyor."
                : "Seçili filtrelere uygun hesap hareketi bulunamadı."}
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isDebt = tx.type === "satis" || tx.type === "devir";
              return (
                <div
                  key={tx.id}
                  className="p-4 flex flex-col gap-3 hover:bg-stone-800/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isDebt ? "bg-rose-500/10" : "bg-emerald-500/10"
                      }`}
                    >
                      {isDebt ? (
                        <ArrowUpRight className="w-5 h-5 text-rose-500" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-stone-200">
                          {tx.type === "satis"
                            ? "Toptan Satış"
                            : tx.type === "tahsilat"
                            ? "Tahsilat"
                            : tx.type === "devir"
                            ? "Açılış/Devir"
                            : tx.type === "odeme"
                            ? "Ödeme"
                            : tx.type === "storno"
                            ? "Storno"
                            : "İşlem"}
                        </span>
                        {tx.slipNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {tx.slipNumber}
                          </span>
                        )}
                        {tx.paymentMethod && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                            {tx.paymentMethod === "nakit"
                              ? "💵 Nakit"
                              : tx.paymentMethod === "banka_havale"
                              ? "🏦 Havale"
                              : tx.paymentMethod === "kredi_karti"
                              ? "💳 Kart"
                              : tx.paymentMethod}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5 line-clamp-2">
                        {tx.description}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1 font-mono">
                        {new Date(tx.createdAt || tx.date).toLocaleString("tr-TR")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pl-13">
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-lg font-black font-mono ${
                          isDebt ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {isDebt ? "+" : "-"}
                        {tx.amount.toLocaleString("tr-TR")} ₺
                      </div>
                      {tx.balanceAfter !== undefined && (
                        <span className="text-[10px] text-stone-500 font-mono">
                          Bakiye: {tx.balanceAfter.toLocaleString("tr-TR")} ₺
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => setEditingTx(tx)}
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 rounded-xl transition-colors border border-stone-700 min-h-[40px] flex items-center gap-1.5 text-xs font-bold active:scale-95"
                        title="Fişi / İşlemi Düzenle"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Düzenle</span>
                      </button>

                      {/* View & Share Receipt Button */}
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-xl transition-colors border border-stone-700 min-h-[40px] min-w-[40px] flex items-center justify-center active:scale-95"
                        title="Fişi Görüntüle & Paylaş"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === "slip" && (
        <B2BSlipModal
          cariId={cari.id}
          cariName={cari.businessName}
          cariPhone={cari.phone}
          customPrices={cari.customPrices}
          onClose={() => setActiveModal(null)}
          onSuccess={(createdTx) => {
            refetch();
            setActiveModal(null);
            if (createdTx) {
              setSelectedTx(createdTx);
            }
          }}
        />
      )}

      {activeModal === "collection" && (
        <B2BCollectionModal
          cariId={cari.id}
          cariName={cari.businessName}
          onClose={() => setActiveModal(null)}
          onSuccess={refetch}
        />
      )}

      {activeModal === "edit" && (
        <CariEditModal
          cari={cari}
          initialTab={editModalTab}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            refetch();
          }}
        />
      )}

      {activeModal === "adjust_balance" && (
        <BalanceAdjustModal
          cari={cari}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            refetch();
          }}
        />
      )}

      {editingTx && (
        <B2BSlipEditModal
          tx={editingTx}
          cari={cari}
          onClose={() => setEditingTx(null)}
          onSuccess={() => {
            setEditingTx(null);
            refetch();
          }}
        />
      )}

      {selectedTx && (
        <TransactionReceiptModal
          tx={selectedTx}
          cari={cari}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  );
}
