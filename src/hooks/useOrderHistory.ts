"use client";

import { useState, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Order, OrderItem } from "@/types";
import { OrderStatusHistoryEntry, StatusChangedByRole } from "@/types/orderStatusHistory";
import { AdminOrderStatus } from "@/types/admin";
import { normalizeOrderStatus, normalizePaymentMethod } from "./useAdminOrders";
import { getErrorMessage } from "@/lib/utils/error";

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
  subtotal?: number | string | null;
  shipping_fee?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;
  payment_method?: string | null;
  delivery_date?: string | null;
  order_notes?: string | null;
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
  user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  order_items?: RawOrderItemRow[];
}

interface RawStatusHistoryRow {
  id: string;
  order_id: string;
  from_status?: string | null;
  to_status: string;
  changed_by_role: string;
  changed_by_id?: string | null;
  note?: string | null;
  created_at: string;
}

export function useOrderHistory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const mapOrder = (o: RawOrderRow): Order => {
    const items: OrderItem[] = (o.order_items || []).map((it) => ({
      productId: it.product_id || "",
      productName: it.product_name || "Ürün",
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      totalPrice: Number(it.total_price) || 0,
      imageUrl: it.image_url || undefined,
      weight: it.weight || undefined,
    }));

    return {
      id: o.id,
      orderNumber: o.order_number || o.id.replace("ORD-", "").toUpperCase(),
      customerName: o.customer_name || "Müşteri",
      phone: o.phone || "",
      deliveryAddress: o.delivery_address || "",
      items,
      subtotal: Number(o.subtotal) || 0,
      shippingFee: Number(o.shipping_fee) || 0,
      totalAmount: Number(o.total_amount) || 0,
      status: normalizeOrderStatus(o.status || undefined),
      paymentMethod: normalizePaymentMethod(o.payment_method || undefined),
      deliveryDate: o.delivery_date || undefined,
      orderNotes: o.order_notes || "",
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
      userId: o.user_id || null,
      createdAt: o.created_at,
      updatedAt: o.updated_at || undefined,
    };
  };

  // Müşterinin kendi geçmiş siparişlerini getir
  const fetchMyOrders = useCallback(
    async (userId: string, limit = 20, offset = 0): Promise<{ orders: Order[]; totalCount: number }> => {
      if (!supabase || !isSupabaseConfigured() || !userId) {
        return { orders: [], totalCount: 0 };
      }

      setLoading(true);
      setError(null);

      try {
        const { data, count, error: fetchErr } = await supabase
          .from("orders")
          .select("*, order_items(*)", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (fetchErr) throw fetchErr;

        const rawList = (data as unknown as RawOrderRow[]) || [];
        return {
          orders: rawList.map(mapOrder),
          totalCount: count ?? rawList.length,
        };
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        console.error("fetchMyOrders error:", err);
        setError(msg);
        return { orders: [], totalCount: 0 };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Admin için müşteri davranış/sipariş geçmişi
  const fetchCustomerOrders = useCallback(
    async (
      identifier: { userId?: string; phone?: string },
      limit = 30,
      offset = 0
    ): Promise<{ orders: Order[]; totalCount: number }> => {
      if (!supabase || !isSupabaseConfigured()) {
        return { orders: [], totalCount: 0 };
      }

      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("orders")
          .select("*, order_items(*)", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (identifier.userId) {
          query = query.eq("user_id", identifier.userId);
        } else if (identifier.phone) {
          query = query.eq("phone", identifier.phone);
        } else {
          return { orders: [], totalCount: 0 };
        }

        const { data, count, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        const rawList = (data as unknown as RawOrderRow[]) || [];
        return {
          orders: rawList.map(mapOrder),
          totalCount: count ?? rawList.length,
        };
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        console.error("fetchCustomerOrders error:", err);
        setError(msg);
        return { orders: [], totalCount: 0 };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Belirli bir siparişin durum geçmişini getir
  const fetchStatusHistory = useCallback(
    async (orderId: string): Promise<OrderStatusHistoryEntry[]> => {
      if (!supabase || !isSupabaseConfigured() || !orderId) {
        return [];
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });

        if (fetchErr) throw fetchErr;
        if (!data) return [];

        const rawList = data as unknown as RawStatusHistoryRow[];
        return rawList.map((row) => ({
          id: row.id,
          orderId: row.order_id,
          fromStatus: (row.from_status as AdminOrderStatus) || null,
          toStatus: (row.to_status as AdminOrderStatus) || "bekliyor",
          changedByRole: (row.changed_by_role as StatusChangedByRole) || "system",
          changedById: row.changed_by_id ?? null,
          note: row.note ?? null,
          createdAt: row.created_at,
        }));
      } catch (err: unknown) {
        console.error("fetchStatusHistory error:", err);
        return [];
      }
    },
    [supabase]
  );

  return {
    loading,
    error,
    fetchMyOrders,
    fetchCustomerOrders,
    fetchStatusHistory,
  };
}
