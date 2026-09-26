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

      // B2B Entegrasyonu: Eğer cariId varsa ve ödeme tamamlandıysa cari_hareketi oluştur
      if (data.cariId && paymentStatus === "completed") {
        try {
          // Cari hesabın güncel bakiyesini al
          const { data: cariData } = await supabase
            .from("current_accounts")
            .select("balance")
            .eq("id", data.cariId)
            .single();

          const currentBal = Number(cariData?.balance) || 0;
          // Simetrik bakiye ilkesi: Tahsilat (-) bakiyeyi düşürür
          const newBalanceAfter = currentBal - data.amount;

          // Ardışık fiş numarası
          const yymm = `${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          const slipNumber = `FİŞ-${yymm}-${Math.floor(100 + Math.random() * 900)}`;

          const { data: txInserted, error: txErr } = await supabase
            .from("account_transactions")
            .insert({
              account_id: data.cariId,
              type: "tahsilat",
              amount: data.amount,
              description: data.note || `Sipariş Tahsilatı (${data.orderId})`,
              payment_method: data.method === "cash" ? "nakit" : data.method === "pos" ? "kredi_karti" : "banka_havale",
              order_id: data.orderId,
              slip_number: slipNumber,
              balance_after: newBalanceAfter,
              date: nowIso.split("T")[0],
            })
            .select("id")
            .single();

          if (!txErr && txInserted) {
            cariTransactionId = (txInserted as { id: string }).id;
            // Cari bakiyesini güncelle
            await supabase
              .from("current_accounts")
              .update({ balance: newBalanceAfter, updated_at: nowIso })
              .eq("id", data.cariId);
          }
        } catch (cariEx: unknown) {
          console.warn("Cari transaction creation notice:", cariEx);
        }
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

  // B2B Sipariş Teslim Edildiğinde Cari Borç Hareketi Yaz
  const recordOrderDeliveryDebt = async (params: {
    orderId: string;
    cariId: string;
    totalAmount: number;
    orderNumber?: string;
    description?: string;
  }) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      // 1. Zaten bu sipariş için satış borcu yazılmış mı kontrol et (idempotency)
      const { data: existingTx } = await supabase
        .from("account_transactions")
        .select("id")
        .eq("order_id", params.orderId)
        .eq("type", "satis")
        .limit(1);

      if (existingTx && existingTx.length > 0) {
        return { success: true, message: "Cari borcu zaten kayıtlı" };
      }

      // 2. Güncel cari bakiyesini çek
      const { data: cariData, error: cariErr } = await supabase
        .from("current_accounts")
        .select("balance")
        .eq("id", params.cariId)
        .single();

      if (cariErr || !cariData) {
        return { success: false, error: "Cari hesap bulunamadı" };
      }

      const currentBalance = Number(cariData.balance) || 0;
      // Simetrik bakiye ilkesi: Borç (+) bakiyeyi artırır
      const newBalanceAfter = currentBalance + params.totalAmount;
      const nowIso = new Date().toISOString();
      const slipNumber = params.orderNumber || `FİŞ-${nowIso.slice(2, 4)}${nowIso.slice(5, 7)}-${Math.floor(100 + Math.random() * 900)}`;

      // 3. account_transactions'a satis (borç) kaydı ekle
      const { error: txErr } = await supabase.from("account_transactions").insert({
        account_id: params.cariId,
        type: "satis",
        amount: params.totalAmount,
        description: params.description || `B2B Sipariş Teslimatı (#${params.orderNumber || params.orderId})`,
        payment_method: "veresiye",
        order_id: params.orderId,
        slip_number: slipNumber,
        balance_after: newBalanceAfter,
        date: nowIso.split("T")[0],
      });

      if (txErr) throw txErr;

      // 4. Cari güncel bakiyesini güncelle
      await supabase
        .from("current_accounts")
        .update({ balance: newBalanceAfter, updated_at: nowIso })
        .eq("id", params.cariId);

      return { success: true, newBalance: newBalanceAfter };
    } catch (err: unknown) {
      console.error("recordOrderDeliveryDebt error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Sipariş İptal Edildiğinde / Düzeltildiğinde Storno (Ters Kayıt) Aç
  const recordOrderStorno = async (params: {
    orderId: string;
    cariId: string;
    amount: number;
    reason: string;
  }) => {
    try {
      if (!supabase) return { success: false, error: "Supabase bağlantısı yok" };

      const { data: cariData } = await supabase
        .from("current_accounts")
        .select("balance")
        .eq("id", params.cariId)
        .single();

      const currentBalance = Number(cariData?.balance) || 0;
      // Storno: Satış borcunu düşürür (-)
      const newBalanceAfter = currentBalance - params.amount;
      const nowIso = new Date().toISOString();

      await supabase.from("account_transactions").insert({
        account_id: params.cariId,
        type: "storno",
        amount: params.amount,
        description: `İPTAL / STORNO: ${params.reason} (${params.orderId})`,
        payment_method: "diger",
        order_id: params.orderId,
        slip_number: `STR-${nowIso.slice(2, 4)}${nowIso.slice(5, 7)}-${Math.floor(100 + Math.random() * 900)}`,
        balance_after: newBalanceAfter,
        date: nowIso.split("T")[0],
      });

      await supabase
        .from("current_accounts")
        .update({ balance: newBalanceAfter, updated_at: nowIso })
        .eq("id", params.cariId);

      return { success: true, newBalance: newBalanceAfter };
    } catch (err: unknown) {
      console.error("recordOrderStorno error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  return {
    payments,
    loading,
    error,
    createPayment,
    updatePaymentStatus,
    recordOrderDeliveryDebt,
    recordOrderStorno,
    fetchPaymentsByOrder,
    fetchCourierDailyPayments,
    refetch: fetchPayments,
  };
}
