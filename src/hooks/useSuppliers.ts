"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Supplier, SupplierTransaction } from "@/types/admin";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchSuppliers = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: supaErr } = await (supabase as any)
        .from("suppliers")
        .select("*")
        .order("name", { ascending: true });

      if (supaErr) throw supaErr;

      if (data) {
        const mapped: Supplier[] = data.map((d: any) => ({
          id: d.id,
          companyName: d.name || "İsimsiz Tedarikçi",
          materialType: d.category || "Hammadde",
          phone: d.phone || "",
          contactPerson: d.contact_person || "",
          balance: Number(d.balance) || 0,
          notes: d.address || "",
          createdAt: d.created_at,
        }));
        setSuppliers(mapped);
      }
    } catch (err: any) {
      console.error("Suppliers fetch error:", err);
      setError("Tedarikçiler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSuppliers();

    if (supabase && isSupabaseConfigured()) {
      const channel = supabase
        .channel("admin-suppliers-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "suppliers" },
          () => {
            fetchSuppliers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchSuppliers]);

  // Add Supplier
  const addSupplier = async (
    data: Omit<Supplier, "id" | "createdAt" | "balance"> & { initialBalance?: number }
  ) => {
    try {
      const newId = `ted_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const balance = Number(data.initialBalance) || 0;

      // Optimistic update
      const newObj: Supplier = {
        ...data,
        id: newId,
        balance,
        createdAt: new Date().toISOString(),
      };
      setSuppliers((prev) => [...prev, newObj]);

      if (supabase) {
        const { error: insErr } = await (supabase as any).from("suppliers").insert({
          id: newId,
          name: data.companyName,
          category: data.materialType || "Hammadde",
          contact_person: data.contactPerson || "",
          phone: data.phone || "",
          address: data.notes || "",
          balance: balance,
        });
        if (insErr) throw insErr;
      }

      return { success: true, id: newId };
    } catch (err: any) {
      console.error("Add supplier error:", err);
      fetchSuppliers();
      return { success: false, error: err.message };
    }
  };

  // Update Supplier
  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    try {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );

      if (supabase) {
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (data.companyName !== undefined) updatePayload.name = data.companyName;
        if (data.materialType !== undefined) updatePayload.category = data.materialType;
        if (data.contactPerson !== undefined) updatePayload.contact_person = data.contactPerson;
        if (data.phone !== undefined) updatePayload.phone = data.phone;
        if (data.notes !== undefined) updatePayload.address = data.notes;
        if (data.balance !== undefined) updatePayload.balance = data.balance;

        const { error: updErr } = await (supabase as any)
          .from("suppliers")
          .update(updatePayload)
          .eq("id", id);
        if (updErr) throw updErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Update supplier error:", err);
      fetchSuppliers();
      return { success: false, error: err.message };
    }
  };

  // Delete Supplier
  const deleteSupplier = async (id: string) => {
    try {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));

      if (supabase) {
        const { error: delErr } = await (supabase as any)
          .from("suppliers")
          .delete()
          .eq("id", id);
        if (delErr) throw delErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Delete supplier error:", err);
      fetchSuppliers();
      return { success: false, error: err.message };
    }
  };

  // Add Transaction (Alış veya Ödeme)
  const addSupplierTransaction = async (
    supplierId: string,
    tx: {
      type: "alis" | "odeme";
      amount: number;
      description: string;
      date?: string;
      paymentMethod?: "nakit" | "banka_havale" | "kredi_karti" | "diger";
    }
  ) => {
    try {
      const amount = Number(tx.amount);
      const balanceDelta = tx.type === "alis" ? amount : -amount;

      // Optimistic update
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierId ? { ...s, balance: s.balance + balanceDelta } : s))
      );

      if (supabase) {
        // 1. Insert transaction
        await (supabase as any).from("supplier_transactions").insert({
          supplier_id: supplierId,
          type: tx.type === "alis" ? "purchase" : "payment",
          amount: amount,
          description: tx.description,
          date: tx.date || new Date().toISOString(),
        });

        // 2. Update balance
        const { data: cur } = await (supabase as any)
          .from("suppliers")
          .select("balance")
          .eq("id", supplierId)
          .single();

        const currentBal = Number(cur?.balance) || 0;
        await (supabase as any)
          .from("suppliers")
          .update({ balance: currentBal + balanceDelta, updated_at: new Date().toISOString() })
          .eq("id", supplierId);
      }

      return { success: true };
    } catch (err: any) {
      console.error("Add supplier transaction error:", err);
      fetchSuppliers();
      return { success: false, error: err.message };
    }
  };

  // Total Debt to Suppliers
  const totalDebt = suppliers.reduce((sum, s) => (s.balance > 0 ? sum + s.balance : sum), 0);

  return {
    suppliers,
    loading,
    error,
    totalDebt,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierTransaction,
    refreshSuppliers: fetchSuppliers,
  };
}
