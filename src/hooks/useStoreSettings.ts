"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { CartDateOption, PublicStoreSettings } from "@/types/settings";
import { DEFAULT_STORE_SETTINGS, toPublicSettings } from "@/lib/settings/schema";

interface StoreSettingsState {
  settings: PublicStoreSettings;
  /** Sunucudan gerçek ayarlar geldi mi (gelmeden önce varsayılanlar gösterilir) */
  loaded: boolean;
  dates: CartDateOption[];
  datesLoaded: boolean;
  datesError: string | null;
  loadSettings: () => Promise<void>;
  /** Teslim tarihleri sepet içeriğine göre anlık hesaplanır (cutoff, satış günleri, limitler, kapasite) */
  loadDates: (items: { productId: string; quantity: number }[]) => Promise<void>;
}

let settingsPromise: Promise<void> | null = null;

const useStoreSettingsStore = create<StoreSettingsState>()((set) => ({
  settings: toPublicSettings(DEFAULT_STORE_SETTINGS),
  loaded: false,
  dates: [],
  datesLoaded: false,
  datesError: null,

  loadSettings: () => {
    if (!settingsPromise) {
      settingsPromise = fetch("/api/settings", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data: { settings?: PublicStoreSettings }) => {
          if (data.settings) set({ settings: data.settings, loaded: true });
        })
        .catch((err: unknown) => {
          console.warn("Store settings load failed:", err);
          settingsPromise = null; // sonraki çağrı tekrar denesin
        });
    }
    return settingsPromise;
  },

  loadDates: async (items) => {
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { dates?: CartDateOption[] } = await res.json();
      set({ dates: Array.isArray(data.dates) ? data.dates : [], datesLoaded: true, datesError: null });
    } catch {
      set({ datesLoaded: true, datesError: "Teslim tarihleri yüklenemedi. Lütfen sayfayı yenileyin." });
    }
  },
}));

/** İşletme ayarları (ücret, eşik, mahalleler, WhatsApp…) — ilk kullanımda bir kez yüklenir. */
export function useStoreSettings() {
  const settings = useStoreSettingsStore((s) => s.settings);
  const loaded = useStoreSettingsStore((s) => s.loaded);
  const loadSettings = useStoreSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return { settings, loaded };
}

/**
 * Sepete göre teslim günleri; `active` iken (sepet açık) ve sepet içeriği değiştikçe tazelenir.
 */
export function useDeliveryDates(active: boolean, items: { productId: string; quantity: number }[]) {
  const dates = useStoreSettingsStore((s) => s.dates);
  const datesLoaded = useStoreSettingsStore((s) => s.datesLoaded);
  const datesError = useStoreSettingsStore((s) => s.datesError);
  const loadDates = useStoreSettingsStore((s) => s.loadDates);
  const signature = JSON.stringify(items.map((i) => [i.productId, i.quantity]));

  useEffect(() => {
    if (!active) return;
    const lines: { productId: string; quantity: number }[] = (JSON.parse(signature) as [string, number][]).map(
      ([productId, quantity]) => ({ productId, quantity })
    );
    const timer = setTimeout(() => void loadDates(lines), 250); // adet +/− hızlı basılınca tek istek
    return () => clearTimeout(timer);
  }, [active, signature, loadDates]);

  const reloadDates = () => {
    const lines: { productId: string; quantity: number }[] = (JSON.parse(signature) as [string, number][]).map(
      ([productId, quantity]) => ({ productId, quantity })
    );
    return loadDates(lines);
  };

  return { dates, datesLoaded, datesError, reloadDates };
}
