"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount, CariTransaction } from "@/types/admin";
import { mapAccount } from "@/lib/cari/account";
import { LEDGER_SELECT, mapLedger, type LedgerRow } from "@/lib/cari/ledger";
import { Product } from "@/types";
import type { ExtendedProduct } from "@/types";

export function useCariProfile(cariId: string) {
  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCariData = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!supabase || !isSupabaseConfigured()) {
        setError("Veritabanı bağlantısı kurulamadı.");
        setLoading(false);
        return;
      }

      // Fetch Cari details
      const { data: cariData, error: cariError } = await supabase
        .from("current_accounts")
        .select("*")
        .eq("id", cariId)
        .single();

      if (cariError) {
        throw new Error(cariError.message);
      }

      setCari(mapAccount(cariData as Record<string, unknown>));

      const { data: txData, error: txError } = await supabase
        .from("account_transactions")
        .select(LEDGER_SELECT)
        .eq("account_id", cariId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (txError) throw new Error(txError.message);
      setTransactions(mapLedger((txData ?? []) as LedgerRow[]));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cari bilgileri alınamadı.";
      console.error("Cari fetch error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [cariId]);

  const fetchProducts = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true);
        
      if (data && !error && data.length > 0) {
        const mapped = data.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          price: Number(p.price) || 0,
          category: (p.category as string) || "bread",
          isAvailable: p.is_available !== false,
          isActive: true,
          imageUrl: (p.image_url as string) || "",
          description: (p.description as string) || "",
          stock: Number(p.stock) || 0,
          weight: Number(p.weight) || 0,
          madeToOrder: Boolean(p.made_to_order),
          isPopular: Boolean(p.is_popular),
          isNew: Boolean(p.is_new)
        }));
        setActiveProducts(mapped);
      }
    } catch (err) {
      console.warn("Urunler fetch error:", err);
    }
  }, []);

  useEffect(() => {
    if (!cariId) return;
    
    fetchCariData();
    fetchProducts();

    const supabase = createClient();
    if (!supabase) return;

    // Realtime Listener for this specific account
    const channelId = `cari-detail-${cariId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_transactions", filter: `account_id=eq.${cariId}` },
        () => {
          fetchCariData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "current_accounts", filter: `id=eq.${cariId}` },
        () => {
          fetchCariData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cariId, fetchCariData, fetchProducts]);

  return { cari, transactions, activeProducts, loading, error, refetch: fetchCariData };
}
