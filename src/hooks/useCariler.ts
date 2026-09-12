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
  where,
  getDocs,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { CariAccount, CariTransaction } from "@/types/admin";

export function useCariler() {
  const [cariler, setCariler] = useState<CariAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for all Cari Accounts
  useEffect(() => {
    try {
      const q = query(collection(db, "cariler"), orderBy("businessName", "asc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: CariAccount[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as CariAccount);
          });
          setCariler(list);
          setLoading(false);
        },
        (err) => {
          console.error("Cariler listener error:", err);
          setError("Cari hesaplar yüklenirken bir hata oluştu.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Create new Cari
  const addCari = async (data: Omit<CariAccount, "id" | "createdAt" | "balance"> & { initialBalance?: number }) => {
    try {
      const newId = `cari_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const newCari: CariAccount = {
        ...data,
        id: newId,
        balance: data.initialBalance || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "cariler", newId), newCari);
      return { success: true, id: newId };
    } catch (err: any) {
      console.error("Add cari error:", err);
      return { success: false, error: err.message };
    }
  };

  // Update existing Cari
  const updateCari = async (id: string, data: Partial<CariAccount>) => {
    try {
      const cariRef = doc(db, "cariler", id);
      await updateDoc(cariRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err: any) {
      console.error("Update cari error:", err);
      return { success: false, error: err.message };
    }
  };

  // Delete Cari
  const deleteCari = async (id: string) => {
    try {
      await deleteDoc(doc(db, "cariler", id));
      return { success: true };
    } catch (err: any) {
      console.error("Delete cari error:", err);
      return { success: false, error: err.message };
    }
  };

  // Add Cari Transaction (Satış veya Tahsilat)
  const addTransaction = async (
    cariId: string,
    tx: {
      type: "satis" | "tahsilat";
      amount: number;
      description: string;
      date?: string;
      paymentMethod?: "nakit" | "banka_havale" | "kredi_karti" | "diger";
      orderId?: string;
    }
  ) => {
    try {
      const dateStr = tx.date || new Date().toISOString().split("T")[0];
      const txData: any = {
        cariId,
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description,
        date: dateStr,
        paymentMethod: tx.paymentMethod || "nakit",
        orderId: tx.orderId || null,
        createdAt: serverTimestamp(),
      };

      // 1. Add to cari_hareketler
      const txRef = await addDoc(collection(db, "cari_hareketler"), txData);

      // 2. Adjust Cari balance
      // satis -> alacağımız artar (+amount)
      // tahsilat -> borç ödenir, alacağımız azalır (-amount)
      const balanceDelta = tx.type === "satis" ? Number(tx.amount) : -Number(tx.amount);
      await updateDoc(doc(db, "cariler", cariId), {
        balance: increment(balanceDelta),
        updatedAt: new Date().toISOString(),
      });

      return { success: true, id: txRef.id };
    } catch (err: any) {
      console.error("Add transaction error:", err);
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
  };
}
