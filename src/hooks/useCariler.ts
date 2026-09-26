"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount } from "@/types/admin";
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
        const mapped: CariAccount[] = data.map((d: Record<string, unknown>) => {
          // account_type kolonu artık mevcut, fallback olarak type'a bak
          const rawAccountType = (d.account_type as string) || (d.type as string) || "musteri";
          const accountType: "musteri" | "gider" = 
            rawAccountType === "gider" ? "gider" : "musteri";

          return {
            id: d.id as string,
            businessName: (d.name as string) || "İsimsiz Cari",
            contactPerson: (d.contact_person as string) || "",
            phone: (d.phone as string) || "",
            address: (d.address as string) || "",
            neighborhood: (d.neighborhood as string) || "",
            taxNumber: (d.tax_id as string) || "",
            taxOffice: (d.tax_office as string) || "",
            balance: Number(d.balance) || 0,
            accountType,
            customPrices: (d.custom_prices as Record<string, number>) || {},
            notes: (d.notes as string) || "",
            createdAt: d.created_at as string,
            updatedAt: d.updated_at as string,
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
      const accountType = data.accountType || "musteri";

      // Optimistic update
      const newObj: CariAccount = {
        ...data,
        id: newId,
        balance,
        accountType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCariler((prev) => [...prev, newObj]);

      if (supabase) {
        const fullPayload = {
          id: newId,
          name: data.businessName,
          type: accountType,
          account_type: accountType,
          contact_person: data.contactPerson || "",
          phone: data.phone || "",
          address: data.address || "",
          neighborhood: data.neighborhood || "",
          tax_id: data.taxNumber || "",
          tax_office: data.taxOffice || "",
          notes: data.notes || "",
          custom_prices: data.customPrices || {},
          balance: balance,
          credit_limit: 0,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insErr } = await supabase!.from("current_accounts").insert(fullPayload);
        if (insErr) {
          if (insErr.code === "42703" || insErr.message?.includes("column")) {
            // Graceful fallback to core columns if migration wasn't run
            const corePayload = {
              id: newId,
              name: data.businessName,
              type: data.contactPerson || accountType,
              phone: data.phone || "",
              address: data.address || "",
              tax_id: data.taxNumber || "",
              balance: balance,
              credit_limit: 0,
              status: "active",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            const { error: coreErr } = await supabase!.from("current_accounts").insert(corePayload);
            if (coreErr) throw coreErr;
          } else {
            throw insErr;
          }
        }

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
        const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (data.businessName !== undefined) updatePayload.name = data.businessName;
        if (data.contactPerson !== undefined) updatePayload.contact_person = data.contactPerson;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.address !== undefined) updatePayload.address = data.address;
        if (data.neighborhood !== undefined) updatePayload.neighborhood = data.neighborhood;
        if (data.taxNumber !== undefined) updatePayload.tax_id = data.taxNumber;
        if (data.taxOffice !== undefined) updatePayload.tax_office = data.taxOffice;
        if (data.notes !== undefined) updatePayload.notes = data.notes;
        if (data.customPrices !== undefined) updatePayload.custom_prices = data.customPrices;
        if (data.accountType !== undefined) {
          updatePayload.type = data.accountType;
          updatePayload.account_type = data.accountType;
        }
        if (balanceToSet !== undefined) updatePayload.balance = balanceToSet;

        const { error: updErr } = await supabase!
          .from("current_accounts")
          .update(updatePayload)
          .eq("id", id);

        if (updErr) {
          if (updErr.code === "42703" || updErr.message?.includes("column")) {
            // Graceful fallback to core columns
            const corePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (data.businessName !== undefined) corePayload.name = data.businessName;
            if (data.contactPerson !== undefined) corePayload.type = data.contactPerson;
            if (data.phone !== undefined) corePayload.phone = data.phone;
            if (data.address !== undefined) corePayload.address = data.address;
            if (data.taxNumber !== undefined) corePayload.tax_id = data.taxNumber;
            if (balanceToSet !== undefined) corePayload.balance = balanceToSet;
            const { error: coreUpdErr } = await supabase!.from("current_accounts").update(corePayload).eq("id", id);
            if (coreUpdErr) throw coreUpdErr;
          } else {
            throw updErr;
          }
        }

        // If balance changed directly, log an adjustment transaction
        if (targetCari && balanceToSet !== undefined && balanceToSet !== targetCari.balance) {
          const diff = balanceToSet - targetCari.balance;
          await supabase!.from("account_transactions").insert({
            account_id: id,
            type: diff > 0 ? "debt" : "credit",
            amount: Math.abs(diff),
            description: `Bakiye Düzeltme (Eski: ${targetCari.balance} ₺ → Yeni: ${balanceToSet} ₺)`,
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
        // Clean up transactions first to prevent FK constraint errors
        await supabase!.from("account_transactions").delete().eq("account_id", id);

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
            description: `${description} (Eski: ${currentBal} ₺ → Yeni: ${targetBal} ₺)`,
            date: new Date().toISOString().split("T")[0],
            balance_after: targetBal,
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
      const res = await fetch("/api/admin/finans/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cariId,
          type: tx.type,
          amount: Number(tx.amount),
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

      return {
        success: true,
        slipNumber: data.slipNumber,
        transactionId: data.transactionId,
        newBalance: data.newBalance,
      };
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
        // Atomik Storno: Hem transaction kaydı hem bakiye güncellemesi tek RPC'de
        const stornoType = reverseDelta > 0 ? "debt" : "credit";

        const { data: stornoResult, error: stornoErr } = await supabase
          .rpc("record_cari_transaction_atomic", {
            p_account_id: cariId,
            p_type: stornoType,
            p_amount: Math.abs(reverseDelta),
            p_description: `[İPTAL / STORNO] İşlem Geri Alma`,
          });

        if (stornoErr) {
          console.error("Storno RPC Error:", stornoErr);
          throw new Error("Storno işlemi kaydedilirken hata oluştu.");
        }
      }

      return { success: true, reverseDelta };
    } catch (err: unknown) {
      console.error("Storno transaction error:", err);
      fetchCariler();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Aggregated totals
  const totalReceivable = cariler
    .filter((c) => c.accountType !== "gider")
    .reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0);
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
