"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ExpenseRecord, AdminOrder, CariAccount, Supplier } from "@/types/admin";
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

  // Listen to expenses
  useEffect(() => {
    try {
      const q = query(collection(db, "giderler"), orderBy("date", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ExpenseRecord[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as ExpenseRecord);
          });
          setExpenses(list);
          setLoadingExpenses(false);
        },
        (err) => {
          console.error("Expenses listener error:", err);
          setError("Giderler yüklenirken bir hata oluştu.");
          setLoadingExpenses(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoadingExpenses(false);
    }
  }, []);

  // Add Expense
  const addExpense = async (data: Omit<ExpenseRecord, "id" | "createdAt">) => {
    try {
      const newExpense = {
        ...data,
        amount: Number(data.amount),
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, "giderler"), newExpense);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error("Add expense error:", err);
      return { success: false, error: err.message };
    }
  };

  // Delete Expense
  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, "giderler", id));
      return { success: true };
    } catch (err: any) {
      console.error("Delete expense error:", err);
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
  };
}
