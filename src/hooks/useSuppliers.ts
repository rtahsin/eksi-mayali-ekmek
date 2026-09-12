"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Supplier, SupplierTransaction } from "@/types/admin";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for all suppliers
  useEffect(() => {
    try {
      const q = query(collection(db, "tedarikciler"), orderBy("companyName", "asc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Supplier[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Supplier);
          });
          setSuppliers(list);
          setLoading(false);
        },
        (err) => {
          console.error("Suppliers listener error:", err);
          setError("Tedarikçiler yüklenirken bir hata oluştu.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Add Supplier
  const addSupplier = async (
    data: Omit<Supplier, "id" | "createdAt" | "balance"> & { initialBalance?: number }
  ) => {
    try {
      const newId = `ted_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const newSup: Supplier = {
        ...data,
        id: newId,
        balance: data.initialBalance || 0,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "tedarikciler", newId), newSup);
      return { success: true, id: newId };
    } catch (err: any) {
      console.error("Add supplier error:", err);
      return { success: false, error: err.message };
    }
  };

  // Update Supplier
  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    try {
      await updateDoc(doc(db, "tedarikciler", id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err: any) {
      console.error("Update supplier error:", err);
      return { success: false, error: err.message };
    }
  };

  // Delete Supplier
  const deleteSupplier = async (id: string) => {
    try {
      await deleteDoc(doc(db, "tedarikciler", id));
      return { success: true };
    } catch (err: any) {
      console.error("Delete supplier error:", err);
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
      const dateStr = tx.date || new Date().toISOString().split("T")[0];
      const txData: any = {
        supplierId,
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description,
        date: dateStr,
        paymentMethod: tx.paymentMethod || "banka_havale",
        createdAt: serverTimestamp(),
      };

      // 1. Add to tedarikci_hareketler
      const txRef = await addDoc(collection(db, "tedarikci_hareketler"), txData);

      // 2. Adjust Supplier balance
      // alis -> borcumuz artar (+amount)
      // odeme -> borcumuz azalır (-amount)
      const balanceDelta = tx.type === "alis" ? Number(tx.amount) : -Number(tx.amount);
      await updateDoc(doc(db, "tedarikciler", supplierId), {
        balance: increment(balanceDelta),
        updatedAt: new Date().toISOString(),
      });

      return { success: true, id: txRef.id };
    } catch (err: any) {
      console.error("Add supplier transaction error:", err);
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
  };
}
