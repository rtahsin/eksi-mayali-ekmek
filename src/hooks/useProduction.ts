"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAdminOrders } from "./useAdminOrders";
import { useProducts } from "./useProducts";

export type ProductionStage =
  | "otoliz_yogurma"        // 1. Un ve su buluştu, yoğuruldu
  | "laminasyon_katlama"   // 2. Katlamalar yapılıyor, gluten gelişiyor
  | "soguk_fermantasyon"   // 3. 36 saat soğuk fermantasyonda (+4°C)
  | "firinda_pisirim"      // 4. Taş tabanlı fırında 240°C pişiyor
  | "soguma_hazir";        // 5. Ahşap raflarda soğudu, dağıtıma hazır

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  targetDate: string; // Pişirim / Teslimat Tarihi YYYY-MM-DD
  status: ProductionStage;
  items: {
    productId: string;
    productName: string;
    targetCount: number;
    flourType?: string;
  }[];
  counterSurplus: number; // Dükkan tezgahı için ekstra pişirim adedi
  totalLoaves: number;
  notes?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface IngredientCalculation {
  totalLoaves: number;
  totalFlourKg: number;
  flourBreakdown: Record<string, number>; // un çeşidi -> kg
  totalWaterLiters: number;
  totalLevainKg: number;
  totalSaltGrams: number;
}

export function useProduction(selectedDate?: string) {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { allOrders } = useAdminOrders();
  const { products } = useProducts("all");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const tm = new Date();
    tm.setDate(tm.getDate() + 1);
    return tm.toISOString().split("T")[0];
  }, []);

  const activeDate = selectedDate || tomorrowStr;

  // Real-time listener for batches
  useEffect(() => {
    try {
      const q = query(collection(db, "uretim_partileri"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: ProductionBatch[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as ProductionBatch);
          });
          setBatches(list);
          setLoading(false);
        },
        (err) => {
          console.error("Production batches listener error:", err);
          setError("Üretim partileri yüklenirken bir hata oluştu.");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Calculate needed bread quantities for target date from confirmed orders
  const neededBreads = useMemo(() => {
    const dateOrders = allOrders.filter(
      (o) => o.deliveryDate === activeDate && o.status !== "iptal"
    );

    const counts: Record<string, { product: any; count: number }> = {};

    dateOrders.forEach((o) => {
      o.items.forEach((item) => {
        // Find product
        const prod = products.find((p) => p.id === item.productId) || {
          id: item.productId,
          name: item.productName,
          category: "bread",
          weight: 800,
        };

        // Only count bread products for bakery production batches
        if (!counts[item.productId]) {
          counts[item.productId] = { product: prod, count: 0 };
        }
        counts[item.productId].count += item.quantity;
      });
    });

    return Object.values(counts);
  }, [allOrders, products, activeDate]);

  // Baker's Formulation Calculator
  const calculateIngredients = (
    breadList: { product: any; count: number }[],
    counterSurplus: number = 0
  ): IngredientCalculation => {
    let totalLoaves = counterSurplus;
    breadList.forEach((b) => {
      totalLoaves += b.count;
    });

    // Standard artisan loaf assumptions:
    // ~500g flour per loaf
    // 75% hydration = ~375g water
    // 20% sourdough levain = ~100g active starter
    // 2% salt = ~10g Çankırı rock salt
    const flourPerLoafKg = 0.5;
    const waterPerLoafL = 0.375;
    const levainPerLoafKg = 0.1;
    const saltPerLoafG = 10;

    const totalFlourKg = Math.round(totalLoaves * flourPerLoafKg * 10) / 10;
    const totalWaterLiters = Math.round(totalLoaves * waterPerLoafL * 10) / 10;
    const totalLevainKg = Math.round(totalLoaves * levainPerLoafKg * 10) / 10;
    const totalSaltGrams = Math.round(totalLoaves * saltPerLoafG);

    // Flour breakdown by specific heritage grain
    const flourBreakdown: Record<string, number> = {};
    breadList.forEach((b) => {
      const prodName = (b.product.name || "").toLowerCase();
      let flourName = "Taş Değirmen Atalık Buğday";
      if (prodName.includes("siyez")) flourName = "Atalık Kastamonu Siyez Unu";
      else if (prodName.includes("çavdar") || prodName.includes("cavdar")) flourName = "Tam Çavdar Unu";
      else if (prodName.includes("karakılçık") || prodName.includes("karakilcik"))
        flourName = "Taş Değirmen Karakılçık Unu";

      const kg = Math.round(b.count * flourPerLoafKg * 10) / 10;
      flourBreakdown[flourName] = (flourBreakdown[flourName] || 0) + kg;
    });

    if (counterSurplus > 0) {
      flourBreakdown["Taş Değirmen Atalık Buğday (Tezgah)"] =
        Math.round(counterSurplus * flourPerLoafKg * 10) / 10;
    }

    return {
      totalLoaves,
      totalFlourKg,
      flourBreakdown,
      totalWaterLiters,
      totalLevainKg,
      totalSaltGrams,
    };
  };

  // Create Batch
  const createBatch = async (batchData: {
    targetDate: string;
    items: ProductionBatch["items"];
    counterSurplus: number;
    notes?: string;
  }) => {
    try {
      const batchNumber = `PARTI-${batchData.targetDate.replace(/-/g, "")}-${Math.floor(
        10 + Math.random() * 90
      )}`;
      const totalLoaves =
        batchData.items.reduce((s, it) => s + it.targetCount, 0) + (batchData.counterSurplus || 0);

      const newBatch: Omit<ProductionBatch, "id"> = {
        batchNumber,
        targetDate: batchData.targetDate,
        status: "otoliz_yogurma",
        items: batchData.items,
        counterSurplus: batchData.counterSurplus || 0,
        totalLoaves,
        notes: batchData.notes || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "uretim_partileri"), newBatch);
      return { success: true, id: docRef.id };
    } catch (err: any) {
      console.error("Create batch error:", err);
      return { success: false, error: err.message };
    }
  };

  // Update Batch Stage
  const updateBatchStatus = async (batchId: string, newStatus: ProductionStage) => {
    try {
      const batchRef = doc(db, "uretim_partileri", batchId);
      await updateDoc(batchRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (err: any) {
      console.error("Update batch stage error:", err);
      return { success: false, error: err.message };
    }
  };

  // Delete Batch
  const deleteBatch = async (batchId: string) => {
    try {
      await deleteDoc(doc(db, "uretim_partileri", batchId));
      return { success: true };
    } catch (err: any) {
      console.error("Delete batch error:", err);
      return { success: false, error: err.message };
    }
  };

  return {
    batches,
    loading,
    error,
    activeDate,
    todayStr,
    tomorrowStr,
    neededBreads,
    calculateIngredients,
    createBatch,
    updateBatchStatus,
    deleteBatch,
  };
}
