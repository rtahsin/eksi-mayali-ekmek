"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useCouriers } from "@/hooks/useCouriers";
import {
  Truck,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Printer,
  Calendar,
  DollarSign,
  MessageCircle,
  Package,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Map as MapIcon,
  X,
  Compass,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Tag,
  ListOrdered,
  Layers,
  Send,
  UserCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  User,
} from "lucide-react";
import Link from "next/link";
import { OrderSlipModal } from "@/components/admin/OrderSlipModal";
import { BulkLabelsModal } from "@/components/admin/BulkLabelsModal";
import { AdminOrder } from "@/types/admin";

const BEYLIKDUZU_ROUTE_ORDER = [
  "Yakuplu",
  "Marmara",
  "Barış",
  "Cumhuriyet",
  "Büyükşehir",
  "Adnan Kahveci",
  "Gürpınar",
  "Dereağzı",
  "Kavaklı",
  "Sahil",
  "Beylikdüzü OSB",
];

function extractCoordinates(address?: string): { lat: string; lon: string } | null {
  if (!address) return null;
  const match = address.match(/(?:GPS|Konum):\s*([0-9.]+),\s*([0-9.]+)/i);
  if (match) {
    return { lat: match[1], lon: match[2] };
  }
  return null;
}

function getMapUrls(address: string) {
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

    // Initial setup for existing couriers
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/siparisler"
            className="p-2 rounded-xl bg-[#1A1410] border border-[#2F241D] text-foreground/70 hover:text-artisan-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Kurye Dağıtım & Rota Masası
            </h1>
            <p className="text-xs text-foreground/60 font-sans mt-0.5">
              Beylikdüzü mahalle bazlı sıralı teslimat rotası, kurye atama ve canlı navigasyon
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-xs text-foreground font-mono focus:outline-none focus:border-artisan-gold"
          />

          {/* Courier Console Link */}
          <Link
            href="/kurye"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-sans font-bold shadow-md shadow-amber-500/20 transition-all"
            title="Kurye Mobil Konsolunu Başlat"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>🛵 Kurye Konsolu</span>
          </Link>

          {/* Bulk Labels Modal Button */}
          <button
            type="button"
            onClick={() => setShowBulkLabelsModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#221A14] hover:bg-[#2C211A] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
            title="Torba ve Paket Etiketlerini Toplu Yazdır"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paket Etiketleri</span>
          </button>

          {/* Live Map Button */}
          <button
            type="button"
            onClick={() => setShowRouteMapModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-sans font-bold transition-all"
            title="Canlı Harita Görünümünü Aç"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Harita</span>
          </button>

          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-xs font-sans font-medium transition-all"
            title="Rotayı ve Harita Linklerini Kuryeye Gönder"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Print Manifest */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#221A14] hover:bg-[#2C211A] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <Package className="w-3.5 h-3.5 text-artisan-gold" />
            <span>Toplam Paket</span>
          </div>
          <div className="font-serif text-xl font-bold text-foreground mt-0.5">{totalPackages}</div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Kalan Teslimat</span>
          </div>
          <div className="font-serif text-xl font-bold text-blue-400 mt-0.5">
            {pendingDeliveryCount}
          </div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Teslim Edilen</span>
          </div>
          <div className="font-serif text-xl font-bold text-emerald-400 mt-0.5">
            {deliveredCount}
          </div>
        </div>

        <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-[11px] font-sans text-foreground/60">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Kapıda Tahsilat (Nakit)</span>
          </div>
          <div className="font-serif text-xl font-bold text-amber-400 mt-0.5 font-mono">
            {totalCashToCollect.toLocaleString("tr-TR")} ₺
          </div>
        </div>
      </div>

      {/* Courier Workload Ribbon (Kurye Görev Yükü Dağılımı) */}
      <div className="bg-[#18130F] border border-[#261E17] p-4 rounded-2xl space-y-2.5 print:hidden shadow-lg">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span className="font-serif font-bold text-stone-200">
              Kurye Görev Yükü Dağılımı ({selectedDate})
            </span>
          </div>
          <Link
            href="/admin/kurye/yonetim"
            className="text-[11px] text-amber-400 hover:underline"
          >
            Kuryeleri Yönet →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {courierWorkloads.couriersList.map(([cId, item]) => (
            <div
              key={cId}
              className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-stone-200 truncate">{item.courierName}</div>
                <div className="text-[10px] text-stone-400">
                  {item.delivered} teslim · {item.pending} bekliyor
                </div>
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-amber-400 text-xs shrink-0">
                {item.total}
              </div>
            </div>
          ))}

          {/* Unassigned count alert box */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
              courierWorkloads.unassignedCount > 0
                ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                : "bg-stone-900/40 border-stone-800/60 text-stone-500"
            }`}
          >
            <div className="min-w-0">
              <div className="font-bold flex items-center gap-1">
                {courierWorkloads.unassignedCount > 0 && (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span>Atanmamış Paket</span>
              </div>
              <div className="text-[10px] opacity-80">Kurye bekliyor</div>
            </div>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                courierWorkloads.unassignedCount > 0
                  ? "bg-rose-500 text-stone-950"
                  : "bg-stone-800 text-stone-400"
              }`}
            >
              {courierWorkloads.unassignedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Assignment Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="sticky top-4 z-30 p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 to-[#1e1712] border-2 border-amber-500/60 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold font-mono flex items-center justify-center">
              {selectedOrderIds.length}
            </span>
            <span className="font-bold text-stone-100">sipariş seçildi</span>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-[11px] text-stone-400 hover:text-stone-200 underline ml-2"
            >
              Seçimi Temizle
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkAssignCourierId}
              onChange={(e) => setBulkAssignCourierId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">Kurye Seçiniz...</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName} ({c.vehicleType === "motorcycle" ? "Moto" : "Araba"})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!bulkAssignCourierId || isBatchUpdating}
              onClick={handleBulkAssignCourier}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-bold transition-all shadow"
            >
              Seçilenleri Ata & Yola Çıkar
            </button>
          </div>
        </div>
      )}

      {/* Operational Controls Ribbon: View Mode Toggle & Batch Actions */}
      <div className="bg-[#18130F] border border-[#261E17] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden shadow-lg">
        {/* View Mode Switcher + Select All */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-medium"
            title="Tümünü Seç / Seçimi Kaldır"
          >
            {selectedOrderIds.length === deliveryOrders.length && deliveryOrders.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-stone-500" />
            )}
            <span>Tümü ({deliveryOrders.length})</span>
          </button>

          <div className="flex items-center gap-1 bg-[#120E0B] p-1 rounded-xl border border-[#2A201A]">
            <button
              type="button"
              onClick={() => setViewMode("sequence")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "sequence"
                  ? "bg-amber-500 text-stone-950 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Sıralı Rota (1, 2, 3...)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "grouped"
                  ? "bg-amber-500 text-stone-950 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mahalle Grupları</span>
            </button>
          </div>
        </div>

        {/* Optimization & Batch Actions */}
        <div className="flex items-center gap-2">
          {viewMode === "sequence" && (
            <button
              type="button"
              onClick={handleAutoSortBeylikduzu}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Beylikdüzü coğrafi güzergahına göre otomatik sırala"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>🧭 Beylikdüzü Rota Sırasına Göre Diz</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDispatchModal(true)}
            disabled={isBatchUpdating}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Hazırlanan tüm siparişleri kurye seçerek yola çıkar"
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>🚀 Hepsini Yola Çıkar</span>
          </button>
        </div>
      </div>

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
          {deliveryOrders.map((order, idx) => {
            const isDelivered = order.status === "teslim_edildi";
            const isSelected = selectedOrderIds.includes(order.id);
            const urls = getMapUrls(order.deliveryAddress);
            const assignedCourier = couriers.find((c) => c.id === order.courierId);

            // Estimated arrival (starting at 14:00, +15 mins each)
            const startHour = 14;
            const totalMinutes = idx * 15;
            const etaHour = startHour + Math.floor(totalMinutes / 60);
            const etaMin = totalMinutes % 60;
            const etaFormatted = `${String(etaHour).padStart(2, "0")}:${String(etaMin).padStart(
              2,
              "0"
            )}`;

            return (
              <div
                key={order.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDelivered
                    ? "bg-[#14100D] border-stone-800/60 opacity-60"
                    : isSelected
                    ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
                    : "bg-[#18130F] border-[#261E17] hover:border-stone-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Checkbox + Reorder Controls + Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelectOrder(order.id)}
                      className="mt-1 text-stone-400 hover:text-amber-400 print:hidden"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-600" />
                      )}
                    </button>

                    {/* Move Up/Down Controls */}
                    <div className="flex flex-col items-center gap-1 shrink-0 print:hidden">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 disabled:opacity-30 transition-colors"
                        title="Yukarı Taşı"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === deliveryOrders.length - 1}
                        className="p-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 disabled:opacity-30 transition-colors"
                        title="Aşağı Taşı"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif font-bold text-sm text-foreground">
                          {order.customerName}
                        </span>
                        <span className="text-xs font-mono text-stone-400">
                          (#{order.orderNumber || order.id.slice(-6)})
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                          {order.neighborhood}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400/90 font-bold">
                          ⏱️ Tahmini: ~{etaFormatted}
                        </span>
                        {urls.coords && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            📍 GPS
                          </span>
                        )}

                        {/* Courier Badge or Dropdown */}
                        <div className="print:hidden">
                          <select
                            value={order.courierId || ""}
                            onChange={(e) => handleAssignSingleCourier(order.id, e.target.value)}
                            className={`text-[11px] px-2 py-0.5 rounded-lg border focus:outline-none transition-colors ${
                              assignedCourier
                                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                                : "bg-stone-900 border-amber-500/30 text-amber-400/80 hover:border-amber-400"
                            }`}
                          >
                            <option value="">Kurye Ata...</option>
                            {couriers.map((c) => (
                              <option key={c.id} value={c.id}>
                                🛵 {c.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-stone-300 font-sans leading-relaxed select-all">
                        {order.deliveryAddress}
                      </div>

                      <div className="text-xs text-stone-400 font-sans">
                        <strong className="text-stone-300">Paket:</strong>{" "}
                        {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                      </div>

                      {order.orderNotes && (
                        <div className="text-[11px] text-amber-300/90 italic">
                          Not: {order.orderNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800">
                    <div className="text-right">
                      <div className="font-serif text-base font-bold text-foreground">
                        {order.totalAmount} ₺
                      </div>
                      <div className="text-[11px]">
                        {order.paymentMethod === "cash_on_delivery" ? (
                          <span className="text-amber-400 font-bold">Kapıda Nakit</span>
                        ) : order.paymentMethod === "pos_at_door" ? (
                          <span className="text-blue-400">Kapıda POS</span>
                        ) : (
                          <span className="text-emerald-400">Ödendi / Cari</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 print:hidden">
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                          title="Müşteriyi Ara"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <a
                        href={urls.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs flex items-center gap-1 transition-colors"
                        title="Google Navigasyon"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Navigasyon</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForSlip(order)}
                        className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-400 hover:bg-stone-800 transition-colors"
                        title="Paket Fişi / Etiket Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateOrderStatus(
                            order.id,
                            isDelivered ? "kuryede" : "teslim_edildi"
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isDelivered
                            ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                            : "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm"
                        }`}
                      >
                        {isDelivered ? "Teslim Edildi ✓" : "Teslim Et"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grouped View by Neighborhood */
        <div className="space-y-6">
          {groupedOrders.map(([neighborhood, orders]) => (
            <div
              key={neighborhood}
              className="bg-[#18130F] border border-[#261E17] rounded-2xl overflow-hidden print:border-black print:bg-white"
            >
              <div className="bg-[#201812] px-4 py-3 border-b border-[#261E17] flex items-center justify-between print:bg-gray-100 print:text-black">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-artisan-gold print:text-black" />
                  <span className="font-serif font-bold text-sm text-foreground print:text-black">
                    {neighborhood}
                  </span>
                </div>
                <div className="text-xs font-sans text-artisan-gold font-mono print:text-black">
                  {orders.length} Adres / Paket
                </div>
              </div>

              <div className="divide-y divide-[#261E17] print:divide-black">
                {orders.map((order, idx) => {
                  const isDelivered = order.status === "teslim_edildi";
                  const urls = getMapUrls(order.deliveryAddress);
                  const assignedCourier = couriers.find((c) => c.id === order.courierId);

                  return (
                    <div
                      key={order.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        isDelivered ? "opacity-60 bg-emerald-950/10" : "hover:bg-[#1E1611]"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#291F18] flex items-center justify-center text-[10px] font-mono text-artisan-gold font-bold shrink-0 print:border print:border-black print:text-black">
                            {idx + 1}
                          </span>
                          <span className="font-serif font-bold text-sm text-foreground print:text-black">
                            {order.customerName}
                          </span>
                          <span className="text-xs font-mono text-foreground/50">
                            (#{order.orderNumber || order.id.slice(-6)})
                          </span>

                          {/* Courier Dropdown */}
                          <div className="print:hidden">
                            <select
                              value={order.courierId || ""}
                              onChange={(e) => handleAssignSingleCourier(order.id, e.target.value)}
                              className={`text-[11px] px-2 py-0.5 rounded-lg border focus:outline-none transition-colors ${
                                assignedCourier
                                  ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                                  : "bg-stone-900 border-amber-500/30 text-amber-400/80 hover:border-amber-400"
                              }`}
                            >
                              <option value="">Kurye Ata...</option>
                              {couriers.map((c) => (
                                <option key={c.id} value={c.id}>
                                  🛵 {c.displayName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {order.phone && (
                            <a
                              href={`tel:${order.phone}`}
                              className="text-artisan-gold hover:underline text-xs font-mono flex items-center gap-1 print:text-black"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{order.phone}</span>
                            </a>
                          )}

                          {urls.coords && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              📍 GPS
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-foreground/80 font-sans pl-7 leading-relaxed print:text-black select-all">
                          {order.deliveryAddress}
                        </div>

                        <div className="text-xs text-foreground/60 pl-7 font-sans print:text-black">
                          <strong className="text-foreground/80 print:text-black">Paket:</strong>{" "}
                          {order.items.map((it) => `${it.quantity}x ${it.productName}`).join(", ")}
                        </div>

                        {order.orderNotes && (
                          <div className="text-[11px] text-amber-300/90 pl-7 italic print:text-black">
                            Not: {order.orderNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#261E17]">
                        <div className="text-right">
                          <div className="font-serif text-base font-bold text-foreground print:text-black">
                            {order.totalAmount} ₺
                          </div>
                          <div className="text-[11px] font-sans">
                            {order.paymentMethod === "cash_on_delivery" ? (
                              <span className="text-amber-400 font-bold print:text-black">Kapıda Nakit</span>
                            ) : order.paymentMethod === "pos_at_door" ? (
                              <span className="text-blue-400 print:text-black">Kapıda POS</span>
                            ) : (
                              <span className="text-emerald-400 print:text-black">Ödendi / Cari</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 print:hidden">
                          <a
                            href={urls.google}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-sans flex items-center gap-1 transition-colors border border-amber-500/30"
                            title="Google Haritalar"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Navigasyon</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderForSlip(order)}
                            className="p-2 rounded-xl bg-[#241A13] hover:bg-[#302218] text-artisan-gold text-xs font-sans flex items-center gap-1.5 transition-colors border border-[#34241A]"
                            title="Paket Fişi / Etiket Yazdır"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateOrderStatus(
                                order.id,
                                isDelivered ? "kuryede" : "teslim_edildi"
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-serif font-bold transition-all ${
                              isDelivered
                                ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                                : "bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground shadow-sm"
                            }`}
                          >
                            {isDelivered ? "Teslim Edildi ✓" : "Teslim Et"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch All Modal (Hepsini Yola Çıkar Seçimi) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Toplu Dağıtım Onayı
                </span>
                <h3 className="text-lg font-bold font-serif text-stone-100 mt-0.5">
                  Hepsini Yola Çıkar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Hazırlanmış ve bekleyen tüm siparişler <strong>'Kuryede'</strong> durumuna alınacak ve müşterilere canlı takip açılacaktır. Hangi kuryeye atanmasını istersiniz?
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400">Kurye Seçimi:</label>
              <select
                value={dispatchCourierId}
                onChange={(e) => setDispatchCourierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="keep">Mevcut Atanmış Kuryeleri Koru (Değiştirme)</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    Tümünü "{c.displayName}" Kuryesine Ata ({c.vehicleType === "motorcycle" ? "Moto" : "Araba"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-medium hover:bg-stone-700"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={isBatchUpdating}
                onClick={handleConfirmBatchDispatch}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow"
              >
                {isBatchUpdating ? "Güncelleniyor..." : "Yola Çıkışı Onayla 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Live Route Map Modal */}
      {showRouteMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-serif font-bold text-stone-100 text-base">
                    Beylikdüzü Canlı Dağıtım Haritası ({selectedDate})
                  </h3>
                  <p className="text-stone-400 text-xs">
                    Toplam {deliveryOrders.length} teslimat noktası mahallelere göre listelenmiştir.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRouteMapModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
              <div className="md:col-span-2 relative min-h-[350px] bg-stone-950 flex flex-col items-center justify-center">
                <iframe
                  title="Beylikdüzü Dağıtım Haritası"
                  width="100%"
                  height="100%"
                  className="w-full h-full min-h-[400px] border-0"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=28.59,40.95,28.72,41.03&layer=mapnik"
                />
                <div className="absolute bottom-3 left-3 bg-stone-900/90 border border-stone-700 px-3 py-1.5 rounded-xl text-[11px] text-stone-200 font-sans backdrop-blur-sm flex items-center gap-2 shadow">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Merkez: Beylikdüzü Taş Fırın Dağıtım Bölgesi</span>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[500px] space-y-3 bg-stone-950/40 border-t md:border-t-0 md:border-l border-stone-800">
                <div className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Teslimat Sırası ({deliveryOrders.length})</span>
                  <span className="text-amber-400 font-mono">{totalCashToCollect} ₺</span>
                </div>

                {deliveryOrders.length === 0 ? (
                  <div className="text-stone-500 text-xs p-4 text-center">Bu tarihte durak yok</div>
                ) : (
                  deliveryOrders.map((o, idx) => {
                    const urls = getMapUrls(o.deliveryAddress);
                    const isDone = o.status === "teslim_edildi";
                    const cObj = couriers.find((c) => c.id === o.courierId);

                    return (
                      <div
                        key={o.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
                          isDone
                            ? "bg-emerald-950/20 border-emerald-500/20 opacity-60"
                            : "bg-stone-900/80 border-stone-800 hover:border-amber-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-200 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            <span>{o.customerName}</span>
                          </span>
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {o.totalAmount} ₺
                          </span>
                        </div>

                        {cObj && (
                          <div className="text-[10px] font-medium text-emerald-400">
                            🛵 Kurye: {cObj.displayName}
                          </div>
                        )}

                        <div className="text-stone-400 text-[11px] line-clamp-1">
                          {o.neighborhood} · {o.deliveryAddress}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <a
                            href={urls.google}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigasyonu Başlat</span>
                          </a>

                          <a
                            href={urls.yandex}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-stone-400 hover:text-stone-200 flex items-center gap-0.5"
                          >
                            <span>Yandex</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
