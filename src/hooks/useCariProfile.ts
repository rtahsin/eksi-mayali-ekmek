"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchCariAccountDetail } from "@/lib/cari/client";
import { getErrorMessage } from "@/lib/utils/error";
import { useProducts } from "@/hooks/useProducts";
import type { CariAccount, CariTransaction } from "@/types/admin";
import type { Product } from "@/types";

export function useCariProfile(cariId: string) {
  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { allProducts } = useProducts();

  const activeProducts = useMemo<Product[]>(
    () => allProducts.filter((p) => p.isActive !== false),
    [allProducts]
  );

  const fetchCariData = useCallback(async () => {
    if (!cariId) {
      setLoading(false);
      return;
    }
    try {
      const detail = await fetchCariAccountDetail(cariId, { includeTransactions: true });
      setCari(detail.account);
      setTransactions(detail.transactions ?? []);
      setError(null);
    } catch (err: unknown) {
      const message = getErrorMessage(err) || "Cari bilgileri alınamadı.";
      console.error("Cari fetch error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [cariId]);

  useEffect(() => {
    if (!cariId) return;

    void fetchCariData();

    const supabase = createClient();
    if (!supabase || !isSupabaseConfigured()) return;

    const channelId = `cari-detail-${cariId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "account_transactions", filter: `account_id=eq.${cariId}` },
        () => {
          void fetchCariData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "current_accounts", filter: `id=eq.${cariId}` },
        () => {
          void fetchCariData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cariId, fetchCariData]);

  return { cari, transactions, activeProducts, loading, error, refetch: fetchCariData };
}
