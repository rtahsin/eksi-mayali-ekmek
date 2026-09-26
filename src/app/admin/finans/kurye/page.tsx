"use client";

import React, { useState, useMemo } from "react";
import { Truck, Calendar, DollarSign, Loader2, CheckCircle2, User, MessageCircle, AlertCircle } from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useCouriers } from "@/hooks/useCouriers";
import { usePayments } from "@/hooks/usePayments";
import { CourierSettlementModal } from "@/components/admin/CourierSettlementModal";

export default function FinansKuryePage() {
  const { allOrders, loading: ordersLoading } = useAdminOrders();
  const { couriers, loading: couriersLoading } = useCouriers();
  const { payments, loading: paymentsLoading } = usePayments();

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [selectedCourierId, setSelectedCourierId] = useState<string>("all");
  const [handoverCashInput, setHandoverCashInput] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);

  // Filter orders by selected date and courier method
  const dayOrders = useMemo(() => {
    return allOrders.filter((o) => {
      const isDate = o.deliveryDate === selectedDate;
      const isCourier = o.deliveryMethod === "courier";
      const matchesCourier =
        selectedCourierId === "all" || o.courierId === selectedCourierId;
      return isDate && isCourier && matchesCourier;
    });
  }, [allOrders, selectedDate, selectedCourierId]);

  // Payments for this date and courier from the payments table
  const dayPayments = useMemo(() => {
    return payments.filter((p) => {
      const paidDate = p.paidAt ? p.paidAt.split("T")[0] : p.createdAt.split("T")[0];
      const isDate = paidDate === selectedDate;
      const matchesCourier =
        selectedCourierId === "all" || p.courierId === selectedCourierId;
      return isDate && matchesCourier;
    });
  }, [payments, selectedDate, selectedCourierId]);

  // Settlement Calculation based on payments table + orders reconciliation
  const settlementSummary = useMemo(() => {
    // 1. Direct from payments table
    const completedPayments = dayPayments.filter((p) => p.status === "completed");
    const cashCollected = completedPayments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + p.amount, 0);
    const posCollected = completedPayments
      .filter((p) => p.method === "pos")
      .reduce((sum, p) => sum + p.amount, 0);
    const onlineTotal = completedPayments
      .filter((p) => p.method === "online_card" || p.method === "transfer" || p.method === "cari")
      .reduce((sum, p) => sum + p.amount, 0);

    // 2. Pending amounts from orders that haven't been delivered/paid
    let cashPending = 0;
    let posPending = 0;
    let deliveredCount = 0;
    let pendingCount = 0;

    dayOrders.forEach((o) => {
      const isDelivered = o.status === "teslim_edildi";
      if (isDelivered) {
        deliveredCount++;
      } else if (o.status !== "iptal") {
        pendingCount++;
        if (o.paymentMethod === "cash_on_delivery") {
          cashPending += o.totalAmount;
        } else if (o.paymentMethod === "pos_at_door") {
          posPending += o.totalAmount;
        }
      }
    });

    const grandTotal = cashCollected + posCollected + onlineTotal;
    const handoverCash = parseFloat(handoverCashInput) || 0;
    const cashDifference = handoverCashInput !== "" ? handoverCash - cashCollected : 0;

    return {
      totalOrders: dayOrders.length,
      deliveredCount,
      pendingCount,
      cashCollected,
      cashPending,
      posCollected,
      posPending,
      onlineTotal,
      grandTotal,
      handoverCash,
      cashDifference,
    };
  }, [dayOrders, dayPayments, handoverCashInput]);

  const selectedCourierObj = useMemo(() => {
    return couriers.find((c) => c.id === selectedCourierId);
  }, [couriers, selectedCourierId]);

  // WhatsApp Reconciliation Message
  const handleShareReconciliationWhatsApp = () => {
    const courierTitle = selectedCourierObj ? selectedCourierObj.displayName : "Tüm Kuryeler";
    const text = [
      `🍞 *EKMEKLAB GÜN SONU Z RAPORU & KASA MUTABAKATI*`,
      `📅 *Tarih:* ${selectedDate}`,
      `🛵 *Kurye:* ${courierTitle}`,
      `📦 *Teslimat Sayısı:* ${settlementSummary.deliveredCount} / ${settlementSummary.totalOrders} paket`,
      ``,
      `💵 *Kasadaki Nakit Tahsilat:* ${settlementSummary.cashCollected.toLocaleString("tr-TR")} ₺`,
      `💳 *Mobil POS Tahsilat:* ${settlementSummary.posCollected.toLocaleString("tr-TR")} ₺`,
      `🌐 *Online / Cari:* ${settlementSummary.onlineTotal.toLocaleString("tr-TR")} ₺`,
      `💰 *Toplam Günlük Ciro:* ${settlementSummary.grandTotal.toLocaleString("tr-TR")} ₺`,
      ``,
      handoverCashInput !== ""
        ? `🤝 *Kuryeden Teslim Alınan Nakit:* ${settlementSummary.handoverCash.toLocaleString("tr-TR")} ₺\n⚖️ *Kasa Farkı:* ${settlementSummary.cashDifference >= 0 ? "+" : ""}${settlementSummary.cashDifference.toLocaleString("tr-TR")} ₺ (${settlementSummary.cashDifference === 0 ? "KASA TAM ✅" : settlementSummary.cashDifference > 0 ? "FAZLA VAR" : "AÇIK VAR ⚠️"})`
        : `_Kasa teslimatı bekleniyor_`,
      ``,
      `_EkmekLab Muhasebe & Kurye Masası_`,
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const loading = ordersLoading || couriersLoading || paymentsLoading;

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-4">
        <div>
          <h2 className="text-lg font-bold text-stone-100 font-serif">Kurye Z Raporu</h2>
          <p className="text-xs text-stone-400">
            Gün sonu kurye hesaplaşması, payments tablosu dökümü ve kasa mutabakatı
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Courier Selector */}
          <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-200 outline-none"
            >
              <option value="all">Tüm Kuryeler</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName} ({c.vehicleType === "motorcycle" ? "Moto" : "Araba"})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-200 outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {dayOrders.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-stone-500" />
          </div>
          <h3 className="text-stone-300 font-bold mb-1">Teslimat Bulunamadı</h3>
          <p className="text-stone-500 text-sm">
            Seçilen kurye ve {selectedDate} tarihinde kurye teslimatlı sipariş bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Summary Cards */}
          <div className="lg:col-span-2 space-y-4">
            {/* KPI Ribbon */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
                <div className="text-[11px] font-bold uppercase text-stone-400">Teslimat</div>
                <div className="text-2xl font-bold font-mono text-stone-100 mt-1">
                  <span className="text-emerald-400">{settlementSummary.deliveredCount}</span>
                  <span className="text-stone-500"> / </span>
                  <span>{settlementSummary.totalOrders}</span>
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {settlementSummary.pendingCount} bekleyen paket
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
                <div className="text-[11px] font-bold uppercase text-amber-400">Tahsil Edilen Nakit</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {settlementSummary.cashCollected.toLocaleString("tr-TR")} ₺
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Bekleyen: {settlementSummary.cashPending.toLocaleString("tr-TR")} ₺
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800">
                <div className="text-[11px] font-bold uppercase text-blue-400">Çekilen Mobil POS</div>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {settlementSummary.posCollected.toLocaleString("tr-TR")} ₺
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Bekleyen: {settlementSummary.posPending.toLocaleString("tr-TR")} ₺
                </div>
              </div>
            </div>

            {/* Reconciliation Box */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold font-serif text-stone-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Kasa Kapatma & Kuryeden Nakit Teslim Alma</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    Kuryenin Teslim Ettiği Nakit (₺):
                  </label>
                  <input
                    type="number"
                    value={handoverCashInput}
                    onChange={(e) => setHandoverCashInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="text-xs text-stone-400 mb-1">Kasa Durumu & Fark:</div>
                  <div
                    className={`p-2.5 rounded-xl border font-mono text-sm font-bold flex items-center justify-between ${
                      handoverCashInput === ""
                        ? "bg-stone-950 border-stone-800 text-stone-500"
                        : settlementSummary.cashDifference === 0
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                        : settlementSummary.cashDifference > 0
                        ? "bg-blue-950/40 border-blue-500/40 text-blue-400"
                        : "bg-red-950/40 border-red-500/40 text-red-400"
                    }`}
                  >
                    <span>
                      {handoverCashInput === ""
                        ? "Giriş Bekleniyor"
                        : settlementSummary.cashDifference === 0
                        ? "Kasa Tam ✓"
                        : settlementSummary.cashDifference > 0
                        ? "Kasa Fazlası"
                        : "Kasa Açığı ⚠️"}
                    </span>
                    <span>
                      {handoverCashInput !== ""
                        ? `${settlementSummary.cashDifference >= 0 ? "+" : ""}${settlementSummary.cashDifference.toLocaleString("tr-TR")} ₺`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                Z Raporunu Görüntüle / Yazdır
              </button>

              <button
                type="button"
                onClick={handleShareReconciliationWhatsApp}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Mutabakat Raporunu WhatsApp ile Gönder</span>
              </button>
            </div>
          </div>

          {/* Right Column: Order List Sidebar */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-stone-300 font-serif flex items-center justify-between">
              <span>Sipariş Dökümü ({dayOrders.length})</span>
              <span className="text-[11px] font-mono text-amber-400">
                {settlementSummary.grandTotal.toLocaleString("tr-TR")} ₺
              </span>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {dayOrders.map((o) => {
                const isDelivered = o.status === "teslim_edildi";
                return (
                  <div
                    key={o.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isDelivered
                        ? "bg-stone-950/60 border-stone-800/80"
                        : "bg-amber-500/5 border-amber-500/20"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-stone-200 truncate">{o.customerName}</div>
                      <div className="text-[10px] text-stone-500 truncate">
                        #{o.orderNumber || o.id.slice(-6)} · {o.neighborhood}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-stone-100">{o.totalAmount} ₺</div>
                      <div className="text-[10px]">
                        {o.paymentMethod === "cash_on_delivery" ? (
                          <span className="text-amber-400 font-semibold">Nakit</span>
                        ) : o.paymentMethod === "pos_at_door" ? (
                          <span className="text-blue-400 font-semibold">POS</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">Ödendi</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Printable Z-Report Modal */}
      <CourierSettlementModal
        date={selectedDate}
        orders={dayOrders}
        summary={settlementSummary}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
