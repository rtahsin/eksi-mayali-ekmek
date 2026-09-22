"use client";

import React, { useState } from "react";
import { Wallet, ArrowRightLeft, Plus, Building2, CreditCard, Loader2 } from "lucide-react";
import { useFinans } from "@/hooks/useFinans";
import { CashAccountType } from "@/types/admin";

export default function FinansKasaPage() {
  const { kasaBalances, cashMovements, addIncome, addTransfer, loading: expensesLoading } = useFinans();

  // Modals for Kasa
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState<number | "">("");
  const [transferFrom, setTransferFrom] = useState<CashAccountType>("nakit");
  const [transferTo, setTransferTo] = useState<CashAccountType>("banka_havale");
  const [transferDesc, setTransferDesc] = useState("");
  const [transferring, setTransferring] = useState(false);

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount) return;
    setTransferring(true);
    const res = await addTransfer({
      from: transferFrom,
      to: transferTo,
      amount: Number(transferAmount),
      description: transferDesc || "Kasa/Banka Virman",
    });
    if (res.success) {
      setTransferModalOpen(false);
      setTransferAmount("");
      setTransferDesc("");
    } else {
      alert("Transfer hatası: " + res.error);
    }
    setTransferring(false);
  };

  const getAccountName = (acc: CashAccountType) => {
    if (acc === "nakit") return "Nakit Kasa";
    if (acc === "banka_havale") return "Banka / Havale";
    if (acc === "pos") return "POS / Kredi Kartı";
    return acc;
  };

  const getAccountIcon = (acc: CashAccountType) => {
    if (acc === "nakit") return <Wallet className="w-5 h-5 text-amber-500" />;
    if (acc === "banka_havale") return <Building2 className="w-5 h-5 text-emerald-500" />;
    if (acc === "pos") return <CreditCard className="w-5 h-5 text-blue-500" />;
    return <Wallet className="w-5 h-5 text-stone-500" />;
  };

  if (expensesLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquid */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between group">
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Toplam Nakit/Likit</div>
            <div className="text-3xl font-black font-mono text-stone-100">
              {(kasaBalances.nakit.balance + kasaBalances.banka.balance + kasaBalances.pos.pending).toLocaleString("tr-TR")} ₺
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-stone-800 text-[10px] text-stone-400 font-semibold">
            Şu an elimizde bulunan toplam işletme parası
          </div>
        </div>

        {/* Nakit */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16" /></div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wallet className="w-3 h-3" /> Nakit Kasa (Çekmece)
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {kasaBalances.nakit.balance.toLocaleString("tr-TR")} ₺
            </div>
          </div>
        </div>

        {/* Banka */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Building2 className="w-16 h-16" /></div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Banka / Havale
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {kasaBalances.banka.balance.toLocaleString("tr-TR")} ₺
            </div>
          </div>
        </div>

        {/* POS */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-16 h-16" /></div>
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Yazar Kasa POS
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {kasaBalances.pos.pending.toLocaleString("tr-TR")} ₺
            </div>
          </div>
        </div>
      </div>

      {/* Header for Movements */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold text-stone-100 font-serif">Kasa Akış & Virman</h2>
          <p className="text-xs text-stone-400">Kasalar arası transfer ve son para hareketleri</p>
        </div>
        <button
          onClick={() => setTransferModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-colors shrink-0"
        >
          <ArrowRightLeft className="w-4 h-4" /> Virman / Para Transferi
        </button>
      </div>

      {/* Cash Movements Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-stone-950 border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tarih</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tür</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Hesap</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Açıklama</th>
                <th className="py-3 px-4 text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/50">
              {cashMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500 text-xs">Henüz hareket bulunmuyor.</td>
                </tr>
              ) : (
                cashMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-800/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-stone-400">
                      {new Date(m.date).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold">
                      {m.type === "in" && <span className="text-emerald-400">GİRİŞ</span>}
                      {m.type === "out" && <span className="text-rose-400">ÇIKIŞ</span>}
                      {m.type === "transfer" && <span className="text-blue-400">VİRMAN</span>}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {m.type === "transfer" ? (
                        <div className="flex items-center gap-1.5 text-stone-400">
                          {getAccountIcon(m.account)} {getAccountName(m.account)}
                          <ArrowRightLeft className="w-3 h-3 mx-1" />
                          {m.targetAccount && getAccountName(m.targetAccount)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-stone-300">
                          {getAccountIcon(m.account)} {getAccountName(m.account)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-300">
                      <div className="line-clamp-2">{m.title}</div>
                      {m.relatedSource && (
                        <div className="text-[10px] text-stone-500 mt-0.5">Kaynak: {m.relatedSource}</div>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-sm font-mono font-bold text-right ${
                      m.type === "in" ? "text-emerald-400" : m.type === "out" ? "text-rose-400" : "text-blue-400"
                    }`}>
                      {m.type === "in" ? "+" : m.type === "out" ? "-" : ""}
                      {m.amount.toLocaleString("tr-TR")} ₺
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-950/60">
              <h3 className="font-bold text-stone-100 font-serif text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-500" /> Virman / Para Transferi
              </h3>
            </div>
            <form onSubmit={handleSaveTransfer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-400">Gönderen (Çıkış)</label>
                  <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value as any)} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none">
                    <option value="nakit">Nakit Kasa</option>
                    <option value="banka_havale">Banka</option>
                    <option value="pos">POS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-400">Alıcı (Giriş)</label>
                  <select value={transferTo} onChange={(e) => setTransferTo(e.target.value as any)} className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-200 outline-none">
                    <option value="banka_havale">Banka</option>
                    <option value="nakit">Nakit Kasa</option>
                    <option value="pos">POS</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Tutar (₺)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Örn: 1000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-lg font-bold font-mono text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Açıklama</label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Opsiyonel açıklama..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                <button type="button" onClick={() => setTransferModalOpen(false)} className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold">Vazgeç</button>
                <button type="submit" disabled={transferring || transferFrom === transferTo} className="px-5 py-2 bg-blue-500 hover:bg-blue-400 text-stone-950 font-bold rounded-xl text-xs disabled:opacity-50 transition-colors">
                  {transferring ? "Kaydediliyor..." : "Transferi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
