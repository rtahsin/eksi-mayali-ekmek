"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
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

  useEffect(() => {
    // 1. If Supabase is configured, use Supabase Realtime
    const supabase = createClient();
    if (supabase && isSupabaseConfigured()) {
      const fetchSupabaseOrders = async () => {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .order("created_at", { ascending: false });

          if (data && !error) {
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
                source: "web",
                orderNotes: o.order_notes || "",
                courierNotes: "",
                createdAt: o.created_at,
                updatedAt: o.updated_at,
              };
            });
            setOrders(list);
            setLoading(false);
          }
        } catch (e) {
          console.warn("Supabase orders error:", e);
        }
      };

      fetchSupabaseOrders();

      const channel = supabase
        .channel("admin-orders-realtime")
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

    // 2. Fallback to Firestore 'siparisler'
    try {
      const ordersRef = collection(db, "siparisler");
      const q = query(ordersRef, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: AdminOrder[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // Extract items
            const rawItems = Array.isArray(data.items) ? data.items : [];
            const items = rawItems.map((it: any) => ({
              productId: it.productId || it.id || "",
              productName: it.productName || it.name || "Ürün",
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unitPrice || it.price) || 0,
              totalPrice: Number(it.totalPrice || (it.quantity * it.price)) || 0,
              imageUrl: it.imageUrl,
              weight: it.weight,
            }));

            // Calculate date string (YYYY-MM-DD)
            let deliveryDate = data.deliveryDate;
            if (!deliveryDate && data.createdAt) {
              try {
                const d = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                deliveryDate = d.toISOString().split("T")[0];
              } catch {
                deliveryDate = new Date().toISOString().split("T")[0];
              }
            }
            if (!deliveryDate) {
              deliveryDate = new Date().toISOString().split("T")[0];
            }

            list.push({
              id: docSnap.id,
              orderNumber: data.orderNumber || docSnap.id.substring(0, 6).toUpperCase(),
              customerName: data.customerName || data.name || "İsimsiz Müşteri",
              phone: data.phone || data.customerPhone || "",
              deliveryAddress: data.deliveryAddress || data.address || "",
              neighborhood: data.neighborhood || extractNeighborhood(data.deliveryAddress || data.address || ""),
              deliveryMethod: data.deliveryMethod === "pickup" ? "pickup" : "courier",
              deliveryDate,
              deliveryTimeWindow: data.deliveryTimeWindow || "14:00 - 18:00",
              items,
              subtotal: Number(data.subtotal) || Number(data.amount) || 0,
              shippingFee: Number(data.shippingFee) || 0,
              totalAmount: Number(data.totalAmount || data.amount) || 0,
              status: normalizeOrderStatus(data.status),
              paymentMethod: normalizePaymentMethod(data.paymentMethod),
              paymentStatus: data.paymentStatus || (data.status === "completed" ? "paid" : "pending"),
              source: (data.source as OrderSource) || "web",
              cariId: data.cariId,
              orderNotes: data.orderNotes || data.notes || "",
              courierNotes: data.courierNotes || "",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          });

          setOrders(list);
          setLoading(false);
        },
        (err) => {
          console.error("Orders listener error:", err);
          setError("Siparişler yüklenirken bir hata oluştu.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: AdminOrderStatus, courierNotes?: string) => {
    try {
      const supabase = createClient();
      if (supabase && isSupabaseConfigured()) {
        try {
          await supabase
            .from("orders")
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", orderId);
        } catch (e) {
          console.warn("Supabase status update error:", e);
        }
      }

      try {
        const orderRef = doc(db, "siparisler", orderId);
        const updateData: any = {
          status: newStatus,
          updatedAt: serverTimestamp(),
        };
        if (courierNotes !== undefined) {
          updateData.courierNotes = courierNotes;
        }
        if (newStatus === "teslim_edildi") {
          updateData.paymentStatus = "paid";
          updateData.deliveredAt = serverTimestamp();
        }
        await updateDoc(orderRef, updateData);
      } catch (e) {}

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
      const ordersRef = collection(db, "siparisler");
      const subtotal = (orderData.items || []).reduce((sum, it) => sum + it.totalPrice, 0);
      const shippingFee = orderData.deliveryMethod === "pickup" ? 0 : subtotal >= 1000 ? 0 : 150;
      const totalAmount = subtotal + shippingFee;

      const newOrder = {
        orderNumber: `EK-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: orderData.customerName || "Müşteri",
        phone: orderData.phone || "",
        deliveryAddress: orderData.deliveryAddress || "Atölye Teslim",
        neighborhood: orderData.neighborhood || "",
        deliveryMethod: orderData.deliveryMethod || "courier",
        deliveryDate: orderData.deliveryDate || new Date().toISOString().split("T")[0],
        deliveryTimeWindow: orderData.deliveryTimeWindow || "14:00 - 18:00",
        items: orderData.items || [],
        subtotal,
        shippingFee,
        totalAmount,
        status: orderData.status || "bekliyor",
        paymentMethod: orderData.paymentMethod || "cash_on_delivery",
        paymentStatus: orderData.paymentStatus || "pending",
        source: orderData.source || "whatsapp",
        cariId: orderData.cariId || null,
        orderNotes: orderData.orderNotes || "",
        courierNotes: orderData.courierNotes || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(ordersRef, newOrder);
      return { success: true, id: docRef.id };
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
