"use client";

import React, { useState } from "react";
import { CreditCard, DollarSign, X, CheckCircle, AlertCircle, FileText } from "lucide-react";
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#18130F] border border-[#261E17] rounded-3xl p-6 text-stone-100 shadow-2xl space-y-5 overflow-hidden">
        {/* Amber Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#261E17] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#F7EBD3]">
                Tahsilat / Ödeme Kaydı
              </h3>
              <p className="text-[11px] text-stone-400 font-mono">
                Sipariş #{orderNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-[#261E17] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-[#120E0B] border border-[#261E17] rounded-xl p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-stone-400 block text-[10px] font-mono">Toplam Sipariş Tutarı</span>
            <span className="font-bold text-stone-200 text-sm">{totalAmount} ₺</span>
          </div>
          <div className="text-right">
            <span className="text-stone-400 block text-[10px] font-mono">Kalan Tahsilat</span>
            <span className="font-bold text-[#F59E0B] text-sm">{remainingAmount} ₺</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Method Selection */}
          <div>
            <label className="block text-stone-300 font-medium mb-1.5">
              Ödeme / Tahsilat Yöntemi:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "💵 Nakit" },
                { id: "pos", label: "💳 POS Kart" },
                { id: "transfer", label: "🏦 Havale" },
                { id: "online_card", label: "🌐 Online" },
                { id: "cari", label: "🏢 Cari Hesap" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id as PaymentMethodType)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-colors font-medium text-xs ${
                    method === m.id
                      ? "bg-[#261E17] border-[#F59E0B] text-[#F59E0B]"
                      : "bg-[#120E0B] border-[#261E17] text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Partial Payment Toggle */}
          <div className="flex items-center justify-between py-1 px-1">
            <span className="text-stone-300 font-medium">Kısmi Tahsilat (Parçalı Ödeme)</span>
            <input
              type="checkbox"
              checked={isPartial}
              onChange={(e) => {
                setIsPartial(e.target.checked);
                if (!e.target.checked) setAmount(remainingAmount);
              }}
              className="w-4 h-4 accent-[#F59E0B] rounded cursor-pointer"
            />
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Tahsil Edilen Tutar (₺):
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={!isPartial}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#120E0B] border border-[#261E17] text-stone-100 font-mono text-sm focus:outline-none focus:border-[#F59E0B] disabled:opacity-75"
            />
          </div>

          {/* Transaction Ref */}
          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Referans / Slip / Dekont No (İsteğe bağlı):
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="Örn: POS-89312 veya Dekont Ref"
              className="w-full px-3.5 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Açıklama / Not (İsteğe bağlı):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Kurye elden aldı, müşteri sonra tamamlayacak vb."
              className="w-full px-3.5 py-2 rounded-xl bg-[#120E0B] border border-[#261E17] text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-[#261E17] hover:bg-[#342920] text-stone-300 font-medium transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : "Tahsilatı Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
