"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type ThemePreference,
  type ResolvedTheme,
  type DarkThemeVariant,
  getStoredThemePreference,
  setStoredThemePreference,
  getStoredDarkVariant,
  setStoredDarkVariant,
  getSystemTheme,
  resolveTheme,
  applyThemeToDOM,
} from "./resolveTheme";

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [darkVariant, setDarkVariantState] = useState<DarkThemeVariant>("b");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredThemePreference();
    const variant = getStoredDarkVariant();
    const system = getSystemTheme();
    const current = resolveTheme(stored, system);
    setPreference(stored);
    setResolvedTheme(current);
    setDarkVariantState(variant);
    applyThemeToDOM(current, variant);

    // İşletim sistemi tema değişikliklerini dinle
    if (typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const activeStored = getStoredThemePreference();
        if (activeStored === "system") {
          const next = e.matches ? "dark" : "light";
          const curVar = getStoredDarkVariant();
          setResolvedTheme(next);
          applyThemeToDOM(next, curVar);
        }
      };
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, []);

  const changePreference = useCallback((nextPref: ThemePreference) => {
    setStoredThemePreference(nextPref);
    setPreference(nextPref);
    const system = getSystemTheme();
    const next = resolveTheme(nextPref, system);
    const curVar = getStoredDarkVariant();
    setResolvedTheme(next);
    applyThemeToDOM(next, curVar);
  }, []);

  const changeDarkVariant = useCallback((v: DarkThemeVariant) => {
    setStoredDarkVariant(v);
    setDarkVariantState(v);
    const system = getSystemTheme();
    const curPref = getStoredThemePreference();
    const cur = resolveTheme(curPref, system);
    applyThemeToDOM(cur, v);
  }, []);

  return {
    preference,
    resolvedTheme,
    darkVariant,
    setPreference: changePreference,
    setDarkVariant: changeDarkVariant,
    mounted,
  };
}
