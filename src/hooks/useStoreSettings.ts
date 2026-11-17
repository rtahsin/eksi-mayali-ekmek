"use client";

import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import type { PublicStoreSettings } from "@/types/settings";
import { DEFAULT_STORE_SETTINGS, toPublicSettings } from "@/lib/settings/schema";
import { fetchDeliveryDates } from "@/lib/ordering/clientAvailability";
import type { DeliveryDatesState } from "@/types/settings";

interface StoreSettingsState {
  settings: PublicStoreSettings;
  /** Sunucudan gerçek ayarlar geldi mi (gelmeden önce varsayılanlar gösterilir) */
  loaded: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
}

let settingsPromise: Promise<void> | null = null;

const useStoreSettingsStore = create<StoreSettingsState>()((set) => ({
  settings: toPublicSettings(DEFAULT_STORE_SETTINGS),
  loaded: false,
  error: null,

  loadSettings: () => {
    if (!settingsPromise) {
      set({ error: null });
      settingsPromise = fetch("/api/settings", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data: { settings?: PublicStoreSettings }) => {
          if (!data.settings) throw new Error("Mağaza ayarları eksik");
          set({ settings: data.settings, loaded: true, error: null });
        })
        .catch((err: unknown) => {
          console.warn("Store settings load failed:", err);
          set({ loaded: false, error: "Mağaza ayarları yüklenemedi. Lütfen tekrar deneyin." });
          settingsPromise = null; // sonraki çağrı tekrar denesin
        });
    }
    return settingsPromise;
  },


}));

/** İşletme ayarları (ücret, eşik, mahalleler, WhatsApp…) — ilk kullanımda bir kez yüklenir. */
export function useStoreSettings() {
  const settings = useStoreSettingsStore((s) => s.settings);
  const loaded = useStoreSettingsStore((s) => s.loaded);
  const settingsError = useStoreSettingsStore((s) => s.error);
  const loadSettings = useStoreSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return { settings, loaded, settingsError, reloadSettings: loadSettings };
}

/**
 * Sepete göre teslim günleri; `active` iken (sepet açık) ve sepet içeriği değiştikçe tazelenir.
 */
export function useDeliveryDates(active: boolean, items: { productId: string; quantity: number }[]) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<DeliveryDatesState>({ key: "", dates: [], loaded: false, error: null });
  const signature = JSON.stringify(items.map((i) => [i.productId, i.quantity]));
  const key = `${revision}:${signature}`;

  useEffect(() => {
    if (!active) {
      setState({ key: "", dates: [], loaded: false, error: null });
      return;
    }
    const lines: { productId: string; quantity: number }[] = (JSON.parse(signature) as [string, number][]).map(
      ([productId, quantity]) => ({ productId, quantity })
    );
    const controller = new AbortController();
    setState({ key, dates: [], loaded: false, error: null });
    const timer = setTimeout(async () => {
      try {
        const dates = await fetchDeliveryDates(lines, controller.signal);
        if (!controller.signal.aborted) setState({ key, dates, loaded: true, error: null });
      } catch {
        if (!controller.signal.aborted) setState({ key, dates: [], loaded: true, error: "Teslim günleri yüklenemedi. Lütfen tekrar deneyin." });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [active, signature, key]);

  const reloadDates = useCallback(() => setRevision((value) => value + 1), []);
  // Never present availability from a previous cart while the new request is pending.
  const current = active && state.key === key;
  return { dates: current ? state.dates : [], datesLoaded: current && state.loaded, datesError: current ? state.error : null, reloadDates };
}
