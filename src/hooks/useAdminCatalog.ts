"use client";

import { useCallback, useEffect, useState } from "react";
import type { BundleItem, ExtendedProduct, MasterclassDetail, ProductCategoryInfo, ProductSaleDate } from "@/types";

/** Admin ürün formu (`POST /api/admin/products` gövdesi). */
export interface ProductForm {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  category: string;
  weight: number;
  weightUnit: "g" | "kg" | "ml" | "l" | "adet";
  isAvailable: boolean;
  isActive: boolean;
  isPopular: boolean;
  isNew: boolean;
  madeToOrder: boolean;
  availability: "daily" | "dates";
  saleDates: ProductSaleDate[];
  dailyLimit: number | null;
  leadTimeDays: number;
  capacityUnits: number;
  bundleItems: BundleItem[];
  crossSell: string[];
  displayOrder: number;
  ingredients: string[];
  flourTypes: string[];
  hydration: number | null;
  masterclass: MasterclassDetail | null;
  orderThreshold: number | null;
  saleWeekdays: number[] | null;
}

const UNITS: ProductForm["weightUnit"][] = ["g", "kg", "ml", "l", "adet"];

export function productToForm(p: ExtendedProduct): ProductForm {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    imageUrl: p.imageUrl?.startsWith("/images/categories/") ? null : p.imageUrl || null,
    category: p.category,
    weight: p.weight,
    weightUnit: (UNITS as string[]).includes(p.weightUnit || "") ? (p.weightUnit as ProductForm["weightUnit"]) : "g",
    isAvailable: p.isAvailable !== false,
    isActive: p.isActive !== false,
    isPopular: Boolean(p.isPopular),
    isNew: Boolean(p.isNew),
    madeToOrder: Boolean(p.madeToOrder),
    availability: p.availability ?? "daily",
    saleDates: p.saleDates ?? [],
    dailyLimit: p.dailyLimit ?? null,
    leadTimeDays: p.leadTimeDays ?? 0,
    capacityUnits: p.capacityUnits ?? 1,
    bundleItems: p.bundleItems ?? [],
    crossSell: p.crossSell ?? [],
    displayOrder: p.displayOrder ?? 0,
    ingredients: p.ingredients ?? [],
    flourTypes: p.flourTypes ?? [],
    hydration: p.hydration ?? null,
    masterclass: p.masterclass ?? null,
    orderThreshold: p.orderThreshold ?? null,
    saleWeekdays: p.saleWeekdays ?? null,
  };
}

export function emptyProductForm(category: string): ProductForm {
  return {
    name: "",
    description: "",
    price: 0,
    compareAtPrice: null,
    imageUrl: null,
    category,
    weight: 0,
    weightUnit: "g",
    isAvailable: true,
    isActive: true,
    isPopular: false,
    isNew: false,
    madeToOrder: false,
    availability: "daily",
    saleDates: [],
    dailyLimit: null,
    leadTimeDays: 0,
    capacityUnits: 1,
    bundleItems: [],
    crossSell: [],
    displayOrder: 0,
    ingredients: [],
    flourTypes: [],
    hydration: null,
    masterclass: null,
    orderThreshold: null,
    saleWeekdays: null,
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data: T & { error?: string } = await res.json().catch(() => ({}) as T & { error?: string });
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/** Admin kataloğu: arşivlenmişler ve gizli kategoriler dahil; tüm yazımlar sunucu API'si üzerinden. */
export function useAdminCatalog() {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await request<{ products: ExtendedProduct[]; categories: ProductCategoryInfo[] }>("/api/admin/products");
      setProducts(data.products);
      setCategories(data.categories);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ürünler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProduct = async (form: ProductForm) => {
    const res = await request<{ id: string; slug: string }>("/api/admin/products", { method: "POST", body: JSON.stringify(form) });
    await reload();
    return res;
  };

  const archiveProduct = async (id: string) => {
    await request(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await reload();
  };

  /** Liste üzerinden hızlı değişiklik (tükendi / vitrinde) — formun tamamı gönderilir. */
  const quickUpdate = async (product: ExtendedProduct, patch: Partial<ProductForm>) => {
    await saveProduct({ ...productToForm(product), ...patch });
  };

  const saveCategory = async (category: Partial<ProductCategoryInfo> & { name: string }) => {
    await request("/api/admin/categories", { method: "POST", body: JSON.stringify(category) });
    await reload();
  };

  const deleteCategory = async (id: string) => {
    await request(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await reload();
  };

  return { products, categories, loading, error, reload, saveProduct, archiveProduct, quickUpdate, saveCategory, deleteCategory };
}
