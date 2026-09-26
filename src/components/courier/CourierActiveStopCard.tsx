"use client";

import React from "react";
import {
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  Compass,
  CheckCircle2,
  Package,
  Radio,
  DollarSign,
  CreditCard,
  Check,
} from "lucide-react";
import { AdminOrder } from "@/types/admin";

function extractCoordinates(address?: string): { lat: string; lon: string } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (match) {
    return { lat: match[1], lon: match[2] };
  }
  return null;
}

function getNavigationUrls(address: string, liveLat?: number | null, liveLng?: number | null) {
  if (liveLat && liveLng) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${liveLat},${liveLng}`,
      apple: `https://maps.apple.com/?daddr=${liveLat},${liveLng}`,
      yandex: `https://yandex.com.tr/harita/?rtext=~${liveLat}%2C${liveLng}&rtt=auto`,
      isLiveGps: true,
    };
  }

  const coords = extractCoordinates(address);
  const cleanAddress = address.replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  const query = encodeURIComponent(`${cleanAddress}, Beylikdüzü, İstanbul`);

  if (coords) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`,
      apple: `https://maps.apple.com/?daddr=${coords.lat},${coords.lon}`,
      yandex: `https://yandex.com.tr/harita/?rtext=~${coords.lat}%2C${coords.lon}&rtt=auto`,
      isLiveGps: false,
    };
  }

  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${query}`,
    yandex: `https://yandex.com.tr/harita/?text=${query}`,
    isLiveGps: false,
  };
}

interface CourierActiveStopCardProps {
  currentStop: AdminOrder;
  stopIndex: number;
  totalStops: number;
  onOpenSettlement: (order: AdminOrder) => void;
}

export function CourierActiveStopCard({
  currentStop,
  stopIndex,
  totalStops,
  onOpenSettlement,
}: CourierActiveStopCardProps) {
  const currentNav = getNavigationUrls(
    currentStop.deliveryAddress,
    currentStop.customerLat,
    currentStop.customerLng
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>
            SIRADAKİ TESLİMAT: DURAK {stopIndex + 1} / {totalStops}
          </span>
        </span>
        <span className="text-stone-400 font-mono text-[11px]">
          {currentStop.orderNumber ? `#${currentStop.orderNumber}` : `#${currentStop.id.slice(-6)}`}
        </span>
      </div>

      {/* Giant Active Card */}
      <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-[#1e1712] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Customer & Phone Bar */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-500/90 uppercase tracking-wider">
                {currentStop.neighborhood || "Beylikdüzü"}
              </span>
              {currentStop.locationShared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold animate-pulse">
                  <Radio className="w-2.5 h-2.5" />
                  <span>Canlı Konum</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-100 mt-0.5">
              {currentStop.customerName}
            </h2>
          </div>

          {/* Quick Call & WhatsApp Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {currentStop.phone && (
              <>
                <a
                  href={`tel:${currentStop.phone}`}
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
                  title="Müşteriyi Ara"
                >
                  <Phone className="w-5 h-5" />
                </a>
                <a
                  href={`https://wa.me/90${currentStop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Merhaba ${currentStop.customerName} Bey/Hanım, EkmekLab taş fırınından taze ekmeklerinizle yoldayım, yaklaşık 10 dakikaya adresinizdeyim. 🍞🛵`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-600 text-stone-950 shadow-lg shadow-emerald-600/20 active:scale-95 transition-transform"
                  title="WhatsApp'tan Yaz"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Delivery Address Box */}
        <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm font-medium text-stone-100 leading-relaxed select-all">
              {currentStop.deliveryAddress}
            </div>
          </div>

          {currentStop.orderNotes && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-sans italic flex items-center gap-2">
              <span className="font-bold shrink-0">Bina/Zil Notu:</span>
              <span>{currentStop.orderNotes}</span>
            </div>
          )}
        </div>

        {/* Items Summary */}
        <div className="bg-stone-950/50 border border-stone-800/80 rounded-2xl p-3.5 space-y-2">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Paket İçeriği</span>
          </div>
          <div className="space-y-1">
            {currentStop.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-stone-200">
                <span className="font-medium">
                  <strong className="text-amber-400">{it.quantity}x</strong> {it.productName}
                </span>
                <span className="text-stone-400 font-mono">{it.totalPrice} ₺</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Badge Banner */}
        <div className="rounded-2xl p-3 border border-stone-800 flex items-center justify-between gap-3 shadow-inner">
          {currentStop.paymentMethod === "cash_on_delivery" ? (
            <div className="flex items-center gap-2.5 w-full bg-amber-500/15 border border-amber-500/30 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400">Kapıda Nakit Tahsil Edilecek</div>
                <div className="text-2xl font-bold font-mono text-amber-300">
                  {currentStop.totalAmount.toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>
          ) : currentStop.paymentMethod === "pos_at_door" ? (
            <div className="flex items-center gap-2.5 w-full bg-blue-500/15 border border-blue-500/30 p-3 rounded-xl">
              <CreditCard className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-blue-400">Kapıda Mobil POS Çekilecek</div>
                <div className="text-2xl font-bold font-mono text-blue-300">
                  {currentStop.totalAmount.toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 w-full bg-emerald-500/15 border border-emerald-500/30 p-3 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400">Tahsilat Yok (Ödendi / Cari)</div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {currentStop.totalAmount.toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>
          )}
        </div>

        {/* One-Tap Navigation Buttons */}
        {currentNav && (
          <div className="space-y-2 pt-1">
            {currentNav.isLiveGps && (
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400">
                <span className="flex items-center gap-1.5 font-bold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Müşteri canlı konum paylaşıyor</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-300/80">Tam GPS Koordinatı</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={currentNav.google}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs border border-stone-700 transition-all active:scale-95 shadow"
              >
                <Navigation className="w-4 h-4 text-amber-400" />
                <span>{currentNav.isLiveGps ? "Canlı Konuma Git" : "Google Harita"}</span>
              </a>

              <a
                href={currentNav.yandex}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs border border-stone-700 transition-all active:scale-95 shadow"
              >
                <Compass className="w-4 h-4 text-red-400" />
                <span>Yandex Navigasyon</span>
              </a>
            </div>
          </div>
        )}

        {/* Giant Complete Delivery Button -> Opens Settlement Modal */}
        <button
          type="button"
          onClick={() => onOpenSettlement(currentStop)}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-stone-950 font-serif font-black text-lg sm:text-xl rounded-2xl shadow-xl shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-400/40"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>TESLİM EDİLDİ OLARAK ONAYLA</span>
        </button>
      </div>
    </div>
  );
}
