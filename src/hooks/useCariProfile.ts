"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount, CariTransaction } from "@/types/admin";
import { Product } from "@/types";
import { INITIAL_PRODUCTS, normalizeCategory, ExtendedProduct } from "@/hooks/useProducts";

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

      // Supabase'den gelen snake_case veriyi camelCase objeye çevirme
      const formattedCari: CariAccount = {
        id: cariData.id,
        businessName: cariData.business_name,
        contactPerson: cariData.contact_person,
        phone: cariData.phone,
        address: cariData.address,
        neighborhood: cariData.neighborhood || "Beylikdüzü",
        taxOffice: cariData.tax_office,
        taxNumber: cariData.tax_number,
        balance: cariData.balance || 0,
        customPrices: cariData.custom_prices || {},
        createdAt: cariData.created_at,
        updatedAt: cariData.updated_at,
      };

      setCari(formattedCari);

      // Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", cariId)
        .order("created_at", { ascending: false });

      if (txError) {
        console.warn("Tx fetch error:", txError);
      } else if (txData) {
        const formattedTxs: CariTransaction[] = txData.map((t: any) => ({
          id: t.id,
          cariId: t.account_id,
          date: t.created_at ? t.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
          type: t.type,
          amount: t.amount,
          description: t.description,
          relatedOrderId: t.related_order_id,
          createdAt: t.created_at,
        }));
        setTransactions(formattedTxs);
      }

    } catch (err: any) {
      console.error("Cari fetch error:", err);
      setError(err.message || "Cari bilgileri alınamadı.");
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
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          category: normalizeCategory(p.category),
          isAvailable: p.is_available !== false,
          isActive: true,
          imageUrl: p.image_url,
          description: p.description,
          stock: Number(p.stock),
          weight: Number(p.weight),
          madeToOrder: Boolean(p.made_to_order),
          isPopular: Boolean(p.is_popular),
          isNew: Boolean(p.is_new)
        }));
        setActiveProducts(mapped);
      } else {
        setActiveProducts(INITIAL_PRODUCTS.filter(x => x.isActive));
      }
    } catch (err) {
      console.warn("Urunler fetch error:", err);
      setActiveProducts(INITIAL_PRODUCTS.filter(x => x.isActive));
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
