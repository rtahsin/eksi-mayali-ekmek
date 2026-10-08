/**
 * Atölye Kremi Tasarım Sistemi Semantik Renk Token'ları (T-01, docs/MARKA.md §8)
 *
 * Değişmez kurallar:
 * - Zemin: #F6EEDF
 * - Kâğıt / Kart: #FBF6EC
 * - Mürekkep: #3B1E1A
 * - İkincil metin: #6E5148
 * - Çizgi: #E2D3BD
 * - Vurgu (terakota): #B4532A (krem üzerinde ~4.3:1 kontrast; yalnızca büyük metin ve UI öğelerinde kullanılır)
 */
export const ATELIER_CREAM = {
  bg: "#F6EEDF",
  surface: "#FBF6EC",
  ink: "#3B1E1A",
  inkMuted: "#6E5148",
  line: "#E2D3BD",
  accent: "#B4532A",
  // Yardımcı durum ve fırın gösterge renkleri
  good: "#5E7F3E",
  warn: "#C8862C",
  bad: "#9B2C1F",
  dough: "#EAD3A2",
} as const;

/**
 * Atölye Gece Paleti: "Obsidyen & Fırın Közü" (OLED Derinliği)
 * Zemin #0E0D0C, kart #181715, mürekkep #F8F4EE, ikincil #9E9387, çizgi #2A2724, vurgu #E07A5F.
 */
export const ATELIER_NIGHT = {
  bg: "#0E0D0C",
  surface: "#181715",
  ink: "#F8F4EE",
  inkMuted: "#9E9387",
  line: "#2A2724",
  accent: "#E07A5F",
  // Yardımcı durum ve fırın gösterge renkleri
  good: "#82A358",
  warn: "#DDA14C",
  bad: "#BD4638",
  dough: "#EAD3A2",
} as const;

export type AtelierCreamColor = keyof typeof ATELIER_CREAM;
export type AtelierNightColor = keyof typeof ATELIER_NIGHT;
