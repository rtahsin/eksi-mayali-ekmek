"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount, CariTransaction } from "@/types/admin";

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
      const { data, error: supaErr } = await (supabase as any)
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
            notes: d.status || "",
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          };
        });
        setCariler(mapped);
      }
    } catch (err: any) {
      console.error("Cariler fetch error:", err);
      setError("Cari hesaplar yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCariler();

    if (supabase && isSupabaseConfigured()) {
      const channel = supabase
        .channel("admin-cariler-realtime")
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

  // Create new Cari
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
        const { error: insErr } = await (supabase as any).from("current_accounts").insert({
          id: newId,
          name: data.businessName,
          type: data.accountType || data.contactPerson || "customer",
          phone: data.phone || "",
          address: data.address || "",
          tax_id: data.taxNumber || "",
          balance: balance,
          credit_limit: 0,
          status: "active",
        });
        if (insErr) throw insErr;
      }

      return { success: true, id: newId };
    } catch (err: any) {
      console.error("Add cari error:", err);
      fetchCariler();
      return { success: false, error: err.message };
    }
  };

  // Update existing Cari
  const updateCari = async (id: string, data: Partial<CariAccount>) => {
    try {
      setCariler((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...data } : c))
      );

      if (supabase) {
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (data.businessName !== undefined) updatePayload.name = data.businessName;
        if (data.contactPerson !== undefined) updatePayload.type = data.contactPerson;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.address !== undefined) updatePayload.address = data.address;
        if (data.taxNumber !== undefined) updatePayload.tax_id = data.taxNumber;
        if (data.balance !== undefined) updatePayload.balance = data.balance;

        const { error: updErr } = await (supabase as any)
          .from("current_accounts")
          .update(updatePayload)
          .eq("id", id);
        if (updErr) throw updErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Update cari error:", err);
      fetchCariler();
      return { success: false, error: err.message };
    }
  };

  // Delete Cari
  const deleteCari = async (id: string) => {
    try {
      setCariler((prev) => prev.filter((c) => c.id !== id));

      if (supabase) {
        const { error: delErr } = await (supabase as any)
          .from("current_accounts")
          .delete()
          .eq("id", id);
        if (delErr) throw delErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Delete cari error:", err);
      fetchCariler();
      return { success: false, error: err.message };
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
      const balanceDelta = tx.type === "satis" ? amount : -amount;

      // Optimistic balance update
      setCariler((prev) =>
        prev.map((c) => (c.id === cariId ? { ...c, balance: c.balance + balanceDelta } : c))
      );

      if (supabase) {
        // 1. Insert transaction
        await (supabase as any).from("account_transactions").insert({
          account_id: cariId,
          type: tx.type === "satis" ? "debt" : "credit",
          amount: amount,
          description: tx.description,
          date: tx.date || new Date().toISOString(),
        });

        // 2. Fetch current balance to be precise
        const { data: cur } = await (supabase as any)
          .from("current_accounts")
          .select("balance")
          .eq("id", cariId)
          .single();

        const currentBal = Number(cur?.balance) || 0;
        await (supabase as any)
          .from("current_accounts")
          .update({ balance: currentBal + balanceDelta, updated_at: new Date().toISOString() })
          .eq("id", cariId);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Add transaction error:", err);
      fetchCariler();
      return { success: false, error: err.message };
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
    addTransaction,
    refreshCariler: fetchCariler,
  };
}
