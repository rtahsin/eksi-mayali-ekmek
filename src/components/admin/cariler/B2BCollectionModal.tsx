"use client";

import React, { useEffect, useRef, useState } from "react";
import { Banknote, Building2, CreditCard, Loader2, ShieldAlert, Wallet, X } from "lucide-react";
import { useCariler } from "@/hooks/useCariler";

interface B2BCollectionModalProps {
  cariId: string;
  cariName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const METHODS: Array<{
  id: "nakit" | "banka_havale" | "pos";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "banka_havale", label: "Havale / EFT", icon: Building2 },
  { id: "nakit", label: "Nakit", icon: Banknote },
  { id: "pos", label: "Kredi Kartı", icon: CreditCard },
];

export default function B2BCollectionModal({
  cariId,
  cariName,
  onClose,
  onSuccess,
}: B2BCollectionModalProps) {
  const { addTransaction } = useCariler();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"nakit" | "banka_havale" | "pos">("banka_havale");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Lütfen 0'dan büyük geçerli bir tahsilat tutarı girin.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await addTransaction(cariId, {
        kind: "tahsilat",
        amount: Math.round(numericAmount * 100) / 100,
        description: desc.trim() || undefined,
        paymentMethod,
      });

      if (!res.success) {
        throw new Error(res.error || "Tahsilat kaydedilemedi.");
      }

      onSuccess?.();
      dialogRef.current?.close();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
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
      aria-labelledby="b2b-collection-title"
      className="m-auto mb-0 w-full max-w-md rounded-t-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 sm:mb-auto sm:rounded-2xl"
    >
      <div className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E2D3BD] bg-[#F6EEDF] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="b2b-collection-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                Tahsilat Al
              </h2>
              <p className="truncate text-xs text-[#6E5148]">{cariName}</p>
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

        {/* Form */}
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

          <div>
            <label
              htmlFor="collection-amount"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E5148]"
            >
              Tahsilat Tutarı (₺)
            </label>
            <input
              id="collection-amount"
              type="text"
              inputMode="decimal"
              autoFocus
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="min-h-12 w-full rounded-xl border border-[#E2D3BD] bg-white px-4 font-mono text-2xl font-bold tabular-nums text-emerald-800 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E5148]">
              Ödeme Yöntemi
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                        : "border-[#E2D3BD] bg-white text-[#3B1E1A] hover:bg-[#F6EEDF]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="collection-desc"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6E5148]"
            >
              Açıklama / Makbuz Notu
            </label>
            <textarea
              id="collection-desc"
              rows={2}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Örn. Garanti EFT veya kurye nakit teslim..."
              className="w-full rounded-xl border border-[#E2D3BD] bg-white p-3 text-base text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:border-[#B4532A] focus:outline-none sm:text-sm"
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
              disabled={loading}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "İşleniyor..." : "Tahsilatı Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
