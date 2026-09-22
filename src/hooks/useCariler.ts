"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount, CariTransaction } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";

export function useCariler() {
  const [cariler, setCariler] = useState<CariAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCariler = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: supaErr } = await supabase!
        .from("current_accounts")
        .select("*")
        .order("name", { ascending: true });

      if (supaErr) throw supaErr;

      if (data) {
        const mapped: CariAccount[] = data.map((d: any) => {
          const isExpense = d.type === "gider" || (d.name && d.name.toLowerCase().includes("gider"));
          return {
            id: d.id,
            businessName: d.name || "İsimsiz Cari",
            contactPerson: d.type || "",
            phone: d.phone || "",
            address: d.address || "",
            neighborhood: "",
            taxNumber: d.tax_id || "",
            taxOffice: "",
            balance: Number(d.balance) || 0,
            accountType: isExpense ? "gider" : "musteri",
            customPrices: d.custom_prices || {},
            notes: d.status || "",
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          };
        });
        setCariler(mapped);
      }
    } catch (err: unknown) {
      console.error("Cariler fetch error:", err);
      setError("Cari hesaplar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCariler();

    if (supabase && isSupabaseConfigured()) {
      const channelId = `admin-cariler-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "current_accounts" },
          () => {
            fetchCariler();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchCariler]);

  // Create new Cari with optional initial opening balance
  const addCari = async (
    data: Omit<CariAccount, "id" | "createdAt" | "balance"> & { initialBalance?: number }
  ) => {
    try {
      const newId = `cari_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const balance = Number(data.initialBalance) || 0;

      // Optimistic update
      const newObj: CariAccount = {
        ...data,
        id: newId,
        balance,
        accountType: data.accountType || (data.businessName.toLowerCase().includes("gider") ? "gider" : "musteri"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCariler((prev) => [...prev, newObj]);

      if (supabase) {
        const { error: insErr } = await supabase!.from("current_accounts").insert({
          id: newId,
          name: data.businessName,
          type: data.accountType || data.contactPerson || "customer",
          phone: data.phone || "",
          address: data.address || "",
          tax_id: data.taxNumber || "",
          balance: balance,
          credit_limit: 0,
          status: "active",
          custom_prices: data.customPrices || {},
        });
        if (insErr) throw insErr;

        // If there is an opening balance, record the opening transaction
        if (balance !== 0) {
          await supabase!.from("account_transactions").insert({
            account_id: newId,
            type: balance > 0 ? "debt" : "credit",
            amount: Math.abs(balance),
            description: "Açılış / Devir Bakiyesi",
            date: new Date().toISOString().split("T")[0],
          });
        }
      }

      return { success: true, id: newId };
    } catch (err: unknown) {
      console.error("Add cari error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Update existing Cari (supports updating balance directly)
  const updateCari = async (
    id: string,
    data: Partial<CariAccount> & { newBalance?: number }
  ) => {
    try {
      const targetCari = cariler.find((c) => c.id === id);
      const balanceToSet =
        data.newBalance !== undefined
          ? Number(data.newBalance)
          : data.balance !== undefined
          ? Number(data.balance)
          : undefined;

      setCariler((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...data,
                ...(balanceToSet !== undefined ? { balance: balanceToSet } : {}),
              }
            : c
        )
      );

      if (supabase) {
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (data.businessName !== undefined) updatePayload.name = data.businessName;
        if (data.contactPerson !== undefined) updatePayload.type = data.contactPerson;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.address !== undefined) updatePayload.address = data.address;
        if (data.taxNumber !== undefined) updatePayload.tax_id = data.taxNumber;
        if (data.customPrices !== undefined) updatePayload.custom_prices = data.customPrices;
        if (data.accountType !== undefined) updatePayload.type = data.accountType;
        if (balanceToSet !== undefined) updatePayload.balance = balanceToSet;

        const { error: updErr } = await supabase!
          .from("current_accounts")
          .update(updatePayload)
          .eq("id", id);
        if (updErr) throw updErr;

        // If balance changed directly, log an adjustment transaction
        if (targetCari && balanceToSet !== undefined && balanceToSet !== targetCari.balance) {
          const diff = balanceToSet - targetCari.balance;
          await supabase!.from("account_transactions").insert({
            account_id: id,
            type: diff > 0 ? "debt" : "credit",
            amount: Math.abs(diff),
            description: `Bakiye Düzeltme (Eski: ${targetCari.balance} ₺ ➔ Yeni: ${balanceToSet} ₺)`,
            date: new Date().toISOString().split("T")[0],
          });
        }
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Update cari error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Delete Cari
  const deleteCari = async (id: string) => {
    try {
      setCariler((prev) => prev.filter((c) => c.id !== id));

      if (supabase) {
        const { error: delErr } = await supabase!
          .from("current_accounts")
          .delete()
          .eq("id", id);
        if (delErr) throw delErr;
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Delete cari error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Directly set/adjust balance (ETA / Logo style Bakiye Düzeltme / Devir)
  const setManualBalance = async (
    cariId: string,
    newBalance: number,
    description: string = "Açılış / Bakiye Düzeltme Devri"
  ) => {
    try {
      const targetCari = cariler.find((c) => c.id === cariId);
      const currentBal = targetCari ? Number(targetCari.balance || 0) : 0;
      const targetBal = Number(newBalance || 0);
      const diff = targetBal - currentBal;

      // Optimistic update
      setCariler((prev) =>
        prev.map((c) => (c.id === cariId ? { ...c, balance: targetBal } : c))
      );

      if (supabase) {
        if (diff !== 0) {
          await supabase!.from("account_transactions").insert({
            account_id: cariId,
            type: diff > 0 ? "debt" : "credit",
            amount: Math.abs(diff),
            description: `${description} (Eski: ${currentBal} ₺ ➔ Yeni: ${targetBal} ₺)`,
            date: new Date().toISOString().split("T")[0],
          });
        }

        await supabase!
          .from("current_accounts")
          .update({ balance: targetBal, updated_at: new Date().toISOString() })
          .eq("id", cariId);
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Set manual balance error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Add Cari Transaction (Satış, Tahsilat veya Ödeme)
  const addTransaction = async (
    cariId: string,
    tx: {
      type: "satis" | "tahsilat" | "odeme";
      amount: number;
      description: string;
      date?: string;
      paymentMethod?: "nakit" | "banka_havale" | "kredi_karti" | "diger";
      orderId?: string;
    }
  ) => {
    try {
      const amount = Number(tx.amount);
      const targetCari = cariler.find((c) => c.id === cariId);
      const isExpenseAccount = targetCari?.accountType === "gider";
      // Optimistic fallback logic will be replaced by API call
      const res = await fetch("/api/admin/finans/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cariId,
          type: tx.type,
          amount,
          description: tx.description,
          paymentMethod: tx.paymentMethod,
          orderId: tx.orderId,
          date: tx.date,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "İşlem kaydedilemedi");
      }

      // Update UI with the exact new balance from server
      setCariler((prev) =>
        prev.map((c) => (c.id === cariId ? { ...c, balance: data.newBalance } : c))
      );

      return { success: true };
    } catch (err: unknown) {
      console.error("Add transaction error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Delete transaction with automatic reverse balance adjustment (Ters Kayıt)
  const deleteTransaction = async (
    cariId: string,
    txId: string,
    type: "satis" | "tahsilat" | "odeme" | "devir" | string,
    amount: number,
    accountType?: "musteri" | "gider",
    isCredit?: boolean
  ) => {
    try {
      const isExpense = accountType === "gider";
      let reverseDelta = 0;
      if (isCredit !== undefined) {
        reverseDelta = isCredit ? amount : -amount;
      } else if (type === "satis") {
        reverseDelta = -amount; // Satış iptal edilince müşteri borcu düşer
      } else if (type === "tahsilat") {
        reverseDelta = amount; // Tahsilat iptal edilince müşteri borcu geri artar
      } else if (type === "odeme") {
        reverseDelta = isExpense ? amount : -amount;
      } else if (type === "devir") {
        reverseDelta = -amount;
      }

      // Optimistic balance update in local state
      setCariler((prev) =>
        prev.map((c) => (c.id === cariId ? { ...c, balance: c.balance + reverseDelta } : c))
      );

      if (supabase) {
        // 1. Delete from account_transactions
        const { error: delErr } = await supabase!
          .from("account_transactions")
          .delete()
          .eq("id", txId);
        if (delErr) throw delErr;

        // 2. Fetch current balance and apply reverseDelta
        const { data: cur } = await supabase!
          .from("current_accounts")
          .select("balance")
          .eq("id", cariId)
          .single();

        const currentBal = Number(cur?.balance) || 0;
        await supabase!
          .from("current_accounts")
          .update({ balance: currentBal + reverseDelta, updated_at: new Date().toISOString() })
          .eq("id", cariId);
      }

      return { success: true, reverseDelta };
    } catch (err: unknown) {
      console.error("Delete transaction error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Aggregated totals
  const totalReceivable = cariler.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0);
  const totalCredit = cariler.reduce((sum, c) => (c.balance < 0 ? sum + Math.abs(c.balance) : sum), 0);

  return {
    cariler,
    loading,
    error,
    totalReceivable,
    totalCredit,
    addCari,
    updateCari,
    deleteCari,
    setManualBalance,
    addTransaction,
    deleteTransaction,
    refreshCariler: fetchCariler,
  };
}
