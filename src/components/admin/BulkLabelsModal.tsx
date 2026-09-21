"use client";

import React, { useState } from "react";
import { AdminOrder } from "@/types/admin";
import { Printer, X, Tag, Package, Check, Phone, MapPin } from "lucide-react";

interface BulkLabelsModalProps {
  orders: AdminOrder[];
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BulkLabelsModal({ orders, date, isOpen, onClose }: BulkLabelsModalProps) {
  const [labelFormat, setLabelFormat] = useState<"a4" | "thermal">("a4");

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:bg-white print:text-black">
        {/* Modal Header (Hidden in print) */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-stone-100 text-base">
                Toplu Paket & Torba Etiketleri
              </h2>
              <p className="text-stone-400 text-xs font-mono">
                {date} Dağıtımı · {orders.length} Adet Paket Etiketi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="bg-stone-800/80 p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setLabelFormat("a4")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  labelFormat === "a4"
                    ? "bg-amber-500 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                A4 Sayfa (2'li)
              </button>
              <button
                type="button"
                onClick={() => setLabelFormat("thermal")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  labelFormat === "thermal"
                    ? "bg-amber-500 text-stone-950 font-bold"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                Termal / 80mm
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Labels Area */}
        <div className="p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              Yazdırılacak paket etiketi bulunamadı.
            </div>
          ) : (
            <div
              className={`gap-4 print:gap-2 ${
                labelFormat === "a4"
                  ? "grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2"
                  : "grid grid-cols-1 max-w-sm mx-auto print:max-w-none print:w-full"
              }`}
            >
              {orders.map((order, idx) => {
                const payMethodLabel =
                  order.paymentMethod === "cash_on_delivery"
                    ? "💵 KAPIDA NAKİT"
                    : order.paymentMethod === "pos_at_door"
                    ? "💳 KAPIDA POS"
                    : "✅ ÖDENDİ";

                return (
                  <div
                    key={order.id}
                    className="border-2 border-dashed border-stone-700 print:border-black rounded-2xl p-4 bg-stone-950/40 print:bg-white text-stone-200 print:text-black space-y-3 page-break-inside-avoid shadow-sm"
                  >
                    {/* Brand & Stop Header */}
                    <div className="flex items-center justify-between border-b border-dashed border-stone-700 print:border-black pb-2">
                      <div>
                        <div className="font-serif font-black tracking-wide text-xs print:text-black">
                          🍞 EKMEKLAB TAŞ FIRIN
                        </div>
                        <div className="text-[10px] text-stone-400 print:text-gray-600 font-mono">
                          {date} · Teslimat Paketi
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 print:bg-black print:text-white font-mono font-black text-xs">
                          DURAK #{idx + 1}
                        </span>
                        <div className="text-[10px] text-stone-400 print:text-gray-600 font-mono">
                          #{order.orderNumber || order.id.slice(-6)}
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-1">
                      <div className="font-serif font-bold text-sm text-stone-100 print:text-black">
                        {order.customerName}
                      </div>
                      {order.phone && (
                        <div className="text-xs font-mono text-stone-300 print:text-black flex items-center gap-1">
                          <Phone className="w-3 h-3 text-amber-400 print:text-black" />
                          <span>{order.phone}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-stone-300 print:text-black leading-tight flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-amber-400 print:text-black shrink-0 mt-0.5" />
                        <span>
                          <strong>{order.neighborhood}</strong> · {order.deliveryAddress}
                        </span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="p-2 rounded-xl bg-stone-900/80 print:bg-gray-50 border border-stone-800 print:border-gray-300 space-y-1">
                      <div className="text-[10px] font-mono text-stone-400 print:text-gray-600 uppercase">
                        Paket İçeriği:
                      </div>
                      <div className="space-y-0.5">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs font-medium"
                          >
                            <span className="font-bold text-amber-300 print:text-black">
                              {item.quantity}x {item.productName}
                            </span>
                            <span className="text-[11px] font-mono text-stone-400 print:text-gray-700">
                              {item.totalPrice} ₺
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Notes if any */}
                    {order.orderNotes && (
                      <div className="p-1.5 rounded-lg bg-amber-500/10 print:bg-yellow-50 text-[10px] text-amber-300 print:text-black italic">
                        <strong>Not:</strong> {order.orderNotes}
                      </div>
                    )}

                    {/* Payment Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-dashed border-stone-700 print:border-black text-xs">
                      <div>
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                            order.paymentMethod === "cash_on_delivery"
                              ? "bg-amber-500/20 text-amber-400 print:bg-transparent print:text-black"
                              : order.paymentMethod === "pos_at_door"
                              ? "bg-blue-500/20 text-blue-400 print:bg-transparent print:text-black"
                              : "bg-emerald-500/20 text-emerald-400 print:bg-transparent print:text-black"
                          }`}
                        >
                          {payMethodLabel}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-serif font-bold text-base text-stone-100 print:text-black">
                          {order.totalAmount} ₺
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
