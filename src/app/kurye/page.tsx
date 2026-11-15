"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { B2BHotSaleModal } from "@/components/admin/cariler/B2BHotSaleModal";
import { B2BFlexibleDeliveryModal } from "@/components/courier/B2BFlexibleDeliveryModal";
import { DeliveryLabels } from "@/components/courier/DeliveryLabels";
import { useCourierNetwork } from "@/hooks/useCourierNetwork";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import {
  clusterOrdersByNeighborhood,
  getNavigationUrls,
  moveStop,
  waPhone,
} from "@/lib/delivery/maps";
import { orderMessage } from "@/lib/orders/adminFlow";
import { deliverOrder, type DeliveryPayment } from "@/lib/orders/delivery";
import { createClient } from "@/lib/supabase/client";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import type { AdminOrder } from "@/types/admin";

type CourierTab = "stops" | "bench" | "kasa";

interface StopItem {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

interface DispatchStop {
  id: string;
  orderNumber: string;
  slipNumber: string | null;
  status: string;
  customerName: string;
  customerPhone: string;
  address: string;
  neighborhood: string;
  district?: string;
  deliveryNote: string;
  lat: number | null;
  lng: number | null;
  items: StopItem[];
  totalAmount: number;
  paidAmount: number;
  remainingDue: number;
  paymentMethod: string;
  paymentStatus: string;
  cariId: string | null;
  cariName: string | null;
  stopSequence: number | null;
  deliveryTimeWindow: string | null;
  createdAt: string;
  courierId: string | null;
  courierName?: string | null;
}

interface BenchItem {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone?: string;
  neighborhood: string;
  district?: string;
  address: string;
  deliveryNote?: string;
  deliveryMethod?: string;
  lat?: number | null;
  lng?: number | null;
  deliveryTimeWindow: string | null;
  items: StopItem[];
  itemsSummary: string;
  paymentMethod: string;
  paymentStatus: string;
  cariId: string | null;
  cariName: string | null;
  totalAmount: number;
  remainingDue: number;
  createdAt: string;
}

interface CourierOption {
  id: string;
  displayName: string;
  isActive: boolean;
  isOnShift: boolean;
}

interface SettlementInfo {
  id: string;
  cashHandedOver: number;
  cardSlipTotal: number;
  note: string | null;
  settledAt: string;
}

interface B2BAccountPreview {
  id: string;
  businessName: string;
  phone: string;
  address: string;
  neighborhood: string;
  balance: number;
  creditLimit: number;
  customPrices: Record<string, number>;
}

interface CatalogProductPreview {
  id: string;
  name: string;
  price: number;
  category: string;
  weight: number | null;
  weightUnit: string;
  unitLabel: string;
  isAvailable: boolean;
}

interface DispatchPayload {
  date: string;
  isAdmin: boolean;
  canManageDispatch?: boolean;
  isOnShift?: boolean;
  courier: CourierOption | null;
  couriers?: CourierOption[];
  myStops: DispatchStop[];
  deliveredStops: DispatchStop[];
  claimableBench: BenchItem[];
  kasaSummary: {
    deliveredCount: number;
    cashExpected: number;
    cardExpected: number;
    cariDeliveredTotal: number;
    settlement: SettlementInfo | null;
  };
  b2bAccounts: B2BAccountPreview[];
  catalogProducts: CatalogProductPreview[];
}

const CURRENCY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return `₺${CURRENCY_FORMATTER.format(Number.isFinite(value) ? value : 0)}`;
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case "bekliyor":
      return "Bekliyor";
    case "hazirlaniyor":
      return "Hazırlanıyor";
    case "firinda":
      return "Fırında / Hazır";
    case "kuryede":
      return "Kuryede";
    case "teslim_edildi":
      return "Teslim Edildi";
    case "iptal":
      return "İptal";
    default:
      return status;
  }
}

function formatPaymentMethodLabel(method: string): string {
  switch (method) {
    case "cash":
    case "nakit":
      return "Kapıda Nakit";
    case "pos":
    case "card":
    case "kart":
      return "Kapıda POS";
    case "transfer":
    case "havale":
      return "Havale / EFT";
    case "cari":
      return "Cari Hesap";
    case "online":
      return "Online Ödendi";
    default:
      return method || "Belirtilmedi";
  }
}

function normalizeAdminPaymentMethod(method: string): AdminOrder["paymentMethod"] {
  switch (method) {
    case "cari":
      return "cari";
    case "online":
      return "online";
    case "pos":
    case "pos_at_door":
    case "card":
    case "kart":
      return "pos_at_door";
    case "transfer":
    case "havale":
      return "transfer";
    case "whatsapp":
      return "whatsapp";
    default:
      return "cash_on_delivery";
  }
}

function normalizeAdminPaymentStatus(status: string): AdminOrder["paymentStatus"] {
  if (status === "paid" || status === "odendi") return "paid";
  if (status === "on_delivery") return "on_delivery";
  return "pending";
}

function toPrintOrder(stop: DispatchStop, date: string): AdminOrder {
  const subtotal = stop.items.reduce((sum, item) => sum + item.totalPrice, 0) || stop.totalAmount;
  return {
    id: stop.id,
    orderNumber: stop.orderNumber,
    createdAt: stop.createdAt,
    customerName: stop.customerName,
    phone: stop.customerPhone,
    source: "web",
    deliveryMethod: "courier",
    deliveryAddress: stop.address,
    neighborhood: stop.neighborhood,
    district: stop.district,
    deliveryDate: date,
    deliveryTimeWindow: stop.deliveryTimeWindow ?? "",
    items: stop.items.map((item) => ({
      productId: item.productId ?? "",
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      weight: Number.parseFloat(item.unit) || 0,
    })),
    subtotal,
    shippingFee: Math.max(0, stop.totalAmount - subtotal),
    totalAmount: stop.totalAmount,
    status: (stop.status as AdminOrder["status"]) || "kuryede",
    paymentMethod: normalizeAdminPaymentMethod(stop.paymentMethod),
    paymentStatus: normalizeAdminPaymentStatus(stop.paymentStatus),
    orderNotes: stop.deliveryNote,
    courierId: stop.courierId ?? undefined,
    stopSequence: stop.stopSequence,
    cariId: stop.cariId ?? undefined,
  };
}

const TAB_ITEMS: ReadonlyArray<{ id: CourierTab; label: string }> = [
  { id: "stops", label: "Dağıtım Listem" },
  { id: "bench", label: "Hazır Tezgah — Üzerime Al" },
  { id: "kasa", label: "Kasam & Sıcak Satış" },
];

export default function KuryeDispatchPage() {
  const today = useIstanbulToday();
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<CourierTab>("stops");

  const [data, setData] = useState<DispatchPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null);
  const [bulkClaiming, setBulkClaiming] = useState<boolean>(false);
  const [selectedBenchIds, setSelectedBenchIds] = useState<Set<string>>(new Set());
  const [shiftBusy, setShiftBusy] = useState<boolean>(false);
  const [startingRoute, setStartingRoute] = useState<boolean>(false);
  const [reordering, setReordering] = useState<boolean>(false);

  // Delivery modal state
  const deliverDialogRef = useRef<HTMLDialogElement | null>(null);
  const [deliverStop, setDeliverStop] = useState<DispatchStop | null>(null);
  const [deliverPayment, setDeliverPayment] = useState<DeliveryPayment>("cash");
  const [deliverNote, setDeliverNote] = useState<string>("");
  const [deliverBusy, setDeliverBusy] = useState<boolean>(false);
  const [deliverModalError, setDeliverModalError] = useState<string | null>(null);

  // Faz 4 B2B Hot-Sale modal state
  const [hotSaleModalOpen, setHotSaleModalOpen] = useState(false);
  // Faz 7 Esnek B2B Teslimat modal state
  const [b2bDeliverStop, setB2bDeliverStop] = useState<DispatchStop | null>(null);

  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isOnline,
    queueLength,
    isSyncing,
    enqueueDelivery,
    syncQueue,
    syncErrors,
    clearSyncErrors,
  } = useCourierNetwork();

  const fetchDispatch = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMsg(null);

      try {
        const params = new URLSearchParams();
        params.set("date", selectedDate);
        if (selectedCourierId) {
          params.set("courierId", selectedCourierId);
        }

        const res = await fetch(`/api/courier/dispatch?${params.toString()}`, {
          cache: "no-store",
        });

        const payload = (await res.json().catch(() => null)) as
          | (DispatchPayload & { error?: string })
          | { error?: string }
          | null;

        if (!res.ok) {
          const message =
            payload && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : `Dağıtım listesi alınamadı (HTTP ${res.status}).`;
          setErrorMsg(message);
          return;
        }

        if (payload && "myStops" in payload) {
          setData(payload);
          if (!selectedCourierId && (payload.canManageDispatch || payload.isAdmin)) {
            if (payload.courier?.id) {
              setSelectedCourierId(payload.courier.id);
            } else {
              setSelectedCourierId("all");
            }
          }
          // Tezgahtan düşen seçimleri temizle
          const benchIdSet = new Set(payload.claimableBench.map((b) => b.id));
          setSelectedBenchIds((prev) => {
            if (prev.size === 0) return prev;
            const next = new Set(Array.from(prev).filter((id) => benchIdSet.has(id)));
            return next.size === prev.size ? prev : next;
          });
        }
      } catch {
        setErrorMsg("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCourierId, selectedDate],
  );

  useEffect(() => {
    void fetchDispatch();
  }, [fetchDispatch]);

  // Realtime subscription with deterministic cleanup
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`kurye-dispatch-${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `delivery_date=eq.${selectedDate}`,
        },
        () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            void fetchDispatch({ silent: true });
          }, 500);
        },
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [fetchDispatch, selectedDate]);

  // Native <dialog> close listeners (read + reset returnValue per spec)
  useEffect(() => {
    const dlg = deliverDialogRef.current;
    if (!dlg) return;
    const handleClose = () => {
      dlg.returnValue = "";
      setDeliverStop(null);
      setDeliverModalError(null);
    };
    dlg.addEventListener("close", handleClose);
    return () => dlg.removeEventListener("close", handleClose);
  }, []);

  const openDeliverModal = (stop: DispatchStop) => {
    setDeliverStop(stop);
    setDeliverModalError(null);
    setDeliverNote("");
    if (stop.cariId || stop.remainingDue <= 0) {
      setDeliverPayment("unpaid");
    } else if (stop.paymentMethod === "pos" || stop.paymentMethod === "card") {
      setDeliverPayment("pos");
    } else if (stop.paymentMethod === "transfer" || stop.paymentMethod === "havale") {
      setDeliverPayment("transfer");
    } else {
      setDeliverPayment("cash");
    }
    deliverDialogRef.current?.showModal();
  };

  const closeDeliverModal = (result = "cancel") => {
    deliverDialogRef.current?.close(result);
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverStop) return;
    setDeliverBusy(true);
    setDeliverModalError(null);

    try {
      if (!isOnline) {
        enqueueDelivery(deliverStop.id, deliverPayment, deliverNote);
        setData((prev) =>
          prev
            ? {
                ...prev,
                myStops: prev.myStops.filter((item) => item.id !== deliverStop.id),
              }
            : prev,
        );
        setFeedback({
          kind: "success",
          text: `${deliverStop.orderNumber} çevrimdışı kuyruğa alındı. Bağlantı gelince otomatik işlenecek.`,
        });
        closeDeliverModal("queued");
        return;
      }

      const result = await deliverOrder(deliverStop.id, deliverPayment, deliverNote);
      if (!result.ok) {
        setDeliverModalError(result.error || "Teslimat kaydedilemedi.");
        return;
      }

      setFeedback({
        kind: "success",
        text: `${deliverStop.orderNumber} teslim edildi olarak kapatıldı.`,
      });
      closeDeliverModal("confirmed");
      await fetchDispatch({ silent: true });
    } catch {
      enqueueDelivery(deliverStop.id, deliverPayment, deliverNote);
      setData((prev) =>
        prev
          ? {
              ...prev,
              myStops: prev.myStops.filter((item) => item.id !== deliverStop.id),
            }
          : prev,
      );
      setFeedback({
        kind: "success",
        text: `${deliverStop.orderNumber} bağlantı kesintisi nedeniyle çevrimdışı kuyruğa alındı.`,
      });
      closeDeliverModal("queued");
    } finally {
      setDeliverBusy(false);
    }
  };

  const canManageDispatch = Boolean(data?.canManageDispatch || data?.isAdmin);
  const targetClaimCourierId =
    selectedCourierId && selectedCourierId !== "all"
      ? selectedCourierId
      : data?.courier?.id ?? null;

  const handleToggleShift = async () => {
    if (!data?.courier || shiftBusy) return;
    setShiftBusy(true);
    setFeedback(null);
    const nextShift = !(data.courier.isActive && data.courier.isOnShift);
    try {
      const res = await fetch("/api/courier/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isOnShift: nextShift,
          courierId: data.courier.id,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Vardiya durumu güncellenemedi.",
        });
        return;
      }
      setFeedback({
        kind: "success",
        text: nextShift
          ? "Vardiya açıldı — dağıtım ve teslimata hazırsınız."
          : "Vardiya kapatıldı (dinlenme / planlama modu).",
      });
      await fetchDispatch({ silent: true });
    } catch {
      setFeedback({ kind: "error", text: "Vardiya güncellenirken bağlantı hatası oluştu." });
    } finally {
      setShiftBusy(false);
    }
  };

  const handleClaimOrder = async (benchItem: BenchItem) => {
    if (canManageDispatch && !targetClaimCourierId) {
      setFeedback({
        kind: "error",
        text: "Paket zimmetlemek için yukarıdan bir kurye seçmelisiniz.",
      });
      return;
    }

    setClaimingId(benchItem.id);
    setFeedback(null);

    try {
      const bodyPayload =
        canManageDispatch && targetClaimCourierId
          ? { courierId: targetClaimCourierId, startRoute: false }
          : { startRoute: false };

      const res = await fetch(`/api/orders/${benchItem.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;

      if (res.status === 409) {
        setFeedback({
          kind: "error",
          text: json?.error || `${benchItem.orderNumber} az önce başka bir kurye tarafından alındı.`,
        });
        await fetchDispatch({ silent: true });
        return;
      }

      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Paket üzerinize alınamadı.",
        });
        return;
      }

      setSelectedBenchIds((prev) => {
        if (!prev.has(benchItem.id)) return prev;
        const next = new Set(prev);
        next.delete(benchItem.id);
        return next;
      });
      setFeedback({
        kind: "success",
        text: `${benchItem.orderNumber} dağıtım listenize eklendi. Hazır olunca "Seferi Başlat"a basabilirsiniz.`,
      });
      await fetchDispatch({ silent: true });
    } catch {
      setFeedback({
        kind: "error",
        text: "Zimmetleme sırasında bağlantı hatası oluştu.",
      });
    } finally {
      setClaimingId(null);
    }
  };

  const handleBulkClaim = async (orderIds: string[]) => {
    if (orderIds.length === 0 || bulkClaiming) return;
    if (canManageDispatch && !targetClaimCourierId) {
      setFeedback({
        kind: "error",
        text: "Toplu zimmetlemek için yukarıdan bir kurye seçmelisiniz.",
      });
      return;
    }

    setBulkClaiming(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/orders/bulk/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: orderIds.slice(0, 50),
          ...(canManageDispatch && targetClaimCourierId ? { courierId: targetClaimCourierId } : {}),
          startRoute: false,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; claimedCount?: number; claimedIds?: string[]; skippedCount?: number }
        | null;

      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Seçili paketler zimmetlenemedi.",
        });
        await fetchDispatch({ silent: true });
        return;
      }

      const claimedSet = new Set(json?.claimedIds ?? orderIds);
      setSelectedBenchIds((prev) => {
        const next = new Set(Array.from(prev).filter((id) => !claimedSet.has(id)));
        return next;
      });
      setFeedback({
        kind: "success",
        text: `${json?.claimedCount ?? orderIds.length} paket dağıtım listenize alındı.`,
      });
      await fetchDispatch({ silent: true });
    } catch {
      setFeedback({
        kind: "error",
        text: "Toplu zimmetleme sırasında bağlantı hatası oluştu.",
      });
    } finally {
      setBulkClaiming(false);
    }
  };

  const handleUnclaimOrder = async (stop: DispatchStop) => {
    if (unclaimingId) return;
    setUnclaimingId(stop.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orders/${stop.id}/claim`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Paket tezgaha bırakılamadı.",
        });
        return;
      }
      setFeedback({
        kind: "success",
        text: `${stop.orderNumber} tezgaha bırakıldı.`,
      });
      await fetchDispatch({ silent: true });
    } catch {
      setFeedback({
        kind: "error",
        text: "Tezgaha bırakma sırasında bağlantı hatası oluştu.",
      });
    } finally {
      setUnclaimingId(null);
    }
  };

  const handleStartRoute = async (orderIds: string[]) => {
    if (orderIds.length === 0 || startingRoute) return;
    setStartingRoute(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/courier/start-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds,
          ...(canManageDispatch && targetClaimCourierId ? { courierId: targetClaimCourierId } : {}),
          date: selectedDate,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; updatedCount?: number; message?: string }
        | null;
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Sefer başlatılamadı.",
        });
        return;
      }
      setFeedback({
        kind: "success",
        text: json?.message || `${json?.updatedCount ?? orderIds.length} paket dağıtıma çıkarıldı.`,
      });
      await fetchDispatch({ silent: true });
    } catch {
      setFeedback({
        kind: "error",
        text: "Sefer başlatılırken bağlantı hatası oluştu.",
      });
    } finally {
      setStartingRoute(false);
    }
  };

  const handleResetRouteOrder = async () => {
    if (!data || data.myStops.length === 0 || reordering) return;
    setReordering(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/courier/route-order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset: true,
          orderedIds: data.myStops.map((s) => s.id),
          ...(canManageDispatch && targetClaimCourierId ? { courierId: targetClaimCourierId } : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: json?.error || "Rota sırası sıfırlanamadı.",
        });
        return;
      }
      setFeedback({
        kind: "success",
        text: "Duraklar mahalle sırasına göre dizildi.",
      });
      await fetchDispatch({ silent: true });
    } catch {
      setFeedback({
        kind: "error",
        text: "Sıra sıfırlanırken bağlantı hatası oluştu.",
      });
    } finally {
      setReordering(false);
    }
  };

  const handleMoveStop = async (stopId: string, direction: "up" | "down") => {
    if (!data || reordering) return;
    const currentIds = data.myStops.map((stop) => stop.id);
    const nextIds = moveStop(currentIds, stopId, direction);

    if (nextIds.every((id, idx) => id === currentIds[idx])) {
      return;
    }

    const byId = new Map(data.myStops.map((stop) => [stop.id, stop]));
    const reorderedStops = nextIds
      .map((id, idx): DispatchStop | null => {
        const stop = byId.get(id);
        return stop ? { ...stop, stopSequence: idx } : null;
      })
      .filter((stop): stop is DispatchStop => stop !== null);

    const previousStops = data.myStops;
    setData((prev) => (prev ? { ...prev, myStops: reorderedStops } : prev));
    setReordering(true);

    try {
      const res = await fetch("/api/courier/route-order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: nextIds }),
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
        setData((prev) => (prev ? { ...prev, myStops: previousStops } : prev));
        setFeedback({
          kind: "error",
          text: errJson?.error || "Durak sırası kaydedilemedi.",
        });
      }
    } catch {
      setData((prev) => (prev ? { ...prev, myStops: previousStops } : prev));
      setFeedback({
        kind: "error",
        text: "Bağlantı hatası nedeniyle durak sırası güncellenemedi.",
      });
    } finally {
      setReordering(false);
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx = idx;
    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % TAB_ITEMS.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + TAB_ITEMS.length) % TAB_ITEMS.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = TAB_ITEMS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(TAB_ITEMS[nextIdx].id);
    tabButtonRefs.current[nextIdx]?.focus();
  };

  const totalToCollect = useMemo(
    () =>
      (data?.myStops ?? []).reduce(
        (sum, stop) => sum + (stop.cariId ? 0 : Math.max(0, stop.remainingDue)),
        0,
      ),
    [data?.myStops],
  );

  const printOrders = useMemo(
    () => (data?.myStops ?? []).map((stop) => toPrintOrder(stop, selectedDate)),
    [data?.myStops, selectedDate],
  );

  const plannedStops = useMemo(
    () => (data?.myStops ?? []).filter((stop) => stop.status !== "kuryede"),
    [data?.myStops],
  );

  const benchClusters = useMemo(
    () =>
      clusterOrdersByNeighborhood(
        (data?.claimableBench ?? []).map((b) => ({
          id: b.id,
          neighborhood: b.neighborhood,
          deliveryAddress: b.address,
          deliveryMethod: b.deliveryMethod || "courier",
          status: b.status,
          courierId: null,
          items: b.items,
        })),
      ),
    [data?.claimableBench],
  );

  const activeCourierOnShift = data?.courier
    ? data.courier.isActive && data.courier.isOnShift
    : Boolean(data?.isOnShift ?? true);

  return (
    <div className="min-h-screen bg-[#F6EEDF] text-[#3B1E1A] print:bg-white">
      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-6 print:hidden">
        {/* Top Bar */}
        <header className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#6E5148] uppercase">
                EkmekLab Dağıtım Konsolu
              </p>
              <h1 className="mt-0.5 font-serif text-2xl font-bold text-[#B4532A] sm:text-3xl">
                Hibrit Kurye &amp; Saha Kasası
              </h1>
              <p className="mt-1 text-sm text-[#6E5148]">
                {formatTrDate(selectedDate)}
                {data?.courier ? ` · ${data.courier.displayName}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data?.courier && (
                <button
                  type="button"
                  disabled={shiftBusy || !data.courier.isActive}
                  onClick={() => void handleToggleShift()}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A] disabled:opacity-60 ${
                    activeCourierOnShift
                      ? "border-[#B4D3BC] bg-[#E5EFE7] text-[#1D5130] hover:bg-[#D5E7DA]"
                      : "border-[#E8C589] bg-[#FFF8EB] text-[#6B4211] hover:bg-[#F5E9CE]"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      activeCourierOnShift ? "bg-[#245A38]" : "bg-[#B4532A]"
                    }`}
                  />
                  {shiftBusy
                    ? "Güncelleniyor..."
                    : activeCourierOnShift
                      ? "Vardiyada · Kapat"
                      : "Vardiya Dışı · Vardiyayı Aç"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void fetchDispatch({ silent: true })}
                disabled={refreshing || loading}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#F3E8D5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A] disabled:opacity-60"
              >
                {refreshing ? "Yenileniyor..." : "Yenile"}
              </button>

              {data?.isAdmin && (
                <Link
                  href="/admin/ekip"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-4 text-sm font-semibold text-[#3B1E1A] transition hover:bg-[#FBF6EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A]"
                >
                  Ekip &amp; Kasa Yönetimi
                </Link>
              )}
            </div>
          </div>

          {/* Date & Optional Admin Courier Switcher */}
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#E2D3BD] pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(today, -1))}
                className={`min-h-11 rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A] ${
                  selectedDate === addDays(today, -1)
                    ? "border-[#B4532A] bg-[#B4532A] text-white"
                    : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F3E8D5]"
                }`}
              >
                Dün
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className={`min-h-11 rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A] ${
                  selectedDate === today
                    ? "border-[#B4532A] bg-[#B4532A] text-white"
                    : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F3E8D5]"
                }`}
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(today, 1))}
                className={`min-h-11 rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A] ${
                  selectedDate === addDays(today, 1)
                    ? "border-[#B4532A] bg-[#B4532A] text-white"
                    : "border-[#E2D3BD] bg-[#FBF6EC] text-[#3B1E1A] hover:bg-[#F3E8D5]"
                }`}
              >
                Yarın
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="dispatch-date-input" className="text-xs font-semibold text-[#6E5148]">
                Teslimat Tarihi
              </label>
              <input
                id="dispatch-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base font-mono text-[#3B1E1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A]"
              />
            </div>

            {canManageDispatch && data?.couriers && data.couriers.length > 0 && (
              <div className="flex flex-col gap-1">
                <label htmlFor="admin-courier-select" className="text-xs font-semibold text-[#6E5148]">
                  Yönetici Görünümü · Kurye Seç
                </label>
                <select
                  id="admin-courier-select"
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="min-h-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-base text-[#3B1E1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A]"
                >
                  <option value="all">Tüm Kuryeler</option>
                  {data.couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} {c.isOnShift ? "(Vardiyada)" : "(Vardiya Dışı)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {/* Offline / Pending Sync Banner */}
        {(!isOnline || queueLength > 0 || syncErrors.length > 0) && (
          <section
            aria-live="polite"
            className="mt-3 rounded-2xl border border-[#E8C589] bg-[#FFF8EB] p-4 text-[#5C3A0E] shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  {!isOnline
                    ? "İnternet bağlantısı yok — teslimatlar çevrimdışı kuyruğa alınır."
                    : `${queueLength} teslimat eşitleme bekliyor.`}
                </p>
                {syncErrors.length > 0 && (
                  <p className="mt-1 text-xs font-medium text-[#8E2B1B]">
                    Son eşitleme uyarısı: {syncErrors[0]}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {queueLength > 0 && isOnline && (
                  <button
                    type="button"
                    onClick={() => void syncQueue()}
                    disabled={isSyncing}
                    className="min-h-11 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white transition hover:bg-[#9C4421] disabled:opacity-60"
                  >
                    {isSyncing ? "Eşitleniyor..." : "Kuyruğu Eşitle"}
                  </button>
                )}
                {syncErrors.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSyncErrors}
                    className="min-h-11 rounded-xl border border-[#E8C589] bg-[#FFFFFF] px-3 text-sm font-semibold text-[#5C3A0E]"
                  >
                    Uyarıyı Kapat
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Inline Feedback Alert */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-sm ${
              feedback.kind === "success"
                ? "border-[#B4D3BC] bg-[#E5EFE7] text-[#1D5130]"
                : "border-[#E5B0A5] bg-[#FCECE9] text-[#7D2114]"
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="min-h-11 rounded-xl border border-current/20 bg-white/70 px-3 text-xs font-bold"
            >
              Kapat
            </button>
          </div>
        )}

        {/* Single-row Accessible Tabs (No wrapping, underline shape + color, no aria-controls) */}
        <nav aria-label="Kurye konsolu görünümleri" className="mt-4">
          <div
            role="tablist"
            aria-label="Kurye sekmeleri"
            className="flex flex-nowrap overflow-x-auto rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-1.5 shadow-sm"
          >
            {TAB_ITEMS.map((tab, idx) => {
              const selected = activeTab === tab.id;
              const badgeCount =
                tab.id === "stops"
                  ? (data?.myStops.length ?? 0)
                  : tab.id === "bench"
                    ? (data?.claimableBench.length ?? 0)
                    : null;

              return (
                <button
                  key={tab.id}
                  id={`courier-tab-${tab.id}`}
                  ref={(el) => {
                    tabButtonRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`flex min-h-12 shrink-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border-b-[3px] px-4 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A] ${
                    selected
                      ? "border-[#B4532A] bg-[#FFFFFF] text-[#3B1E1A] shadow-sm"
                      : "border-transparent text-[#6E5148] hover:bg-[#F3E8D5]/70 hover:text-[#3B1E1A]"
                  }`}
                >
                  <span>{tab.label}</span>
                  {badgeCount !== null && (
                    <span
                      className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs tabular-nums ${
                        selected
                          ? "bg-[#B4532A] text-white"
                          : "bg-[#E2D3BD] text-[#3B1E1A]"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Loading / Auth / Error States */}
        {loading && !data ? (
          <div className="mt-4 rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-[#3B1E1A]">
              Dağıtım ekranı yükleniyor...
            </p>
            <p className="mt-1 text-sm text-[#6E5148]">
              Duraklar, hazır tezgah ve kasa özeti getiriliyor.
            </p>
          </div>
        ) : errorMsg ? (
          <div className="mt-4 rounded-2xl border border-[#E5B0A5] bg-[#FFFFFF] p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold text-[#7D2114]">
              Dağıtım Konsolu Açılamadı
            </h2>
            <p className="mt-2 text-sm text-[#3B1E1A]">{errorMsg}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void fetchDispatch()}
                className="min-h-11 rounded-xl bg-[#B4532A] px-5 text-sm font-bold text-white"
              >
                Tekrar Dene
              </button>
              <Link
                href="/giris"
                className="inline-flex min-h-11 items-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-5 text-sm font-semibold text-[#3B1E1A]"
              >
                Giriş Sayfası
              </Link>
            </div>
          </div>
        ) : data ? (
          <>
            {/* TAB 1: DAĞITIM LİSTEM */}
            {activeTab === "stops" && (
              <section
                role="tabpanel"
                aria-labelledby="courier-tab-stops"
                className="mt-4 space-y-4"
              >
                {/* KPI Strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-3.5 shadow-sm">
                    <p className="text-xs font-semibold text-[#6E5148]">Kalan Durak</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#3B1E1A]">
                      {data.myStops.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-3.5 shadow-sm">
                    <p className="text-xs font-semibold text-[#6E5148]">Teslim Edilen</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#1D5130]">
                      {data.kasaSummary.deliveredCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-3.5 shadow-sm">
                    <p className="text-xs font-semibold text-[#6E5148]">Kalan Tahsilat</p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#B4532A]">
                      {formatCurrency(totalToCollect)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-3 shadow-sm">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={data.myStops.length === 0}
                      className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-3 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-50"
                    >
                      Etiket Yazdır
                    </button>
                    {data.myStops.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleResetRouteOrder()}
                        disabled={reordering}
                        className="min-h-11 w-full rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-50"
                      >
                        {reordering ? "Sıralanıyor..." : "Mahalle Sırasına Göre Diz"}
                      </button>
                    )}
                  </div>
                </div>

                {plannedStops.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D7A98B] bg-[#FFF4EC] p-4 shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-[#3B1E1A]">
                        {plannedStops.length} paket planlandı (henüz yola çıkmadı)
                      </p>
                      <p className="text-xs text-[#6E5148]">
                        Paketleri araca yüklediğinizde tek dokunuşla müşterilere yola çıktı durumuna geçirebilirsiniz.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={startingRoute}
                      onClick={() => void handleStartRoute(plannedStops.map((s) => s.id))}
                      className="min-h-12 w-full rounded-xl bg-[#B4532A] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#9C4421] disabled:opacity-60 sm:w-auto"
                    >
                      {startingRoute
                        ? "Sefer Başlatılıyor..."
                        : `🚀 Seferi Başlat (${plannedStops.length} Paketi Yola Çıkar)`}
                    </button>
                  </div>
                )}

                {selectedCourierId === "all" && canManageDispatch && (
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4 text-sm text-[#3B1E1A]">
                    <strong>Tüm Kuryeler</strong> görünümü açık. Üzerinize paket almak için yukarıdan
                    hedef kuryeyi seçebilirsiniz.
                  </div>
                )}

                {data.myStops.length === 0 ? (
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-8 text-center shadow-sm">
                    <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">
                      Aktif Dağıtım Durağınız Yok
                    </h2>
                    <p className="mt-2 text-sm text-[#6E5148]">
                      Hazır tezgahında bekleyen paket varsa sağdaki sekmeden tek dokunuşla
                      üzerinize alabilirsiniz.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("bench")}
                      className="mt-4 min-h-12 rounded-xl bg-[#B4532A] px-6 text-sm font-bold text-white transition hover:bg-[#9C4421]"
                    >
                      Hazır Tezgaha Geç ({data.claimableBench.length})
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.myStops.map((stop, idx) => {
                      const nav = getNavigationUrls(stop.address, stop.lat, stop.lng);
                      const isCari = Boolean(stop.cariId) || stop.paymentMethod === "cari";
                      const waDigits = waPhone(stop.customerPhone);
                      const waText = orderMessage("yolda", toPrintOrder(stop, selectedDate), {
                        window: stop.deliveryTimeWindow || "planlanan teslimat aralığı",
                        dateLabel: formatTrDate(selectedDate),
                      });
                      const hasGps = stop.lat !== null && stop.lng !== null;
                      const isOnRoute = stop.status === "kuryede";

                      return (
                        <article
                          key={stop.id}
                          className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-4 shadow-sm sm:p-5"
                        >
                          {/* Top Row: Stop Sequence + Order/Slip Numbers + Giant Amount Badge */}
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2D3BD] pb-3">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex min-h-9 items-center rounded-lg bg-[#3B1E1A] px-2.5 font-mono text-xs font-bold text-white">
                                  DURAK #{idx + 1}
                                </span>
                                <span className="font-mono text-xl font-extrabold tracking-tight text-[#3B1E1A] sm:text-2xl">
                                  {stop.orderNumber}
                                </span>
                                {stop.slipNumber && (
                                  <span className="inline-flex items-center rounded-lg border border-[#E2D3BD] bg-[#FBF6EC] px-2.5 py-1 font-mono text-sm font-bold text-[#3B1E1A]">
                                    {stop.slipNumber}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E5148]">
                                <span
                                  className={`rounded-md px-2 py-0.5 font-bold ${
                                    isOnRoute
                                      ? "bg-[#E5EFE7] text-[#1D5130]"
                                      : "bg-[#FFF8EB] text-[#6B4211]"
                                  }`}
                                >
                                  {isOnRoute
                                    ? "Yolda (Kuryede)"
                                    : `Planlanan · ${formatStatusLabel(stop.status)}`}
                                </span>
                                {stop.courierName && (
                                  <span className="rounded-md border border-[#E2D3BD] bg-[#FBF6EC] px-2 py-0.5 font-semibold text-[#3B1E1A]">
                                    Kurye: {stop.courierName}
                                  </span>
                                )}
                                {stop.deliveryTimeWindow && (
                                  <span className="font-mono font-semibold">
                                    Saat: {stop.deliveryTimeWindow}
                                  </span>
                                )}
                                <span
                                  className={`rounded-md px-2 py-0.5 font-mono font-semibold ${
                                    hasGps
                                      ? "bg-[#E5EFE7] text-[#1D5130]"
                                      : "bg-[#FBF6EC] text-[#6E5148]"
                                  }`}
                                >
                                  {hasGps
                                    ? `GPS Pin (${stop.lat?.toFixed(4)}, ${stop.lng?.toFixed(4)})`
                                    : "Adres Pini"}
                                </span>
                              </div>
                            </div>

                            {/* Move Up/Down + Collection Status Badge */}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label={`${stop.orderNumber} durağını yukarı al`}
                                  disabled={idx === 0 || reordering}
                                  onClick={() => void handleMoveStop(stop.id, "up")}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-base font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-40"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  aria-label={`${stop.orderNumber} durağını aşağı al`}
                                  disabled={idx === data.myStops.length - 1 || reordering}
                                  onClick={() => void handleMoveStop(stop.id, "down")}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-base font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-40"
                                >
                                  ↓
                                </button>
                              </div>

                              {isCari ? (
                                <div className="rounded-xl border border-[#C9B398] bg-[#EFE7DA] px-3.5 py-2 text-right">
                                  <p className="text-[11px] font-bold tracking-wide text-[#3B1E1A] uppercase">
                                    CARİ TESLİMAT
                                  </p>
                                  <p className="font-mono text-base font-extrabold tabular-nums text-[#3B1E1A]">
                                    {formatCurrency(stop.totalAmount)}
                                  </p>
                                  {stop.cariName && (
                                    <p className="text-xs font-semibold text-[#6E5148]">
                                      {stop.cariName}
                                    </p>
                                  )}
                                </div>
                              ) : stop.remainingDue > 0 ? (
                                <div className="rounded-xl bg-[#B4532A] px-3.5 py-2 text-right text-white">
                                  <p className="text-[11px] font-bold tracking-wide uppercase">
                                    TAHSİL EDİLECEK
                                  </p>
                                  <p className="font-mono text-lg font-extrabold tabular-nums">
                                    {formatCurrency(stop.remainingDue)}
                                  </p>
                                  <p className="text-[11px] font-medium text-[#FBF6EC]">
                                    {formatPaymentMethodLabel(stop.paymentMethod)}
                                  </p>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-[#B4D3BC] bg-[#E5EFE7] px-3.5 py-2 text-right text-[#1D5130]">
                                  <p className="text-[11px] font-bold tracking-wide uppercase">
                                    ÖDEMESİ ALINDI
                                  </p>
                                  <p className="font-mono text-lg font-extrabold tabular-nums">
                                    ₺0,00
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Customer, Phone, Address & Delivery Note */}
                          <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">
                                {stop.customerName}
                              </h2>
                              {stop.customerPhone && (
                                <span className="font-mono text-base font-bold text-[#3B1E1A]">
                                  {stop.customerPhone}
                                </span>
                              )}
                            </div>

                            <p className="text-base leading-relaxed text-[#3B1E1A]">
                              {stop.neighborhood && (
                                <span className="font-bold">{stop.neighborhood} — </span>
                              )}
                              {stop.address || "Adres bilgisi belirtilmemiş"}
                            </p>

                            {stop.deliveryNote && (
                              <div className="rounded-xl border border-[#E8C589] bg-[#FFF8EB] px-3.5 py-2.5 text-sm text-[#5C3A0E]">
                                <strong className="font-bold">Teslimat Notu: </strong>
                                {stop.deliveryNote}
                              </div>
                            )}
                          </div>

                          {/* Order Items */}
                          <div className="mt-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3">
                            <p className="text-xs font-bold tracking-wide text-[#6E5148] uppercase">
                              Paket Kalemleri ({stop.items.length})
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {stop.items.map((item, itemIdx) => (
                                <li
                                  key={`${stop.id}-item-${itemIdx}`}
                                  className="flex items-center justify-between gap-2 text-sm text-[#3B1E1A]"
                                >
                                  <span className="font-medium">
                                    <strong className="font-mono text-base font-extrabold tabular-nums">
                                      {item.quantity}x
                                    </strong>{" "}
                                    {item.productName}
                                    {item.unit ? ` (${item.unit})` : ""}
                                  </span>
                                  <span className="font-mono text-sm font-semibold tabular-nums text-[#6E5148]">
                                    {formatCurrency(item.totalPrice)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 1-Tap Quick Actions */}
                          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                            {stop.customerPhone ? (
                              <a
                                href={`tel:${stop.customerPhone}`}
                                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5]"
                              >
                                Müşteriyi Ara
                              </a>
                            ) : (
                              <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC]/60 px-3 text-sm font-semibold text-[#6E5148]">
                                Telefon Yok
                              </span>
                            )}

                            {waDigits ? (
                              <a
                                href={`https://wa.me/${waDigits}?text=${encodeURIComponent(waText)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#B4D3BC] bg-[#E5EFE7] px-3 text-sm font-bold text-[#1D5130] transition hover:bg-[#D5E7DA]"
                              >
                                WhatsApp (Yolda)
                              </a>
                            ) : (
                              <span className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC]/60 px-3 text-sm font-semibold text-[#6E5148]">
                                WA Yok
                              </span>
                            )}

                            <a
                              href={nav.google}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-3 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
                            >
                              Google Harita
                            </a>

                            <a
                              href={nav.apple}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-3 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
                            >
                              Apple Harita
                            </a>

                            <a
                              href={nav.yandex}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FFFFFF] px-3 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#FBF6EC]"
                            >
                              Yandex Harita
                            </a>
                          </div>

                          {/* Primary Deliver + Unclaim Actions */}
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => openDeliverModal(stop)}
                              className="min-h-12 flex-1 rounded-xl bg-[#245A38] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#1B452B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1E1A]"
                            >
                              Teslim Et &amp; Tahsilatı Kapat
                            </button>
                            {Boolean(stop.cariId) && (
                              <button
                                type="button"
                                onClick={() => setB2bDeliverStop(stop)}
                                className="min-h-12 rounded-xl border border-[#B4532A] bg-[#FBF6EC] px-4 text-sm font-bold text-[#8E3D1B] transition hover:bg-[#F3E2D4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1E1A]"
                              >
                                ✏️ Adet / İade / Kısmi Tahsilat
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={unclaimingId === stop.id}
                              onClick={() => void handleUnclaimOrder(stop)}
                              className="min-h-12 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-sm font-bold text-[#3B1E1A] transition hover:bg-[#F3E8D5] disabled:opacity-50"
                            >
                              {unclaimingId === stop.id ? "Bırakılıyor..." : "Tezgaha Bırak"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* Delivered Stops Today */}
                {data.deliveredStops.length > 0 && (
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4 shadow-sm sm:p-5">
                    <h2 className="font-serif text-lg font-bold text-[#3B1E1A]">
                      Bugün Teslim Edilenler ({data.deliveredStops.length})
                    </h2>
                    <ul className="mt-3 divide-y divide-[#E2D3BD]">
                      {data.deliveredStops.map((doneStop) => (
                        <li
                          key={doneStop.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#3B1E1A]">
                              {doneStop.orderNumber}
                            </span>
                            {doneStop.slipNumber && (
                              <span className="ml-2 rounded border border-[#E2D3BD] bg-white px-1.5 py-0.5 font-mono text-xs font-semibold text-[#3B1E1A]">
                                {doneStop.slipNumber}
                              </span>
                            )}
                            <span className="ml-2 font-semibold text-[#3B1E1A]">
                              {doneStop.customerName}
                            </span>
                            <span className="ml-2 text-xs text-[#6E5148]">
                              {doneStop.neighborhood}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#E5EFE7] px-2 py-0.5 text-xs font-bold text-[#1D5130]">
                              {doneStop.cariId ? "Cari" : formatPaymentMethodLabel(doneStop.paymentMethod)}
                            </span>
                            <span className="font-mono font-bold tabular-nums text-[#3B1E1A]">
                              {formatCurrency(doneStop.totalAmount)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: HAZIR TEZGAH — ÜZERİME AL */}
            {activeTab === "bench" && (
              <section
                role="tabpanel"
                aria-labelledby="courier-tab-bench"
                className="mt-4 space-y-4"
              >
                <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-4 shadow-sm sm:p-5">
                  <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">
                    Hazır Tezgah — Mahalle Kümelemeli Paketler
                  </h2>
                  <p className="mt-1 text-sm text-[#6E5148]">
                    Henüz kuryeye atanmamış paketleri mahalle veya bina bazında tek dokunuşla
                    üzerinize alabilirsiniz. Alınan paketler planlı listenize eklenir; hazır
                    olduğunuzda Dağıtım Listem sekmesinden <strong>Seferi Başlat</strong> diyebilirsiniz.
                  </p>
                  {!activeCourierOnShift && !canManageDispatch && (
                    <div className="mt-3 rounded-xl border border-[#E8C589] bg-[#FFF8EB] p-3 text-sm font-semibold text-[#5C3A0E]">
                      Vardiyanız şu an kapalı. Paketleri planlı olarak üzerinize alabilir veya
                      üst başlıktaki butondan vardiyanızı açabilirsiniz.
                    </div>
                  )}
                  {canManageDispatch && !targetClaimCourierId && (
                    <div className="mt-3 rounded-xl border border-[#E8C589] bg-[#FFF8EB] p-3 text-sm font-semibold text-[#5C3A0E]">
                      Tezgahtan paket zimmetlemek için yukarıdaki yönetici seçicisinden hedef bir
                      kurye seçin.
                    </div>
                  )}
                </div>

                {selectedBenchIds.size > 0 && (
                  <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3B1E1A] bg-[#3B1E1A] p-3.5 text-white shadow-md">
                    <span className="text-sm font-bold">
                      {selectedBenchIds.size} paket seçildi
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={bulkClaiming || (canManageDispatch && !targetClaimCourierId)}
                        onClick={() => void handleBulkClaim(Array.from(selectedBenchIds))}
                        className="min-h-11 rounded-xl bg-[#B4532A] px-4 text-sm font-bold text-white transition hover:bg-[#9C4421] disabled:opacity-60"
                      >
                        {bulkClaiming
                          ? "Alınıyor..."
                          : `Seçilen ${selectedBenchIds.size} Paketi Üzerime Al`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBenchIds(new Set())}
                        className="min-h-11 rounded-xl border border-white/25 px-3 text-xs font-semibold text-white/90 hover:bg-white/10"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                )}

                {data.claimableBench.length === 0 ? (
                  <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-8 text-center shadow-sm">
                    <p className="font-serif text-lg font-bold text-[#3B1E1A]">
                      Tezgahta bekleyen boş paket yok.
                    </p>
                    <p className="mt-1 text-sm text-[#6E5148]">
                      Yeni paketler hazırlandığında bu ekran gerçek zamanlı güncellenir.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {benchClusters.map((cluster) => {
                      const clusterItems = cluster.orderIds
                        .map((id) => data.claimableBench.find((b) => b.id === id))
                        .filter((item): item is BenchItem => item !== undefined);

                      return (
                        <section
                          key={cluster.neighborhood}
                          className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-3.5 shadow-sm sm:p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2D3BD] pb-3">
                            <div>
                              <h3 className="font-serif text-lg font-bold text-[#3B1E1A]">
                                {cluster.neighborhood}
                              </h3>
                              <p className="text-xs font-semibold text-[#6E5148]">
                                {cluster.totalOrders} paket · {cluster.totalUnits} adet ürün
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={
                                bulkClaiming || (canManageDispatch && !targetClaimCourierId)
                              }
                              onClick={() => void handleBulkClaim(cluster.orderIds)}
                              className="min-h-11 rounded-xl bg-[#3B1E1A] px-4 text-sm font-bold text-white transition hover:bg-[#522B25] disabled:opacity-50"
                            >
                              {bulkClaiming
                                ? "Alınıyor..."
                                : `Tüm Mahalleyi Üzerime Al (${cluster.orderIds.length})`}
                            </button>
                          </div>

                          {cluster.buildingClusters.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {cluster.buildingClusters.map((b) => (
                                <button
                                  key={b.key}
                                  type="button"
                                  disabled={
                                    bulkClaiming || (canManageDispatch && !targetClaimCourierId)
                                  }
                                  onClick={() => void handleBulkClaim(b.orderIds)}
                                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#D7A98B] bg-[#FFF4EC] px-3 text-xs font-bold text-[#3B1E1A] transition hover:bg-[#F9E6D8] disabled:opacity-50"
                                >
                                  <span>Aynı Bina ({b.count}):</span>
                                  <span className="max-w-[200px] truncate">{b.label}</span>
                                  <span className="text-[#8E3D1B]">· Hepsini Al</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 space-y-3">
                            {clusterItems.map((item) => {
                              const isCari = Boolean(item.cariId) || item.paymentMethod === "cari";
                              const busy = claimingId === item.id;
                              const checked = selectedBenchIds.has(item.id);

                              return (
                                <article
                                  key={item.id}
                                  className={`rounded-2xl border bg-[#FFFFFF] p-4 shadow-sm sm:p-5 ${
                                    checked ? "border-[#B4532A] ring-2 ring-[#B4532A]/25" : "border-[#E2D3BD]"
                                  }`}
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                      <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-[#E2D3BD] bg-[#FBF6EC]">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          aria-label={`${item.orderNumber} seçim`}
                                          onChange={(e) => {
                                            const nextChecked = e.target.checked;
                                            setSelectedBenchIds((prev) => {
                                              const next = new Set(prev);
                                              if (nextChecked) next.add(item.id);
                                              else next.delete(item.id);
                                              return next;
                                            });
                                          }}
                                          className="h-5 w-5 accent-[#B4532A]"
                                        />
                                      </label>
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-mono text-xl font-extrabold text-[#3B1E1A]">
                                            {item.orderNumber}
                                          </span>
                                          <span className="rounded-lg bg-[#F3E2D4] px-2.5 py-1 text-xs font-bold text-[#8E3D1B]">
                                            {formatStatusLabel(item.status)}
                                          </span>
                                          {item.deliveryTimeWindow && (
                                            <span className="font-mono text-xs font-semibold text-[#6E5148]">
                                              {item.deliveryTimeWindow}
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="mt-1.5 font-serif text-lg font-bold text-[#3B1E1A]">
                                          {item.customerName}
                                        </h4>
                                        <p className="text-sm text-[#6E5148]">
                                          {item.neighborhood ? `${item.neighborhood} · ` : ""}
                                          {item.address}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <span
                                        className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${
                                          isCari
                                            ? "border border-[#C9B398] bg-[#EFE7DA] text-[#3B1E1A]"
                                            : "bg-[#FBF6EC] text-[#3B1E1A]"
                                        }`}
                                      >
                                        {isCari
                                          ? `CARİ${item.cariName ? ` · ${item.cariName}` : ""}`
                                          : formatPaymentMethodLabel(item.paymentMethod)}
                                      </span>
                                      <p className="mt-1 font-mono text-xl font-extrabold tabular-nums text-[#3B1E1A]">
                                        {formatCurrency(item.totalAmount)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-3.5 py-2.5 text-sm text-[#3B1E1A]">
                                    <strong>Paket Özeti: </strong>
                                    {item.itemsSummary || "Kalem özeti yok"}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      busy ||
                                      bulkClaiming ||
                                      (canManageDispatch && !targetClaimCourierId)
                                    }
                                    onClick={() => void handleClaimOrder(item)}
                                    className="mt-3 min-h-12 w-full rounded-xl bg-[#B4532A] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#9C4421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1E1A] disabled:opacity-50"
                                  >
                                    {busy ? "Üzerinize Alınıyor..." : "Üzerime Al"}
                                  </button>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB 3: KASAM & SICAK SATIŞ */}
            {activeTab === "kasa" && (
              <section
                role="tabpanel"
                aria-labelledby="courier-tab-kasa"
                className="mt-4 space-y-4"
              >
                <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-4 shadow-sm sm:p-5">
                  <h2 className="font-serif text-xl font-bold text-[#3B1E1A]">
                    Günlük Kurye Kasa Özeti
                  </h2>
                  <p className="mt-1 text-sm text-[#6E5148]">
                    {formatTrDate(data.date)} teslimatlarından sunucu tarafından hesaplanan
                    beklenen tahsilatlar.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4">
                      <p className="text-xs font-semibold text-[#6E5148]">
                        Beklenen Nakit Tahsilat
                      </p>
                      <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[#3B1E1A]">
                        {formatCurrency(data.kasaSummary.cashExpected)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4">
                      <p className="text-xs font-semibold text-[#6E5148]">
                        Beklenen POS / Kart Tahsilatı
                      </p>
                      <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[#3B1E1A]">
                        {formatCurrency(data.kasaSummary.cardExpected)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4">
                      <p className="text-xs font-semibold text-[#6E5148]">
                        Cari Hesaba Teslim Edilen
                      </p>
                      <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[#3B1E1A]">
                        {formatCurrency(data.kasaSummary.cariDeliveredTotal)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-4">
                      <p className="text-xs font-semibold text-[#6E5148]">
                        Teslim Edilen Toplam Paket
                      </p>
                      <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-[#1D5130]">
                        {data.kasaSummary.deliveredCount} Adet
                      </p>
                    </div>
                  </div>

                  {data.kasaSummary.settlement ? (
                    <div className="mt-4 rounded-2xl border border-[#B4D3BC] bg-[#E5EFE7] p-4 text-sm text-[#1D5130]">
                      <p className="font-bold">Gün Sonu Kasa Mutabakatı Tamamlandı</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 font-mono tabular-nums">
                        <span>Teslim Nakit: {formatCurrency(data.kasaSummary.settlement.cashHandedOver)}</span>
                        <span>POS Slip: {formatCurrency(data.kasaSummary.settlement.cardSlipTotal)}</span>
                      </div>
                      {data.kasaSummary.settlement.note && (
                        <p className="mt-1.5 text-xs font-medium">
                          Not: {data.kasaSummary.settlement.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-[#E2D3BD] bg-[#FBF6EC] p-3.5 text-sm text-[#6E5148]">
                      Gün sonu kasa mutabakatı henüz kapatılmadı. Yönetici{" "}
                      <strong>/admin/ekip</strong> ekranından nakit ve POS slip teslimini onaylar.
                    </div>
                  )}
                </div>

                {/* B2B Hot Sale Action Card */}
                <div className="rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded-lg bg-[#F3E2D4] px-2.5 py-1 text-xs font-bold text-[#8E3D1B]">
                        B2B Araçtan Sıcak Satış
                      </span>
                      <h2 className="mt-2 font-serif text-xl font-bold text-[#3B1E1A]">
                        Şarküteri &amp; Kurumsal Sıcak Satış Fişi
                      </h2>
                      <p className="mt-1 text-sm text-[#6E5148]">
                        {data.b2bAccounts.length} aktif cari hesap ve {data.catalogProducts.length}{" "}
                        satışa açık ürün yüklendi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHotSaleModalOpen(true)}
                      disabled={data.b2bAccounts.length === 0}
                      className="min-h-12 rounded-xl bg-[#B4532A] px-5 text-base font-bold text-white shadow-sm transition hover:bg-[#9C4421] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1E1A] disabled:opacity-50"
                    >
                      Şarküteri Sıcak Satış Fişi Kes
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>

      {/* Print-only thermal labels (hidden while Sevk İrsaliyesi modal is open) */}
      {data && printOrders.length > 0 && !hotSaleModalOpen && !b2bDeliverStop && (
        <DeliveryLabels orders={printOrders} date={selectedDate} />
      )}

      {/* Native <dialog> — Delivery Confirmation & Payment */}
      <dialog
        ref={deliverDialogRef}
        aria-labelledby="deliver-dialog-title"
        className="m-auto w-[min(94vw,32rem)] rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:overflow-hidden backdrop:bg-[#3B1E1A]/45 backdrop:overscroll-contain"
      >
        {deliverStop && (
          <form onSubmit={handleConfirmDelivery} className="max-h-[90dvh] overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2D3BD] pb-3">
              <div>
                <p className="font-mono text-sm font-bold text-[#6E5148]">
                  {deliverStop.orderNumber}
                </p>
                <h2 id="deliver-dialog-title" className="font-serif text-xl font-bold text-[#3B1E1A]">
                  Teslimatı Tamamla — {deliverStop.customerName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeDeliverModal("cancel")}
                className="min-h-11 min-w-11 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] text-sm font-bold text-[#3B1E1A]"
              >
                Kapat
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#6E5148]">Sipariş Toplamı</span>
                <span className="font-mono text-base font-bold tabular-nums text-[#3B1E1A]">
                  {formatCurrency(deliverStop.totalAmount)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-[#6E5148]">Kapıda Kalan Tahsilat</span>
                <span className="font-mono text-lg font-extrabold tabular-nums text-[#B4532A]">
                  {deliverStop.cariId ? "Cari Hesaba İşlenir" : formatCurrency(deliverStop.remainingDue)}
                </span>
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className="text-xs font-bold tracking-wide text-[#6E5148] uppercase">
                Tahsilat Şekli Seçin
              </legend>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    { value: "cash", label: "Nakit Tahsil Edildi" },
                    { value: "pos", label: "Kapıda POS / Kart" },
                    { value: "transfer", label: "Havale / EFT" },
                    {
                      value: "unpaid",
                      label: deliverStop.cariId
                        ? "Cari Hesaba Borç İşle"
                        : "Tahsilatsız / Önceden Ödendi",
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
                      deliverPayment === opt.value
                        ? "border-[#B4532A] bg-[#F3E2D4] text-[#3B1E1A]"
                        : "border-[#E2D3BD] bg-[#FFFFFF] text-[#6E5148]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryPayment"
                      value={opt.value}
                      checked={deliverPayment === opt.value}
                      onChange={() => setDeliverPayment(opt.value)}
                      className="h-4 w-4 accent-[#B4532A]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <label htmlFor="delivery-confirm-note" className="block text-xs font-bold text-[#6E5148]">
                Teslimat / Kasa Notu (Opsiyonel)
              </label>
              <textarea
                id="delivery-confirm-note"
                rows={2}
                value={deliverNote}
                onChange={(e) => setDeliverNote(e.target.value)}
                placeholder="Örn: Resepsiyona bırakıldı, pos slibi alındı..."
                className="mt-1.5 w-full rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] p-3 text-base text-[#3B1E1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4532A]"
              />
            </div>

            {deliverModalError && (
              <div className="mt-3 rounded-xl border border-[#E5B0A5] bg-[#FCECE9] p-3 text-sm font-semibold text-[#7D2114]">
                {deliverModalError}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => closeDeliverModal("cancel")}
                disabled={deliverBusy}
                className="min-h-12 flex-1 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] px-4 text-sm font-bold text-[#3B1E1A]"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                autoFocus
                disabled={deliverBusy}
                className="min-h-12 flex-[2] rounded-xl bg-[#245A38] px-5 text-base font-bold text-white transition hover:bg-[#1B452B] disabled:opacity-60"
              >
                {deliverBusy ? "Kaydediliyor..." : "Teslimatı Onayla"}
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Faz 4 — B2B Araçtan Sıcak Satış & Sevk İrsaliyesi Modalı */}
      <B2BHotSaleModal
        open={hotSaleModalOpen}
        onClose={() => setHotSaleModalOpen(false)}
        accounts={data?.b2bAccounts ?? []}
        products={data?.catalogProducts ?? []}
        isAdmin={data?.isAdmin ?? false}
        delivererName={data?.courier?.displayName}
        onCompleted={() => {
          void fetchDispatch({ silent: true });
        }}
      />

      {/* Faz 7 — Kapıda Esnek B2B Teslimat, İade & Kısmi Tahsilat Modalı */}
      <B2BFlexibleDeliveryModal
        stop={b2bDeliverStop}
        onClose={() => setB2bDeliverStop(null)}
        accounts={data?.b2bAccounts ?? []}
        products={data?.catalogProducts ?? []}
        isAdmin={data?.isAdmin ?? false}
        onCompleted={() => {
          setFeedback({
            kind: "success",
            text: "Esnek B2B teslimat & cari kaydı tamamlandı.",
          });
          void fetchDispatch({ silent: true });
        }}
      />
    </div>
  );
}
