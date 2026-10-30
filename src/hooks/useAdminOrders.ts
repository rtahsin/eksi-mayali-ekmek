"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminOrder, AdminOrderStatus, AdminPaymentMethod, OrderSource } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { addDays, istanbulToday, normalizeDeliveryDate } from "@/lib/time/istanbul";
import { computeShippingFee } from "@/lib/settings/schema";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { defaultDeliveryPayment, deliverOrder, type DeliveryPayment } from "@/lib/orders/delivery";
import { mergeOrders, OPEN_STATUSES, orderSearchFilter } from "@/lib/orders/orderQueries";

export function normalizeOrderStatus(rawStatus?: string): AdminOrderStatus {
  if (!rawStatus) return "bekliyor";
  const s = rawStatus.toLowerCase().trim();
  if (s === "pending" || s === "bekliyor") return "bekliyor";
  if (s === "processing" || s === "hazirlaniyor") return "hazirlaniyor";
  if (s === "firinda" || s === "baking") return "firinda";
  if (s === "kuryede" || s === "on_delivery" || s === "in_transit") return "kuryede";
  if (s === "completed" || s === "teslim_edildi" || s === "delivered") return "teslim_edildi";
  if (s === "cancelled" || s === "iptal") return "iptal";
  return "bekliyor";
}

export function normalizePaymentMethod(rawMethod?: string): AdminPaymentMethod {
  if (!rawMethod) return "cash_on_delivery";
  const m = rawMethod.toLowerCase().trim();
  if (m === "pos_at_door" || m === "kapida_pos" || m === "pos") return "pos_at_door";
  if (m === "online" || m === "credit_card" || m === "kredi_karti") return "online";
  if (m === "transfer" || m === "havale" || m === "eft") return "transfer";
  if (m === "cari" || m === "veresiye" || m === "b2b") return "cari";
  return "cash_on_delivery";
}

interface RawOrderItemRow {
  product_id?: string | null;
  product_name?: string | null;
  quantity?: number | null;
  unit_price?: number | string | null;
  total_price?: number | string | null;
  image_url?: string | null;
  weight?: number | null;
}

interface RawOrderRow {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  delivery_address?: string | null;
  neighborhood?: string | null;
  delivery_method?: string | null;
  delivery_date?: string | null;
  delivery_time_window?: string | null;
  subtotal?: number | string | null;
  shipping_fee?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  source?: string | null;
  order_notes?: string | null;
  courier_notes?: string | null;
  courier_id?: string | null;
  assigned_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: "customer" | "admin" | "system" | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  location_shared?: boolean | null;
  location_consent_at?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  estimated_delivery?: string | null;
  user_id?: string | null;
  idempotency_key?: string | null;
  cari_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  order_items?: RawOrderItemRow[];
}

interface UseAdminOrdersOptions {
  /** Son kaç sipariş (varsayılan 300). Açık ve tahsil edilmemiş siparişler bu sınırdan bağımsız hep yüklenir. */
  limit?: number;
  /** Tüm geçmiş (Müşteriler): sayfa sayfa hepsi yüklenir. */
  history?: boolean;
}

/** Veritabanı satırı → AdminOrder */
function toAdminOrder(o: RawOrderRow): AdminOrder {
    const items = (o.order_items || []).map((it) => ({
      productId: it.product_id || "",
      productName: it.product_name || "Ürün",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      totalPrice: Number(it.total_price) || 0,
      imageUrl: it.image_url || undefined,
      weight: it.weight || undefined,
    }));

    // Eski "today"/"tomorrow"/"custom:" kayıtları sipariş anına göre ISO tarihe çevrilir (K1)
    const d = normalizeDeliveryDate(o.delivery_date, o.created_at);

    return {
      id: o.id,
      orderNumber: o.order_number || o.id.replace("ORD-", "").toUpperCase(),
      customerName: o.customer_name || "İsimsiz Müşteri",
      phone: o.phone || "",
      deliveryAddress: o.delivery_address || "",
      neighborhood: o.neighborhood || extractNeighborhood(o.delivery_address || ""),
      deliveryMethod: o.delivery_method === "pickup" ? "pickup" : "courier",
      deliveryDate: d,
      deliveryTimeWindow: o.delivery_time_window || undefined,
      items,
      subtotal: Number(o.subtotal) || 0,
      shippingFee: Number(o.shipping_fee) || 0,
      totalAmount: Number(o.total_amount) || 0,
      status: normalizeOrderStatus(o.status || undefined),
      paymentMethod: normalizePaymentMethod(o.payment_method || undefined),
      paymentStatus: (o.payment_status as "paid" | "pending" | "on_delivery") || (o.status === "teslim_edildi" ? "paid" : "pending"),
      source: (o.source as OrderSource) || "web",
      courierId: o.courier_id || null,
      assignedAt: o.assigned_at || null,
      deliveredAt: o.delivered_at || null,
      cancelledAt: o.cancelled_at || null,
      cancelReason: o.cancel_reason || null,
      cancelledBy: o.cancelled_by || null,
      customerLat: o.customer_lat ?? null,
      customerLng: o.customer_lng ?? null,
      locationShared: !!o.location_shared,
      locationConsentAt: o.location_consent_at || null,
      deliveryLat: o.delivery_lat ?? null,
      deliveryLng: o.delivery_lng ?? null,
      estimatedDelivery: o.estimated_delivery || null,
      userId: o.user_id || null,
      idempotencyKey: o.idempotency_key || null,
      cariId: o.cari_id || undefined,
      orderNotes: o.order_notes || "",
      courierNotes: o.courier_notes || "",
      createdAt: o.created_at,
      updatedAt: o.updated_at || undefined,
    };
}

const PAGE = 1000;
const HISTORY_MAX = 20000;

export function useAdminOrders(options: UseAdminOrdersOptions = {}) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Arama ve detay için sunucudan ayrıca getirilen (son N'in dışındaki) siparişler
  const [extra, setExtra] = useState<AdminOrder[]>([]);
  const extraIds = useRef<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"bugun" | "yarin" | "hepsi">("bugun");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const supabase = createClient();
  const { settings: storeSettings } = useStoreSettings();

  const fetchSupabaseOrders = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const select = "*, order_items(*)";
    try {
      let recent: RawOrderRow[];
      if (options.history) {
        recent = [];
        for (let from = 0; from < HISTORY_MAX; from += PAGE) {
          const { data, error } = await supabase
            .from("orders")
            .select(select)
            .order("created_at", { ascending: false })
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const rows = (data ?? []) as unknown as RawOrderRow[];
          recent.push(...rows);
          if (rows.length < PAGE) break;
        }
      } else {
        const { data, error } = await supabase
          .from("orders")
          .select(select)
          .order("created_at", { ascending: false })
          .limit(options.limit ?? 300);
        if (error) throw error;
        recent = (data ?? []) as unknown as RawOrderRow[];
      }

      // Son N'in dışında kalsa da kaybolmaması gerekenler: açık işler ve parası alınmamış teslimler
      const [open, uncollected, again] = await Promise.all([
        supabase.from("orders").select(select).in("status", [...OPEN_STATUSES]),
        supabase
          .from("orders")
          .select(select)
          .eq("status", "teslim_edildi")
          .is("cari_id", null)
          .or("payment_status.is.null,payment_status.neq.paid"),
        extraIds.current.length
          ? supabase.from("orders").select(select).in("id", extraIds.current)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const err = open.error || uncollected.error || again.error;
      if (err) throw err;

      const map = (rows: unknown) => ((rows ?? []) as RawOrderRow[]).map(toAdminOrder);
      setOrders(mergeOrders(map(recent), map(open.data), map(uncollected.data)));
      setExtra(map(again.data));
      setError(null);
    } catch (e: unknown) {
      console.error("Supabase orders error:", e);
      setError("Siparişler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [supabase, options.history, options.limit]);

  // Son N'in dışındaki siparişleri sunucudan getirip listeye katar (sonraki yenilemelerde de güncel tutulur)
  const addExtra = useCallback((rows: unknown) => {
    const found = ((rows ?? []) as RawOrderRow[]).map(toAdminOrder);
    if (found.length === 0) return 0;
    extraIds.current = [...new Set([...extraIds.current, ...found.map((o) => o.id)])];
    setExtra((prev) => mergeOrders(prev, found));
    return found.length;
  }, []);

  /** Aramada eşleşen eski siparişler (ad, sipariş no, telefon). */
  const searchOrders = useCallback(
    async (query: string) => {
      const filter = orderSearchFilter(query);
      if (!supabase || !filter) return 0;
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .or(filter)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.warn("Sipariş araması:", error.message);
        return 0;
      }
      return addExtra(data);
    },
    [supabase, addExtra]
  );

  /** Detay sayfası: listede olmayan siparişi kimlik ya da sipariş numarasıyla getirir. */
  const loadOrder = useCallback(
    async (idOrNumber: string) => {
      if (!supabase || !/^[\w-]{1,80}$/.test(idOrNumber)) return false;
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .or(`id.eq.${idOrNumber},order_number.eq.${idOrNumber}`)
        .limit(1);
      if (error) return false;
      return addExtra(data) > 0;
    },
    [supabase, addExtra]
  );

  const allOrders = useMemo(() => mergeOrders(extra, orders), [extra, orders]);

  useEffect(() => {
    fetchSupabaseOrders();

    if (supabase && isSupabaseConfigured()) {
      const channelId = `admin-orders-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          () => {
            fetchSupabaseOrders();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments" },
          () => {
            fetchSupabaseOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchSupabaseOrders]);

  // Durum değişikliği sunucuda: ara durumlar /status, teslim /deliver (ödeme + cari tek işlem), iptal /cancel.
  // Teslimde ödeme şekli verilmezse siparişin ödeme yöntemi tahsil edilmiş sayılır.
  const updateOrderStatus = async (
    orderId: string,
    newStatus: AdminOrderStatus,
    opts: { note?: string; payment?: DeliveryPayment } = {}
  ): Promise<{ success: boolean; error?: string }> => {
    const currentOrder = orders.find((o) => o.id === orderId);
    const note = opts.note;
    try {
      if (newStatus === "teslim_edildi") {
        const payment = opts.payment ?? defaultDeliveryPayment(currentOrder?.paymentMethod, Boolean(currentOrder?.cariId));
        const res = await deliverOrder(orderId, payment, note);
        if (!res.ok) throw new Error(res.error || "Teslim kaydedilemedi");
      } else {
        const url = newStatus === "iptal" ? `/api/orders/${encodeURIComponent(orderId)}/cancel` : `/api/orders/${encodeURIComponent(orderId)}/status`;
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newStatus === "iptal" ? { reason: note || "Fırın iptal etti" } : { status: newStatus, note }),
        });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = (data as { error?: unknown } | null)?.error;
          throw new Error(typeof msg === "string" ? msg : "Durum güncellenemedi");
        }
      }
      await fetchSupabaseOrders();
      return { success: true };
    } catch (err: unknown) {
      console.error("Update order error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Assign courier to order (API üzerinden tek-yazar, P1-09)
  const assignCourier = async (
    orderId: string,
    courierId: string,
    _adminId?: string
  ) => {
    try {
      const currentOrder = orders.find((o) => o.id === orderId);
      if (currentOrder && (currentOrder.status === "teslim_edildi" || currentOrder.status === "iptal")) {
        return {
          success: false,
          error: `'${currentOrder.status}' durumundaki bir siparişe kurye atanamaz.`,
        };
      }

      const res = await fetch(`/api/orders/${orderId}/assign-courier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierId,
          status: "kuryede",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Kurye ataması başarısız oldu.",
        };
      }

      const nowIso = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, courierId, assignedAt: nowIso, status: "kuryede" }
            : o
        )
      );

      return { success: true };
    } catch (err: unknown) {
      console.error("Assign courier error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Cancel order flow
  const cancelOrder = async (orderId: string, reason: string) => {
    return updateOrderStatus(orderId, "iptal", { note: reason });
  };

  // Manuel sipariş: sunucuda tek atomik RPC (numara, kalemler, geçmiş). Cari borcu teslimde yazılır.
  const createManualOrder = async (orderData: Partial<AdminOrder> & { idempotencyKey?: string }) => {
    try {
      const subtotal = (orderData.items || []).reduce((sum, it) => sum + it.totalPrice, 0);
      const shippingFee = orderData.shippingFee ?? computeShippingFee(subtotal, storeSettings);
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: orderData.idempotencyKey || crypto.randomUUID(),
          customerName: orderData.customerName || "",
          phone: orderData.phone || "",
          deliveryAddress: orderData.deliveryAddress || "",
          neighborhood: orderData.neighborhood || "",
          deliveryMethod: orderData.deliveryMethod === "pickup" ? "pickup" : "courier",
          deliveryDate: orderData.deliveryDate || istanbulToday(),
          deliveryTimeWindow: orderData.deliveryTimeWindow || undefined,
          items: (orderData.items || []).map((it) => ({
            productId: it.productId,
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            ...(it.imageUrl ? { imageUrl: it.imageUrl } : {}),
            ...(it.weight ? { weight: it.weight } : {}),
          })),
          shippingFee,
          paymentMethod: orderData.paymentMethod === "online" ? "transfer" : orderData.paymentMethod || "cash_on_delivery",
          source: orderData.source || "phone",
          status: orderData.status === "bekliyor" ? "bekliyor" : "hazirlaniyor",
          ...(orderData.cariId ? { cariId: orderData.cariId } : {}),
          orderNotes: orderData.orderNotes || "",
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const rec = (data && typeof data === "object" ? data : {}) as { id?: string; orderNumber?: string; error?: string };
      if (!res.ok || !rec.id) throw new Error(rec.error || "Sipariş kaydedilemedi");

      fetchSupabaseOrders();
      return { success: true, id: rec.id, orderNumber: rec.orderNumber };
    } catch (err: unknown) {
      console.error("Create manual order error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Date constants
  // İstanbul takvimi (UTC değil); sayfa açık kalsa da gece yarısı ilerler
  const todayStr = useIstanbulToday();
  const tomorrowStr = useMemo(() => addDays(todayStr, 1), [todayStr]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const searching = searchQuery.trim().length > 0;
    return allOrders.filter((order) => {
      // Tarih filtresi; arama tüm tarihlerde yapılır
      if (!searching && dateFilter === "bugun" && order.deliveryDate !== todayStr) return false;
      if (!searching && dateFilter === "yarin" && order.deliveryDate !== tomorrowStr) return false;

      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase("tr").trim();
        const digits = q.replace(/\D/g, "");
        const matchesName = order.customerName.toLocaleLowerCase("tr").includes(q);
        const matchesPhone = digits.length >= 3 && order.phone.replace(/\D/g, "").includes(digits);
        const matchesOrderNo = order.orderNumber?.toLocaleLowerCase("tr").includes(q);
        const matchesNeighborhood = order.neighborhood?.toLocaleLowerCase("tr").includes(q);
        if (!matchesName && !matchesPhone && !matchesOrderNo && !matchesNeighborhood) return false;
      }

      return true;
    });
  }, [allOrders, statusFilter, dateFilter, searchQuery, todayStr, tomorrowStr]);


  return {
    orders: filteredOrders,
    allOrders,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    searchQuery,
    setSearchQuery,
    updateOrderStatus,
    assignCourier,
    cancelOrder,
    createManualOrder,
    refetch: fetchSupabaseOrders,
    searchOrders,
    loadOrder,
  };
}

function extractNeighborhood(address: string): string {
  const lower = address.toLowerCase();
  if (lower.includes("adnan kahveci")) return "Adnan Kahveci";
  if (lower.includes("barış") || lower.includes("baris")) return "Barış";
  if (lower.includes("büyükşehir") || lower.includes("buyuksehir")) return "Büyükşehir";
  if (lower.includes("cumhuriyet")) return "Cumhuriyet";
  if (lower.includes("dereağzı") || lower.includes("dereagzi")) return "Dereağzı";
  if (lower.includes("gürpınar") || lower.includes("gurpinar")) return "Gürpınar";
  if (lower.includes("kavaklı") || lower.includes("kavakli")) return "Kavaklı";
  if (lower.includes("marmara")) return "Marmara";
  if (lower.includes("sahil")) return "Sahil";
  if (lower.includes("yakuplu")) return "Yakuplu";
  if (lower.includes("beykent")) return "Beykent";
  return "Beylikdüzü";
}
