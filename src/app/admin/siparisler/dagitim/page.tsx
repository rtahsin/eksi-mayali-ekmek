"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useCouriers } from "@/hooks/useCouriers";
import { Truck } from "lucide-react";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { BulkLabelsModal } from "@/components/admin/BulkLabelsModal";
import { AdminOrder } from "@/types/admin";
import {
  BEYLIKDUZU_ROUTE_ORDER,
  getMapUrls,
  DagitimHeader,
  DagitimStatsBar,
  DagitimWorkloadRibbon,
  DagitimBulkActionBar,
  DagitimToolbar,
  DagitimSequenceCard,
  DagitimGroupedView,
  DagitimDispatchModal,
  DagitimRouteMapModal,
} from "@/components/admin/dagitim";

export default function DeliveryRoutePage() {
  const { allOrders, updateOrderStatus, assignCourier, loading } = useAdminOrders();
  const { couriers } = useCouriers();

  const [selectedOrderForSlip, setSelectedOrderForSlip] = useState<AdminOrder | null>(null);
  const [showBulkLabelsModal, setShowBulkLabelsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);
  const [viewMode, setViewMode] = useState<"sequence" | "grouped">("sequence");
  const [customSequence, setCustomSequence] = useState<string[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // Checkbox multi-selection for bulk courier assignment
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkAssignCourierId, setBulkAssignCourierId] = useState<string>("");

  // Batch "Dispatch All" modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchCourierId, setDispatchCourierId] = useState<string>("keep");

  // Filter orders for the selected date that require delivery
  const baseDeliveryOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.deliveryDate === selectedDate &&
        o.deliveryMethod === "courier" &&
        o.status !== "iptal"
    );
  }, [allOrders, selectedDate]);

  // Load custom sequence from localStorage when date or orders change
  useEffect(() => {
    if (typeof window === "undefined" || baseDeliveryOrders.length === 0) return;
    const storageKey = `ekmeklab_route_seq_${selectedDate}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomSequence(parsed);
          return;
        }
      } catch (e) {
        console.warn("Could not parse route sequence from storage:", e);
      }
    }
    // Default initial sequence
    setCustomSequence(baseDeliveryOrders.map((o) => o.id));
  }, [selectedDate, baseDeliveryOrders.length]);

  // Sorted delivery orders based on customSequence
  const deliveryOrders = useMemo(() => {
    if (customSequence.length === 0) return baseDeliveryOrders;
    const orderMap = new Map(baseDeliveryOrders.map((o) => [o.id, o]));
    const result: AdminOrder[] = [];

    // First add in custom order
    customSequence.forEach((id) => {
      const o = orderMap.get(id);
      if (o) {
        result.push(o);
        orderMap.delete(id);
      }
    });

    // Then any newly added orders
    orderMap.forEach((o) => {
      result.push(o);
    });

    return result;
  }, [baseDeliveryOrders, customSequence]);

  // Group orders by neighborhood
  const groupedOrders = useMemo(() => {
    const map = new Map<string, typeof deliveryOrders>();
    deliveryOrders.forEach((o) => {
      const n = o.neighborhood || "Beylikdüzü Diğer";
      if (!map.has(n)) map.set(n, []);
      map.get(n)!.push(o);
    });
    return Array.from(map.entries());
  }, [deliveryOrders]);

  // Financial and package summaries
  const totalPackages = deliveryOrders.length;
  const deliveredCount = deliveryOrders.filter((o) => o.status === "teslim_edildi").length;
  const pendingDeliveryCount = totalPackages - deliveredCount;
  const totalCashToCollect = deliveryOrders
    .filter((o) => o.paymentMethod === "cash_on_delivery" && o.status !== "teslim_edildi")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // Courier workload distribution stats
  const courierWorkloads = useMemo(() => {
    const map = new Map<
      string,
      { courierName: string; total: number; delivered: number; pending: number }
    >();

    couriers.forEach((c) => {
      map.set(c.id, {
        courierName: c.displayName,
        total: 0,
        delivered: 0,
        pending: 0,
      });
    });

    let unassignedCount = 0;

    deliveryOrders.forEach((o) => {
      if (!o.courierId) {
        unassignedCount++;
      } else {
        const item = map.get(o.courierId);
        if (item) {
          item.total++;
          if (o.status === "teslim_edildi") item.delivered++;
          else item.pending++;
        }
      }
    });

    return {
      couriersList: Array.from(map.entries()),
      unassignedCount,
    };
  }, [couriers, deliveryOrders]);

  // Save updated sequence
  const saveSequence = (newSeq: string[]) => {
    setCustomSequence(newSeq);
    if (typeof window !== "undefined") {
      localStorage.setItem(`ekmeklab_route_seq_${selectedDate}`, JSON.stringify(newSeq));
    }
  };

  // Move stop up in sequence
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newSeq = deliveryOrders.map((o) => o.id);
    const temp = newSeq[index - 1];
    newSeq[index - 1] = newSeq[index];
    newSeq[index] = temp;
    saveSequence(newSeq);
  };

  // Move stop down in sequence
  const handleMoveDown = (index: number) => {
    if (index >= deliveryOrders.length - 1) return;
    const newSeq = deliveryOrders.map((o) => o.id);
    const temp = newSeq[index + 1];
    newSeq[index + 1] = newSeq[index];
    newSeq[index] = temp;
    saveSequence(newSeq);
  };

  // Auto-sort by Beylikdüzü outbound geographical route
  const handleAutoSortBeylikduzu = () => {
    const sorted = [...baseDeliveryOrders].sort((a, b) => {
      const nA = a.neighborhood || "";
      const nB = b.neighborhood || "";

      let idxA = BEYLIKDUZU_ROUTE_ORDER.findIndex((x) =>
        nA.toLowerCase().includes(x.toLowerCase())
      );
      let idxB = BEYLIKDUZU_ROUTE_ORDER.findIndex((x) =>
        nB.toLowerCase().includes(x.toLowerCase())
      );

      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;

      if (idxA !== idxB) return idxA - idxB;
      return a.customerName.localeCompare(b.customerName);
    });

    const newSeq = sorted.map((o) => o.id);
    saveSequence(newSeq);
  };

  // Handle single order courier assignment
  const handleAssignSingleCourier = async (orderId: string, courierId: string) => {
    if (!courierId) return;
    await assignCourier(orderId, courierId);
  };

  // Toggle order checkbox
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === deliveryOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(deliveryOrders.map((o) => o.id));
    }
  };

  // Bulk assign selected orders to chosen courier
  const handleBulkAssignCourier = async () => {
    if (selectedOrderIds.length === 0 || !bulkAssignCourierId) return;

    const courierObj = couriers.find((c) => c.id === bulkAssignCourierId);
    if (
      !confirm(
        `Seçilen ${selectedOrderIds.length} siparişi "${courierObj?.displayName || "Kurye"}" kuryesine atamak ve 'Kuryede' durumuna almak istiyor musunuz?`
      )
    ) {
      return;
    }

    setIsBatchUpdating(true);
    try {
      for (const id of selectedOrderIds) {
        await assignCourier(id, bulkAssignCourierId);
      }
      setSelectedOrderIds([]);
      setBulkAssignCourierId("");
      alert(`${selectedOrderIds.length} sipariş başarıyla atandı!`);
    } catch (err) {
      console.error("Bulk assign error:", err);
      alert("Atama sırasında hata oluştu.");
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // Execute Batch Dispatch (Hepsini Yola Çıkar)
  const handleConfirmBatchDispatch = async () => {
    const eligible = deliveryOrders.filter(
      (o) => o.status !== "teslim_edildi" && o.status !== "iptal" && o.status !== "kuryede"
    );

    if (eligible.length === 0) {
      alert("Kuryeye aktarılacak bekleyen teslimat bulunmuyor.");
      setShowDispatchModal(false);
      return;
    }

    setIsBatchUpdating(true);
    try {
      for (const o of eligible) {
        if (dispatchCourierId && dispatchCourierId !== "keep") {
          await assignCourier(o.id, dispatchCourierId);
        } else {
          await updateOrderStatus(o.id, "kuryede");
        }
      }
      setShowDispatchModal(false);
      alert(`${eligible.length} adet sipariş 'Kuryede' durumuna alındı!`);
    } catch (err) {
      console.error("Batch status update error:", err);
      alert("Durum güncellenirken bir hata oluştu.");
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleShareWhatsApp = () => {
    if (deliveryOrders.length === 0) {
      alert("Bu tarihte dağıtım bulunmuyor.");
      return;
    }

    let text = `📅 *EkmekLab Dağıtım Rotası (${selectedDate})*\n`;
    text += `📦 Toplam Paket: ${totalPackages}\n`;
    text += `💰 Tahsil Edilecek Nakit: ${totalCashToCollect.toLocaleString("tr-TR")} ₺\n\n`;

    deliveryOrders.forEach((o, idx) => {
      const urls = getMapUrls(o.deliveryAddress);
      const courierObj = couriers.find((c) => c.id === o.courierId);
      let payLabel = "Ödendi / Cari";
      if (o.paymentMethod === "cash_on_delivery") payLabel = "Kapıda Nakit";
      else if (o.paymentMethod === "pos_at_door") payLabel = "Kapıda POS";

      text += `📍 *Durak #${idx + 1}: ${o.customerName}* (${o.neighborhood})\n`;
      if (courierObj) text += `🛵 Kurye: ${courierObj.displayName}\n`;
      text += `Tel: ${o.phone || "-"}\n`;
      text += `Adres: ${o.deliveryAddress}\n`;
      text += `Paket: ${o.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}\n`;
      if (o.orderNotes) {
        text += `Not: ${o.orderNotes}\n`;
      }
      text += `Tutar: ${o.totalAmount} ₺ (${payLabel})\n`;
      text += `🗺️ Navigasyon: ${urls.google}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━\nFırıncı Tahsin Usta Dağıtım Listesi`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleToggleStatus = (orderId: string, isDelivered: boolean) => {
    updateOrderStatus(orderId, isDelivered ? "kuryede" : "teslim_edildi");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Toolbar */}
      <DagitimHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onBulkLabelsOpen={() => setShowBulkLabelsModal(true)}
        onMapOpen={() => setShowRouteMapModal(true)}
        onShareWhatsApp={handleShareWhatsApp}
        onPrint={handlePrint}
      />

      {/* Summary Stat Ribbon */}
      <DagitimStatsBar
        totalPackages={totalPackages}
        pendingDeliveryCount={pendingDeliveryCount}
        deliveredCount={deliveredCount}
        totalCashToCollect={totalCashToCollect}
      />

      {/* Courier Workload Ribbon */}
      <DagitimWorkloadRibbon
        selectedDate={selectedDate}
        courierWorkloads={courierWorkloads}
      />

      {/* Floating / Sticky Bulk Assignment Action Bar */}
      <DagitimBulkActionBar
        selectedCount={selectedOrderIds.length}
        couriers={couriers}
        bulkAssignCourierId={bulkAssignCourierId}
        onCourierChange={setBulkAssignCourierId}
        onBulkAssign={handleBulkAssignCourier}
        onClearSelection={() => setSelectedOrderIds([])}
        isBatchUpdating={isBatchUpdating}
      />

      {/* Operational Controls Ribbon: View Mode Toggle & Batch Actions */}
      <DagitimToolbar
        selectedCount={selectedOrderIds.length}
        totalCount={deliveryOrders.length}
        onToggleSelectAll={handleToggleSelectAll}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAutoSortBeylikduzu={handleAutoSortBeylikduzu}
        onOpenDispatchModal={() => setShowDispatchModal(true)}
        isBatchUpdating={isBatchUpdating}
      />

      {/* Print-Only Header */}
      <div className="hidden print:block border-b pb-4 mb-4 text-black">
        <h2 className="text-xl font-bold">EKMEKLAB FIRIN KURYESİ DAĞITIM MANİFESTOSU</h2>
        <p className="text-xs">
          Tarih: {selectedDate} · Toplam Paket: {totalPackages} · Tahsil Edilecek Nakit: {totalCashToCollect} ₺
        </p>
      </div>

      {/* Main Order Views */}
      {loading ? (
        <div className="p-16 text-center text-xs text-foreground/60">Yükleniyor...</div>
      ) : deliveryOrders.length === 0 ? (
        <div className="p-12 text-center bg-[#18130F] border border-[#261E17] rounded-2xl space-y-2">
          <Truck className="w-8 h-8 text-foreground/30 mx-auto" />
          <div className="text-sm font-sans font-bold text-foreground">
            Bu tarihte ({selectedDate}) kurye teslimatı bulunmuyor
          </div>
          <div className="text-xs text-foreground/50">
            Günün siparişlerini görüntülemek için tarih seçimini değiştirebilirsiniz.
          </div>
        </div>
      ) : viewMode === "sequence" ? (
        /* Sequence View (1, 2, 3...) */
        <div className="space-y-3">
          {deliveryOrders.map((order, idx) => (
            <DagitimSequenceCard
              key={order.id}
              order={order}
              idx={idx}
              totalOrders={deliveryOrders.length}
              isSelected={selectedOrderIds.includes(order.id)}
              couriers={couriers}
              onToggleSelect={handleToggleSelectOrder}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onAssignCourier={handleAssignSingleCourier}
              onPrintSlip={setSelectedOrderForSlip}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      ) : (
        /* Grouped View by Neighborhood */
        <DagitimGroupedView
          groupedOrders={groupedOrders}
          couriers={couriers}
          onAssignCourier={handleAssignSingleCourier}
          onPrintSlip={setSelectedOrderForSlip}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Dispatch All Modal */}
      <DagitimDispatchModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        couriers={couriers}
        dispatchCourierId={dispatchCourierId}
        onDispatchCourierIdChange={setDispatchCourierId}
        onConfirm={handleConfirmBatchDispatch}
        isBatchUpdating={isBatchUpdating}
      />

      {/* Visual Live Route Map Modal */}
      <DagitimRouteMapModal
        isOpen={showRouteMapModal}
        onClose={() => setShowRouteMapModal(false)}
        selectedDate={selectedDate}
        deliveryOrders={deliveryOrders}
        couriers={couriers}
        totalCashToCollect={totalCashToCollect}
      />

      {/* Printable Thermal Slip Modal */}
      {selectedOrderForSlip && (
        <OrderSlipModal
          order={selectedOrderForSlip}
          isOpen={Boolean(selectedOrderForSlip)}
          onClose={() => setSelectedOrderForSlip(null)}
        />
      )}

      {/* Bulk Bag Labels Modal */}
      <BulkLabelsModal
        orders={deliveryOrders}
        date={selectedDate}
        isOpen={showBulkLabelsModal}
        onClose={() => setShowBulkLabelsModal(false)}
      />
    </div>
  );
}
