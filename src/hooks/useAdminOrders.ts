"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminOrder, AdminOrderStatus, AdminPaymentMethod, OrderSource } from "@/types/admin";

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

export function useAdminOrders() {
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
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase orders error:", error);
        setError("Siparişler yüklenirken hata oluştu.");
      } else if (data) {
        const list: AdminOrder[] = data.map((o: any) => {
          const items = (o.order_items || []).map((it: any) => ({
            productId: it.product_id || "",
            productName: it.product_name || "Ürün",
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.total_price) || 0,
            imageUrl: it.image_url,
            weight: it.weight,
          }));

          const d =
            o.delivery_date ||
            (o.created_at
              ? new Date(o.created_at).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]);

          return {
            id: o.id,
            orderNumber: o.id.replace("ORD-", "").toUpperCase(),
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
            status: normalizeOrderStatus(o.status),
            paymentMethod: normalizePaymentMethod(o.payment_method),
            paymentStatus: o.status === "teslim_edildi" ? "paid" : "pending",
            source: "web" as OrderSource,
            orderNotes: o.order_notes || "",
            courierNotes: "",
            createdAt: o.created_at,
            updatedAt: o.updated_at,
          };
        });
        setOrders(list);
      }
    } catch (e: any) {
      console.warn("Supabase orders exception:", e);
      setError(e.message);
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
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchSupabaseOrders]);

  // Update order status
  const updateOrderStatus = async (
    orderId: string,
    newStatus: AdminOrderStatus,
    _courierNotes?: string
  ) => {
    try {
      if (supabase && isSupabaseConfigured()) {
        await supabase
          .from("orders")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", orderId);
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      return { success: true };
    } catch (err: any) {
      console.error("Update order error:", err);
      return { success: false, error: err.message };
    }
  };

  // Create manual/WhatsApp order
  const createManualOrder = async (orderData: Partial<AdminOrder>) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      const subtotal = (orderData.items || []).reduce((sum, it) => sum + it.totalPrice, 0);
      const shippingFee = orderData.deliveryMethod === "pickup" ? 0 : subtotal >= 1000 ? 0 : 150;
      const totalAmount = subtotal + shippingFee;
      const orderId = `ORD-${Date.now().toString().slice(-6)}`;

      const { error: insErr } = await (supabase as any).from("orders").insert({
        id: orderId,
        customer_name: orderData.customerName || "Müşteri",
        phone: orderData.phone || "",
        delivery_address: orderData.deliveryAddress || "Atölye Teslim",
        neighborhood: orderData.neighborhood || "",
        delivery_method: orderData.deliveryMethod || "courier",
        delivery_date: orderData.deliveryDate || new Date().toISOString().split("T")[0],
        status: orderData.status || "bekliyor",
        payment_method: orderData.paymentMethod || "cash_on_delivery",
        subtotal,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        order_notes: orderData.orderNotes || "",
      });

      if (insErr) throw insErr;

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
        await (supabase as any).from("order_items").insert(itemInserts);
      }

      fetchSupabaseOrders();
      return { success: true, id: orderId };
    } catch (err: any) {
      console.error("Create manual order error:", err);
      return { success: false, error: err.message };
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
    createManualOrder,
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
