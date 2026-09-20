"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
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
  counterSurplus: number;
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
  const supabase = createClient();

  const fetchBatches = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: supaErr } = await (supabase as any)
        .from("production_batches")
        .select("*")
        .order("created_at", { ascending: false });

      if (supaErr) throw supaErr;

      if (data) {
        const mapped: ProductionBatch[] = data.map((d: any) => ({
          id: d.id,
          batchNumber: d.batch_number || `PARTI-${d.id.slice(-4)}`,
          targetDate: d.bake_time ? new Date(d.bake_time).toISOString().split("T")[0] : activeDate,
          status: (d.status || "otoliz_yogurma") as ProductionStage,
          items: [
            {
              productId: d.product_id || "",
              productName: d.product_name || "Taş Fırın Ekmeği",
              targetCount: Number(d.planned_quantity) || 0,
              flourType: d.flour_type || undefined,
            },
          ],
          counterSurplus: Math.max(0, (Number(d.planned_quantity) || 0) - (Number(d.baked_quantity) || 0)),
          totalLoaves: Number(d.planned_quantity) || 0,
          notes: d.notes || "",
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        setBatches(mapped);
      }
    } catch (err: any) {
      console.error("Production batches fetch error:", err);
      setError("Üretim partileri yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [supabase, activeDate]);

  useEffect(() => {
    fetchBatches();

    if (supabase && isSupabaseConfigured()) {
      const channelId = `admin-batches-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "production_batches" },
          () => {
            fetchBatches();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [supabase, fetchBatches]);

  // Calculate needed bread quantities for target date from confirmed orders
  const neededBreads = useMemo(() => {
    const dateOrders = allOrders.filter(
      (o) => o.deliveryDate === activeDate && o.status !== "iptal"
    );

    const counts: Record<string, { product: any; count: number }> = {};

    dateOrders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId) || {
          id: item.productId,
          name: item.productName,
          category: "bread",
          weight: 800,
        };

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
      const batchId = `batch_${Date.now().toString(36)}`;
      const batchNumber = `PARTI-${batchData.targetDate.replace(/-/g, "")}-${Math.floor(
        10 + Math.random() * 90
      )}`;
      const totalLoaves =
        batchData.items.reduce((s, it) => s + it.targetCount, 0) + (batchData.counterSurplus || 0);

      const firstItem = batchData.items[0];

      // Optimistic update
      const newBatch: ProductionBatch = {
        id: batchId,
        batchNumber,
        targetDate: batchData.targetDate,
        status: "otoliz_yogurma",
        items: batchData.items,
        counterSurplus: batchData.counterSurplus || 0,
        totalLoaves,
        notes: batchData.notes || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setBatches((prev) => [newBatch, ...prev]);

      if (supabase) {
        const { error: insErr } = await (supabase as any).from("production_batches").insert({
          id: batchId,
          batch_number: batchNumber,
          product_id: firstItem?.productId || null,
          product_name: firstItem?.productName || "Taş Fırın Ekmeği",
          flour_type: firstItem?.flourType || "Atalık Buğday",
          planned_quantity: totalLoaves,
          baked_quantity: 0,
          available_stock: totalLoaves,
          status: "otoliz_yogurma",
          bake_time: `${batchData.targetDate}T06:00:00Z`,
          notes: batchData.notes || "",
        });
        if (insErr) throw insErr;
      }

      return { success: true, id: batchId };
    } catch (err: any) {
      console.error("Create batch error:", err);
      fetchBatches();
      return { success: false, error: err.message };
    }
  };

  // Update Batch Stage
  const updateBatchStatus = async (batchId: string, newStatus: ProductionStage) => {
    try {
      setBatches((prev) =>
        prev.map((b) => (b.id === batchId ? { ...b, status: newStatus } : b))
      );

      if (supabase) {
        const { error: updErr } = await (supabase as any)
          .from("production_batches")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", batchId);
        if (updErr) throw updErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Update batch stage error:", err);
      fetchBatches();
      return { success: false, error: err.message };
    }
  };

  // Delete Batch
  const deleteBatch = async (batchId: string) => {
    try {
      setBatches((prev) => prev.filter((b) => b.id !== batchId));

      if (supabase) {
        const { error: delErr } = await (supabase as any)
          .from("production_batches")
          .delete()
          .eq("id", batchId);
        if (delErr) throw delErr;
      }

      return { success: true };
    } catch (err: any) {
      console.error("Delete batch error:", err);
      fetchBatches();
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
    refreshBatches: fetchBatches,
  };
}
