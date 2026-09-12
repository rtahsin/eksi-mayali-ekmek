"use client";

import React from "react";
import { AdminOrder } from "@/types/admin";
import { Printer, X, Check, MapPin, Phone, Clock, Store } from "lucide-react";

interface OrderSlipModalProps {
  order: AdminOrder;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderSlipModal({ order, isOpen, onClose }: OrderSlipModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentLabel = () => {
    if (order.paymentMethod === "cash_on_delivery") {
      return `KAPIDA NAKİT TAHSİLAT: ${order.totalAmount} ₺`;
    }
    if (order.paymentMethod === "pos_at_door") {
      return `KAPIDA MOBİL POS (KART): ${order.totalAmount} ₺`;
    }
    if (order.paymentMethod === "online") {
      return `ONLINE KART İLE ÖDENDİ (${order.totalAmount} ₺)`;
    }
    if (order.paymentMethod === "transfer") {
      return `HAVALE / EFT İLE ÖDENDİ (${order.totalAmount} ₺)`;
    }
    if (order.paymentMethod === "cari") {
      return `KURUMSAL CARİ HESABA YAZILDI (${order.totalAmount} ₺)`;
    }
    return `${order.totalAmount} ₺`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-8">
        {/* Header toolbar (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2 text-stone-200 text-sm font-bold font-serif">
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Kurye Paketleme Fişi & Koli Etiketi</span>
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

        {/* Printable Area: Styled as clean 80mm white receipt with black text */}
        <div className="p-6 bg-stone-950 flex justify-center">
          <div
            id="thermal-slip-area"
            className="w-full max-w-[340px] bg-white text-black p-5 rounded-xl shadow font-mono text-[11px] leading-relaxed border border-stone-300"
          >
            {/* Store Brand */}
            <div className="text-center pb-3 border-b-2 border-dashed border-gray-400">
              <div className="font-bold text-base tracking-wider uppercase">
                EKMEKLAB TAŞ FIRIN
              </div>
              <div className="text-[10px] text-gray-600">
                Ekşi Mayalı Ekmekler & Gurme Lezzetler
              </div>
              <div className="text-[10px] text-gray-600">
                Beylikdüzü Dağıtım Hattı: 0530 638 97 73
              </div>
            </div>

            {/* Order & Delivery Info */}
            <div className="py-3 border-b border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>SİPARİŞ: #{order.orderNumber || order.id.substring(0, 6)}</span>
                <span>{order.deliveryDate}</span>
              </div>
              <div className="text-[10px] text-gray-700">
                Saat Dilimi: <strong>{order.deliveryTimeWindow || "14:00 - 18:00"}</strong>
              </div>
              <div className="text-[10px] text-gray-700">
                Teslimat: <strong>{order.deliveryMethod === "pickup" ? "ATÖLYEDEN GEL-AL" : "ÖZEL KURYE"}</strong>
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-3 border-b border-dashed border-gray-400 space-y-1">
              <div className="font-bold text-xs uppercase">{order.customerName}</div>
              <div className="font-bold">{order.phone}</div>
              <div className="font-bold text-[11px] text-gray-900">
                📍 {order.neighborhood || "Beylikdüzü"}
              </div>
              <div className="text-[10px] text-gray-800 leading-tight">
                {order.deliveryAddress}
              </div>
            </div>

            {/* Order Items */}
            <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-2">
              <div className="font-bold text-[10px] uppercase text-gray-700">
                PAKET İÇERİĞİ:
              </div>
              <div className="space-y-1.5">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="pr-2">
                      <span className="font-bold">{it.quantity}x</span> {it.productName}
                      {it.weight ? ` (${it.weight}g)` : ""}
                    </div>
                    <span className="font-bold shrink-0">{it.totalPrice} ₺</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary & Collection Alert */}
            <div className="py-3 border-b-2 border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>Ara Toplam:</span>
                <span>{order.subtotal} ₺</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Kurye Teslimatı:</span>
                <span>{order.shippingFee === 0 ? "ÜCRETSİZ" : `${order.shippingFee} ₺`}</span>
              </div>
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
                <span>GENEL TOPLAM:</span>
                <span>{order.totalAmount} ₺</span>
              </div>

              {/* Payment Box */}
              <div className="mt-2.5 p-2 bg-gray-100 border border-gray-300 rounded text-center">
                <div className="text-[10px] uppercase font-bold text-gray-800">
                  {paymentLabel()}
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.orderNotes && (
              <div className="py-2 border-b border-dashed border-gray-400 text-[10px]">
                <strong>Sipariş Notu:</strong> {order.orderNotes}
              </div>
            )}

            {/* Footer Notice */}
            <div className="pt-3 text-center text-[9px] text-gray-600 leading-tight space-y-1">
              <div>Ekşi mayalı ekmeklerimiz 36 saat soğuk fermantasyonla üretilmiştir.</div>
              <div className="font-bold text-black">Afiyet Olsun! • ekmeklab.tr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-slip-area,
          #thermal-slip-area * {
            visibility: visible !important;
          }
          #thermal-slip-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
