"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCouriers } from "@/hooks/useCouriers";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { mapsLink } from "@/components/admin/OrderCard";
import { BulkLabelsModal } from "@/components/admin/BulkLabelsModal";
import type { AdminOrder, AdminOrderStatus, OrderSource } from "@/types/admin";
import {
  canCancel,
  compareForWork,
  inStatusGroup,
  isUncollected,
  nextStep,
  ORDER_MESSAGE_LABELS,
  orderMessage,
  paymentLabel,
  STATUS_GROUP_LABELS,
  statusLabel,
  type OrderMessage,
  type StatusGroup,
} from "@/lib/orders/adminFlow";
import {
  defaultDeliveryPayment,
  DELIVERY_PAYMENT_LABELS,
  type DeliveryPayment,
} from "@/lib/orders/delivery";
import { hasCapability } from "@/lib/security/capabilities";
import { toWhatsAppNumber } from "@/lib/settings/schema";
import { trackingUrl, whatsappLink } from "@/lib/site";
import { addDays, formatTrDate, relativeTrDate } from "@/lib/time/istanbul";

type SourceFilter = "all" | "web" | "manual";

interface BulkStatusResponse {
  ok?: boolean;
  action?: string;
  updatedCount?: number;
  updatedIds?: string[];
  skippedCount?: number;
  skipped?: { orderId: string; orderNumber: string | null; reason: string }[];
  error?: string;
}

const GROUPS: StatusGroup[] = ["acik", "yeni", "hazirlik", "yolda", "teslim", "iptal", "hepsi"];
const PAGE_SIZE = 30;

const CANCEL_PRESETS = [
  "Müşteri vazgeçti",
  "Adres / telefon ulaşılamadı",
  "Fırın kapasitesi dolu",
  "Yanlış sipariş girişi",
];

function statusBadgeCls(status: AdminOrderStatus): string {
  switch (status) {
    case "bekliyor":
      return "bg-[#FEF3D6] text-[#7A4A0B] border-[#E8C587]";
    case "hazirlaniyor":
      return "bg-[#F3E2D4] text-[#8E3D1B] border-[#DFB99F]";
    case "firinda":
      return "bg-[#B4532A] text-white border-[#B4532A]";
    case "kuryede":
      return "bg-[#EEF3F8] text-[#24476B] border-[#C5D5E4]";
    case "teslim_edildi":
      return "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]";
    case "iptal":
      return "bg-[#FCECE9] text-[#7D2114] border-[#E7B7AF]";
  }
}

function sourceBadgeInfo(source: OrderSource): {
  label: string;
  cls: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (source) {
    case "whatsapp":
      return {
        label: "WhatsApp",
        cls: "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]",
        icon: MessageCircle,
      };
    case "phone":
      return {
        label: "Telefon",
        cls: "bg-[#FEF3D6] text-[#7A4A0B] border-[#E8C587]",
        icon: Phone,
      };
    case "in_store":
      return {
        label: "Dükkân",
        cls: "bg-[#EEF3F8] text-[#24476B] border-[#C5D5E4]",
        icon: Store,
      };
    default:
      return {
        label: "Web",
        cls: "bg-[#F6EEDF] text-[#3B1E1A] border-[#E2D3BD]",
        icon: Globe,
      };
  }
}

const DELIVERY_PAYMENTS: DeliveryPayment[] = ["cash", "pos", "transfer", "unpaid"];

export default function AdminOrdersPage() {
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role;
  const canViewFinance = hasCapability(role, "dashboard.finance");
  const canManageOrders = hasCapability(role, "orders.ops");
  const canDispatchCourier = hasCapability(role, "courier.dispatch");

  const { settings } = useStoreSettings();
  const { couriers, activeCouriers } = useCouriers();
  const courierMap = useMemo(() => new Map(couriers.map((c) => [c.id, c])), [couriers]);

  const {
    orders,
    allOrders,
    loading,
    error,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
    updateOrderStatus,
    refetch,
    searchOrders,
  } = useAdminOrders();

  const today = useIstanbulToday();
  const tomorrow = addDays(today, 1);

  const [customDate, setCustomDate] = useState<string>("");
  const [group, setGroup] = useState<StatusGroup>("acik");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [onlyUncollected, setOnlyUncollected] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Toplu seçim ve aksiyon durumları
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkCourierId, setBulkCourierId] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState<"approve" | "prepare" | "assign_courier" | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);
  const [rowBusyIds, setRowBusyIds] = useState<Set<string>>(() => new Set());
  const [labelsOpen, setLabelsOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Native <dialog> modalları
  const [deliverOrderTarget, setDeliverOrderTarget] = useState<AdminOrder | null>(null);
  const [deliverPayment, setDeliverPayment] = useState<DeliveryPayment>("cash");
  const [deliverNote, setDeliverNote] = useState("");
  const [deliverBusy, setDeliverBusy] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);
  const deliverDialogRef = useRef<HTMLDialogElement>(null);

  const [cancelOrderTarget, setCancelOrderTarget] = useState<AdminOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelDialogRef = useRef<HTMLDialogElement>(null);

  const [messageOrderTarget, setMessageOrderTarget] = useState<AdminOrder | null>(null);
  const [messageType, setMessageType] = useState<OrderMessage>("yolda");
  const messageDialogRef = useRef<HTMLDialogElement>(null);

  // Varsayılan toplu atama kuryesi: vardiyadaki ilk aktif kurye
  useEffect(() => {
    if (!bulkCourierId && activeCouriers.length > 0) {
      const preferred = activeCouriers.find((c) => c.isOnShift) ?? activeCouriers[0];
      if (preferred) setBulkCourierId(preferred.id);
    }
  }, [activeCouriers, bulkCourierId]);

  useEffect(() => {
    setShown(PAGE_SIZE);
    setSelectedIds(new Set());
    setBulkFeedback(null);
  }, [group, dateFilter, customDate, searchQuery, onlyUncollected, courierFilter, sourceFilter]);

  useEffect(() => {
    if (searchQuery.trim().length < 3) return;
    const t = window.setTimeout(() => void searchOrders(searchQuery), 350);
    return () => window.clearTimeout(t);
  }, [searchQuery, searchOrders]);

  // Dialog lifecycle synchronization
  useEffect(() => {
    const dialog = deliverDialogRef.current;
    if (!dialog) return;
    if (deliverOrderTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [deliverOrderTarget]);

  useEffect(() => {
    const dialog = cancelDialogRef.current;
    if (!dialog) return;
    if (cancelOrderTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [cancelOrderTarget]);

  useEffect(() => {
    const dialog = messageDialogRef.current;
    if (!dialog) return;
    if (messageOrderTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [messageOrderTarget]);

  const uncollected = useMemo(() => (canViewFinance ? allOrders.filter(isUncollected) : []), [allOrders, canViewFinance]);

  const searching = searchQuery.trim().length > 0;
  const dateFilteredOrders = useMemo(() => {
    if (!customDate || searching) return orders;
    return orders.filter((o) => o.deliveryDate === customDate);
  }, [orders, customDate, searching]);

  const filteredByDimensions = useMemo(() => {
    const sourcePool = onlyUncollected ? uncollected : dateFilteredOrders;
    return sourcePool.filter((o) => {
      if (sourceFilter === "web" && o.source !== "web") return false;
      if (sourceFilter === "manual" && o.source === "web") return false;

      if (canDispatchCourier) {
        if (courierFilter === "unassigned") {
          if (o.deliveryMethod === "pickup" || Boolean(o.courierId)) return false;
        } else if (courierFilter !== "all") {
          if (o.courierId !== courierFilter) return false;
        }
      }
      return true;
    });
  }, [onlyUncollected, uncollected, dateFilteredOrders, sourceFilter, canDispatchCourier, courierFilter]);

  const counts = useMemo(() => {
    const c = {} as Record<StatusGroup, number>;
    for (const g of GROUPS) c[g] = filteredByDimensions.filter((o) => inStatusGroup(o.status, g)).length;
    return c;
  }, [filteredByDimensions]);

  const list = useMemo(
    () =>
      (onlyUncollected ? filteredByDimensions : filteredByDimensions.filter((o) => inStatusGroup(o.status, group)))
        .slice()
        .sort(compareForWork),
    [filteredByDimensions, group, onlyUncollected]
  );

  const selectedOrders = useMemo(() => list.filter((o) => selectedIds.has(o.id)), [list, selectedIds]);

  const allSelected = list.length > 0 && selectedOrders.length === list.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < list.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const eligibleForApprove = useMemo(
    () => selectedOrders.filter((o) => o.status === "bekliyor"),
    [selectedOrders]
  );
  const eligibleForPrepare = useMemo(
    () => selectedOrders.filter((o) => o.status === "hazirlaniyor"),
    [selectedOrders]
  );
  const eligibleForCourier = useMemo(
    () =>
      selectedOrders.filter(
        (o) => o.deliveryMethod !== "pickup" && o.status !== "teslim_edildi" && o.status !== "iptal"
      ),
    [selectedOrders]
  );

  const dayCount = (d: string) => allOrders.filter((o) => o.deliveryDate === d && o.status !== "iptal").length;
  const active = dateFilteredOrders.filter((o) => o.status !== "iptal");
  const loaves = active.reduce((s, o) => s + o.items.reduce((n, it) => n + it.quantity, 0), 0);
  const revenue = active.reduce((s, o) => s + o.totalAmount, 0);

  const dates: { id: typeof dateFilter; label: string; count?: number }[] = [
    { id: "bugun", label: "Bugün", count: dayCount(today) },
    { id: "yarin", label: "Yarın", count: dayCount(tomorrow) },
    { id: "hepsi", label: "Tümü" },
  ];

  const handlePresetDate = (preset: typeof dateFilter) => {
    setCustomDate("");
    setDateFilter(preset);
  };

  const handleCustomDateChange = (val: string) => {
    if (!val) {
      setCustomDate("");
      setDateFilter("hepsi");
      return;
    }
    if (val === today) {
      setCustomDate("");
      setDateFilter("bugun");
      return;
    }
    if (val === tomorrow) {
      setCustomDate("");
      setDateFilter("yarin");
      return;
    }
    setCustomDate(val);
    setDateFilter("hepsi");
  };

  const datePickerValue = customDate || (dateFilter === "bugun" ? today : dateFilter === "yarin" ? tomorrow : "");

  const activeDateLabel = useMemo(() => {
    if (onlyUncollected) return "Tahsilat Bekleyen Teslimler";
    if (customDate) return formatTrDate(customDate, "long");
    if (dateFilter === "bugun") return `Bugün (${formatTrDate(today, "long")})`;
    if (dateFilter === "yarin") return `Yarın (${formatTrDate(tomorrow, "long")})`;
    return "Tüm Tarihler";
  }, [onlyUncollected, customDate, dateFilter, today, tomorrow]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((o) => o.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const runBulkAction = async (
    action: "approve" | "prepare" | "assign_courier",
    targets: AdminOrder[],
    courierId?: string
  ) => {
    if (bulkBusy || targets.length === 0) return;
    if (action === "assign_courier" && !courierId) {
      setBulkFeedback({ kind: "error", message: "Lütfen dağıtım için bir kurye seçin." });
      return;
    }

    setBulkBusy(action);
    setBulkFeedback(null);

    try {
      const ids = targets.map((o) => o.id);
      let updatedTotal = 0;
      let skippedTotal = 0;
      const skippedReasons: string[] = [];
      const chunkErrors: string[] = [];

      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const res = await fetch("/api/admin/orders/bulk-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderIds: chunk,
            action,
            ...(action === "assign_courier" && courierId ? { courierId } : {}),
          }),
        });

        const body = (await res.json().catch(() => ({}))) as BulkStatusResponse;
        if (!res.ok) {
          chunkErrors.push(body.error || `HTTP ${res.status}`);
        } else {
          updatedTotal += body.updatedCount ?? 0;
          skippedTotal += body.skippedCount ?? 0;
          if (Array.isArray(body.skipped)) {
            for (const s of body.skipped.slice(0, 3)) {
              skippedReasons.push(`${s.orderNumber || s.orderId.slice(0, 6)}: ${s.reason}`);
            }
          }
        }
      }

      await refetch();

      const actionLabel =
        action === "approve"
          ? "hazırlanıyor aşamasına alındı"
          : action === "prepare"
          ? "fırında aşamasına alındı"
          : "kuryeye dağıtıma atandı";

      if (chunkErrors.length > 0 && updatedTotal === 0) {
        setBulkFeedback({
          kind: "error",
          message: `Toplu işlem başarısız: ${chunkErrors.join(" · ")}`,
        });
      } else if (chunkErrors.length > 0 || skippedTotal > 0) {
        setSelectedIds(new Set());
        setBulkFeedback({
          kind: updatedTotal > 0 ? "ok" : "error",
          message: `${updatedTotal} sipariş ${actionLabel}, ${skippedTotal} sipariş atlandı.${
            skippedReasons.length > 0 ? ` (${skippedReasons.join(" · ")})` : ""
          }`,
        });
      } else {
        setSelectedIds(new Set());
        setBulkFeedback({
          kind: "ok",
          message: `${updatedTotal} sipariş başarıyla ${actionLabel}.`,
        });
      }
    } catch {
      setBulkFeedback({ kind: "error", message: "Toplu işlem sırasında bağlantı hatası oluştu." });
    } finally {
      setBulkBusy(null);
    }
  };

  const handleRowNextStep = async (order: AdminOrder) => {
    const step = nextStep(order);
    if (!step || rowBusyIds.has(order.id)) return;

    if (step.status === "teslim_edildi") {
      setDeliverPayment(defaultDeliveryPayment(order.paymentMethod, Boolean(order.cariId)));
      setDeliverNote("");
      setDeliverError(null);
      setDeliverOrderTarget(order);
      return;
    }

    setBulkFeedback(null);
    setRowBusyIds((prev) => new Set(prev).add(order.id));
    try {
      const res = await updateOrderStatus(order.id, step.status);
      if (!res.success) {
        setBulkFeedback({ kind: "error", message: `${order.customerName}: ${res.error || "Durum güncellenemedi."}` });
      }
    } finally {
      setRowBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  const submitDeliverDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverOrderTarget || deliverBusy) return;
    setDeliverBusy(true);
    setDeliverError(null);

    try {
      const res = await updateOrderStatus(deliverOrderTarget.id, "teslim_edildi", {
        payment: deliverPayment,
        note: deliverNote.trim() || undefined,
      });
      if (!res.success) {
        setDeliverError(res.error || "Teslim kaydedilemedi.");
        return;
      }
      setDeliverOrderTarget(null);
    } finally {
      setDeliverBusy(false);
    }
  };

  const submitCancelDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelOrderTarget || cancelBusy) return;
    setCancelBusy(true);
    setCancelError(null);

    try {
      const res = await updateOrderStatus(cancelOrderTarget.id, "iptal", {
        note: cancelReason.trim() || "Yönetim iptali",
      });
      if (!res.success) {
        setCancelError(res.error || "Sipariş iptal edilemedi.");
        return;
      }
      setCancelOrderTarget(null);
    } finally {
      setCancelBusy(false);
    }
  };

  const openMessageModal = (order: AdminOrder) => {
    const defaultMsg: OrderMessage =
      order.status === "teslim_edildi"
        ? "teslim"
        : order.status === "kuryede"
        ? order.deliveryMethod === "pickup"
          ? "hazir"
          : "yolda"
        : "alindi";
    setMessageType(defaultMsg);
    setMessageOrderTarget(order);
  };

  const messagePreviewText = useMemo(() => {
    if (!messageOrderTarget) return "";
    return orderMessage(messageType, messageOrderTarget, {
      window: settings.deliveryWindow,
      dateLabel: relativeTrDate(messageOrderTarget.deliveryDate),
      trackingUrl: trackingUrl(messageOrderTarget.orderNumber || messageOrderTarget.id),
    });
  }, [messageOrderTarget, messageType, settings.deliveryWindow]);

  const printOrders = useMemo(
    () => (selectedOrders.length > 0 ? selectedOrders : list),
    [selectedOrders, list]
  );
  const printTotalAmount = useMemo(
    () => printOrders.reduce((s, o) => s + o.totalAmount, 0),
    [printOrders]
  );
  const printItemCount = useMemo(
    () => printOrders.reduce((s, o) => s + o.items.reduce((n, it) => n + it.quantity, 0), 0),
    [printOrders]
  );

  const visibleOrders = list.slice(0, shown);

  return (
    <>
      <div className="space-y-4 pb-24 print:hidden">
        {/* Başlık ve üst aksiyonlar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 id="orders-table-heading" className="font-serif text-2xl sm:text-3xl font-bold text-[#3B1E1A]">
              Siparişler & Dağıtım
            </h1>
            <p className="text-xs text-[#6E5148] mt-0.5">
              <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">{active.length}</span> aktif
              sipariş ·{" "}
              <span className="font-mono tabular-nums font-semibold text-[#3B1E1A]">{loaves}</span> adet ürün
              {canViewFinance && (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-mono tabular-nums font-semibold text-[#1D5130]">
                    {revenue.toLocaleString("tr-TR")} ₺
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setLabelsOpen(true)}
              disabled={printOrders.length === 0}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#FBF6EC] disabled:opacity-40 transition-colors"
              title="Torbalara yapıştırılacak paket etiketlerini oluştur"
            >
              <Tag className="w-4 h-4 text-[#B4532A]" aria-hidden="true" />
              <span>Etiketler ({printOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={printOrders.length === 0}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#FBF6EC] disabled:opacity-40 transition-colors"
              title="Seçili siparişleri veya listenin tamamını sevkiyat tablosu olarak yazdır"
            >
              <Printer className="w-4 h-4 text-[#8E3D1B]" aria-hidden="true" />
              <span>Sevkiyat Yazdır</span>
            </button>
            {canManageOrders && (
              <Link
                href="/admin/siparisler/yeni"
                className="min-h-[44px] px-4 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Yeni sipariş
              </Link>
            )}
          </div>
        </div>

        {/* Tarih + Özel Takvim + Arama + Kurye & Kaynak Filtreleri */}
        <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-4 space-y-3 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {dates.map((d) => {
                const isSelected = !onlyUncollected && !customDate && dateFilter === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setOnlyUncollected(false);
                      handlePresetDate(d.id);
                    }}
                    className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? "bg-[#B4532A] text-white border-[#B4532A]"
                        : "bg-[#FBF6EC] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E2D4]"
                    }`}
                  >
                    <span>{d.label}</span>
                    {typeof d.count === "number" && (
                      <span className="font-mono tabular-nums opacity-85">{d.count}</span>
                    )}
                  </button>
                );
              })}

              <label
                className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  customDate && !onlyUncollected
                    ? "bg-[#F3E2D4] text-[#8E3D1B] border-[#B4532A]"
                    : "bg-[#FBF6EC] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E2D4]"
                }`}
                title="Takvimden tarih seç"
              >
                <Calendar className="w-3.5 h-3.5 text-[#8E3D1B] shrink-0" aria-hidden="true" />
                <input
                  type="date"
                  value={datePickerValue}
                  onChange={(e) => {
                    setOnlyUncollected(false);
                    handleCustomDateChange(e.target.value);
                  }}
                  aria-label="Belirli bir tarih seç"
                  className="bg-transparent text-xs font-mono text-[#3B1E1A] focus:outline-none w-[112px] cursor-pointer"
                />
                {customDate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePresetDate("hepsi");
                    }}
                    aria-label="Özel tarihi temizle"
                    className="p-0.5 rounded hover:bg-[#E2D3BD]/60 text-[#3B1E1A]"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </label>
            </div>

            <div className="relative flex-1">
              <label htmlFor="orders-search-input" className="sr-only">
                Sipariş ara
              </label>
              <Search
                className="w-4 h-4 text-[#6E5148] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="orders-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ad, telefon, mahalle, sipariş no…"
                className="w-full min-h-[44px] pl-10 pr-10 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Aramayı temizle"
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#6E5148] hover:text-[#3B1E1A]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* İkincil filtre satırı: Kaynak, Kurye, Tahsilat Bekleyen & Durum Sekmeleri */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1 border-t border-[#E2D3BD]">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E5148]">
                <span>Kaynak:</span>
                <select
                  aria-label="Sipariş kaynağı filtresi"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                  className="min-h-[38px] px-2.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
                >
                  <option value="all">Tüm Kaynaklar</option>
                  <option value="web">Web</option>
                  <option value="manual">Manuel (WhatsApp / Tel / Dükkân)</option>
                </select>
              </label>

              {canDispatchCourier && (
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E5148]">
                  <span>Kurye:</span>
                  <select
                    aria-label="Kurye filtresi"
                    value={courierFilter}
                    onChange={(e) => setCourierFilter(e.target.value)}
                    className="min-h-[38px] px-2.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
                  >
                    <option value="all">Tüm Kuryeler</option>
                    <option value="unassigned">Atanmamış (Kurye Bekliyor)</option>
                    {activeCouriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName}
                        {c.isOnShift ? " (Vardiyada)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {canViewFinance && uncollected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyUncollected((v) => !v)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-bold shrink-0 border transition-colors ${
                    onlyUncollected
                      ? "bg-[#FEF3D6] border-[#E8C587] text-[#7A4A0B]"
                      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#7A4A0B] hover:bg-[#FEF3D6]/70"
                  }`}
                >
                  Tahsilat bekleyen ({uncollected.length})
                </button>
              )}
              {GROUPS.map((g) => {
                const activeGroup = !onlyUncollected && group === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setOnlyUncollected(false);
                      setGroup(g);
                    }}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-bold shrink-0 border transition-colors ${
                      activeGroup
                        ? "bg-[#3B1E1A] border-[#3B1E1A] text-white"
                        : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A]"
                    }`}
                  >
                    {STATUS_GROUP_LABELS[g]}{" "}
                    <span className="font-mono tabular-nums opacity-75">{counts[g]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Toplu Seçim & Dağıtım Çubuğu */}
        {canManageOrders && list.length > 0 && (
          <div className="bg-[#FBF6EC] border border-[#E2D3BD] rounded-2xl p-3.5 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none min-h-[38px] px-1">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-[#E2D3BD] accent-[#B4532A]"
                />
                <span className="text-xs font-bold text-[#3B1E1A]">
                  {selectedOrders.length > 0 ? (
                    <>
                      <span className="font-mono tabular-nums text-[#8E3D1B]">{selectedOrders.length}</span> sipariş
                      seçili
                    </>
                  ) : (
                    `Tümünü Seç (${list.length})`
                  )}
                </span>
              </label>

              {selectedOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={bulkBusy !== null || eligibleForApprove.length === 0}
                    onClick={() => void runBulkAction("approve", eligibleForApprove)}
                    className="min-h-[38px] px-3 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    title="Bekleyen seçili siparişleri Hazırlanıyor aşamasına al"
                  >
                    {bulkBusy === "approve" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ChefHat className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>Seçilenleri Hazırlanıyor Yap ({eligibleForApprove.length})</span>
                  </button>

                  <button
                    type="button"
                    disabled={bulkBusy !== null || eligibleForPrepare.length === 0}
                    onClick={() => void runBulkAction("prepare", eligibleForPrepare)}
                    className="min-h-[38px] px-3 rounded-xl bg-[#3B1E1A] hover:bg-[#2A1512] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                    title="Hazırlanan seçili siparişleri Fırında aşamasına al"
                  >
                    {bulkBusy === "prepare" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>Seçilenleri Fırında Yap ({eligibleForPrepare.length})</span>
                  </button>

                  {canDispatchCourier && (
                    <div className="flex flex-wrap items-center gap-1.5 bg-[#FFFFFF] border border-[#E2D3BD] rounded-xl p-1">
                      {activeCouriers.length > 0 ? (
                        <>
                          <select
                            aria-label="Dağıtım için kurye seç"
                            value={bulkCourierId}
                            onChange={(e) => setBulkCourierId(e.target.value)}
                            className="min-h-[34px] px-2 rounded-lg bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] focus:outline-none"
                          >
                            <option value="">Kurye seç…</option>
                            {activeCouriers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.displayName}
                                {c.isOnShift ? " (Vardiyada)" : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={bulkBusy !== null || !bulkCourierId || eligibleForCourier.length === 0}
                            onClick={() => void runBulkAction("assign_courier", eligibleForCourier, bulkCourierId)}
                            className="min-h-[34px] px-3 rounded-lg bg-[#1D5130] hover:bg-[#163F25] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                          >
                            {bulkBusy === "assign_courier" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>Seçilenleri Kuryeye Dağıtım Listesi Ata ({eligibleForCourier.length})</span>
                          </button>
                        </>
                      ) : (
                        <Link
                          href="/admin/ekip"
                          className="px-2.5 py-1 text-xs font-semibold text-[#8E3D1B] hover:underline"
                        >
                          Ekip & Kurye ekranından aktif kurye ekle →
                        </Link>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={clearSelection}
                    className="min-h-[38px] px-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] text-xs font-semibold"
                  >
                    Temizle
                  </button>
                </div>
              )}
            </div>

            {bulkFeedback && (
              <div
                role={bulkFeedback.kind === "error" ? "alert" : "status"}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                  bulkFeedback.kind === "error"
                    ? "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                    : "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {bulkFeedback.kind === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{bulkFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkFeedback(null)}
                  aria-label="Bildirimi kapat"
                  className="p-1 rounded hover:bg-black/5"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading && allOrders.length === 0 ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-[#6E5148]">
            <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Siparişler yükleniyor…
          </div>
        ) : list.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl py-16 text-center space-y-2 shadow-sm">
            <ShoppingBag className="w-8 h-8 text-[#6E5148] mx-auto" aria-hidden="true" />
            <p className="text-sm font-medium text-[#3B1E1A]">Bu filtrede sipariş yok.</p>
            <p className="text-xs text-[#6E5148]">Tarih, kurye, kaynak veya durum filtresini değiştirmeyi deneyin.</p>
          </div>
        ) : (
          <>
            {/* Mobil Kart Listesi (md altında) */}
            <div className="md:hidden space-y-3">
              {visibleOrders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                const src = sourceBadgeInfo(order.source);
                const SrcIcon = src.icon;
                const step = nextStep(order);
                const isRowBusy = rowBusyIds.has(order.id);
                const assignedCourier = order.courierId ? courierMap.get(order.courierId) : undefined;

                return (
                  <article
                    key={order.id}
                    className={`bg-[#FFFFFF] border rounded-2xl p-4 space-y-3 shadow-sm ${
                      isSelected ? "border-[#B4532A] ring-2 ring-[#B4532A]/20" : "border-[#E2D3BD]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {canManageOrders && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(order.id)}
                            aria-label={`${order.customerName} siparişini seç`}
                            className="w-5 h-5 mt-0.5 rounded border-[#E2D3BD] accent-[#B4532A] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/admin/siparisler/${order.id}`}
                              className="text-sm font-bold text-[#3B1E1A] hover:underline truncate"
                            >
                              {order.customerName}
                            </Link>
                            {order.orderNumber && (
                              <span className="font-mono text-[11px] text-[#6E5148]">#{order.orderNumber}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${statusBadgeCls(
                                order.status
                              )}`}
                            >
                              {statusLabel(order.status, order.deliveryMethod)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${src.cls}`}
                            >
                              <SrcIcon className="w-3 h-3" aria-hidden="true" />
                              {src.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {canViewFinance && (
                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-sm font-bold text-[#3B1E1A]">
                            {order.totalAmount.toLocaleString("tr-TR")} ₺
                          </div>
                          <div className="text-[11px] text-[#6E5148]">
                            {order.cariId ? "Cari" : paymentLabel(order.paymentMethod, order.deliveryMethod)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-[#6E5148] space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#3B1E1A]">
                          {relativeTrDate(order.deliveryDate)}
                          {order.deliveryTimeWindow ? ` · ${order.deliveryTimeWindow}` : ""}
                        </span>
                        <span>·</span>
                        <span>
                          {order.deliveryMethod === "pickup" ? "Fırından Gel-Al" : order.neighborhood || "Teslimat"}
                        </span>
                        {assignedCourier && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF3F8] border border-[#C5D5E4] text-[#24476B] font-semibold">
                            <Truck className="w-3 h-3" aria-hidden="true" /> {assignedCourier.displayName}
                          </span>
                        )}
                      </div>
                      <div className="text-[#3B1E1A]">
                        {order.items.map((it) => `${it.quantity}× ${it.productName}`).join(", ")}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2D3BD]">
                      {canManageOrders && step && (
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => void handleRowNextStep(order)}
                          className="min-h-[40px] px-3.5 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isRowBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>{step.label}</span>
                        </button>
                      )}
                      {order.phone && (
                        <>
                          <a
                            href={`tel:${order.phone.replace(/\s+/g, "")}`}
                            aria-label={`${order.customerName} ara`}
                            className="min-h-[40px] px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Ara
                          </a>
                          <button
                            type="button"
                            onClick={() => openMessageModal(order)}
                            className="min-h-[40px] px-3 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-xs font-semibold text-[#1D5130] inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> WA
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/siparisler/${order.id}`}
                        className="min-h-[40px] px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] inline-flex items-center gap-1 ml-auto"
                      >
                        Detay <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Masaüstü Kurumsal DataGrid (md+) */}
            <section className="hidden md:block bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl overflow-hidden shadow-sm">
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="orders-table-heading"
                className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#B4532A]"
              >
                <table className="w-full text-left border-collapse min-w-[960px]">
                  <caption className="sr-only">
                    Seçili tarih ve filtrelere göre EkmekLab sipariş ve dağıtım listesi
                  </caption>
                  <thead>
                    <tr className="bg-[#FBF6EC] border-b border-[#E2D3BD] text-[11px] font-bold uppercase tracking-wider text-[#6E5148]">
                      {canManageOrders && (
                        <th scope="col" className="w-11 px-3 py-3 text-center">
                          <span className="sr-only">Seç</span>
                        </th>
                      )}
                      <th scope="col" className="px-3 py-3">
                        Sipariş / Kaynak
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Müşteri & İletişim
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Teslimat & Kurye
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Ürünler
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Durum
                      </th>
                      {canViewFinance && (
                        <th scope="col" className="px-3 py-3 text-right">
                          Ödeme & Tutar
                        </th>
                      )}
                      <th scope="col" className="px-3 py-3 text-right">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2D3BD] text-sm text-[#3B1E1A]">
                    {visibleOrders.map((order) => {
                      const isSelected = selectedIds.has(order.id);
                      const src = sourceBadgeInfo(order.source);
                      const SrcIcon = src.icon;
                      const step = nextStep(order);
                      const isRowBusy = rowBusyIds.has(order.id);
                      const assignedCourier = order.courierId ? courierMap.get(order.courierId) : undefined;
                      const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors ${
                            isSelected ? "bg-[#F3E2D4]/45" : "hover:bg-[#FBF6EC]/70"
                          }`}
                        >
                          {canManageOrders && (
                            <td className="px-3 py-3 text-center align-top">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleOne(order.id)}
                                aria-label={`${order.customerName} siparişini seç`}
                                className="w-4 h-4 mt-1 rounded border-[#E2D3BD] accent-[#B4532A] cursor-pointer"
                              />
                            </td>
                          )}

                          <th scope="row" className="px-3 py-3 text-left align-top font-normal">
                            <Link
                              href={`/admin/siparisler/${order.id}`}
                              className="font-mono text-xs font-bold text-[#3B1E1A] hover:text-[#8E3D1B] hover:underline block"
                            >
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </Link>
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${src.cls}`}
                              >
                                <SrcIcon className="w-3 h-3" aria-hidden="true" />
                                {src.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6E5148] mt-1 font-mono tabular-nums">
                              {relativeTrDate(order.deliveryDate)}
                            </div>
                          </th>

                          <td className="px-3 py-3 align-top">
                            <Link
                              href={`/admin/siparisler/${order.id}`}
                              className="font-semibold text-[#3B1E1A] hover:underline block"
                            >
                              {order.customerName}
                            </Link>
                            {order.phone && (
                              <a
                                href={`tel:${order.phone.replace(/\s+/g, "")}`}
                                className="font-mono tabular-nums text-xs text-[#6E5148] hover:text-[#3B1E1A] inline-block mt-0.5"
                              >
                                {order.phone}
                              </a>
                            )}
                            {order.cariId && (
                              <span className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F3E2D4] border border-[#DFB99F] text-[10px] font-bold text-[#8E3D1B] ml-1.5">
                                <Building2 className="w-3 h-3" aria-hidden="true" /> Cari
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3 align-top text-xs max-w-[230px]">
                            {order.deliveryMethod === "pickup" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBF6EC] border border-[#E2D3BD] font-semibold text-[#3B1E1A]">
                                <Store className="w-3 h-3 text-[#8E3D1B]" aria-hidden="true" /> Fırından Gel-Al
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-semibold text-[#3B1E1A] flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-[#8E3D1B] shrink-0" aria-hidden="true" />
                                  <span>{order.neighborhood || "Mahalle yok"}</span>
                                </div>
                                <p className="text-[#6E5148] line-clamp-2">{order.deliveryAddress}</p>
                                {assignedCourier ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF3F8] border border-[#C5D5E4] text-[#24476B] text-[11px] font-bold">
                                    <Truck className="w-3 h-3" aria-hidden="true" /> {assignedCourier.displayName}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FEF3D6] border border-[#E8C587] text-[#7A4A0B] text-[11px] font-semibold">
                                    Kurye atanmadı
                                  </span>
                                )}
                              </div>
                            )}
                            {order.deliveryTimeWindow && (
                              <div className="text-[11px] text-[#6E5148] font-mono tabular-nums mt-1">
                                {order.deliveryTimeWindow}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3 align-top text-xs max-w-[220px]">
                            <ul className="space-y-0.5">
                              {order.items.map((it, idx) => (
                                <li key={`${order.id}-${it.productId}-${idx}`} className="text-[#3B1E1A]">
                                  <strong className="font-mono tabular-nums">{it.quantity}×</strong> {it.productName}
                                </li>
                              ))}
                            </ul>
                            <div className="text-[11px] text-[#6E5148] mt-1 font-mono tabular-nums">
                              Toplam {itemCount} adet
                            </div>
                            {order.orderNotes && (
                              <div className="mt-1 px-2 py-1 rounded bg-[#FEF3D6]/70 border border-[#E8C587] text-[11px] text-[#7A4A0B]">
                                Not: {order.orderNotes}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap ${statusBadgeCls(
                                order.status
                              )}`}
                            >
                              {statusLabel(order.status, order.deliveryMethod)}
                            </span>
                          </td>

                          {canViewFinance && (
                            <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                              <div className="font-mono tabular-nums font-bold text-[#3B1E1A]">
                                {order.totalAmount.toLocaleString("tr-TR")} ₺
                              </div>
                              <div className="text-[11px] text-[#6E5148] mt-0.5">
                                {order.cariId
                                  ? "Cari hesap"
                                  : paymentLabel(order.paymentMethod, order.deliveryMethod)}
                              </div>
                              {isUncollected(order) ? (
                                <span className="inline-flex mt-1 px-1.5 py-0.5 rounded bg-[#FEF3D6] border border-[#E8C587] text-[10px] font-bold text-[#7A4A0B]">
                                  Tahsilat Bekliyor
                                </span>
                              ) : order.paymentStatus === "paid" ? (
                                <span className="inline-flex mt-1 px-1.5 py-0.5 rounded bg-[#E5EFE7] border border-[#B4D3BC] text-[10px] font-bold text-[#1D5130]">
                                  Ödendi
                                </span>
                              ) : null}
                            </td>
                          )}

                          <td className="px-3 py-3 align-top text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {canManageOrders && step && (
                                <button
                                  type="button"
                                  disabled={isRowBusy}
                                  onClick={() => void handleRowNextStep(order)}
                                  className="min-h-[34px] px-2.5 rounded-lg bg-[#B4532A] hover:bg-[#9D4622] text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isRowBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>{step.label}</span>
                                </button>
                              )}

                              {order.deliveryMethod === "courier" && order.deliveryAddress && (
                                <a
                                  href={mapsLink(order)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`${order.customerName} haritada aç`}
                                  title="Haritada aç"
                                  className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E2D4]"
                                >
                                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                                </a>
                              )}

                              {order.phone && (
                                <button
                                  type="button"
                                  onClick={() => openMessageModal(order)}
                                  aria-label={`${order.customerName} WhatsApp mesajı`}
                                  title="WhatsApp mesajı hazırla"
                                  className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg bg-[#E5EFE7] border border-[#B4D3BC] text-[#1D5130] hover:bg-[#D4E7D8]"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}

                              {canManageOrders && canCancel(order.status) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelReason("");
                                    setCancelError(null);
                                    setCancelOrderTarget(order);
                                  }}
                                  aria-label={`${order.customerName} siparişini iptal et`}
                                  title="Siparişi iptal et"
                                  className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] hover:bg-[#F9DDD7]"
                                >
                                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}

                              <Link
                                href={`/admin/siparisler/${order.id}`}
                                aria-label={`${order.customerName} sipariş detayı`}
                                title="Detay ve fiş"
                                className="min-h-[34px] px-2.5 inline-flex items-center gap-1 rounded-lg bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-semibold text-[#3B1E1A] hover:bg-[#F3E2D4]"
                              >
                                Detay
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {list.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="w-full min-h-[48px] rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] text-sm font-semibold text-[#3B1E1A] hover:bg-[#FBF6EC] transition-colors shadow-sm"
              >
                <span className="font-mono tabular-nums">{list.length - shown}</span> sipariş daha göster
              </button>
            )}
          </>
        )}
      </div>

      {/* Native <dialog>: Teslim Et Modalı */}
      <dialog
        ref={deliverDialogRef}
        aria-labelledby="deliver-dialog-title"
        onClose={(e) => {
          e.currentTarget.returnValue = "";
          setDeliverOrderTarget(null);
        }}
        onClick={(e) => {
          if (e.target === deliverDialogRef.current && !deliverBusy) {
            setDeliverOrderTarget(null);
          }
        }}
        className="w-full max-w-md rounded-3xl bg-[#FFFFFF] text-[#3B1E1A] border border-[#E2D3BD] p-0 shadow-2xl overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain m-auto"
      >
        {deliverOrderTarget && (
          <form onSubmit={(e) => void submitDeliverDialog(e)} className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#E2D3BD] pb-3">
              <div>
                <h2 id="deliver-dialog-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                  Teslimatı Onayla
                </h2>
                <p className="text-xs text-[#6E5148] mt-0.5">
                  {deliverOrderTarget.customerName}
                  {canViewFinance ? ` · ${deliverOrderTarget.totalAmount.toLocaleString("tr-TR")} ₺` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={deliverBusy}
                onClick={() => setDeliverOrderTarget(null)}
                aria-label="Kapat"
                className="min-w-[36px] min-h-[36px] rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-[#3B1E1A]">Ödeme Durumu</legend>
              <div className="grid grid-cols-2 gap-2">
                {DELIVERY_PAYMENTS.map((p) => {
                  const selected = deliverPayment === p;
                  const label =
                    p === "unpaid" && deliverOrderTarget.cariId ? "Cariye yaz" : DELIVERY_PAYMENT_LABELS[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDeliverPayment(p)}
                      className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold text-left transition-colors ${
                        selected
                          ? "bg-[#B4532A] text-white border-[#B4532A]"
                          : "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F3E2D4]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-1">
              <label htmlFor="deliver-note-input" className="text-xs font-semibold text-[#6E5148]">
                Teslim notu (isteğe bağlı)
              </label>
              <input
                id="deliver-note-input"
                type="text"
                value={deliverNote}
                onChange={(e) => setDeliverNote(e.target.value)}
                placeholder="Örn. Kapıcıya bırakıldı"
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A] focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
            </div>

            {deliverError && (
              <div role="alert" className="p-2.5 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114]">
                {deliverError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2D3BD]">
              <button
                type="button"
                autoFocus
                disabled={deliverBusy}
                onClick={() => setDeliverOrderTarget(null)}
                className="min-h-[42px] px-4 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={deliverBusy}
                className="min-h-[42px] px-4 rounded-xl bg-[#1D5130] hover:bg-[#163F25] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {deliverBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                <span>Teslim Edildi İşaretle</span>
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Native <dialog>: İptal Modalı */}
      <dialog
        ref={cancelDialogRef}
        aria-labelledby="cancel-dialog-title"
        onClose={(e) => {
          e.currentTarget.returnValue = "";
          setCancelOrderTarget(null);
        }}
        onClick={(e) => {
          if (e.target === cancelDialogRef.current && !cancelBusy) {
            setCancelOrderTarget(null);
          }
        }}
        className="w-full max-w-md rounded-3xl bg-[#FFFFFF] text-[#3B1E1A] border border-[#E2D3BD] p-0 shadow-2xl overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain m-auto"
      >
        {cancelOrderTarget && (
          <form onSubmit={(e) => void submitCancelDialog(e)} className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#E2D3BD] pb-3">
              <div>
                <h2 id="cancel-dialog-title" className="font-serif text-lg font-bold text-[#7D2114]">
                  Siparişi İptal Et
                </h2>
                <p className="text-xs text-[#6E5148] mt-0.5">
                  {cancelOrderTarget.customerName} (#
                  {cancelOrderTarget.orderNumber || cancelOrderTarget.id.slice(0, 8)})
                </p>
              </div>
              <button
                type="button"
                disabled={cancelBusy}
                onClick={() => setCancelOrderTarget(null)}
                aria-label="Kapat"
                className="min-w-[36px] min-h-[36px] rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CANCEL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCancelReason(preset)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                    cancelReason === preset
                      ? "bg-[#FCECE9] border-[#7D2114] text-[#7D2114]"
                      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E2D4]"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label htmlFor="cancel-reason-input" className="text-xs font-semibold text-[#6E5148]">
                İptal nedeni
              </label>
              <input
                id="cancel-reason-input"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nedeni yazın veya yukarıdan seçin…"
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-sm text-[#3B1E1A] focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
            </div>

            {cancelError && (
              <div role="alert" className="p-2.5 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114]">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2D3BD]">
              <button
                type="button"
                autoFocus
                disabled={cancelBusy}
                onClick={() => setCancelOrderTarget(null)}
                className="min-h-[42px] px-4 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={cancelBusy}
                className="min-h-[42px] px-4 rounded-xl bg-[#7D2114] hover:bg-[#61190F] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {cancelBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                <span>Siparişi İptal Et</span>
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Native <dialog>: WhatsApp Mesaj Modalı */}
      <dialog
        ref={messageDialogRef}
        aria-labelledby="message-dialog-title"
        onClose={(e) => {
          e.currentTarget.returnValue = "";
          setMessageOrderTarget(null);
        }}
        onClick={(e) => {
          if (e.target === messageDialogRef.current) {
            setMessageOrderTarget(null);
          }
        }}
        className="w-full max-w-md rounded-3xl bg-[#FFFFFF] text-[#3B1E1A] border border-[#E2D3BD] p-0 shadow-2xl overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain m-auto"
      >
        {messageOrderTarget && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-[#E2D3BD] pb-3">
              <div>
                <h2 id="message-dialog-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                  WhatsApp Müşteri Bildirimi
                </h2>
                <p className="text-xs text-[#6E5148] mt-0.5">
                  {messageOrderTarget.customerName} · {messageOrderTarget.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMessageOrderTarget(null)}
                aria-label="Kapat"
                className="min-w-[36px] min-h-[36px] rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(ORDER_MESSAGE_LABELS) as OrderMessage[]).map((key) => {
                const active = messageType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMessageType(key)}
                    className={`min-h-[38px] px-3 rounded-xl border text-xs font-bold transition-colors ${
                      active
                        ? "bg-[#B4532A] text-white border-[#B4532A]"
                        : "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F3E2D4]"
                    }`}
                  >
                    {ORDER_MESSAGE_LABELS[key]}
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs text-[#3B1E1A] whitespace-pre-wrap leading-relaxed">
              {messagePreviewText}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2D3BD]">
              <button
                type="button"
                autoFocus
                onClick={() => setMessageOrderTarget(null)}
                className="min-h-[42px] px-4 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs font-bold text-[#3B1E1A]"
              >
                Kapat
              </button>
              <a
                href={whatsappLink(messagePreviewText, toWhatsAppNumber(messageOrderTarget.phone))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMessageOrderTarget(null)}
                className="min-h-[42px] px-4 rounded-xl bg-[#1D5130] hover:bg-[#163F25] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>WhatsApp ile Gönder</span>
              </a>
            </div>
          </div>
        )}
      </dialog>

      {/* Toplu Paket & Torba Etiketleri Modalı */}
      <BulkLabelsModal
        orders={printOrders}
        date={activeDateLabel}
        isOpen={labelsOpen}
        onClose={() => setLabelsOpen(false)}
      />

      {/* Sevkiyat Listesi Yazdır (Beyaz Kağıt Tablosu) */}
      <div className={labelsOpen ? "hidden" : "hidden print:block bg-white text-black p-6 text-xs"}>
        <header className="flex items-end justify-between border-b-2 border-black pb-3 mb-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-700">
              EkmekLab Taş Fırın · Operasyon & Dağıtım
            </p>
            <h2 className="font-serif text-xl font-bold text-black">
              Sevkiyat & Teslimat Listesi — {activeDateLabel}
            </h2>
          </div>
          <div className="text-right font-mono text-xs text-black">
            <div>
              <strong>{printOrders.length}</strong> sipariş · <strong>{printItemCount}</strong> adet ürün
            </div>
            {canViewFinance && (
              <div>
                Toplam: <strong>{printTotalAmount.toLocaleString("tr-TR")} ₺</strong>
              </div>
            )}
          </div>
        </header>

        <table className="w-full border-collapse text-left text-black">
          <caption className="sr-only">Seçili gün ve filtre için sevkiyat sipariş tablosu</caption>
          <thead>
            <tr className="border-b-2 border-black bg-gray-100 text-[11px] uppercase">
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-16">
                # / No
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-40">
                Müşteri & Telefon
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400">
                Teslimat / Adres
              </th>
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-56">
                Ürün Kalemleri
              </th>
              {canViewFinance && (
                <>
                  <th scope="col" className="py-2 px-2 font-bold border border-gray-400 w-28">
                    Ödeme
                  </th>
                  <th scope="col" className="py-2 px-2 font-bold border border-gray-400 text-right w-24">
                    Tutar
                  </th>
                </>
              )}
              <th scope="col" className="py-2 px-2 font-bold border border-gray-400 text-center w-16">
                İmza
              </th>
            </tr>
          </thead>
          <tbody>
            {printOrders.map((order, idx) => {
              const isPickup = order.deliveryMethod === "pickup";
              const assignedCourier = order.courierId ? courierMap.get(order.courierId) : undefined;
              const paidBadge =
                order.cariId || order.paymentMethod === "cari"
                  ? "Cari"
                  : order.paymentStatus === "paid"
                  ? "Ödendi"
                  : "Tahsil Edilecek";
              return (
                <tr key={order.id} className="border-b border-gray-400 break-inside-avoid align-top">
                  <td className="py-2 px-2 border border-gray-400 font-mono">
                    <div className="font-bold">{idx + 1}</div>
                    <div className="text-[10px] text-gray-700">#{order.orderNumber}</div>
                  </td>
                  <td className="py-2 px-2 border border-gray-400">
                    <div className="font-bold">{order.customerName}</div>
                    {order.phone && <div className="font-mono text-[11px]">{order.phone}</div>}
                  </td>
                  <td className="py-2 px-2 border border-gray-400">
                    {isPickup ? (
                      <div className="font-bold">Fırından Gel-Al</div>
                    ) : (
                      <div>
                        {order.neighborhood && <strong>{order.neighborhood} · </strong>}
                        <span>{order.deliveryAddress}</span>
                      </div>
                    )}
                    {assignedCourier && (
                      <div className="text-[10px] text-gray-700 mt-0.5">Kurye: {assignedCourier.displayName}</div>
                    )}
                    {order.deliveryTimeWindow && (
                      <div className="text-[10px] text-gray-700 mt-0.5">{order.deliveryTimeWindow}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 border border-gray-400">
                    {order.items.map((it, i) => (
                      <div key={i}>
                        <strong>{it.quantity}×</strong> {it.productName}
                      </div>
                    ))}
                  </td>
                  {canViewFinance && (
                    <>
                      <td className="py-2 px-2 border border-gray-400">
                        <div className="font-semibold">{paidBadge}</div>
                        <div className="text-[10px] text-gray-700">
                          {paymentLabel(order.paymentMethod, order.deliveryMethod)}
                        </div>
                      </td>
                      <td className="py-2 px-2 border border-gray-400 text-right font-mono font-bold">
                        {order.totalAmount.toLocaleString("tr-TR")} ₺
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2 border border-gray-400 text-center" />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
