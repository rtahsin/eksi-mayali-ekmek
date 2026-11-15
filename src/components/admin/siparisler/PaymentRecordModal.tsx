"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { DollarSign, X, AlertCircle } from "lucide-react";
import { PaymentMethodType } from "@/types/payment";
import { usePayments } from "@/hooks/usePayments";

interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  existingPaidAmount?: number;
  cariId?: string;
  onPaymentSuccess?: () => void;
}

function isOutsideDialog(e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement): boolean {
  const r = dialog.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

export function PaymentRecordModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  totalAmount,
  existingPaidAmount = 0,
  cariId,
  onPaymentSuccess,
}: PaymentRecordModalProps) {
  const remainingAmount = Math.max(0, totalAmount - existingPaidAmount);

  const [amount, setAmount] = useState<number>(remainingAmount > 0 ? remainingAmount : totalAmount);
  const [method, setMethod] = useState<PaymentMethodType>("cash");
  const [isPartial, setIsPartial] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createPayment } = usePayments(orderId);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();
  const partialId = useId();
  const amountId = useId();
  const refId = useId();
  const noteId = useId();

  useEffect(() => {
    if (isOpen) {
      setAmount(remainingAmount > 0 ? remainingAmount : totalAmount);
      setIsPartial(false);
      setError(null);
    }
  }, [isOpen, remainingAmount, totalAmount]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.returnValue = "";
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Geçerli bir tahsilat tutarı giriniz.");
      return;
    }

    setLoading(true);
    setError(null);

    const paymentStatus = amount >= remainingAmount ? "completed" : "partial";

    const res = await createPayment({
      orderId,
      amount,
      method,
      status: paymentStatus,
      collectedBy: "admin",
      transactionRef: transactionRef.trim() || null,
      note: note.trim() || `Admin panelinden tahsil edildi (Sipariş #${orderNumber})`,
      cariId: cariId || null,
    });

    setLoading(false);

    if (res.success) {
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      onClose();
    } else {
      setError(res.error || "Ödeme kaydedilirken bir hata oluştu.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(e) => {
        e.currentTarget.returnValue = "";
        onClose();
      }}
      onPointerDown={(e) => {
        pressedOutsideRef.current = isOutsideDialog(e, e.currentTarget);
      }}
      onPointerUp={(e) => {
        if (pressedOutsideRef.current && isOutsideDialog(e, e.currentTarget)) {
          onClose();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {isOpen && (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] flex items-center justify-center text-[#B4532A]">
                <DollarSign className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id={titleId} className="font-serif font-bold text-base text-[#3B1E1A]">
                  Tahsilat / Ödeme Kaydı
                </h3>
                <p className="text-xs text-[#6E5148] font-mono tabular-nums">
                  Sipariş #{orderNumber}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Tahsilat penceresini kapat"
              onClick={onClose}
              className="min-w-10 min-h-10 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[#6E5148] block text-xs font-mono">Toplam Sipariş Tutarı</span>
              <span className="font-bold font-mono tabular-nums text-[#3B1E1A] text-sm">
                {totalAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#6E5148] block text-xs font-mono">Kalan Tahsilat</span>
              <span className="font-bold font-mono tabular-nums text-[#8E3D1B] text-sm">
                {remainingAmount.toLocaleString("tr-TR")} ₺
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Method Selection */}
            <div>
              <span className="block text-[#3B1E1A] font-semibold mb-1.5">
                Ödeme / Tahsilat Yöntemi:
              </span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tahsilat yöntemi">
                {[
                  { id: "cash", label: "Nakit" },
                  { id: "pos", label: "POS Kart" },
                  { id: "transfer", label: "Havale" },
                  { id: "online_card", label: "Online" },
                  { id: "cari", label: "Cari Hesap" },
                ].map((m) => {
                  const active = method === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      aria-pressed={active}
                      onClick={() => setMethod(m.id as PaymentMethodType)}
                      className={`min-h-10 py-2 px-2.5 rounded-xl border text-center transition-colors font-semibold text-xs ${
                        active
                          ? "bg-[#F3E2D4] border-[#B4532A] text-[#8E3D1B]"
                          : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] hover:bg-[#F1E6D2]"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Partial Payment Toggle */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD]">
              <label htmlFor={partialId} className="text-[#3B1E1A] font-semibold cursor-pointer">
                Kısmi Tahsilat (Parçalı Ödeme)
              </label>
              <input
                id={partialId}
                type="checkbox"
                checked={isPartial}
                onChange={(e) => {
                  setIsPartial(e.target.checked);
                  if (!e.target.checked) setAmount(remainingAmount);
                }}
                className="w-4 h-4 accent-[#B4532A] rounded cursor-pointer"
              />
            </div>

            {/* Amount Field */}
            <div>
              <label htmlFor={amountId} className="block text-[#3B1E1A] font-semibold mb-1">
                Tahsil Edilen Tutar (₺):
              </label>
              <input
                id={amountId}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={!isPartial}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] font-mono tabular-nums text-sm focus:outline-none focus:ring-2 focus:ring-[#B4532A] disabled:bg-[#FBF6EC] disabled:text-[#6E5148]"
              />
            </div>

            {/* Transaction Ref */}
            <div>
              <label htmlFor={refId} className="block text-[#3B1E1A] font-semibold mb-1">
                Referans / Slip / Dekont No (İsteğe bağlı):
              </label>
              <input
                id={refId}
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Örn: POS-89312 veya Dekont Ref"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
            </div>

            {/* Note */}
            <div>
              <label htmlFor={noteId} className="block text-[#3B1E1A] font-semibold mb-1">
                Açıklama / Not (İsteğe bağlı):
              </label>
              <input
                id={noteId}
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Kurye elden aldı, müşteri sonra tamamlayacak vb."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-2 border-t border-[#E2D3BD]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] font-semibold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold shadow-xs active:scale-95 transition-colors disabled:opacity-50"
              >
                {loading ? "Kaydediliyor..." : "Tahsilatı Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}
