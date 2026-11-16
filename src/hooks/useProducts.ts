"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExtendedProduct, MasterclassDetail, ProductCategoryInfo } from "@/types";

export type { MasterclassDetail, ExtendedProduct };

export interface CatalogState {
  products: ExtendedProduct[];
  categories: ProductCategoryInfo[];
}

let cache: CatalogState | null = null;
let inflight: Promise<CatalogState> | null = null;

/** Yalnız birim testlerinde modül önbelleğini sıfırlamak için kullanılır. */
export function __resetProductsCacheForTests(): void {
  cache = null;
  inflight = null;
}

export function resolveInitialCatalogState(
  initialProducts?: ExtendedProduct[],
): { state: CatalogState; loading: boolean } {
  const hasInitial = Array.isArray(initialProducts) && initialProducts.length > 0;
  const hasCache = Boolean(cache && cache.products.length > 0);
  return {
    state: {
      products: hasInitial ? initialProducts : (cache?.products ?? []),
      categories: cache?.categories ?? [],
    },
    loading: !hasInitial && !hasCache,
  };
}

export function mergeFetchedCatalogState(
  prev: CatalogState,
  fetched: CatalogState,
  force: boolean,
): CatalogState {
  return {
    products:
      fetched.products.length > 0 || force || prev.products.length === 0
        ? fetched.products
        : prev.products,
    categories:
      fetched.categories.length > 0 || force || prev.categories.length === 0
        ? fetched.categories
        : prev.categories,
  };
}

export async function fetchCatalog(force = false): Promise<CatalogState> {
  if (cache && cache.products.length > 0 && !force) return cache;
  if (!inflight || force) {
    inflight = fetch("/api/products", { cache: force ? "no-store" : "default" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Partial<CatalogState>) => {
        const next: CatalogState = {
          products: Array.isArray(data.products) ? data.products : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
        };
        if (next.products.length > 0) {
          cache = next;
        }
        return next;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Vitrin kataloğu (aktif ürünler, görünür kategoriler). Sunucudan gelen `initialProducts`
 * doluysa ilk çizimde onlar kullanılır; boş dizi (`[]`) gelirse kilitlemez, API'den çeker.
 * Statik/eski fiyatlı yedek katalog YOKTUR.
 */
export function useProducts(category?: string, initialProducts?: ExtendedProduct[]) {
  const initial = resolveInitialCatalogState(initialProducts);
  const [state, setState] = useState<CatalogState>(initial.state);
  const [loading, setLoading] = useState<boolean>(initial.loading);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) setLoading(true);
    try {
      const data = await fetchCatalog(force);
      setState((prev) => mergeFetchedCatalogState(prev, data, force));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ürünler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

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
