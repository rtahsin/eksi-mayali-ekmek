"use client";

import React from "react";
import { AdminOrder } from "@/types/admin";
import { Printer, X, CheckCircle2, DollarSign, CreditCard, Truck, Calendar, Store } from "lucide-react";

interface CourierSettlementModalProps {
  date: string;
  orders: AdminOrder[];
  summary: {
    totalOrders: number;
    deliveredCount: number;
    pendingCount: number;
    cashCollected: number;
    cashPending: number;
    posCollected: number;
    posPending: number;
    onlineTotal: number;
    grandTotal: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function CourierSettlementModal({
  date,
  orders,
  summary,
  isOpen,
  onClose,
}: CourierSettlementModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-8">
        {/* Header toolbar (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2 text-stone-200 text-sm font-bold font-serif">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Kurye Gün Sonu Z Raporu & Kasa Fişi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır (Termal / A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Area: 80mm white receipt with black text */}
        <div className="p-6 bg-stone-950 flex justify-center">
          <div
            id="courier-z-report-area"
            className="w-full max-w-[340px] bg-white text-black p-5 rounded-xl shadow font-mono text-[11px] leading-relaxed border border-stone-300"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-gray-400">
              <div className="font-bold text-base tracking-wider uppercase">
                EKMEKLAB TAŞ FIRIN
              </div>
              <div className="text-[10px] text-gray-600">
                KURYE GÜN SONU KASA & Z RAPORU
              </div>
              <div className="text-[10px] text-gray-700 font-bold mt-1">
                Tarih: {date}
              </div>
              <div className="text-[9px] text-gray-500">
                Rapor Saati: {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* General Delivery Stats */}
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>TOPLAM SİPARİŞ:</span>
                <span>{summary.totalOrders} Adet</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>Teslim Edilen:</span>
                <span>{summary.deliveredCount} Adet</span>
              </div>
              {summary.pendingCount > 0 && (
                <div className="flex justify-between text-[10px] text-red-600 font-bold">
                  <span>Bekleyen / Yoldaki:</span>
                  <span>{summary.pendingCount} Adet</span>
                </div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-2">
              <div className="font-bold text-xs uppercase tracking-wide">
                TAHSİLAT DÖKÜMÜ:
              </div>

              {/* Cash Collection */}
              <div className="bg-gray-50 p-2 rounded border border-gray-200 space-y-0.5">
                <div className="flex justify-between font-bold text-xs">
                  <span>💵 KAPIDA NAKİT:</span>
                  <span className="text-sm">{summary.cashCollected.toLocaleString("tr-TR")} ₺</span>
                </div>
                {summary.cashPending > 0 && (
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>Bekleyen Nakit:</span>
                    <span>{summary.cashPending.toLocaleString("tr-TR")} ₺</span>
                  </div>
                )}
              </div>

              {/* POS Collection */}
              <div className="bg-gray-50 p-2 rounded border border-gray-200 space-y-0.5">
                <div className="flex justify-between font-bold text-xs">
                  <span>💳 KAPIDA MOBİL POS:</span>
                  <span className="text-sm">{summary.posCollected.toLocaleString("tr-TR")} ₺</span>
                </div>
                {summary.posPending > 0 && (
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>Bekleyen POS:</span>
                    <span>{summary.posPending.toLocaleString("tr-TR")} ₺</span>
                  </div>
                )}
              </div>

              {/* Online / Transfer */}
              <div className="flex justify-between text-[10px] text-gray-700 px-1">
                <span>🌐 Online / Havale:</span>
                <span className="font-bold">{summary.onlineTotal.toLocaleString("tr-TR")} ₺</span>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-gray-300 flex justify-between font-bold text-sm">
                <span>GENEL DAĞITIM CİROSU:</span>
                <span>{summary.grandTotal.toLocaleString("tr-TR")} ₺</span>
              </div>
            </div>

            {/* Detailed Order List (Compact) */}
            <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-1.5">
              <div className="font-bold text-[10px] uppercase text-gray-600">
                SİPARİŞ ÖZET LİSTESİ:
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {orders.map((o, idx) => {
                  const methodLabel =
                    o.paymentMethod === "cash_on_delivery"
                      ? "Nakit"
                      : o.paymentMethod === "pos_at_door"
                      ? "POS"
                      : "Online";
                  const isDelivered = o.status === "teslim_edildi";

                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-[10px] pb-1 border-b border-gray-100"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold">#{o.orderNumber || o.id.substring(0, 5)}</span>{" "}
                        <span>{o.customerName}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold">{o.totalAmount} ₺</span>
                        <span className="text-[9px] text-gray-500 ml-1">({methodLabel})</span>
                        <span className={`ml-1 font-bold ${isDelivered ? "text-emerald-700" : "text-amber-700"}`}>
                          {isDelivered ? "✓" : "⏳"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature Area for Courier & Bakery */}
            <div className="pt-4 pb-2 space-y-6 text-[10px]">
              <div className="flex justify-between items-end">
                <div className="text-center w-36">
                  <div className="font-bold pb-8">Kurye Teslim Eden</div>
                  <div className="border-t border-dashed border-gray-400 pt-1 text-[9px] text-gray-500">
                    İmza / Tarih
                  </div>
                </div>

                <div className="text-center w-36">
                  <div className="font-bold pb-8">Tahsin Usta (Teslim Alan)</div>
                  <div className="border-t border-dashed border-gray-400 pt-1 text-[9px] text-gray-500">
                    Kasa Onayı / İmza
                  </div>
                </div>
              </div>

              <div className="text-center text-[8px] text-gray-400 uppercase tracking-widest pt-2">
                *** EKMEKLAB ATÖLYE YÖNETİM SİSTEMİ ***
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
