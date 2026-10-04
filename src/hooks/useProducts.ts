"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtendedProduct, MasterclassDetail, ProductCategoryInfo } from "@/types";

export type { MasterclassDetail, ExtendedProduct };

interface CatalogState {
  products: ExtendedProduct[];
  categories: ProductCategoryInfo[];
}

let cache: CatalogState | null = null;
let inflight: Promise<CatalogState> | null = null;

async function fetchCatalog(force = false): Promise<CatalogState> {
  if (cache && !force) return cache;
  if (!inflight || force) {
    inflight = fetch("/api/products", { cache: force ? "no-store" : "default" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: CatalogState) => {
        cache = { products: data.products ?? [], categories: data.categories ?? [] };
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Vitrin kataloğu (aktif ürünler, görünür kategoriler). Sunucudan gelen `initialProducts`
 * varsa ilk çizimde onlar kullanılır. Statik/eski fiyatlı yedek katalog YOKTUR.
 * Ürün düzenleme yalnızca admin Ürünler sayfasından (`/api/admin/products`).
 */
export function useProducts(category?: string, initialProducts?: ExtendedProduct[]) {
  const [state, setState] = useState<CatalogState>(() => ({
    products: initialProducts ?? cache?.products ?? [],
    categories: cache?.categories ?? [],
  }));
  const [loading, setLoading] = useState<boolean>(!initialProducts && !cache);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    try {
      const data = await fetchCatalog(force);
      setState((prev) => ({
        products: initialProducts && !force ? prev.products : data.products,
        categories: data.categories,
      }));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ürünler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [initialProducts]);

  useEffect(() => {
    void load();
  }, [load]);

  const products =
    !category || category === "all" ? state.products : state.products.filter((p) => p.category === category);

  return {
    products,
    allProducts: state.products,
    categories: state.categories,
    loading,
    error,
    reloadProducts: () => load(true),
  };
}
