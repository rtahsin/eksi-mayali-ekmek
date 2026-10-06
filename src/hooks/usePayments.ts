"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  Payment,
  PaymentMethodType,
  PaymentStatusType,
  PaymentCollectedBy,
} from "@/types/payment";
import { getErrorMessage } from "@/lib/utils/error";

interface RawPaymentRow {
  id: string;
  order_id: string;
  amount: number | string;
  method: string;
  status: string;
  paid_at?: string | null;
  collected_by?: string | null;
  courier_id?: string | null;
  transaction_ref?: string | null;
  cari_transaction_id?: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export function usePayments(orderIdFilter?: string) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const mapPaymentRow = useCallback((row: RawPaymentRow): Payment => {
    return {
      id: row.id,
      orderId: row.order_id,
      amount: Number(row.amount) || 0,
      method: (row.method as PaymentMethodType) || "cash",
      status: (row.status as PaymentStatusType) || "pending",
      paidAt: row.paid_at ?? null,
      collectedBy: (row.collected_by as PaymentCollectedBy) ?? null,
      courierId: row.courier_id ?? null,
      transactionRef: row.transaction_ref ?? null,
      cariTransactionId: row.cari_transaction_id ?? null,
      note: row.note ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? undefined,
    };
  }, []);

  const fetchPayments = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (orderIdFilter) {
        query = query.eq("order_id", orderIdFilter);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) {
        console.error("Fetch payments error:", fetchErr);
        setError("Ödemeler yüklenirken hata oluştu.");
      } else if (data) {
        const rawList = data as unknown as RawPaymentRow[];
        setPayments(rawList.map(mapPaymentRow));
      }
    } catch (err: unknown) {
      console.warn("Fetch payments exception:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase, orderIdFilter, mapPaymentRow]);

  useEffect(() => {
    fetchPayments();

    if (supabase && isSupabaseConfigured()) {
      const channelId = `payments-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments" },
          () => {
            fetchPayments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchPayments]);

  // Siparişe göre ödemeleri getir
  const fetchPaymentsByOrder = async (orderId: string): Promise<Payment[]> => {
    if (!supabase) return [];
    try {
      const { data, error: err } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (err) throw err;
      if (!data) return [];
      const rawList = data as unknown as RawPaymentRow[];
      return rawList.map(mapPaymentRow);
    } catch (e: unknown) {
      console.error("fetchPaymentsByOrder error:", e);
      return [];
    }
  };

  // Kuryenin günlük tahsilatları
  const fetchCourierDailyPayments = async (courierId: string, dateStr?: string): Promise<Payment[]> => {
    if (!supabase) return [];
    try {
      const targetDate = dateStr || new Date().toISOString().split("T")[0];
      const startIso = `${targetDate}T00:00:00.000Z`;
      const endIso = `${targetDate}T23:59:59.999Z`;

      const { data, error: err } = await supabase
        .from("payments")
        .select("*")
        .eq("courier_id", courierId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false });

      if (err) throw err;
      if (!data) return [];
      const rawList = data as unknown as RawPaymentRow[];
      return rawList.map(mapPaymentRow);
    } catch (e: unknown) {
      console.error("fetchCourierDailyPayments error:", e);
      return [];
    }
  };

  // Yeni ödeme oluştur (API üzerinden tek-yazar, P1-09)
  const createPayment = async (data: {
    orderId: string;
    amount: number;
    method: PaymentMethodType;
    status?: PaymentStatusType;
    paidAt?: string | null;
    collectedBy?: PaymentCollectedBy;
    courierId?: string | null;
    transactionRef?: string | null;
    note?: string | null;
    cariId?: string | null;
  }) => {
    try {
      const paymentStatus = data.status || "completed";
      const nowIso = new Date().toISOString();
      const paidAt = data.paidAt || (paymentStatus === "completed" ? nowIso : null);

      const res = await fetch(`/api/admin/orders/${data.orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: data.amount,
          method: data.method,
          status: paymentStatus,
          paidAt,
          collectedBy: data.collectedBy || "admin",
          courierId: data.courierId || null,
          transactionRef: data.transactionRef || null,
          note: data.note || null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: body.error || "Ödeme kaydedilemedi",
        };
      }

      const rpcData = body.data || {};
      const newPayment: Payment = {
        id: rpcData.payment_id || `temp-${Date.now()}`,
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        status: paymentStatus,
        paidAt,
        collectedBy: data.collectedBy || "admin",
        courierId: data.courierId || null,
        transactionRef: data.transactionRef || null,
        cariTransactionId: rpcData.cari_transaction_id || null,
        note: data.note || null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setPayments((prev) => [newPayment, ...prev]);
      return { success: true, payment: newPayment };
    } catch (err: unknown) {
      console.error("Create payment error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Ödeme durumu güncelle (tek yazar: doğrudan istemci yazımı kapalıdır)
  const updatePaymentStatus = async (
    _paymentId: string,
    _status: PaymentStatusType,
    _paidAt?: string
  ) => {
    console.warn("Direct client-side payment status update is deprecated (single-writer rule).");
    return { success: false, error: "İstemciden doğrudan ödeme güncelleme yetkisi kapalıdır." };
  };

  return {
    payments,
    loading,
    error,
    createPayment,
    updatePaymentStatus,
    fetchPaymentsByOrder,
    fetchCourierDailyPayments,
    refetch: fetchPayments,
  };
}
