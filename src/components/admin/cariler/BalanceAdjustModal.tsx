"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Scale, ShieldAlert, X } from "lucide-react";
import { recordLedger } from "@/hooks/useCariler";
import type { CariAccount } from "@/types/admin";

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
  const currentBalance = Math.round((Number(cari.balance) || 0) * 100) / 100;
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [targetBalanceStr, setTargetBalanceStr] = useState<string>(String(currentBalance));
  const [reason, setReason] = useState<string>("Mutabakat");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const parsedTarget = Number(targetBalanceStr.replace(",", "."));
  const hasValidNumber = targetBalanceStr.trim() !== "" && Number.isFinite(parsedTarget);
  const targetBalance = hasValidNumber ? Math.round(parsedTarget * 100) / 100 : currentBalance;
  const diff = Math.round((targetBalance - currentBalance) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidNumber) {
      setError("Lütfen geçerli bir hedef bakiye tutarı girin.");
      return;
    }
    if (!reason.trim()) {
      setError("Bakiye düzeltme gerekçesi zorunludur.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await recordLedger(cari.id, {
        kind: "set_balance",
        targetBalance,
        description: reason.trim(),
      });
      if (!res.success) {
        throw new Error(res.error || "Bakiye güncellenemedi.");
      }
      onSuccess(targetBalance);
      dialogRef.current?.close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bakiye güncellenemedi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="closerequest"
      onCancel={(e) => {
        if (loading) e.preventDefault();
      }}
      aria-labelledby="balance-adjust-title"
      className="m-auto mb-0 w-full max-w-md rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl"
    >
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#B4532A]">
              <Scale className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="balance-adjust-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                Bakiye Mutabakatı / Düzelt
              </h2>
              <p className="truncate text-xs text-[#6E5148]">{cari.businessName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={loading}
            aria-label="Kapat"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-white text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          {/* Mevcut -> Hedef Bakiye */}
          <div className="flex items-center justify-between rounded-xl border border-[#E2D3BD] bg-white p-4">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                Mevcut Bakiye
              </span>
              <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-[#3B1E1A]">
                {currentBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#6E5148]" />
            <div className="text-right">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#8E3D1B]">
                Yeni Hedef
              </span>
              <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-[#8E3D1B]">
                {targetBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="adjust-target-balance"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E5148]"
            >
              Yeni Kesin Bakiye Tutarı (₺)
            </label>
            <input
              id="adjust-target-balance"
              type="text"
              inputMode="decimal"
              autoFocus
              required
              value={targetBalanceStr}
              onChange={(e) => setTargetBalanceStr(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#E2D3BD] bg-white px-4 font-mono text-xl font-bold tabular-nums text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none"
            />
            <p className="mt-1.5 font-mono text-xs text-[#6E5148]">
              Fark devir kaydı:{" "}
              <strong className={diff >= 0 ? "text-[#8E3D1B]" : "text-emerald-800"}>
                {diff >= 0 ? "+" : ""}
                {diff.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
              </strong>{" "}
              (önceki hareketler korunur)
            </p>
          </div>

          <div>
            <label
              htmlFor="adjust-reason"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E5148]"
            >
              Mutabakat / Düzeltme Gerekçesi
            </label>
            <input
              id="adjust-reason"
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn. Ay sonu mutabakatı, devir yuvarlama..."
              className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-white px-3 text-base text-[#3B1E1A] focus:border-[#B4532A] focus:outline-none sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={loading}
              className="min-h-11 rounded-xl border border-[#E2D3BD] bg-white px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#F6EEDF] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || diff === 0}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#9C4421] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {loading ? "Kaydediliyor..." : "Bakiyeyi Güncelle"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
