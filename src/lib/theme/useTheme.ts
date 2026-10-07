"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type ThemePreference,
  type ResolvedTheme,
  getStoredThemePreference,
  setStoredThemePreference,
  getSystemTheme,
  resolveTheme,
  applyThemeToDOM,
} from "./resolveTheme";

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getStoredThemePreference();
    const system = getSystemTheme();
    const current = resolveTheme(stored, system);
    setPreference(stored);
    setResolvedTheme(current);
    applyThemeToDOM(current);

    // İşletim sistemi tema değişikliklerini dinle
    if (typeof window !== "undefined" && window.matchMedia) {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const activeStored = getStoredThemePreference();
        if (activeStored === "system") {
          const next = e.matches ? "dark" : "light";
          setResolvedTheme(next);
          applyThemeToDOM(next);
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
    setResolvedTheme(next);
    applyThemeToDOM(next);
  }, []);

  return {
    preference,
    resolvedTheme,
    setPreference: changePreference,
    mounted,
  };
}
