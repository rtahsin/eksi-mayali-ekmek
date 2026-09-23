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
  const [rawCariTx, setRawCariTx] = useState<any[]>([]);
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
      const { data: finData, error: finErr } = await supabase!
        .from("financial_records")
        .select("*")
        .order("date", { ascending: false })
        .limit(300); // 5. Performans Limiti

      if (finErr) throw finErr;

      const { data: txData, error: txErr } = await supabase!
        .from("account_transactions")
        .select(`
          *,
          current_accounts(type, name)
        `)
        .order("date", { ascending: false })
        .limit(300); // 5. Performans Limiti

      if (txErr) throw txErr;

      setRawRecords(finData || []);
      setRawCariTx(txData || []);
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

  // Delete Financial Record (Storno)
  const deleteExpense = async (id: string) => {
    try {
      if (supabase) {
        // 1. Fetch original record
        const { data: orig, error: fetchErr } = await supabase!
          .from("financial_records")
          .select("*")
          .eq("id", id)
          .single();
        if (fetchErr || !orig) throw fetchErr || new Error("Record not found");

        // 2. Insert reversing record
        let stornoType = orig.type;
        if (orig.type === "income") stornoType = "expense";
        else if (orig.type === "expense") stornoType = "income";
        
        const reverseAmount = orig.type === "transfer" ? -Math.abs(Number(orig.amount)) : Number(orig.amount);

        const { error: insErr } = await supabase!
          .from("financial_records")
          .insert({
            type: stornoType,
            category: orig.category,
            amount: reverseAmount,
            description: `[İPTAL / STORNO] ${orig.description}`,
            payment_method: orig.payment_method,
            date: new Date().toISOString(),
          });
        if (insErr) throw insErr;
        
        fetchExpenses();
      }

      return { success: true };
    } catch (err: unknown) {
      console.error("Storno expense error:", err);
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

    // 1.5 Map account_transactions (Cari Tahsilat / Ödeme)
    rawCariTx.forEach((tx) => {
      // If it's a devir (opening balance), it doesn't affect Kasa
      const descLower = (tx.description || "").toLowerCase();
      if (descLower.includes("devir") || descLower.includes("açılış")) return;

      // We only care about transactions that have a payment_method (i.e. they touched the Kasa)
      // "nakit", "banka_havale", "pos"
      if (!tx.payment_method || tx.payment_method === "diger") return;

      const dateStr = tx.date ? new Date(tx.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const amt = Number(tx.amount) || 0;
      const isExpenseAccount = tx.current_accounts?.type === "gider" || (tx.current_accounts?.name || "").toLowerCase().includes("gider");

      let type: "in" | "out" = "in";
      let title = "";
      
      if (tx.type === "credit") {
        type = isExpenseAccount ? "out" : "in"; // Tahsilat (in) veya Gider ödemesi (out)
        title = isExpenseAccount ? `Cari Ödeme - ${tx.current_accounts?.name || ""}` : `Cari Tahsilat - ${tx.current_accounts?.name || ""}`;
      } else if (tx.type === "debt") {
        type = isExpenseAccount ? "in" : "out"; // Gider hesabından iade (in) veya Müşteriye borç verme (out)
        title = isExpenseAccount ? `Gider İade - ${tx.current_accounts?.name || ""}` : `Müşteri Ödeme - ${tx.current_accounts?.name || ""}`;
      }

      movements.push({
        id: `tx_${tx.id}`,
        type: type,
        account: tx.payment_method as CashAccountType,
        amount: amt,
        title: title + (tx.description ? ` (${tx.description})` : ""),
        category: type === "in" ? "cari_tahsilat" : "cari_odeme",
        date: dateStr,
        relatedSource: type === "in" ? "cari_tahsilat" : "cari_odeme",
        createdAt: tx.created_at,
      });
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
  }, [rawRecords, rawCariTx, allOrders]);

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
