"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Wallet, Receipt, Loader2, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { useCariProfile } from "@/hooks/useCariProfile";
import B2BSlipModal from "@/components/admin/finans/B2BSlipModal";
import B2BCollectionModal from "@/components/admin/finans/B2BCollectionModal";
import CariEditModal from "@/components/admin/cariler/CariEditModal";
import TransactionReceiptModal from "@/components/admin/finans/TransactionReceiptModal";
import { CariTransaction } from "@/types/admin";

export default function IsolatedCariDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const { cari, transactions, loading, refetch } = useCariProfile(id);

  const [activeModal, setActiveModal] = useState<"slip" | "collection" | "edit" | null>(null);
  const [selectedTx, setSelectedTx] = useState<CariTransaction | null>(null);

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
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-stone-800 rounded-xl">Geri Dön</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header Back & Edit */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/finans/cariler")}
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
            <h1 className="text-2xl sm:text-3xl font-black font-serif text-stone-100">{cari.businessName}</h1>
            <p className="text-stone-400 mt-2 max-w-xl text-sm leading-relaxed">
              {cari.address || "Adres bilgisi yok"} <br/>
              {cari.phone || "Telefon bilgisi yok"}
            </p>
          </div>
          
          <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 sm:min-w-[200px]">
            <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Güncel Bakiye</div>
            <div className={`text-3xl font-black font-mono ${cari.balance > 0 ? "text-emerald-400" : cari.balance < 0 ? "text-rose-400" : "text-stone-400"}`}>
              {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-xs text-stone-500 mt-1 font-semibold">
              {cari.balance > 0 ? "Alacaklı (Müşteri Borçlu)" : cari.balance < 0 ? "Borçlu (Biz Borçluyuz)" : "Bakiye Yok"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveModal("slip")}
          className="bg-artisan-terracotta hover:bg-orange-600 text-white p-4 rounded-2xl font-black flex flex-col sm:flex-row items-center justify-center gap-3 transition-colors shadow-lg active:scale-95"
        >
          <Receipt className="w-6 h-6 sm:w-5 sm:h-5" /> 
          <span>B2B Satış (Fiş Kes)</span>
        </button>

        <button
          onClick={() => setActiveModal("collection")}
          className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 p-4 rounded-2xl font-black flex flex-col sm:flex-row items-center justify-center gap-3 transition-colors shadow-lg active:scale-95"
        >
          <Wallet className="w-6 h-6 sm:w-5 sm:h-5" /> 
          <span>Tahsilat Al</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden">
        <div className="p-5 border-b border-stone-800 bg-stone-950">
          <h2 className="text-lg font-bold text-stone-100 font-serif">Hesap Hareketleri</h2>
        </div>
        <div className="divide-y divide-stone-800/50 max-h-[500px] overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">
              Henüz hesap hareketi bulunmuyor.
            </div>
          ) : (
            transactions.map((tx) => {
              const isDebt = tx.type === "satis"; // Müşteriye borç yazıldı (bizim alacağımız)
              return (
                <div key={tx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-800/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDebt ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                      {isDebt ? <ArrowUpRight className="w-5 h-5 text-rose-500" /> : <ArrowDownRight className="w-5 h-5 text-emerald-500" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-stone-200">
                        {tx.type === "satis" ? "Toptan Satış" : tx.type === "tahsilat" ? "Tahsilat" : tx.type === "devir" ? "Açılış/Devir" : tx.type}
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5 line-clamp-2 max-w-md">{tx.description}</div>
                      <div className="text-[10px] text-stone-500 mt-1 font-mono">{new Date(tx.createdAt || tx.date).toLocaleString("tr-TR")}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                    <div className={`text-lg font-black font-mono ${isDebt ? "text-rose-400" : "text-emerald-400"}`}>
                      {isDebt ? "+" : "-"}{tx.amount.toLocaleString("tr-TR")} ₺
                    </div>
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-lg transition-colors border border-stone-700"
                      title="Fişi / Detayı Görüntüle"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === "slip" && (
        <B2BSlipModal cariId={cari.id} cariName={cari.businessName} onClose={() => setActiveModal(null)} onSuccess={refetch} />
      )}
      
      {activeModal === "collection" && (
        <B2BCollectionModal cariId={cari.id} cariName={cari.businessName} onClose={() => setActiveModal(null)} onSuccess={refetch} />
      )}

      {activeModal === "edit" && (
        <CariEditModal
          cari={cari}
          onClose={() => setActiveModal(null)}
          onSuccess={() => { setActiveModal(null); refetch(); }}
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
