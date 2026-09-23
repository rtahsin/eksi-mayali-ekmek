"use client";

import React, { useState } from "react";
import { X, Scale, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { CariAccount } from "@/types/admin";

interface BalanceAdjustModalProps {
  cari: CariAccount;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function BalanceAdjustModal({
  cari,
  onClose,
  onSuccess,
}: BalanceAdjustModalProps) {
  const currentBalance = Number(cari.balance) || 0;
  const [targetBalanceStr, setTargetBalanceStr] = useState<string>(String(currentBalance));
  const [reason, setReason] = useState<string>("Eski Defter Devri & Mutabakat");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const targetBalance = parseFloat(targetBalanceStr) || 0;
  const diff = targetBalance - currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(targetBalance)) {
      setError("Lütfen geçerli bir bakiye tutarı girin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/finans/transaction", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: cari.id,
          targetBalance,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bakiye güncellenemedi.");
      }

      onSuccess(targetBalance);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bakiye güncellenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-[#140F0B] border border-[#2E2219] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative z-10 my-0 sm:my-8 max-h-[90vh] flex flex-col animate-slideUp">
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-[#261E17] flex justify-between items-center bg-[#18130F] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 font-serif text-base">
                Cari Bakiye Düzeltme
              </h3>
              <p className="text-xs text-stone-400">{cari.businessName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-900 rounded-xl text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Current Balance Box */}
          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                Mevcut Bakiye
              </div>
              <div className="text-xl font-mono font-black text-stone-300 mt-0.5">
                {currentBalance.toLocaleString("tr-TR")} ₺
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-stone-600" />
            <div className="text-right">
              <div className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">
                Yeni Hedef
              </div>
              <div className="text-xl font-mono font-black text-amber-400 mt-0.5">
                {targetBalance.toLocaleString("tr-TR")} ₺
              </div>
            </div>
          </div>

          {/* Target Balance Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300">
              Yeni Kesin Bakiye Tutarı (₺) <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={targetBalanceStr}
                onChange={(e) => setTargetBalanceStr(e.target.value)}
                placeholder="Örn: 10000"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-lg font-mono font-bold text-stone-100 focus:outline-none focus:border-amber-500/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-stone-500">
                TL
              </span>
            </div>
          </div>

          {/* Difference Preview */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex justify-between items-center ${
              diff > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                : diff < 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-stone-900 border-stone-800 text-stone-400"
            }`}
          >
            <span>Bakiye Değişimi:</span>
            <span className="font-mono font-bold text-sm">
              {diff > 0
                ? `+${diff.toLocaleString("tr-TR")} ₺ (Borç Artışı)`
                : diff < 0
                ? `${diff.toLocaleString("tr-TR")} ₺ (Alacak/Düşüş)`
                : "0 ₺ (Değişiklik Yok)"}
            </span>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300">
              Düzeltme Açıklaması / Nedeni
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Eski defterden devir, nakit mutabakatı..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
            <p className="text-[10px] text-stone-500">
              Bu açıklama hesap hareketlerine şeffaf bir devir kaydı olarak işlenecektir.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm font-bold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bakiyeyi Güncelle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
