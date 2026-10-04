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

  // Yeni ödeme oluştur
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
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      let cariTransactionId: string | null = null;
      const paymentStatus = data.status || "completed";
      const nowIso = new Date().toISOString();
      const paidAt = data.paidAt || (paymentStatus === "completed" ? nowIso : null);

      // Cari siparişte alınan ödeme → cari defterine TAHSİLAT (sunucuda, atomik).
      // "Cariye yaz" (method: cari) ödeme değildir; borç zaten satış fişiyle yazılır.
      const LEDGER_METHOD: Record<Exclude<PaymentMethodType, "cari">, "nakit" | "pos" | "banka_havale"> = {
        cash: "nakit",
        pos: "pos",
        online_card: "pos",
        transfer: "banka_havale",
      };
      if (data.cariId && paymentStatus === "completed" && data.method !== "cari") {
        const res = await fetch("/api/admin/cari/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "tahsilat",
            accountId: data.cariId,
            amount: data.amount,
            paymentMethod: LEDGER_METHOD[data.method],
            description: data.note || "Teslimatta tahsilat",
            orderId: data.orderId,
          }),
        });
        const body: unknown = await res.json().catch(() => null);
        const rec = (body && typeof body === "object" ? body : {}) as { transactionId?: string; error?: string };
        if (!res.ok || !rec.transactionId) throw new Error(rec.error || "Cari tahsilatı kaydedilemedi");
        cariTransactionId = rec.transactionId;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("payments")
        .insert({
          order_id: data.orderId,
          amount: data.amount,
          method: data.method,
          status: paymentStatus,
          paid_at: paidAt,
          collected_by: data.collectedBy || null,
          courier_id: data.courierId || null,
          transaction_ref: data.transactionRef || null,
          cari_transaction_id: cariTransactionId,
          note: data.note || null,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      // Siparişin payment_status alanını güncelle
      if (paymentStatus === "completed") {
        await supabase
          .from("orders")
          .update({ payment_status: "paid", updated_at: nowIso })
          .eq("id", data.orderId);
      }

      if (inserted) {
        const newPayment = mapPaymentRow(inserted as unknown as RawPaymentRow);
        setPayments((prev) => [newPayment, ...prev]);
        return { success: true, payment: newPayment };
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Create payment error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Ödeme durumu güncelle
  const updatePaymentStatus = async (
    paymentId: string,
    status: PaymentStatusType,
    paidAt?: string
  ) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };
      const nowIso = new Date().toISOString();

      const payload: Record<string, unknown> = {
        status,
        updated_at: nowIso,
      };

      if (status === "completed") {
        payload.paid_at = paidAt || nowIso;
      }

      const { error: updErr } = await supabase
        .from("payments")
        .update(payload)
        .eq("id", paymentId);

      if (updErr) throw updErr;

      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status, paidAt: status === "completed" ? (paidAt || nowIso) : p.paidAt }
            : p
        )
      );

      return { success: true };
    } catch (err: unknown) {
      console.error("Update payment status error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
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
