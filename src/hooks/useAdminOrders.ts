"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminOrder, AdminOrderStatus, AdminPaymentMethod, OrderSource } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";

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
  limit?: number;
}

export function useAdminOrders(options: UseAdminOrdersOptions = {}) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"bugun" | "yarin" | "hepsi">("bugun");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const supabase = createClient();

  const fetchSupabaseOrders = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(300);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase orders error:", error);
        setError("Siparişler yüklenirken hata oluştu.");
      } else if (data) {
        const rawList = data as unknown as RawOrderRow[];
        const list: AdminOrder[] = rawList.map((o) => {
          const items = (o.order_items || []).map((it) => ({
            productId: it.product_id || "",
            productName: it.product_name || "Ürün",
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.total_price) || 0,
            imageUrl: it.image_url || undefined,
            weight: it.weight || undefined,
          }));

          const d =
            o.delivery_date ||
            (o.created_at
              ? new Date(o.created_at).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]);

          return {
            id: o.id,
            orderNumber: o.order_number || o.id.replace("ORD-", "").toUpperCase(),
            customerName: o.customer_name || "İsimsiz Müşteri",
            phone: o.phone || "",
            deliveryAddress: o.delivery_address || "",
            neighborhood: o.neighborhood || extractNeighborhood(o.delivery_address || ""),
            deliveryMethod: o.delivery_method === "pickup" ? "pickup" : "courier",
            deliveryDate: d,
            deliveryTimeWindow: "14:00 - 18:00",
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
        });
        setOrders(list);
      }
    } catch (e: unknown) {
      console.warn("Supabase orders exception:", e);
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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

  // Update order status with audit log (order_status_history)
  const updateOrderStatus = async (
    orderId: string,
    newStatus: AdminOrderStatus,
    courierNotes?: string,
    changedByRole: "system" | "admin" | "courier" | "customer" = "admin",
    changedById?: string,
    note?: string
  ) => {
    try {
      const currentOrder = orders.find((o) => o.id === orderId);
      if (currentOrder && (currentOrder.status === "teslim_edildi" || currentOrder.status === "iptal") && currentOrder.status !== newStatus) {
        return {
          success: false,
          error: `'${currentOrder.status}' durumundaki bir sipariş nihai durumdadır ve değiştirilemez.`,
        };
      }
      const nowIso = new Date().toISOString();

      if (supabase && isSupabaseConfigured()) {
        const updatePayload: Record<string, unknown> = {
          status: newStatus,
          updated_at: nowIso,
        };

        if (courierNotes !== undefined) {
          updatePayload.courier_notes = courierNotes;
        }

        if (newStatus === "teslim_edildi") {
          updatePayload.delivered_at = nowIso;
          updatePayload.payment_status = "paid";
        } else if (newStatus === "iptal") {
          updatePayload.cancelled_at = nowIso;
          updatePayload.cancelled_by = changedByRole;
          if (note) updatePayload.cancel_reason = note;
        }

        let updateQuery = supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", orderId);

        if (currentOrder?.status) {
          updateQuery = updateQuery.eq("status", currentOrder.status);
        }

        const { error: updateErr } = await updateQuery;

        if (updateErr) throw updateErr;

        // Audit Trail (order_status_history)
        await supabase.from("order_status_history").insert({
          order_id: orderId,
          from_status: currentOrder?.status || null,
          to_status: newStatus,
          changed_by_role: changedByRole,
          changed_by_id: changedById || null,
          note: note || courierNotes || null,
        });
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                deliveredAt: newStatus === "teslim_edildi" ? nowIso : o.deliveredAt,
                paymentStatus: newStatus === "teslim_edildi" ? "paid" : o.paymentStatus,
                cancelledAt: newStatus === "iptal" ? nowIso : o.cancelledAt,
                cancelReason: newStatus === "iptal" && note ? note : o.cancelReason,
                cancelledBy: newStatus === "iptal" ? (changedByRole === "courier" ? "admin" : changedByRole) : o.cancelledBy,
                courierNotes: courierNotes !== undefined ? courierNotes : o.courierNotes,
              }
            : o
        )
      );
      return { success: true };
    } catch (err: unknown) {
      console.error("Update order error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Assign courier to order
  const assignCourier = async (
    orderId: string,
    courierId: string,
    adminId?: string
  ) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };
      const currentOrder = orders.find((o) => o.id === orderId);
      if (currentOrder && (currentOrder.status === "teslim_edildi" || currentOrder.status === "iptal")) {
        return {
          success: false,
          error: `'${currentOrder.status}' durumundaki bir siparişe kurye atanamaz.`,
        };
      }
      const nowIso = new Date().toISOString();

      let updateQuery = supabase
        .from("orders")
        .update({
          courier_id: courierId,
          assigned_at: nowIso,
          status: "kuryede",
          updated_at: nowIso,
        })
        .eq("id", orderId);

      if (currentOrder?.status) {
        updateQuery = updateQuery.eq("status", currentOrder.status);
      }

      const { error: updateErr } = await updateQuery;

      if (updateErr) throw updateErr;

      // Audit log
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        from_status: orders.find((o) => o.id === orderId)?.status || null,
        to_status: "kuryede",
        changed_by_role: "admin",
        changed_by_id: adminId || null,
        note: `Kuryeye atandı (Kurye ID: ${courierId})`,
      });

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
  const cancelOrder = async (
    orderId: string,
    reason: string,
    cancelledBy: "admin" | "customer" | "system" = "admin",
    userId?: string
  ) => {
    return updateOrderStatus(orderId, "iptal", undefined, cancelledBy, userId, reason);
  };

  // Create manual/WhatsApp order
  const createManualOrder = async (orderData: Partial<AdminOrder>) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      const subtotal = (orderData.items || []).reduce((sum, it) => sum + it.totalPrice, 0);
      const shippingFee = subtotal >= 1000 ? 0 : 150;
      const totalAmount = subtotal + shippingFee;
      const orderId = crypto.randomUUID();

      // Generate sequential collision-free order number SIP-YYMM-XXX
      let generatedOrderNumber = orderData.orderNumber;
      if (!generatedOrderNumber) {
        try {
          const { data: numData } = await supabase.rpc("generate_order_number");
          if (numData) {
            generatedOrderNumber = numData;
          }
        } catch (rpcErr) {
          console.warn("generate_order_number RPC error:", rpcErr);
        }
        if (!generatedOrderNumber) {
          const now = new Date();
          const yymm = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
          const randomSuffix = Math.floor(100 + Math.random() * 900);
          generatedOrderNumber = `SIP-${yymm}-${randomSuffix}`;
        }
      }

      const { error: insErr } = await supabase.from("orders").insert({
        id: orderId,
        order_number: generatedOrderNumber,
        customer_name: orderData.customerName || "Müşteri",
        phone: orderData.phone || "",
        delivery_address: orderData.deliveryAddress || "",
        neighborhood: orderData.neighborhood || "",
        delivery_method: "courier",
        delivery_date: orderData.deliveryDate || new Date().toISOString().split("T")[0],
        status: orderData.status || "bekliyor",
        payment_method: orderData.paymentMethod || "cash_on_delivery",
        payment_status: orderData.paymentStatus || "pending",
        source: orderData.source || "admin",
        subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        order_notes: orderData.orderNotes || "",
        courier_notes: orderData.courierNotes || "",
        courier_id: orderData.courierId || null,
        cari_id: orderData.cariId || null,
      });

      if (insErr) throw insErr;

      // Status history entry for order creation
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        from_status: null,
        to_status: orderData.status || "bekliyor",
        changed_by_role: "admin",
        note: "Manuel sipariş oluşturuldu",
      });

      if (orderData.items && orderData.items.length > 0) {
        const itemInserts = orderData.items.map((it) => ({
          order_id: orderId,
          product_id: it.productId,
          product_name: it.productName,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
          image_url: it.imageUrl || null,
          weight: it.weight || null,
        }));
        await supabase.from("order_items").insert(itemInserts);
      }

      fetchSupabaseOrders();
      return { success: true, id: orderId, orderNumber: generatedOrderNumber };
    } catch (err: unknown) {
      console.error("Create manual order error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Date constants
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    return tm.toISOString().split("T")[0];
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Date filter
      if (dateFilter === "bugun" && order.deliveryDate !== todayStr) return false;
      if (dateFilter === "yarin" && order.deliveryDate !== tomorrowStr) return false;

      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.phone.includes(q);
        const matchesOrderNo = order.orderNumber?.toLowerCase().includes(q);
        const matchesNeighborhood = order.neighborhood?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesOrderNo && !matchesNeighborhood) return false;
      }

      return true;
    });
  }, [orders, statusFilter, dateFilter, searchQuery, todayStr, tomorrowStr]);

  // Statistics
  const stats = useMemo(() => {
    const todayOrders = orders.filter((o) => o.deliveryDate === todayStr && o.status !== "iptal");
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalToday: todayOrders.length,
      todayRevenue,
      pendingCount: orders.filter((o) => o.status === "bekliyor").length,
      processingCount: orders.filter((o) => o.status === "hazirlaniyor").length,
      bakingCount: orders.filter((o) => o.status === "firinda").length,
      courierCount: orders.filter((o) => o.status === "kuryede").length,
      completedTodayCount: todayOrders.filter((o) => o.status === "teslim_edildi").length,
    };
  }, [orders, todayStr]);

  return {
    orders: filteredOrders,
    allOrders: orders,
    loading,
    error,
    stats,
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
