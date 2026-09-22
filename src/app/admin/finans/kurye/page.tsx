"use client";

import React, { useState, useMemo } from "react";
import { Truck, Calendar, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { CourierSettlementModal } from "@/components/admin/CourierSettlementModal";

export default function FinansKuryePage() {
  const { allOrders, loading } = useAdminOrders();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter orders by selected date and courier method
  const dayOrders = useMemo(() => {
    return allOrders.filter(
      (o) => o.deliveryDate === selectedDate && o.deliveryMethod === "courier"
    );
  }, [allOrders, selectedDate]);

  // Settlement Calculation
  const settlementSummary = useMemo(() => {
    let cashCollected = 0;
    let cashPending = 0;
    let posCollected = 0;
    let posPending = 0;
    let onlineTotal = 0;

    let deliveredCount = 0;
    let pendingCount = 0;

    dayOrders.forEach((o) => {
      const isDelivered = o.status === "teslim_edildi";
      
      if (isDelivered) deliveredCount++;
      else if (o.status !== "iptal") pendingCount++;

      // Kapıda Nakit
      if (o.paymentMethod === "cash_on_delivery") {
        if (isDelivered) cashCollected += o.totalAmount;
        else if (o.status !== "iptal") cashPending += o.totalAmount;
      }
      
      // Kapıda POS
      if (o.paymentMethod === "pos_at_door") {
        if (isDelivered) posCollected += o.totalAmount;
        else if (o.status !== "iptal") posPending += o.totalAmount;
      }
      
      // Online veya Havale (Kuryeyi bağlamaz, sadece bilgi)
      if (o.paymentMethod === "online" || o.paymentMethod === "transfer") {
        if (isDelivered) onlineTotal += o.totalAmount;
      }
    });

    return {
      totalOrders: dayOrders.length,
      deliveredCount,
      pendingCount,
      cashCollected,
      cashPending,
      posCollected,
      posPending,
      onlineTotal,
      grandTotal: cashCollected + cashPending + posCollected + posPending + onlineTotal,
    };
  }, [dayOrders]);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold text-stone-100 font-serif">Kurye Z Raporu</h2>
          <p className="text-xs text-stone-400">Gün sonu kurye hesaplaşması ve ciro kontrolü</p>
        </div>
        <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-stone-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-stone-200 outline-none"
          />
        </div>
      </div>

      {dayOrders.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-stone-500" />
          </div>
          <h3 className="text-stone-300 font-bold mb-1">Teslimat Bulunamadı</h3>
          <p className="text-stone-500 text-sm">Seçilen tarihte kurye teslimatlı sipariş bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 flex flex-col items-center">
          <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-4 text-emerald-500">
            <DollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-stone-300 font-bold mb-2">Günün Kurye Hesabı Hazır</h3>
          <p className="text-stone-500 text-sm text-center mb-6 max-w-md">
            Seçilen tarihteki {dayOrders.length} adet kurye teslimatlı siparişin Z Raporunu görüntüleyebilirsiniz.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-stone-950 font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Z Raporunu Görüntüle / Yazdır
          </button>
          
          <CourierSettlementModal
            date={selectedDate}
            orders={dayOrders}
            summary={settlementSummary}
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
