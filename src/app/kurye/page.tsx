"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { Truck, CheckCircle2, MessageCircle, AlertCircle } from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useCouriers } from "@/hooks/useCouriers";
import { usePayments } from "@/hooks/usePayments";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminOrder } from "@/types/admin";
import { PaymentMethodType } from "@/types/payment";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import { CourierHeader } from "@/components/courier/CourierHeader";
import { CourierShiftRibbon } from "@/components/courier/CourierShiftRibbon";
import { CourierActiveStopCard } from "@/components/courier/CourierActiveStopCard";
import { CourierQueueList } from "@/components/courier/CourierQueueList";
import { CourierPaymentModal } from "@/components/courier/CourierPaymentModal";

export default function CourierMobileConsolePage() {
  const { allOrders, updateOrderStatus, loading } = useAdminOrders();
  const { couriers, updateCourierLocation } = useCouriers();
  const { createPayment } = usePayments();

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedCourierId, setSelectedCourierId] = useState<string>("all");
  const [activeOrderIndex, setActiveOrderIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundAlert, setSoundAlert] = useState(true);

  // Reordering state: array of order IDs
  const [customQueueOrder, setCustomQueueOrder] = useState<string[]>([]);

  // Delivery + Payment Settlement Modal
  const [settlementOrder, setSettlementOrder] = useState<AdminOrder | null>(null);
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // GPS Tracking State
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastLocationUpdateRef = useRef<number>(0);
  const supabase = useMemo(() => createClient(), []);
  const locationChannelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // Set default courier on initial load
  useEffect(() => {
    if (couriers.length > 0 && selectedCourierId === "all") {
      const activeOne = couriers.find((c) => c.isOnShift) || couriers[0];
      if (activeOne) {
        setSelectedCourierId(activeOne.id);
      }
    }
  }, [couriers, selectedCourierId]);

  // Load custom queue order from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = `ekmeklab_courier_queue_${selectedDate}_${selectedCourierId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomQueueOrder(parsed);
        }
      }
    } catch {}
  }, [selectedDate, selectedCourierId]);

  // Save custom queue order to localStorage
  const saveQueueOrder = useCallback(
    (orderIds: string[]) => {
      setCustomQueueOrder(orderIds);
      if (typeof window !== "undefined") {
        try {
          const key = `ekmeklab_courier_queue_${selectedDate}_${selectedCourierId}`;
          localStorage.setItem(key, JSON.stringify(orderIds));
        } catch {}
      }
    },
    [selectedDate, selectedCourierId]
  );

  // Filter today's courier orders
  const courierOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const isDate = o.deliveryDate === selectedDate;
      const isCourier = o.deliveryMethod === "courier";
      const notCancelled = o.status !== "iptal";
      const matchesCourier =
        selectedCourierId === "all" ||
        o.courierId === selectedCourierId ||
        (!o.courierId && selectedCourierId === "unassigned");
      return isDate && isCourier && notCancelled && matchesCourier;
    });
  }, [allOrders, selectedDate, selectedCourierId]);

  // Pending vs Delivered
  const deliveredOrders = useMemo(
    () => courierOrders.filter((o) => o.status === "teslim_edildi"),
    [courierOrders]
  );

  // Sorted pending orders respecting customQueueOrder
  const pendingOrders = useMemo(() => {
    const uncompleted = courierOrders.filter((o) => o.status !== "teslim_edildi");
    if (customQueueOrder.length === 0) return uncompleted;

    const map = new Map(uncompleted.map((o) => [o.id, o]));
    const sorted: AdminOrder[] = [];

    // Add in saved order
    for (const id of customQueueOrder) {
      const item = map.get(id);
      if (item) {
        sorted.push(item);
        map.delete(id);
      }
    }
    // Add any newly arrived orders not in saved order list
    map.forEach((item) => sorted.push(item));
    return sorted;
  }, [courierOrders, customQueueOrder]);

  // Move stop up or down in queue
  const handleMoveStop = (orderId: string, direction: "up" | "down") => {
    const currentList = pendingOrders.map((o) => o.id);
    const index = currentList.indexOf(orderId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentList.length) return;

    const temp = currentList[index];
    currentList[index] = currentList[newIndex];
    currentList[newIndex] = temp;

    saveQueueOrder(currentList);
  };

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
      if (locationChannelRef.current && supabase) {
        supabase.removeChannel(locationChannelRef.current);
        locationChannelRef.current = null;
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
          setGpsAccuracy(Math.round(accuracy));
          setGpsActive(true);

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

          const now = Date.now();
          if (
            selectedCourierId &&
            selectedCourierId !== "all" &&
            selectedCourierId !== "unassigned" &&
            now - lastLocationUpdateRef.current > 10000
          ) {
            lastLocationUpdateRef.current = now;
            updateCourierLocation(selectedCourierId, latitude, longitude).catch(() => {});
          }

          if (supabase && isSupabaseConfigured() && selectedCourierId && selectedCourierId !== "all") {
            const channelName = `courier-location-${selectedCourierId}`;
            if (!locationChannelRef.current || locationChannelRef.current.topic !== `realtime:${channelName}`) {
              if (locationChannelRef.current) {
                supabase.removeChannel(locationChannelRef.current);
              }
              const ch = supabase.channel(channelName);
              ch.subscribe();
              locationChannelRef.current = ch;
            }

            locationChannelRef.current.send({
              type: "broadcast",
              event: "courier_location",
              payload: {
                courierId: selectedCourierId,
                lat: latitude,
                lon: longitude,
                accuracy,
                heading,
                speed,
                timestamp: Date.now(),
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
      if (locationChannelRef.current && supabase) {
        supabase.removeChannel(locationChannelRef.current);
        locationChannelRef.current = null;
      }
    };
  }, [supabase]);

  const openSettlement = (order: AdminOrder) => {
    setSettlementError(null);
    setSettlementOrder(order);
  };

  const handleConfirmDeliveryWithPayment = async (
    paymentType: "cash" | "pos" | "unpaid" | "prepaid"
  ) => {
    if (!settlementOrder) return;
    setSettling(true);
    setSettlementError(null);

    try {
      if (soundAlert && typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }

      const activeCourier = couriers.find((c) => c.id === selectedCourierId);
      const effectiveCourierId = activeCourier?.id || settlementOrder.courierId || null;

      if (paymentType === "cash") {
        await createPayment({
          orderId: settlementOrder.id,
          amount: settlementOrder.totalAmount,
          method: "cash" as PaymentMethodType,
          status: "completed",
          collectedBy: "courier",
          courierId: effectiveCourierId,
          note: `Kapıda nakit teslim alındı (${activeCourier?.displayName || "Kurye"})`,
          cariId: settlementOrder.cariId,
        });
      } else if (paymentType === "pos") {
        await createPayment({
          orderId: settlementOrder.id,
          amount: settlementOrder.totalAmount,
          method: "pos" as PaymentMethodType,
          status: "completed",
          collectedBy: "courier",
          courierId: effectiveCourierId,
          note: `Kapıda mobil POS ile çekildi (${activeCourier?.displayName || "Kurye"})`,
          cariId: settlementOrder.cariId,
        });
      } else if (paymentType === "unpaid") {
        await createPayment({
          orderId: settlementOrder.id,
          amount: 0,
          method: "cash" as PaymentMethodType,
          status: "pending",
          collectedBy: "courier",
          courierId: effectiveCourierId,
          note: "Kapıda tahsilat yapılamadı - bakiyeye/ödemeye bırakıldı",
        });
      } else if (paymentType === "prepaid") {
        await createPayment({
          orderId: settlementOrder.id,
          amount: settlementOrder.totalAmount,
          method: "cari" as PaymentMethodType,
          status: "completed",
          collectedBy: "admin",
          note: "Önceden ödendi / Cari hesap kaydı",
          cariId: settlementOrder.cariId,
        });
      }

      await updateOrderStatus(
        settlementOrder.id,
        "teslim_edildi",
        `Kurye teslim etti (${paymentType.toUpperCase()})`,
        "courier",
        effectiveCourierId || undefined,
        `Kurye teslimatı tamamladı. Tahsilat: ${paymentType}`
      );

      setSettlementOrder(null);
      setActiveOrderIndex(0);
    } catch (err: unknown) {
      console.error("Delivery confirmation error:", err);
      setSettlementError("Teslimat onaylanırken bir hata oluştu.");
    } finally {
      setSettling(false);
    }
  };

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

  const handleShareShiftWhatsApp = () => {
    const activeCourier = couriers.find((c) => c.id === selectedCourierId);
    const courierName = activeCourier ? activeCourier.displayName : "Kurye Ekibi";

    const text = `🍞 *EkmekLab Kurye Kasa Raporu*
📅 Tarih: ${selectedDate}
🛵 Kurye: ${courierName}
--------------------------
📦 Toplam Paket: ${courierOrders.length}
✅ Teslim Edilen: ${deliveredOrders.length}
⏳ Kalan Paket: ${pendingOrders.length}

💰 *Tahsilat Özeti:*
💵 Toplanan Nakit: *${totalCashCollected.toLocaleString("tr-TR")} ₺*
💳 Çekilen Mobil POS: *${totalPosCollected.toLocaleString("tr-TR")} ₺*
📊 Genel Ciro: *${(totalCashCollected + totalPosCollected).toLocaleString("tr-TR")} ₺*
--------------------------
Kasa devri için fırına teslim edilecek tutar: *${totalCashCollected.toLocaleString("tr-TR")} ₺*`;

    const url = `https://wa.me/905436329243?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#120E0B] text-foreground font-sans pb-24 selection:bg-amber-500/20 selection:text-amber-400">
      {/* 1. Header Toolbar */}
      <CourierHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        gpsActive={gpsActive}
        gpsAccuracy={gpsAccuracy}
        onToggleGps={toggleGps}
        soundAlert={soundAlert}
        onToggleSound={() => setSoundAlert(!soundAlert)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        selectedCourierId={selectedCourierId}
        onSelectCourier={setSelectedCourierId}
        couriers={couriers}
      />

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="max-w-xl mx-auto px-4 mt-3">
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{gpsError}</span>
          </div>
        </div>
      )}

      {/* 2. Shift Financial & Order Count Ribbon */}
      <CourierShiftRibbon
        deliveredCount={deliveredOrders.length}
        totalCount={courierOrders.length}
        pendingCount={pendingOrders.length}
        totalCashToCollect={totalCashToCollect}
        totalCashCollected={totalCashCollected}
        totalPosToCollect={totalPosToCollect}
        totalPosCollected={totalPosCollected}
      />

      {/* 3. Main Content Area */}
      <main className="max-w-xl mx-auto px-4 mt-4 space-y-5">
        {loading ? (
          <div className="p-16 text-center text-stone-400 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Teslimat rotası yükleniyor...</p>
          </div>
        ) : courierOrders.length === 0 ? (
          <div className="p-10 text-center bg-stone-900 border border-stone-800 rounded-3xl space-y-3">
            <Truck className="w-12 h-12 text-stone-600 mx-auto" />
            <h2 className="text-base font-bold text-stone-100 font-serif">
              Bugün İçin Teslimat Siparişi Yok
            </h2>
            <p className="text-xs text-stone-400 max-w-xs mx-auto">
              Seçilen kurye ve {selectedDate} tarihine atanmış aktif sipariş bulunmuyor.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCourierId("all")}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl text-xs"
              >
                Tüm Kuryelere Bak
              </button>
              <Link
                href="/admin/siparisler/dagitim"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-md"
              >
                <span>Dağıtım Masasına Git</span>
              </Link>
            </div>
          </div>
        ) : currentStop ? (
          /* Active Hero Delivery Card */
          <CourierActiveStopCard
            currentStop={currentStop}
            stopIndex={pendingOrders.indexOf(currentStop)}
            totalStops={pendingOrders.length}
            onOpenSettlement={openSettlement}
          />
        ) : (
          /* All deliveries completed */
          <div className="p-8 text-center bg-gradient-to-b from-stone-900 to-emerald-950/40 border border-emerald-500/40 rounded-3xl space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-serif text-stone-100">
                Tebrikler! Tüm Teslimatlar Tamamlandı
              </h2>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Bugünkü {courierOrders.length} sipariş başarıyla müşterilere ulaştırıldı.
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
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Tahsin Usta'ya Gün Sonu Kasa Raporunu Gönder</span>
            </button>
          </div>
        )}

        {/* 4. Queue of Stops */}
        <CourierQueueList
          pendingOrders={pendingOrders}
          deliveredOrders={deliveredOrders}
          currentStopId={currentStop?.id}
          onSelectStop={setActiveOrderIndex}
          onMoveStop={handleMoveStop}
          onOpenSettlement={openSettlement}
          onShareShiftWhatsApp={handleShareShiftWhatsApp}
          courierOrdersCount={courierOrders.length}
        />
      </main>

      {/* 5. Settlement / Payment Modal */}
      <CourierPaymentModal
        order={settlementOrder}
        isOpen={Boolean(settlementOrder)}
        onClose={() => setSettlementOrder(null)}
        onConfirmDelivery={handleConfirmDeliveryWithPayment}
        isSubmitting={settling}
        error={settlementError}
      />

      {/* Admin navigation bar so users don't get trapped */}
      <MobileBottomNav onOpenSidebar={() => {}} pendingOrderCount={0} />
    </div>
  );
}
