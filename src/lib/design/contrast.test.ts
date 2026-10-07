import { describe, it, expect } from "vitest";
import { ATELIER_CREAM } from "./tokens";

/**
 * WCAG 2.1 Bağıl Parlaklık (Relative Luminance) hesaplayıcı
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrast(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Atölye Kremi Renk & Kontrast Doğrulaması (T-01, MARKA §8)", () => {
  it("temel token değerlerinin MARKA §8 ile birebir örtüştüğünü doğrular", () => {
    expect(ATELIER_CREAM.bg).toBe("#F6EEDF");
    expect(ATELIER_CREAM.surface).toBe("#FBF6EC");
    expect(ATELIER_CREAM.ink).toBe("#3B1E1A");
    expect(ATELIER_CREAM.inkMuted).toBe("#6E5148");
    expect(ATELIER_CREAM.line).toBe("#E2D3BD");
    expect(ATELIER_CREAM.accent).toBe("#B4532A");
  });

  describe("Krem zemin (#F6EEDF) üzerinde metin kontrast oranları", () => {
    it("mürekkep (#3B1E1A) gövde metni kontrastı (≥ 4.5:1) kuralını rahatça geçer", () => {
      const contrast = calculateContrast(ATELIER_CREAM.ink, ATELIER_CREAM.bg);
      // Beklenen: ~13.1:1
      expect(contrast).toBeGreaterThanOrEqual(7.0); // AAA seviyesi
      expect(contrast).toBeCloseTo(13.14, 1);
    });

    it("ikincil metin (#6E5148) gövde metni kontrastı (≥ 4.5:1) kuralını geçer", () => {
      const contrast = calculateContrast(ATELIER_CREAM.inkMuted, ATELIER_CREAM.bg);
      // Beklenen: ~6.2:1
      expect(contrast).toBeGreaterThanOrEqual(4.5); // AA seviyesi
      expect(contrast).toBeCloseTo(6.21, 1);
    });

    it("terakota vurgusu (#B4532A) büyük metin (≥ 3:1) kuralını geçer ancak gövde metni için (< 4.5:1) yetersizdir", () => {
      const contrast = calculateContrast(ATELIER_CREAM.accent, ATELIER_CREAM.bg);
      // Beklenen: ~4.3:1 (4.32:1)
      expect(contrast).toBeGreaterThanOrEqual(3.0); // Büyük metin (≥18pt veya ≥14pt kalın) geçer
      expect(contrast).toBeLessThan(4.5); // Gövde metni için yetersizdir (AGENTS.md §3 kuralı)
      expect(contrast).toBeCloseTo(4.32, 1);
    });
  });

  describe("Kâğıt/Kart zemini (#FBF6EC) üzerinde metin kontrast oranları", () => {
    it("mürekkep kart üzerinde AAA kontrast sağlar (> 7:1)", () => {
      const contrast = calculateContrast(ATELIER_CREAM.ink, ATELIER_CREAM.surface);
      expect(contrast).toBeGreaterThan(13.0);
    });

    it("ikincil metin kart üzerinde AA kontrast sağlar (≥ 4.5:1)", () => {
      const contrast = calculateContrast(ATELIER_CREAM.inkMuted, ATELIER_CREAM.surface);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });
});
