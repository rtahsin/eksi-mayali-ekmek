"use client";

import React from "react";
import {
  X,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { AdminOrder } from "@/types/admin";

interface CourierPaymentModalProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelivery: (type: "cash" | "pos" | "prepaid" | "unpaid") => void;
  isSubmitting: boolean;
  error?: string | null;
}

export function CourierPaymentModal({
  order,
  isOpen,
  onClose,
  onConfirmDelivery,
  isSubmitting,
  error,
}: CourierPaymentModalProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              Teslimat & Tahsilat Onayı
            </span>
            <h3 className="text-lg font-bold font-serif text-stone-100 mt-0.5">
              {order.customerName}
            </h3>
            <p className="text-xs text-stone-400">
              {order.neighborhood} · {order.deliveryAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Amount Box */}
        <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-400">Sipariş Tutarı:</span>
          <span className="text-2xl font-bold font-mono text-amber-400">
            {order.totalAmount.toLocaleString("tr-TR")} ₺
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Quick Payment Options Grid */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-stone-300 font-serif">
            Ödeme Nasıl Tahsil Edildi?
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Cash */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onConfirmDelivery("cash")}
              className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 font-bold text-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-center"
            >
              <DollarSign className="w-6 h-6 text-amber-400" />
              <span>Kapıda Nakit</span>
              <span className="text-[10px] font-normal text-amber-400/80 font-mono">
                {order.totalAmount} ₺ Nakit
              </span>
            </button>

            {/* 2. POS */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onConfirmDelivery("pos")}
              className="p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 hover:text-blue-200 font-bold text-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-center"
            >
              <CreditCard className="w-6 h-6 text-blue-400" />
              <span>Mobil POS</span>
              <span className="text-[10px] font-normal text-blue-400/80 font-mono">
                {order.totalAmount} ₺ Kart
              </span>
            </button>

            {/* 3. Already Paid / Cari */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onConfirmDelivery("prepaid")}
              className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Önceden Ödendi / Cari</span>
              <span className="text-[10px] font-normal text-emerald-400/80">
                Tahsilat Alınmadı
              </span>
            </button>

            {/* 4. Unpaid / Left for credit */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onConfirmDelivery("unpaid")}
              className="p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
            >
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <span>Ödeme Alınamadı</span>
              <span className="text-[10px] font-normal text-rose-400/80">
                Ödeme Bekliyor
              </span>
            </button>
          </div>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
