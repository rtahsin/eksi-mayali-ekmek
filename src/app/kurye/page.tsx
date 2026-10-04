"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, CheckCircle2, Printer, CalendarDays, AlertTriangle } from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { AdminOrder } from "@/types/admin";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import { CourierActiveStopCard } from "@/components/courier/CourierActiveStopCard";
import { CourierQueueList } from "@/components/courier/CourierQueueList";
import { CourierPaymentModal } from "@/components/courier/CourierPaymentModal";
import { CourierOfflineBanner } from "@/components/courier/CourierOfflineBanner";
import { DeliveryLabels } from "@/components/courier/DeliveryLabels";
import { useCourierNetwork } from "@/hooks/useCourierNetwork";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { deliverOrder, DELIVERY_PAYMENT_LABELS, type DeliveryPayment } from "@/lib/orders/delivery";
import { moveStop, sortStops } from "@/lib/delivery/maps";

const ROUTE_KEY = (date: string) => `ekmeklab_route_${date}`;

function readRoute(date: string): string[] {
  try {
    const raw = localStorage.getItem(ROUTE_KEY(date));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Teslimat ekranı (Faz 3a-2): seçilen günün teslimatları rota sırasıyla.
 * Sıra: mahalleye göre öneri + elle düzenleme (bu cihazda saklanır). Teslim → tek atomik sunucu işlemi;
 * bağlantı yoksa çevrimdışı kuyruğa alınır.
 */
export default function DeliveryConsolePage() {
  const router = useRouter();
  const { allOrders, loading, refetch: refetchOrders } = useAdminOrders();
  const { isOnline, queueLength, isSyncing, enqueueDelivery, syncQueue, syncErrors, clearSyncErrors } = useCourierNetwork();

  const today = useIstanbulToday();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [manualRoute, setManualRoute] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settlementOrder, setSettlementOrder] = useState<AdminOrder | null>(null);
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  useEffect(() => setManualRoute(readRoute(selectedDate)), [selectedDate]);

  // Çevrimdışı kuyruk: bağlantı gelince hemen, sonra 30 sn'de bir dener
  useEffect(() => {
    if (!isOnline || queueLength === 0) return;
    const run = () => {
      syncQueue().then((r) => {
        if (r.synced > 0) refetchOrders();
      });
    };
    run();
    const timer = window.setInterval(run, 30000);
    return () => window.clearInterval(timer);
  }, [isOnline, queueLength, syncQueue, refetchOrders]);

  const dayOrders = useMemo(
    () => allOrders.filter((o) => o.deliveryDate === selectedDate && o.deliveryMethod === "courier" && o.status !== "iptal"),
    [allOrders, selectedDate]
  );
  // Onaylanmamış ("bekliyor") sipariş rotaya girmez; sayısı uyarı olarak gösterilir
  const unconfirmed = dayOrders.filter((o) => o.status === "bekliyor");
  const delivered = dayOrders.filter((o) => o.status === "teslim_edildi");
  const pending = useMemo(
    () =>
      sortStops(
        dayOrders.filter((o) => o.status !== "bekliyor" && o.status !== "teslim_edildi"),
        manualRoute
      ),
    [dayOrders, manualRoute]
  );

  const activeIndex = Math.max(0, pending.findIndex((o) => o.id === activeId));
  const currentStop = pending[activeIndex] ?? null;

  const handleMove = useCallback(
    (orderId: string, direction: "up" | "down") => {
      const next = moveStop(pending.map((o) => o.id), orderId, direction);
      setManualRoute(next);
      try {
        localStorage.setItem(ROUTE_KEY(selectedDate), JSON.stringify(next));
      } catch {}
    },
    [pending, selectedDate]
  );

  const handleDeliver = async (payment: DeliveryPayment) => {
    if (!settlementOrder) return;
    setSettling(true);
    setSettlementError(null);
    const note = `Teslimat · ${DELIVERY_PAYMENT_LABELS[payment]}`;
    try {
      const res = isOnline ? await deliverOrder(settlementOrder.id, payment, note) : { ok: false, retryable: true };
      if (res.ok || res.retryable) {
        if (!res.ok) enqueueDelivery(settlementOrder.id, payment, note);
        setSettlementOrder(null);
        setActiveId(null);
        refetchOrders();
        return;
      }
      setSettlementError(`Teslim kaydedilemedi: ${res.error || "bilinmeyen hata"}`);
    } finally {
      setSettling(false);
    }
  };

  const toCollect = pending.reduce(
    (sum, o) => (o.cariId || o.paymentMethod === "cari" || o.paymentStatus === "paid" ? sum : sum + o.totalAmount),
    0
  );

  return (
    <>
      <div className="min-h-screen bg-[#120E0B] text-stone-200 pb-28 print:hidden">
        {/* Başlık + tarih */}
        <header className="sticky top-0 z-30 bg-[#120E0B]/95 backdrop-blur border-b border-[#261E17] px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-serif text-xl font-bold text-stone-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" /> Teslimat
            </h1>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={pending.length + delivered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 disabled:opacity-40"
            >
              <Printer className="w-4 h-4 text-amber-400" /> Etiket yazdır
            </button>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: "Bugün", value: today },
              { label: "Yarın", value: addDays(today, 1) },
            ].map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDate(d.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${
                  selectedDate === d.value
                    ? "bg-amber-500 text-stone-950 border-amber-500"
                    : "bg-stone-900 text-stone-300 border-stone-800"
                }`}
              >
                {d.label}
              </button>
            ))}
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 min-w-0">
              <CalendarDays className="w-4 h-4 text-stone-500 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none min-w-0"
              />
            </label>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span>{formatTrDate(selectedDate, "long")}</span>
            <span>
              {pending.length} bekleyen · {delivered.length} teslim
              {toCollect > 0 && <> · tahsil edilecek <strong className="text-amber-300">{toCollect.toLocaleString("tr-TR")} ₺</strong></>}
            </span>
          </div>
        </header>

        <CourierOfflineBanner
          isOnline={isOnline}
          queueLength={queueLength}
          isSyncing={isSyncing}
          onManualSync={() => syncQueue().then(() => refetchOrders())}
        />

        <main className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
          {syncErrors.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-1">
              <div className="font-bold">Bazı çevrimdışı teslimler kaydedilemedi:</div>
              {syncErrors.map((e) => (
                <div key={e} className="font-mono">{e}</div>
              ))}
              <button onClick={clearSyncErrors} className="mt-1 underline text-rose-300">
                Anladım
              </button>
            </div>
          )}

          {unconfirmed.length > 0 && (
            <Link
              href="/admin/siparisler"
              className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Bu gün için <strong>{unconfirmed.length}</strong> onaylanmamış sipariş var; onaylanınca rotaya girer.
              </span>
            </Link>
          )}

          {loading ? (
            <div className="py-16 text-center text-stone-500 text-sm">Yükleniyor…</div>
          ) : currentStop ? (
            <CourierActiveStopCard
              currentStop={currentStop}
              stopIndex={activeIndex}
              totalStops={pending.length}
              onOpenSettlement={(o) => {
                setSettlementError(null);
                setSettlementOrder(o);
              }}
            />
          ) : (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm text-stone-300 font-serif">
                {delivered.length > 0 ? "Bu günün teslimatları tamam." : "Bu gün için teslimat yok."}
              </p>
            </div>
          )}

          {(pending.length > 0 || delivered.length > 0) && (
            <CourierQueueList
              pendingOrders={pending}
              deliveredOrders={delivered}
              currentStopId={currentStop?.id}
              onSelectStop={(i) => setActiveId(pending[i]?.id ?? null)}
              onMoveStop={handleMove}
              onOpenSettlement={(o) => {
                setSettlementError(null);
                setSettlementOrder(o);
              }}
              totalCount={pending.length + delivered.length}
            />
          )}
        </main>

        <CourierPaymentModal
          order={settlementOrder}
          isOpen={Boolean(settlementOrder)}
          onClose={() => setSettlementOrder(null)}
          onConfirmDelivery={handleDeliver}
          isSubmitting={settling}
          error={settlementError}
        />

        <MobileBottomNav onOpenSidebar={() => router.push("/admin")} pendingOrderCount={unconfirmed.length} />
      </div>

      <DeliveryLabels orders={[...pending, ...delivered]} date={selectedDate} />
    </>
  );
}
