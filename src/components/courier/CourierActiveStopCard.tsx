"use client";

import React from "react";
import { MapPin, Phone, MessageCircle, Navigation, Compass, Package, Check, Wallet, Building2, CircleCheck } from "lucide-react";
import { AdminOrder } from "@/types/admin";
import { getNavigationUrls, waPhone } from "@/lib/delivery/maps";

interface CourierActiveStopCardProps {
  currentStop: AdminOrder;
  stopIndex: number;
  totalStops: number;
  onOpenSettlement: (order: AdminOrder) => void;
}

/** Kapıda ne yapılacak: tahsilat mı, cariye mi, ödenmiş mi */
function collectionInfo(order: AdminOrder): { label: string; tone: "collect" | "account" | "paid"; amount: number } {
  const amount = order.totalAmount;
  if (order.cariId || order.paymentMethod === "cari") return { label: "Cariye işlenecek (tahsilat yok)", tone: "account", amount };
  if (order.paymentStatus === "paid") return { label: "Ödendi", tone: "paid", amount };
  if (order.paymentMethod === "pos_at_door") return { label: "Kapıda POS ile alınacak", tone: "collect", amount };
  if (order.paymentMethod === "transfer") return { label: "Havale bekleniyor (kontrol et)", tone: "collect", amount };
  return { label: "Kapıda nakit alınacak", tone: "collect", amount };
}

export function CourierActiveStopCard({ currentStop, stopIndex, totalStops, onOpenSettlement }: CourierActiveStopCardProps) {
  const nav = getNavigationUrls(currentStop.deliveryAddress, currentStop.customerLat, currentStop.customerLng);
  const wa = waPhone(currentStop.phone);
  const pay = collectionInfo(currentStop);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-amber-400 uppercase tracking-widest">
          Sıradaki durak {stopIndex + 1} / {totalStops}
        </span>
        <span className="text-stone-400 font-mono text-[11px]">
          #{currentStop.orderNumber || currentStop.id.slice(-6)}
          {currentStop.deliveryTimeWindow ? ` · ${currentStop.deliveryTimeWindow}` : ""}
        </span>
      </div>

      <div className="bg-[#18130F] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Müşteri + ara / WhatsApp */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-amber-500/90 uppercase tracking-wider">
              {currentStop.neighborhood || "Beylikdüzü"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-100 mt-0.5 break-words">
              {currentStop.customerName}
            </h2>
          </div>
          {currentStop.phone && (
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${currentStop.phone}`}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 active:scale-95 transition-transform"
                aria-label="Müşteriyi ara"
              >
                <Phone className="w-5 h-5" />
              </a>
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(
                    `Merhaba, EkmekLab'dan ekmekleriniz yolda; birazdan adresinizdeyim. 🍞`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-600 text-stone-950 active:scale-95 transition-transform"
                  aria-label="WhatsApp'tan yaz"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Adres */}
        <div className="bg-[#120E0B] border border-[#261E17] rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm font-medium text-stone-100 leading-relaxed select-all break-words">
              {currentStop.deliveryAddress}
            </div>
          </div>
          {currentStop.orderNotes && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <span className="font-bold">Not: </span>
              {currentStop.orderNotes}
            </div>
          )}
        </div>

        {/* Paket içeriği */}
        <div className="bg-[#120E0B]/60 border border-[#261E17] rounded-2xl p-3.5 space-y-1.5">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" /> Paket
          </div>
          {currentStop.items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm text-stone-200">
              <span>
                <strong className="text-amber-400">{it.quantity}×</strong> {it.productName}
              </span>
            </div>
          ))}
        </div>

        {/* Kapıda yapılacak */}
        <div
          className={`flex items-center gap-3 p-3 rounded-2xl border ${
            pay.tone === "collect"
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : pay.tone === "account"
              ? "bg-[#C85A32]/15 border-[#C85A32]/40 text-orange-200"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
          }`}
        >
          {pay.tone === "collect" ? (
            <Wallet className="w-6 h-6 shrink-0" />
          ) : pay.tone === "account" ? (
            <Building2 className="w-6 h-6 shrink-0" />
          ) : (
            <CircleCheck className="w-6 h-6 shrink-0" />
          )}
          <div>
            <div className="text-[11px] uppercase font-bold">{pay.label}</div>
            <div className="text-2xl font-bold font-mono">{pay.amount.toLocaleString("tr-TR")} ₺</div>
          </div>
        </div>

        {/* Navigasyon */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={nav.google}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-sm border border-stone-700 active:scale-95"
          >
            <Navigation className="w-4 h-4 text-amber-400" /> Google
          </a>
          <a
            href={nav.yandex}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-sm border border-stone-700 active:scale-95"
          >
            <Compass className="w-4 h-4 text-amber-400" /> Yandex
          </a>
        </div>
        {nav.hasCoordinates && (
          <p className="text-[11px] text-emerald-400 -mt-2">Müşteri sipariş verirken konumunu paylaştı; navigasyon tam noktaya gider.</p>
        )}

        <button
          type="button"
          onClick={() => onOpenSettlement(currentStop)}
          className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-serif font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Check className="w-6 h-6 stroke-[3]" /> TESLİM ET
        </button>
      </div>
    </div>
  );
}
