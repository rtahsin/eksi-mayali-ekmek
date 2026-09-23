"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { CariAccount, CariTransaction, AdminOrder } from "@/types/admin";
import { Product } from "@/types";
import { INITIAL_PRODUCTS, normalizeCategory } from "@/hooks/useProducts";

export function useCariProfile(cariId: string) {
  const [cari, setCari] = useState<CariAccount | null>(null);
  const [transactions, setTransactions] = useState<CariTransaction[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
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
      const rawAccountType = (cariData.account_type as string) || (cariData.type as string) || "musteri";
      const formattedCari: CariAccount = {
        id: cariData.id,
        businessName: cariData.name || "İsimsiz Cari",
        contactPerson: cariData.contact_person || "",
        phone: cariData.phone || "",
        address: cariData.address || "",
        neighborhood: cariData.neighborhood || "",
        taxOffice: cariData.tax_office || "",
        taxNumber: cariData.tax_id || "",
        balance: Number(cariData.balance) || 0,
        accountType: rawAccountType === "gider" ? "gider" : "musteri",
        customPrices: cariData.custom_prices || {},
        notes: cariData.notes || "",
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
        const formattedTxs: CariTransaction[] = txData.map((t: Record<string, unknown>) => {
          const rawType = (t.type as string) || "satis";
          let txType: "satis" | "tahsilat" | "odeme" | "devir" | "storno" = "satis";
          if (rawType === "tahsilat" || rawType === "credit") txType = "tahsilat";
          else if (rawType === "odeme") txType = "odeme";
          else if (rawType === "devir") txType = "devir";
          else if (rawType === "storno") txType = "storno";
          else if (rawType === "debt" || rawType === "satis") txType = "satis";

          const desc = (t.description as string) || "";
          const parsedSlip = (t.slip_number as string) || desc.match(/\[(FİŞ-[^\]]+)\]/)?.[1] || undefined;

          return {
            id: t.id as string,
            cariId: t.account_id as string,
            date: t.date ? String(t.date).split("T")[0] : (t.created_at ? String(t.created_at).split("T")[0] : new Date().toISOString().split("T")[0]),
            type: txType,
            amount: Number(t.amount) || 0,
            description: desc,
            paymentMethod: (t.payment_method as "nakit" | "banka_havale" | "kredi_karti" | "diger" | undefined) || undefined,
            orderId: (t.order_id as string) || undefined,
            slipNumber: parsedSlip,
            balanceAfter: t.balance_after !== null && t.balance_after !== undefined ? Number(t.balance_after) : undefined,
            relatedOrderId: (t.order_id as string) || undefined,
            createdAt: t.created_at as string,
          };
        });
        setTransactions(formattedTxs);
      }

      // Fetch Orders for this Cari
      const { data: ordersData, error: ordersErr } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("cari_id", cariId)
        .order("delivery_date", { ascending: false });

      if (ordersErr) {
        console.warn("Orders fetch notice:", ordersErr.message);
      } else if (ordersData) {
        const mappedOrders: AdminOrder[] = ordersData.map((o: Record<string, unknown>) => {
          const rawItems = Array.isArray(o.order_items) ? o.order_items : [];
          return {
            id: o.id as string,
            orderNumber: ((o.order_number as string) || (o.id as string).replace("ORD-", "")).toUpperCase(),
            customerName: (o.customer_name as string) || formattedCari.businessName,
            phone: (o.phone as string) || formattedCari.phone,
            deliveryAddress: (o.delivery_address as string) || formattedCari.address,
            neighborhood: (o.neighborhood as string) || formattedCari.neighborhood,
            deliveryMethod: o.delivery_method === "pickup" ? "pickup" : "courier",
            deliveryDate: (o.delivery_date as string) || (o.created_at ? String(o.created_at).split("T")[0] : ""),
            deliveryTimeWindow: (o.delivery_time_window as string) || "14:00 - 18:00",
            items: rawItems.map((it: Record<string, unknown>) => ({
              productId: (it.product_id as string) || "",
              productName: (it.product_name as string) || "Ürün",
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.unit_price) || 0,
              totalPrice: Number(it.total_price) || 0,
              imageUrl: it.image_url as string | undefined,
              weight: it.weight as number | undefined,
            })),
            subtotal: Number(o.subtotal) || Number(o.total_amount) || 0,
            shippingFee: Number(o.shipping_fee) || 0,
            totalAmount: Number(o.total_amount) || 0,
            status: (o.status as any) || "hazirlaniyor",
            paymentMethod: (o.payment_method as any) || "cari",
            paymentStatus: o.status === "teslim_edildi" ? "paid" : "pending",
            source: "web",
            cariId: cariId,
            orderNotes: (o.order_notes as string) || "",
            courierNotes: "",
            createdAt: o.created_at,
            updatedAt: o.updated_at,
          };
        });
        setOrders(mappedOrders);
      }

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
          category: normalizeCategory(p.category as string),
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `cari_id=eq.${cariId}` },
        () => {
          fetchCariData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cariId, fetchCariData, fetchProducts]);

  return { cari, transactions, orders, activeProducts, loading, error, refetch: fetchCariData };
}
