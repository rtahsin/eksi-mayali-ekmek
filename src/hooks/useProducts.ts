"use client";
import { getErrorMessage } from "@/lib/utils/error";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types";

import {
  MasterclassDetail,
  ExtendedProduct,
  normalizeCategory,
  INITIAL_PRODUCTS,
} from "@/data/initialProducts";

export type { MasterclassDetail, ExtendedProduct };
export { normalizeCategory, INITIAL_PRODUCTS };

const getDeletedIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ekmeklab_deleted_products");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markIdAsDeletedLocally = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const arr = getDeletedIds();
    if (!arr.includes(id)) {
      arr.push(id);
      localStorage.setItem("ekmeklab_deleted_products", JSON.stringify(arr));
    }
  } catch {}
};

const unmarkIdAsDeletedLocally = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const arr = getDeletedIds().filter((d) => d !== id);
    localStorage.setItem("ekmeklab_deleted_products", JSON.stringify(arr));
  } catch {}
};

export function useProducts(category?: string, initialProducts?: ExtendedProduct[]) {
  const [products, setProducts] = useState<ExtendedProduct[]>(() => {
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts;
    }
    return INITIAL_PRODUCTS;
  });
  const [loading, setLoading] = useState<boolean>(!initialProducts);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const deletedIds = getDeletedIds();

      try {
        // 1. Try fetching from Supabase PostgreSQL first
        const supabase = createClient();
        if (supabase) {
          try {
            const { data: supaProducts, error: supaErr } = await supabase
              .from("products")
              .select("*")
              .eq("is_active", true)
              .order("is_popular", { ascending: false });

            if (supaProducts && !supaErr && supaProducts.length > 0) {
              const mapped: ExtendedProduct[] = supaProducts
                .map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  description: p.description || "",
                  price: Number(p.price),
                  imageUrl:
                    p.image_url ||
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
                  category: normalizeCategory(p.category),
                  stock: Number(p.stock) || 25,
                  weight: Number(p.weight) || 800,
                  weightUnit: p.weight_unit || "g",
                  madeToOrder: Boolean(p.made_to_order),
                  isPopular: Boolean(p.is_popular),
                  isNew: Boolean(p.is_new),
                  isAvailable: p.is_available !== false,
                  isActive: true,
                  ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
                  flourTypes: Array.isArray(p.flour_types) ? p.flour_types : [],
                  hydration: p.hydration ? Number(p.hydration) : undefined,
                  atelierPlacement: p.atelier_placement || undefined,
                  masterclass: p.masterclass || undefined,
                }))
                .filter((p: ExtendedProduct) => !deletedIds.includes(p.id));

              setProducts(mapped);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.warn("Supabase fetch notice, using initial products:", e);
          }
        }

        // 2. Fallback to rich initial artisan catalog
        setProducts(INITIAL_PRODUCTS.filter((p) => !deletedIds.includes(p.id)));
      } catch (err: unknown) {
        console.warn("Could not fetch products, using initial catalog:", err);
        setProducts(INITIAL_PRODUCTS.filter((p) => !deletedIds.includes(p.id)));
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    if (!category || category === "all") return true;
    if (category === "bread") return product.category === "bread";
    if (category === "specialty") return product.category === "specialty" || product.madeToOrder;
    if (category === "gurme" || category === "pantry") {
      return product.category === "gurme" || product.category === "pantry";
    }
    return product.category === category;
  });

  const reloadProducts = async () => {
    const deletedIds = getDeletedIds();
    const supabase = createClient();
    if (!supabase) return;
    try {
      const { data: supaProducts } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("is_popular", { ascending: false });

      if (supaProducts) {
        const mapped: ExtendedProduct[] = supaProducts
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: Number(p.price),
            imageUrl:
              p.image_url ||
              "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
            category: normalizeCategory(p.category),
            stock: Number(p.stock) || 25,
            weight: Number(p.weight) || 800,
            weightUnit: p.weight_unit || "g",
            madeToOrder: Boolean(p.made_to_order),
            isPopular: Boolean(p.is_popular),
            isNew: Boolean(p.is_new),
            isAvailable: p.is_available !== false,
            isActive: true,
            ingredients: Array.isArray(p.ingredients) ? p.ingredients : [],
            flourTypes: Array.isArray(p.flour_types) ? p.flour_types : [],
            hydration: p.hydration ? Number(p.hydration) : undefined,
            atelierPlacement: p.atelier_placement || undefined,
            masterclass: p.masterclass || undefined,
          }))
          .filter((p: ExtendedProduct) => !deletedIds.includes(p.id));

        setProducts(mapped);
      }
    } catch (e) {
      console.warn("Reload products error:", e);
    }
  };

  const updateProductPrice = async (id: string, newPrice: number) => {
    // 1. Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, price: newPrice } : p))
    );

    // 2. Supabase update
    const supabase = createClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("products")
          .update({ price: newPrice, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return { success: true };
      } catch (e: unknown) {
        console.error("Supabase price update error:", e);
        return { success: false, error: getErrorMessage(e) };
      }
    }
    return { success: true };
  };

  const toggleProductStock = async (id: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false ? true : false;

    // 1. Optimistic local update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isAvailable: nextStatus } : p))
    );

    // 2. Supabase update
    const supabase = createClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("products")
          .update({ is_available: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        return { success: true, isAvailable: nextStatus };
      } catch (e: unknown) {
        console.error("Supabase stock update error:", e);
        return { success: false, error: getErrorMessage(e) };
      }
    }
    return { success: true, isAvailable: nextStatus };
  };

  const saveProduct = async (productData: Partial<ExtendedProduct>) => {
    const id = productData.id || `prod_${Date.now().toString(36)}`;
    unmarkIdAsDeletedLocally(id);

    // Try server API first for guaranteed permissions
    try {
      const apiRes = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productData, id }),
      });
      if (apiRes.ok) {
        await reloadProducts();
        return { success: true, id };
      }
    } catch (e) {
      console.warn("API save product notice, falling back to direct client:", e);
    }

    const supabase = createClient();
    if (!supabase) return { success: false, error: "Supabase bağlantısı kurulamadı" };

    const payload: any = {
      id,
      name: productData.name,
      description: productData.description || "",
      price: Number(productData.price) || 0,
      image_url: productData.imageUrl || null,
      category: productData.category || "bread",
      stock: Number(productData.stock) || 25,
      weight: Number(productData.weight) || 800,
      weight_unit: productData.weightUnit || "g",
      made_to_order: Boolean(productData.madeToOrder),
      is_popular: Boolean(productData.isPopular),
      is_new: Boolean(productData.isNew),
      is_available: productData.isAvailable !== false,
      is_active: true,
      ingredients: productData.ingredients || [],
      flour_types: productData.flourTypes || [],
      hydration: productData.hydration || null,
      atelier_placement: productData.atelierPlacement || null,
      masterclass: productData.masterclass || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from("products").upsert(payload);
      if (error) throw error;
      await reloadProducts();
      return { success: true, id };
    } catch (e: unknown) {
      console.error("Supabase save product error:", e);
      return { success: false, error: getErrorMessage(e) };
    }
  };

  const deleteProduct = async (id: string) => {
    // 1. Mark as deleted locally so it never resurfaces
    markIdAsDeletedLocally(id);

    // 2. Instant optimistic removal from UI
    setProducts((prev) => prev.filter((p) => p.id !== id));

    // 3. Call server API route with service role
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        return { success: true };
      }
    } catch (apiErr) {
      console.warn("Server API delete product warning:", apiErr);
    }

    // 4. Direct Supabase client fallback
    const supabase = createClient();
    if (supabase) {
      try {
        const { error: delErr } = await supabase!
          .from("products")
          .delete()
          .eq("id", id);

        if (delErr) {
          await supabase!
            .from("products")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", id);
        }
        return { success: true };
      } catch (e: unknown) {
        console.error("Supabase delete product error:", e);
        return { success: false, error: getErrorMessage(e) };
      }
    }
    return { success: true };
  };

  return {
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    reloadProducts,
    updateProductPrice,
    toggleProductStock,
    saveProduct,
    deleteProduct,
  };
}
