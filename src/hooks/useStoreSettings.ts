"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { DeliveryDateOption, PublicStoreSettings } from "@/types/settings";
import { DEFAULT_STORE_SETTINGS, toPublicSettings } from "@/lib/settings/schema";

interface StoreSettingsState {
  settings: PublicStoreSettings;
  /** Sunucudan gerçek ayarlar geldi mi (gelmeden önce varsayılanlar gösterilir) */
  loaded: boolean;
  dates: DeliveryDateOption[];
  datesLoaded: boolean;
  datesError: string | null;
  loadSettings: () => Promise<void>;
  /** Teslim tarihleri anlık hesaplanır (cutoff); sepet her açıldığında tazelenir */
  loadDates: () => Promise<void>;
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

  loadDates: async () => {
    try {
      const res = await fetch("/api/availability", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { dates?: DeliveryDateOption[] } = await res.json();
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

/** Seçilebilir teslim tarihleri; `active` true olduğunda (ör. sepet açıkken) tazelenir. */
export function useDeliveryDates(active: boolean) {
  const dates = useStoreSettingsStore((s) => s.dates);
  const datesLoaded = useStoreSettingsStore((s) => s.datesLoaded);
  const datesError = useStoreSettingsStore((s) => s.datesError);
  const loadDates = useStoreSettingsStore((s) => s.loadDates);

  useEffect(() => {
    if (active) void loadDates();
  }, [active, loadDates]);

  return { dates, datesLoaded, datesError, reloadDates: loadDates };
}
