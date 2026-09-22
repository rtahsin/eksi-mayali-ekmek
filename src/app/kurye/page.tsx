"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Truck,
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Radio,
  Clock,
  DollarSign,
  CreditCard,
  Check,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminOrder } from "@/types/admin";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";

function extractCoordinates(address?: string): { lat: string; lon: string } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (match) {
    return { lat: match[1], lon: match[2] };
  }
  return null;
}

function getNavigationUrls(address: string) {
  const coords = extractCoordinates(address);
  const cleanAddress = address.replace(/\[📍\s*(?:GPS|Konum):[^\]]+\]/g, "").trim();
  const query = encodeURIComponent(`${cleanAddress}, Beylikdüzü, İstanbul`);

  if (coords) {
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`,
      apple: `https://maps.apple.com/?daddr=${coords.lat},${coords.lon}`,
      yandex: `https://yandex.com.tr/harita/?rtext=~${coords.lat}%2C${coords.lon}&rtt=auto`,
      coords,
    };
  }

  return {
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
    apple: `https://maps.apple.com/?q=${query}`,
    yandex: `https://yandex.com.tr/harita/?text=${query}`,
    coords: null,
  };
}

export default function CourierMobileConsolePage() {
  const { allOrders, updateOrderStatus, loading } = useAdminOrders();
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [activeOrderIndex, setActiveOrderIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundAlert, setSoundAlert] = useState(true);

  // GPS Tracking State
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Filter today's courier orders
  const courierOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.deliveryDate === selectedDate &&
        o.deliveryMethod === "courier" &&
        o.status !== "iptal"
    );
  }, [allOrders, selectedDate]);

  // Pending vs Delivered
  const deliveredOrders = useMemo(
    () => courierOrders.filter((o) => o.status === "teslim_edildi"),
    [courierOrders]
  );
  const pendingOrders = useMemo(
    () => courierOrders.filter((o) => o.status !== "teslim_edildi"),
    [courierOrders]
  );

  // Financial totals for courier shift
  const totalCashToCollect = useMemo(() => {
    return courierOrders
      .filter((o) => o.paymentMethod === "cash_on_delivery" && o.status !== "teslim_edildi")
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [courierOrders]);

  const totalPosToCollect = useMemo(() => {
    return courierOrders
      .filter((o) => o.paymentMethod === "pos_at_door" && o.status !== "teslim_edildi")
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [courierOrders]);

  const totalCashCollected = useMemo(() => {
    return deliveredOrders
      .filter((o) => o.paymentMethod === "cash_on_delivery")
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [deliveredOrders]);

  const totalPosCollected = useMemo(() => {
    return deliveredOrders
      .filter((o) => o.paymentMethod === "pos_at_door")
      .reduce((sum, o) => sum + o.totalAmount, 0);
  }, [deliveredOrders]);

  // The Active Current Stop (First pending order or selected index)
  const currentStop: AdminOrder | null = useMemo(() => {
    if (pendingOrders.length === 0) return null;
    if (activeOrderIndex >= pendingOrders.length) {
      return pendingOrders[0] || null;
    }
    return pendingOrders[activeOrderIndex] || pendingOrders[0] || null;
  }, [pendingOrders, activeOrderIndex]);

  // Start / Stop Live GPS Tracking
  const toggleGps = () => {
    if (gpsActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsActive(false);
      setGpsAccuracy(null);
    } else {
      if (!("geolocation" in navigator)) {
        setGpsError("Cihazınızda GPS / Konum desteği bulunamadı.");
        return;
      }

      setGpsError(null);
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, heading, speed } = pos.coords;
          setCurrentCoords({ lat: latitude, lon: longitude });
          setGpsAccuracy(Math.round(accuracy));
          setGpsActive(true);

          // Save to localStorage
          try {
            localStorage.setItem(
              "ekmeklab_courier_gps",
              JSON.stringify({
                lat: latitude,
                lon: longitude,
                accuracy,
                heading,
                speed,
                updatedAt: new Date().toISOString(),
              })
            );
          } catch {}

          // Broadcast via Supabase Realtime channel if available
          if (supabase && isSupabaseConfigured()) {
            const channel = supabase.channel("courier-live-location");
            channel.send({
              type: "broadcast",
              event: "location_update",
              payload: {
                lat: latitude,
                lon: longitude,
                accuracy,
                heading,
                speed,
                updatedAt: new Date().toISOString(),
              },
            });
          }
        },
        (err) => {
          console.warn("GPS watch error:", err);
          setGpsError("Konum izni verilmedi veya GPS sinyali zayıf.");
          setGpsActive(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
        }
      );
      watchIdRef.current = id;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Handle Mark as Delivered
  const handleMarkDelivered = async (orderId: string) => {
    if (soundAlert && typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch {}
    }

    await updateOrderStatus(orderId, "teslim_edildi");
    setActiveOrderIndex(0);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Share summary via WhatsApp to Tahsin Usta
  const handleShareShiftWhatsApp = () => {
    const text = [
      `🥖 *EKMEKLAB KURYE GÜN SONU KASA RAPORU*`,
      `📅 *Tarih:* ${selectedDate}`,
      `📦 *Toplam Paket:* ${courierOrders.length}`,
      `✅ *Teslim Edilen:* ${deliveredOrders.length}`,
      `⏳ *Kalan:* ${pendingOrders.length}`,
      ``,
      `💵 *Toplanan Kapıda Nakit:* ${totalCashCollected.toLocaleString("tr-TR")} ₺`,
      `💳 *Çekilen Mobil POS:* ${totalPosCollected.toLocaleString("tr-TR")} ₺`,
      `💰 *Toplam Tahsilat:* ${(totalCashCollected + totalPosCollected).toLocaleString("tr-TR")} ₺`,
      ``,
      `_EkmekLab Taş Fırın Kurye Konsolu_`,
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pb-24 font-sans selection:bg-amber-500/30">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 p-3 sm:p-4 shadow-xl">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-serif text-stone-100 flex items-center gap-1.5">
                <span>EkmekLab Kurye</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                  BEYLİKDÜZÜ
                </span>
              </h1>
              <p className="text-[11px] text-stone-400 font-mono">
                {selectedDate === new Date().toISOString().split("T")[0] ? "Bugünkü Dağıtım" : selectedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* GPS Status / Toggle */}
            <button
              type="button"
              onClick={toggleGps}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                gpsActive
                  ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-950/50"
                  : "bg-stone-800 border border-stone-700 text-stone-300 hover:text-white"
              }`}
              title="Canlı GPS Konum Paylaşımını Başlat / Durdur"
            >
              <Radio className={`w-3.5 h-3.5 ${gpsActive ? "animate-pulse text-emerald-400" : "text-stone-400"}`} />
              <span>{gpsActive ? `GPS Açık (±${gpsAccuracy}m)` : "GPS Başlat"}</span>
            </button>

            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => setSoundAlert(!soundAlert)}
              className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700"
              title="Ses ve Titreşim Bildirimi"
            >
              {soundAlert ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700"
              title="Tam Ekran"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="max-w-xl mx-auto px-4 mt-3">
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{gpsError}</span>
          </div>
        </div>
      )}

      {/* Shift Overview Ribbon */}
      <div className="max-w-xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-3 gap-2 bg-stone-900 border border-stone-800 p-3 rounded-2xl text-center shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Teslimat</div>
            <div className="text-base font-bold font-mono text-stone-100 mt-0.5">
              <span className="text-emerald-400">{deliveredOrders.length}</span>
              <span className="text-stone-500"> / </span>
              <span>{courierOrders.length}</span>
            </div>
            <div className="text-[10px] text-stone-400 font-sans">
              {pendingOrders.length} paket kaldı
            </div>
          </div>

          <div className="border-x border-stone-800">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Kalan Nakit</div>
            <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
              {totalCashToCollect.toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-[10px] text-stone-400 font-sans">
              Alınan: {totalCashCollected} ₺
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Kalan POS</div>
            <div className="text-base font-bold font-mono text-blue-400 mt-0.5">
              {totalPosToCollect.toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-[10px] text-stone-400 font-sans">
              Çekilen: {totalPosCollected} ₺
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-4 mt-4 space-y-5">
        {loading ? (
          <div className="p-16 text-center text-stone-400 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Teslimat rotası yükleniyor...</p>
          </div>
        ) : courierOrders.length === 0 ? (
          <div className="p-12 text-center bg-stone-900 border border-stone-800 rounded-3xl space-y-3">
            <Truck className="w-12 h-12 text-stone-600 mx-auto" />
            <h2 className="text-base font-bold text-stone-100 font-serif">
              Bugün İçin Teslimat Siparişi Yok
            </h2>
            <p className="text-xs text-stone-400 max-w-xs mx-auto">
              {selectedDate} tarihine atanmış aktif kurye dağıtımı bulunmuyor.
            </p>
            <Link
              href="/admin/siparisler"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs"
            >
              <span>Siparişler Masasına Dön</span>
            </Link>
          </div>
        ) : currentStop ? (
          /* ========================================================================= */
          /* HERO CARD: SIRADAKİ TESLİMAT */
          /* ========================================================================= */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>SIRADAKİ TESLİMAT DURAK {courierOrders.indexOf(currentStop) + 1} / {courierOrders.length}</span>
              </span>
              <span className="text-stone-400 font-mono text-[11px]">
                #{currentStop.orderNumber || currentStop.id.slice(-6)}
              </span>
            </div>

            {/* Giant Active Card */}
            <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-[#1e1712] border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              {/* Customer & Phone Bar */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-amber-500/90 uppercase tracking-wider">
                    {currentStop.neighborhood || "Beylikdüzü"}
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
              <div className="rounded-2xl p-3.5 border flex items-center justify-between gap-3 shadow-inner">
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
              {(() => {
                const nav = getNavigationUrls(currentStop.deliveryAddress);
                return (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <a
                      href={nav.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs border border-stone-700 transition-all active:scale-95 shadow"
                    >
                      <Navigation className="w-4 h-4 text-amber-400" />
                      <span>Google Harita</span>
                    </a>

                    <a
                      href={nav.yandex}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs border border-stone-700 transition-all active:scale-95 shadow"
                    >
                      <Compass className="w-4 h-4 text-red-400" />
                      <span>Yandex Navigasyon</span>
                    </a>
                  </div>
                );
              })()}

              {/* Giant Complete Delivery Button */}
              <button
                type="button"
                onClick={() => handleMarkDelivered(currentStop.id)}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-stone-950 font-serif font-black text-lg sm:text-xl rounded-2xl shadow-xl shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-emerald-400/40"
              >
                <Check className="w-6 h-6 stroke-[3]" />
                <span>TESLİM EDİLDİ OLARAK ONAYLA</span>
              </button>
            </div>
          </div>
        ) : (
          /* All deliveries completed */
          <div className="p-8 text-center bg-gradient-to-b from-stone-900 to-emerald-950/40 border border-emerald-500/40 rounded-3xl space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-serif text-stone-100">
                Tebrikler! Günün Tüm Teslimatları Tamamlandı
              </h2>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Toplam {courierOrders.length} sipariş başarıyla müşterilere teslim edildi.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[10px] uppercase text-stone-400 font-bold">Toplanan Nakit</div>
                <div className="text-lg font-bold font-mono text-amber-400">{totalCashCollected} ₺</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-stone-400 font-bold">Çekilen Mobil POS</div>
                <div className="text-lg font-bold font-mono text-blue-400">{totalPosCollected} ₺</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleShareShiftWhatsApp}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Tahsin Usta'ya Gün Sonu Kasa Raporunu Gönder</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ALL STOPS LIST (Durak Sıralaması & Atlama) */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-stone-300 font-serif">Günün Tüm Durakları ({courierOrders.length})</span>
            <span className="text-stone-500 text-[11px]">Durak atlamak için tıklayın</span>
          </div>

          <div className="space-y-2">
            {courierOrders.map((order, idx) => {
              const isDelivered = order.status === "teslim_edildi";
              const isCurrent = currentStop?.id === order.id;

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    if (!isDelivered) {
                      const pIdx = pendingOrders.findIndex((o) => o.id === order.id);
                      if (pIdx !== -1) setActiveOrderIndex(pIdx);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10"
                      : isDelivered
                      ? "bg-stone-900/40 border-stone-800/60 opacity-60"
                      : "bg-stone-900/80 border-stone-800 hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                          isDelivered
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : isCurrent
                            ? "bg-amber-500 text-stone-950 font-bold"
                            : "bg-stone-800 text-stone-400"
                        }`}
                      >
                        {isDelivered ? "✓" : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-200 truncate">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {order.neighborhood} · {order.deliveryAddress}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-stone-100">
                        {order.totalAmount} ₺
                      </div>
                      <div className="text-[10px]">
                        {order.paymentMethod === "cash_on_delivery" ? (
                          <span className="text-amber-400 font-semibold">Nakit</span>
                        ) : order.paymentMethod === "pos_at_door" ? (
                          <span className="text-blue-400 font-semibold">POS</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Ödendi</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Shift Summary Button */}
        {courierOrders.length > 0 && (
          <div className="pt-4 pb-20">
            <button
              type="button"
              onClick={handleShareShiftWhatsApp}
              className="w-full py-3 px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Gün Sonu Kurye Raporunu WhatsApp ile Paylaş</span>
            </button>
          </div>
        )}
      </main>
      
      {/* Admin navigation bar so users don't get trapped */}
      <MobileBottomNav onOpenSidebar={() => {}} pendingOrderCount={0} />
    </div>
  );
}
