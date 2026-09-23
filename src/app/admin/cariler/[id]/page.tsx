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
} from "lucide-react";
import { useCariProfile } from "@/hooks/useCariProfile";
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

  const { cari, transactions, loading, refetch } = useCariProfile(id);

  const [activeModal, setActiveModal] = useState<"slip" | "collection" | "edit" | "adjust_balance" | null>(null);
  const [selectedTx, setSelectedTx] = useState<CariTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<CariTransaction | null>(null);

  useEffect(() => {
    const action = searchParams?.get("action");
    if (action === "fis") setActiveModal("slip");
    else if (action === "tahsilat") setActiveModal("collection");
  }, [searchParams]);

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
      {/* Header Back & Edit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/cariler")}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-sm font-bold rounded-2xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Listeye Dön
        </button>

        <button
          onClick={() => setActiveModal("edit")}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-sm font-bold rounded-2xl transition-all"
        >
          <Edit className="w-4 h-4" /> Düzenle
        </button>
      </div>

      {/* Cari Info Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif text-stone-100">
              {cari.businessName}
            </h1>
            <p className="text-stone-400 mt-2 max-w-xl text-sm leading-relaxed">
              {cari.address || "Adres bilgisi yok"} <br />
              {cari.phone || "Telefon bilgisi yok"}
            </p>
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

            {/* Direct Balance Adjustment Button (2-A) */}
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

      {/* Transactions List */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-stone-800 bg-stone-950 flex justify-between items-center">
          <h2 className="text-lg font-bold text-stone-100 font-serif">Hesap Hareketleri</h2>
          <span className="text-xs text-stone-500 font-mono">{transactions.length} hareket</span>
        </div>
        <div className="divide-y divide-stone-800/50 max-h-[500px] overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">
              Henüz hesap hareketi bulunmuyor.
            </div>
          ) : (
            transactions.map((tx) => {
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
                      {/* Edit Button (1-A) */}
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
          onSuccess={refetch}
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
