"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ExpenseRecord } from "@/types/admin";
import { useAdminOrders } from "./useAdminOrders";
import { useCariler } from "./useCariler";
import { useSuppliers } from "./useSuppliers";

export function useFinans() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { allOrders, loading: loadingOrders } = useAdminOrders();
  const { totalReceivable, loading: loadingCariler } = useCariler();
  const { totalDebt, loading: loadingSuppliers } = useSuppliers();

  const supabase = createClient();

  const fetchExpenses = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoadingExpenses(false);
      return;
    }

    try {
      const { data, error: supaErr } = await (supabase as any)
        .from("financial_records")
        .select("*")
        .order("date", { ascending: false });

      if (supaErr) throw supaErr;

      if (data) {
        const mapped: ExpenseRecord[] = data.map((d: any) => ({
          id: d.id,
          category: (d.category || "diger") as any,
          title: d.description || "Gider",
          amount: Number(d.amount) || 0,
          date: d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          paymentMethod: (d.payment_method || "nakit") as any,
          createdAt: d.created_at,
        }));
        setExpenses(mapped);
      }
    } catch (err: any) {
      console.error("Expenses fetch error:", err);
      setError("Giderler yüklenirken hata oluştu.");
    } finally {
      setLoadingExpenses(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchExpenses();

    if (supabase && isSupabaseConfigured()) {
      const channelId = `admin-finans-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "financial_records" },
          () => {
            fetchExpenses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchExpenses]);

  // Add Expense
  const addExpense = async (data: Omit<ExpenseRecord, "id" | "createdAt">) => {
    try {
      const amount = Number(data.amount);
      const tempId = `exp_${Date.now().toString(36)}`;

      // Optimistic update
      const newExp: ExpenseRecord = {
        ...data,
        id: tempId,
        amount,
        createdAt: new Date().toISOString(),
      };
      setExpenses((prev) => [newExp, ...prev]);

      if (supabase) {
        const { error: insErr } = await (supabase as any).from("financial_records").insert({
          type: "expense",
          category: data.category,
          amount: amount,
          description: data.title || "",
          payment_method: data.paymentMethod || "nakit",
          date: data.date || new Date().toISOString(),
        });
        if (insErr) throw insErr;
      }

      return { success: true, id: tempId };
    } catch (err: any) {
      console.error("Add expense error:", err);
      fetchExpenses();
      return { success: false, error: err.message };
    }
  };

  // Delete Expense
  const deleteExpense = async (id: string) => {
    try {
      setExpenses((prev) => prev.filter((e) => e.id !== id));

      if (supabase) {
        const { error: delErr } = await (supabase as any)
          .from("financial_records")
          .delete()
          .eq("id", id);
        if (delErr) throw delErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Delete expense error:", err);
      fetchExpenses();
      return { success: false, error: err.message };
    }
  };

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    // Total Revenue from all valid orders (excluding cancelled)
    const validOrders = allOrders.filter((o) => o.status !== "iptal");
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Total Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Net Profit
    const netProfit = totalRevenue - totalExpenses;

    // Expense breakdown by category
    const breakdown = {
      hammadde: 0,
      yakit_kurye: 0,
      ambalaj: 0,
      fatura_kira: 0,
      diger: 0,
    };

    expenses.forEach((e) => {
      const cat = e.category as keyof typeof breakdown;
      if (breakdown[cat] !== undefined) {
        breakdown[cat] += Number(e.amount);
      } else {
        breakdown.diger += Number(e.amount);
      }
    });

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalReceivable,
      totalDebt,
      breakdown,
      orderCount: validOrders.length,
    };
  }, [allOrders, expenses, totalReceivable, totalDebt]);

  const loading = loadingExpenses || loadingOrders || loadingCariler || loadingSuppliers;

  return {
    expenses,
    loading,
    error,
    metrics,
    addExpense,
    deleteExpense,
    refreshExpenses: fetchExpenses,
  };
}
