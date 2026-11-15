"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdminOrder } from "@/types/admin";
import { Printer, X, Tag, Phone, MapPin } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";

interface BulkLabelsModalProps {
  orders: AdminOrder[];
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BulkLabelsModal({ orders, date, isOpen, onClose }: BulkLabelsModalProps) {
  const [labelFormat, setLabelFormat] = useState<"a4" | "thermal">("a4");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOutsideRef = useRef(false);
  const { adminUser } = useAdminAuth();
  const canViewFinance = hasCapability(adminUser?.role, "dashboard.finance");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isPointerOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  const renderLabelCards = () => (
    <div
      className={`gap-4 print:gap-2 overflow-visible ${
        labelFormat === "a4"
          ? "grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2"
          : "grid grid-cols-1 max-w-sm mx-auto print:max-w-none print:w-full"
      }`}
    >
      {orders.map((order, idx) => {
        const payMethodLabel =
          order.paymentMethod === "cash_on_delivery"
            ? "KAPIDA NAKİT"
            : order.paymentMethod === "pos_at_door"
              ? "KAPIDA POS"
              : order.paymentMethod === "cari"
                ? "CARİ HESAP"
                : "ÖDENDİ";

        return (
          <div
            key={order.id}
            className="border-2 border-dashed border-[#D3C0A5] print:border-black rounded-2xl p-4 bg-white print:bg-white text-[#3B1E1A] print:text-black space-y-3 break-inside-avoid shadow-sm overflow-visible"
          >
            {/* Brand & Stop Header */}
            <div className="flex items-center justify-between border-b border-dashed border-[#E2D3BD] print:border-black pb-2 overflow-visible">
              <div>
                <div className="font-serif font-black tracking-wide text-xs text-[#3B1E1A] print:text-black leading-normal pb-0.5">
                  EKMEKLAB TAŞ FIRIN
                </div>
                <div className="text-xs text-[#6E5148] print:text-gray-700 font-mono tabular-nums leading-normal pb-0.5">
                  {date} · Teslimat Paketi
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-lg bg-[#F3E2D4] text-[#8E3D1B] border border-[#DFB99F] print:border-black print:bg-black print:text-white font-mono tabular-nums font-bold text-xs leading-normal">
                  DURAK #{idx + 1}
                </span>
                <div className="text-xs text-[#6E5148] print:text-gray-700 font-mono tabular-nums leading-normal pb-0.5">
                  #{order.orderNumber || order.id.slice(-6)}
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-1 overflow-visible">
              <div className="font-serif font-bold text-sm text-[#3B1E1A] print:text-black leading-normal pb-0.5">
                {order.customerName}
              </div>
              {order.phone && (
                <div className="text-xs font-mono tabular-nums text-[#3B1E1A] print:text-black flex items-center gap-1 leading-normal pb-0.5">
                  <Phone className="w-3 h-3 text-[#B4532A] print:text-black shrink-0" aria-hidden="true" />
                  <span>{order.phone}</span>
                </div>
              )}
              <div className="text-xs text-[#3B1E1A] print:text-black leading-normal pb-0.5 flex items-start gap-1">
                <MapPin className="w-3 h-3 text-[#B4532A] print:text-black shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>{order.neighborhood}</strong> · {order.deliveryAddress}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div className="p-2.5 rounded-xl bg-[#FBF6EC] print:bg-gray-50 border border-[#E2D3BD] print:border-gray-400 space-y-1 overflow-visible">
              <div className="text-[11px] font-mono text-[#6E5148] print:text-gray-700 uppercase tracking-wide">
                Paket İçeriği:
              </div>
              <div className="space-y-0.5">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs font-medium leading-normal pb-0.5"
                  >
                    <span className="font-bold text-[#3B1E1A] print:text-black">
                      <span className="font-mono tabular-nums text-[#8E3D1B] print:text-black">{item.quantity}x</span>{" "}
                      {item.productName}
                    </span>
                    {canViewFinance && (
                      <span className="text-xs font-mono tabular-nums text-[#6E5148] print:text-black">
                        {item.totalPrice} ₺
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Order Notes if any */}
            {order.orderNotes && (
              <div className="p-2 rounded-lg bg-[#FEF3D6] border border-[#E8C587] print:border-gray-400 print:bg-gray-100 text-xs text-[#7A4A0B] print:text-black italic leading-normal pb-1">
                <strong>Not:</strong> {order.orderNotes}
              </div>
            )}

            {/* Payment Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#E2D3BD] print:border-black text-xs overflow-visible">
              <div>
                <span
                  className={`font-bold font-mono px-2 py-0.5 rounded-md border text-xs ${
                    order.paymentMethod === "cash_on_delivery"
                      ? "bg-[#FEF3D6] border-[#E8C587] text-[#7A4A0B] print:border-black print:bg-transparent print:text-black"
                      : order.paymentMethod === "pos_at_door"
                        ? "bg-[#EEF3F8] border-[#C5D5E4] text-[#24476B] print:border-black print:bg-transparent print:text-black"
                        : "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130] print:border-black print:bg-transparent print:text-black"
                  }`}
                >
                  {payMethodLabel}
                </span>
              </div>

              {canViewFinance && (
                <div className="text-right overflow-visible">
                  <span className="font-mono tabular-nums font-bold text-base text-[#3B1E1A] print:text-black leading-normal pb-1">
                    {order.totalAmount} ₺
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby="bulk-labels-title"
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        onPointerDown={(e) => {
          pointerDownOutsideRef.current = isPointerOutsideDialog(e);
        }}
        onPointerUp={(e) => {
          if (pointerDownOutsideRef.current && isPointerOutsideDialog(e)) {
            onClose();
          }
          pointerDownOutsideRef.current = false;
        }}
        className="m-auto w-[calc(100%-1.5rem)] max-w-4xl max-h-[90dvh] rounded-3xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] p-0 shadow-2xl overflow-hidden backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-[2px] backdrop:overflow-hidden backdrop:overscroll-contain print:hidden"
      >
        {isOpen && (
          <div className="flex flex-col max-h-[90dvh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2D3BD] flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#F3E2D4] border border-[#DFB99F] flex items-center justify-center text-[#8E3D1B]">
                  <Tag className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="bulk-labels-title" className="font-serif font-bold text-[#3B1E1A] text-base">
                    Toplu Paket &amp; Torba Etiketleri
                  </h2>
                  <p className="text-[#6E5148] text-xs font-mono tabular-nums">
                    {date} Dağıtımı · {orders.length} Adet Paket Etiketi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-[#F1E6D2] border border-[#E2D3BD] p-1 rounded-xl flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    aria-pressed={labelFormat === "a4"}
                    onClick={() => setLabelFormat("a4")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      labelFormat === "a4"
                        ? "bg-[#B4532A] text-white font-bold shadow-sm"
                        : "text-[#6E5148] hover:text-[#3B1E1A]"
                    }`}
                  >
                    A4 Sayfa (2&apos;li)
                  </button>
                  <button
                    type="button"
                    aria-pressed={labelFormat === "thermal"}
                    onClick={() => setLabelFormat("thermal")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      labelFormat === "thermal"
                        ? "bg-[#B4532A] text-white font-bold shadow-sm"
                        : "text-[#6E5148] hover:text-[#3B1E1A]"
                    }`}
                  >
                    Termal / 80mm
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" aria-hidden="true" />
                  <span>Yazdır</span>
                </button>

                <button
                  aria-label="Kapat"
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-[#6E5148] hover:text-[#3B1E1A] hover:bg-[#F1E6D2] transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Preview Labels Area */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-[#6E5148] text-xs">
                  Yazdırılacak paket etiketi bulunamadı.
                </div>
              ) : (
                renderLabelCards()
              )}
            </div>
          </div>
        )}
      </dialog>

      {/* Yazdırma Katmanı — #top-layer dışında çoklu sayfayı kesintisiz basar */}
      {isOpen && orders.length > 0 && (
        <div className="hidden print:block bg-white text-black p-0 overflow-visible">
          {renderLabelCards()}
        </div>
      )}
    </>
  );
}
