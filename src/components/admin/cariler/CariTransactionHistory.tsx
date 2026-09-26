"use client";

import React from "react";
import { Plus, Trash2, ArrowDownRight, ArrowUpRight, Search, Info } from "lucide-react";
import { CariTransaction, CariAccount } from "@/types/admin";

interface Props {
  cari: CariAccount;
  transactions: CariTransaction[];
  onOpenQuickSlip: () => void;
  onOpenCollection: () => void;
  onOpenBalanceAdjust: () => void;
  onViewTransactionSlip: (tx: CariTransaction) => void;
  onDeleteTransaction: (tx: CariTransaction) => void;
}

export function CariTransactionHistory({
  cari,
  transactions,
  onOpenQuickSlip,
  onOpenCollection,
  onOpenBalanceAdjust,
  onViewTransactionSlip,
  onDeleteTransaction,
}: Props) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col min-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-stone-100 font-serif flex items-center gap-2">
            İşlem Geçmişi & Hareketler
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Bu cari hesaba ait fişler, ödemeler ve iadeler.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar shrink-0">
          <button
            onClick={onOpenQuickSlip}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Hızlı Fiş (Satış)</span>
          </button>
          <button
            onClick={onOpenCollection}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Tahsilat / İade Al</span>
          </button>
          <button
            onClick={onOpenBalanceAdjust}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs transition-colors border border-stone-700 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Devir / Düzeltme</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-stone-950/50 rounded-2xl border border-stone-800 overflow-hidden flex flex-col">
        {transactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-stone-500">
            <Search className="w-8 h-8 mb-3 opacity-20" />
            <p className="text-xs">Henüz işlem bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-stone-900 border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tarih</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">İşlem Tipi</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Açıklama / Fiş</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider text-right">Borç (Satış)</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider text-right">Alacak (Ödeme)</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/50">
                {transactions.map((tx) => {
                  const isSatis = tx.type === "satis";
                  const isTahsilat = tx.type === "tahsilat" || tx.type === "odeme";
                  const isDevir = tx.type === "devir";
                  const isStorno = tx.type === "storno";

                  return (
                    <tr key={tx.id} className="hover:bg-stone-900/40 transition-colors group">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-stone-300">
                        {new Date(tx.createdAt || tx.date || Date.now()).toLocaleDateString("tr-TR", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          isSatis ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          isTahsilat ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          isStorno ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-stone-800 text-stone-300 border-stone-700"
                        }`}>
                          {isSatis ? <ArrowUpRight className="w-3 h-3" /> :
                           isTahsilat ? <ArrowDownRight className="w-3 h-3" /> :
                           isStorno ? <Info className="w-3 h-3" /> : null}
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-300">
                        <div className="line-clamp-2 max-w-sm">{tx.description}</div>
                        {tx.relatedOrderId && (
                          <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-1">
                            Sipariş: #{tx.relatedOrderId.substring(0, 8)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-amber-400 text-sm">
                        {isSatis || (isDevir && tx.amount > 0) ? `+${tx.amount.toLocaleString("tr-TR")} ₺` : "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-mono font-bold text-emerald-400 text-sm">
                        {isTahsilat || (isDevir && tx.amount < 0) || isStorno ? `+${Math.abs(tx.amount).toLocaleString("tr-TR")} ₺` : "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isSatis && (
                            <button
                              onClick={() => onViewTransactionSlip(tx)}
                              className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] font-bold"
                            >
                              Görüntüle
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTransaction(tx)}
                            className="p-1.5 rounded text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="İşlemi Sil (Ters Kayıt/Storno Oluşturur)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-stone-900 border-t-2 border-stone-800">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right text-[11px] font-bold text-stone-400 uppercase">
                    Güncel Bakiye:
                  </td>
                  <td colSpan={2} className={`py-3 px-4 text-center font-mono font-bold text-lg ${
                    cari.balance > 0 ? "text-rose-400" : cari.balance < 0 ? "text-emerald-400" : "text-stone-300"
                  }`}>
                    {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
