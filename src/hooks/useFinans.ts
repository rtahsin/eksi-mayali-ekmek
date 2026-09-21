"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ExpenseRecord, CashAccountType, CashMovement } from "@/types/admin";
import { useAdminOrders } from "./useAdminOrders";
import { useCariler } from "./useCariler";
import { useSuppliers } from "./useSuppliers";
import { getErrorMessage } from "@/lib/utils/error";

export function useFinans() {
  const [rawRecords, setRawRecords] = useState<any[]>([]);
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
      const { data, error: supaErr } = await supabase!
        .from("financial_records")
        .select("*")
        .order("date", { ascending: false });

      if (supaErr) throw supaErr;

      if (data) {
        setRawRecords(data);
      }
    } catch (err: unknown) {
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

  // Expenses subset
  const expenses: ExpenseRecord[] = useMemo(() => {
    return rawRecords
      .filter((d) => d.type === "expense" || !d.type)
      .map((d: any) => ({
        id: d.id,
        category: (d.category || "diger") as any,
        title: d.description || "Gider",
        amount: Number(d.amount) || 0,
        date: d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        paymentMethod: (d.payment_method || "nakit") as any,
        createdAt: d.created_at,
      }));
  }, [rawRecords]);

  // Add Expense
  const addExpense = async (data: Omit<ExpenseRecord, "id" | "createdAt">) => {
    try {
      const amount = Number(data.amount);
      const tempId = `exp_${Date.now().toString(36)}`;

      if (supabase) {
        const { error: insErr } = await supabase!.from("financial_records").insert({
          type: "expense",
          category: data.category,
          amount: amount,
          description: data.title || "",
          payment_method: data.paymentMethod || "nakit",
          date: data.date || new Date().toISOString(),
        });
        if (insErr) throw insErr;
        fetchExpenses();
      }

      return { success: true, id: tempId };
    } catch (err: unknown) {
      console.error("Add expense error:", err);
      fetchExpenses();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Add Income (Kasaya veya Bankaya Doğrudan Para Girişi)
  const addIncome = async (data: {
    category: string;
    title: string;
    amount: number;
    paymentMethod: CashAccountType;
    date?: string;
    notes?: string;
  }) => {
    try {
      const amount = Number(data.amount);
      const tempId = `inc_${Date.now().toString(36)}`;

      if (supabase) {
        const { error: insErr } = await supabase!.from("financial_records").insert({
          type: "income",
          category: data.category || "gelir",
          amount: amount,
          description: data.title || "Kasa Girişi",
          payment_method: data.paymentMethod || "nakit",
          date: data.date || new Date().toISOString(),
        });
        if (insErr) throw insErr;
        fetchExpenses();
      }

      return { success: true, id: tempId };
    } catch (err: unknown) {
      console.error("Add income error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Add Transfer / Virman (Hesaplar Arası Para Aktarımı)
  const addTransfer = async (data: {
    from: CashAccountType;
    to: CashAccountType;
    amount: number;
    description: string;
    date?: string;
  }) => {
    try {
      const amount = Number(data.amount);
      const tempId = `trf_${Date.now().toString(36)}`;

      if (supabase) {
        const { error: insErr } = await supabase!.from("financial_records").insert({
          type: "transfer",
          category: "virman",
          amount: amount,
          description: `[VİRMAN:${data.from}->${data.to}] ${data.description}`,
          payment_method: data.from,
          date: data.date || new Date().toISOString(),
        });
        if (insErr) throw insErr;
        fetchExpenses();
      }

      return { success: true, id: tempId };
    } catch (err: unknown) {
      console.error("Add transfer error:", err);
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Delete Financial Record
  const deleteExpense = async (id: string) => {
    try {
      if (supabase) {
        const { error: delErr } = await supabase!
          .from("financial_records")
          .delete()
          .eq("id", id);
        if (delErr) throw delErr;
        fetchExpenses();
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Delete expense error:", err);
      fetchExpenses();
      return { success: false, error: getErrorMessage(err) };
    }
  };

  // Kasa & Banka Balances & Movements Engine
  const { kasaBalances, cashMovements } = useMemo(() => {
    const movements: CashMovement[] = [];

    // 1. Map financial_records
    rawRecords.forEach((d) => {
      const dateStr = d.date ? new Date(d.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const amt = Number(d.amount) || 0;
      const desc = d.description || "";

      if (d.type === "transfer") {
        const virmanMatch = desc.match(/\[VİRMAN:(nakit|banka_havale|pos)->(nakit|banka_havale|pos)\]/);
        const fromAcc: CashAccountType = (virmanMatch ? virmanMatch[1] : d.payment_method || "nakit") as CashAccountType;
        const toAcc: CashAccountType = (virmanMatch ? virmanMatch[2] : "banka_havale") as CashAccountType;

        movements.push({
          id: d.id,
          type: "transfer",
          account: fromAcc,
          targetAccount: toAcc,
          amount: amt,
          title: desc.replace(/\[VİRMAN:[^\]]+\]\s*/, "") || "Kasa Virmanı",
          category: "virman",
          date: dateStr,
          relatedSource: "virman",
          createdAt: d.created_at,
        });
      } else if (d.type === "income") {
        movements.push({
          id: d.id,
          type: "in",
          account: (d.payment_method || "nakit") as CashAccountType,
          amount: amt,
          title: desc || "Gelir / Kasa Girişi",
          category: d.category || "gelir",
          date: dateStr,
          relatedSource: "manuel",
          createdAt: d.created_at,
        });
      } else {
        // Expense
        movements.push({
          id: d.id,
          type: "out",
          account: (d.payment_method || "nakit") as CashAccountType,
          amount: amt,
          title: desc || "Gider / Ödeme",
          category: d.category || "gider",
          date: dateStr,
          relatedSource: "gider",
          createdAt: d.created_at,
        });
      }
    });

    // 2. Map delivered orders that haven't been manually recorded
    allOrders.forEach((o) => {
      if (o.status !== "teslim_edildi") return;
      const orderDate = o.deliveryDate || (o.createdAt ? String(o.createdAt).split("T")[0] : "");

      if (o.paymentMethod === "cash_on_delivery") {
        movements.push({
          id: `ord_cash_${o.id}`,
          type: "in",
          account: "nakit",
          amount: o.totalAmount,
          title: `Kapıda Nakit Teslimat - Sipariş #${o.orderNumber || o.id.substring(0, 6)} (${o.customerName})`,
          category: "siparis_nakit",
          date: orderDate,
          relatedSource: "kurye_teslimat",
          createdAt: o.createdAt,
        });
      } else if (o.paymentMethod === "pos_at_door") {
        movements.push({
          id: `ord_pos_${o.id}`,
          type: "in",
          account: "pos",
          amount: o.totalAmount,
          title: `Mobil POS Teslimat - Sipariş #${o.orderNumber || o.id.substring(0, 6)} (${o.customerName})`,
          category: "siparis_pos",
          date: orderDate,
          relatedSource: "kurye_teslimat",
          createdAt: o.createdAt,
        });
      } else if (o.paymentMethod === "online" || o.paymentMethod === "transfer") {
        movements.push({
          id: `ord_bank_${o.id}`,
          type: "in",
          account: "banka_havale",
          amount: o.totalAmount,
          title: `Online / Havale Sipariş - #${o.orderNumber || o.id.substring(0, 6)} (${o.customerName})`,
          category: "siparis_banka",
          date: orderDate,
          relatedSource: "kurye_teslimat",
          createdAt: o.createdAt,
        });
      }
    });

    // Sort movements newest first
    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate balances
    let nakitIn = 0;
    let nakitOut = 0;
    let bankaIn = 0;
    let bankaOut = 0;
    let posIn = 0;
    let posTransferred = 0;

    movements.forEach((m) => {
      if (m.type === "in") {
        if (m.account === "nakit") nakitIn += m.amount;
        else if (m.account === "banka_havale") bankaIn += m.amount;
        else if (m.account === "pos") posIn += m.amount;
      } else if (m.type === "out") {
        if (m.account === "nakit") nakitOut += m.amount;
        else if (m.account === "banka_havale") bankaOut += m.amount;
        else if (m.account === "pos") posTransferred += m.amount;
      } else if (m.type === "transfer") {
        // From account loses, To account gains
        if (m.account === "nakit") nakitOut += m.amount;
        else if (m.account === "banka_havale") bankaOut += m.amount;
        else if (m.account === "pos") posTransferred += m.amount;

        if (m.targetAccount === "nakit") nakitIn += m.amount;
        else if (m.targetAccount === "banka_havale") bankaIn += m.amount;
        else if (m.targetAccount === "pos") posIn += m.amount;
      }
    });

    const balances = {
      nakit: {
        inflows: nakitIn,
        outflows: nakitOut,
        balance: nakitIn - nakitOut,
      },
      banka: {
        inflows: bankaIn,
        outflows: bankaOut,
        balance: bankaIn - bankaOut,
      },
      pos: {
        inflows: posIn,
        transferred: posTransferred,
        pending: posIn - posTransferred,
      },
      totalLiquid: (nakitIn - nakitOut) + (bankaIn - bankaOut) + (posIn - posTransferred),
    };

    return {
      kasaBalances: balances,
      cashMovements: movements,
    };
  }, [rawRecords, allOrders]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    const validOrders = allOrders.filter((o) => o.status !== "iptal");
    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

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
    kasaBalances,
    cashMovements,
    addExpense,
    addIncome,
    addTransfer,
    deleteExpense,
    deleteFinancialRecord: deleteExpense,
    refreshExpenses: fetchExpenses,
  };
}
