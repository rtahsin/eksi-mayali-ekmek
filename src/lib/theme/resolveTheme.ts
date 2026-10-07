/**
 * EkmekLab Tema Motoru (Faz I-02)
 *
 * "Atölye Kremi" ve "Atölye Gece" temaları arasında geçiş ve sistem tercihi çözümleme.
 * Saf ve test edilebilir mimari: resolveTheme(tercih, sistem).
 */

export type ThemePreference = "system" | "light" | "dark";
export type SystemTheme = "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "ekmeklab_theme_preference";

/**
 * Kullanıcı tercihi ve işletim sistemi temasını birleştirerek aktif temayı çözümler.
 * - "light" -> daima "light"
 * - "dark" -> daima "dark"
 * - "system" -> sistem neyse o ("light" veya "dark")
 */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: SystemTheme
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemTheme;
}

/**
 * Tarayıcı ortamında saklanan tema tercihini okur.
 * SSR veya localStorage kısıtlı ortamlarda sessizce "system" döner.
 */
export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
  } catch {
    // localStorage erişim engelli (örn. Safari özel gezinme, iframe)
  }
  return "system";
}

/**
 * Tema tercihini tarayıcıya güvenle yazar.
 */
export function setStoredThemePreference(pref: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // localStorage erişim engelli
  }
}

/**
 * İşletim sisteminin dark mod tercihini okur.
 */
export function getSystemTheme(): SystemTheme {
  if (typeof window === "undefined") return "light";
  try {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // matchMedia desteklenmiyor
  }
  return "light";
}

/**
 * DOM üzerindeki kök <html> elementine temayı uygular.
 */
export function applyThemeToDOM(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}
