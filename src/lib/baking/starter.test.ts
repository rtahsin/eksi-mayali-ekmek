import { describe, it, expect } from "vitest";
import {
  calculateStarterFeeding,
  calculateTempMultiplier,
  RATIO_PROFILES,
} from "./starter";
import { StarterFeedingInput } from "./types";

describe("Ekşi Maya Besleme ve Zamanlayıcı Motoru (Hand-Calculated Golden Fixtures)", () => {
  it("Standart 1:2:2 besleme oranı gramaj dağılımı (Elle hesaplanmış altın örnek 1)", () => {
    // Hedef Aktif Maya: 150g
    // Oran: 1:2:2 (Ana maya : Un : Su)
    // Toplam parça = 1 + 2 + 2 = 5
    // Ana maya: 150 / 5 = 30g
    // Un: 150 * 2 / 5 = 60g
    // Su: 150 * 2 / 5 = 60g
    // Toplam: 30 + 60 + 60 = 150g
    const input: StarterFeedingInput = {
      targetStarterWeight: 150,
      ratio: "1:2:2",
      ambientTemp: 24, // Baz sıcaklık
    };

    const res = calculateStarterFeeding(input);

    expect(res.seedStarterWeight).toBe(30);
    expect(res.flourWeight).toBe(60);
    expect(res.waterWeight).toBe(60);
    expect(res.totalWeight).toBe(150);
    expect(res.estimatedPeakHours).toBe(5.5);
  });

  it("1:5:5 Gece besleme oranı gramaj dağılımı (Altın örnek 2)", () => {
    // Hedef: 220g aktif maya
    // Oran: 1:5:5 => 1 + 5 + 5 = 11 parça
    // Ana maya: 220 / 11 = 20g
    // Un: 220 * 5 / 11 = 100g
    // Su: 220 * 5 / 11 = 100g
    const input: StarterFeedingInput = {
      targetStarterWeight: 220,
      ratio: "1:5:5",
      ambientTemp: 24,
    };

    const res = calculateStarterFeeding(input);

    expect(res.seedStarterWeight).toBe(20);
    expect(res.flourWeight).toBe(100);
    expect(res.waterWeight).toBe(100);
    expect(res.estimatedPeakHours).toBe(11.5);
  });

  it("1:1:1 Hızlı besleme oranı gramaj dağılımı (Altın örnek 3)", () => {
    // Hedef: 90g aktif maya
    // Oran: 1:1:1 => 3 parça
    // 30g ana maya, 30g un, 30g su
    const input: StarterFeedingInput = {
      targetStarterWeight: 90,
      ratio: "1:1:1",
      ambientTemp: 24,
    };

    const res = calculateStarterFeeding(input);

    expect(res.seedStarterWeight).toBe(30);
    expect(res.flourWeight).toBe(30);
    expect(res.waterWeight).toBe(30);
    expect(res.estimatedPeakHours).toBe(3.5);
  });

  it("Sıcaklık etkisi (28°C ılık ortamda süre kısalır)", () => {
    // 28°C ortamda fermantasyon hızı artar, süre kısalır
    const input24: StarterFeedingInput = {
      targetStarterWeight: 150,
      ratio: "1:2:2",
      ambientTemp: 24,
    };
    const input28: StarterFeedingInput = {
      targetStarterWeight: 150,
      ratio: "1:2:2",
      ambientTemp: 28,
    };

    const res24 = calculateStarterFeeding(input24);
    const res28 = calculateStarterFeeding(input28);

    expect(res28.estimatedPeakHours).toBeLessThan(res24.estimatedPeakHours);
  });

  it("Sıcaklık etkisi (20°C serin ortamda süre uzar)", () => {
    const input24: StarterFeedingInput = {
      targetStarterWeight: 150,
      ratio: "1:2:2",
      ambientTemp: 24,
    };
    const input20: StarterFeedingInput = {
      targetStarterWeight: 150,
      ratio: "1:2:2",
      ambientTemp: 20,
    };

    const res24 = calculateStarterFeeding(input24);
    const res20 = calculateStarterFeeding(input20);

    expect(res20.estimatedPeakHours).toBeGreaterThan(res24.estimatedPeakHours);
  });

  it("Hedef yoğurma saatine göre besleme saati geri hesaplaması", () => {
    const targetDate = new Date("2026-10-08T14:00:00Z");
    const input: StarterFeedingInput = {
      targetStarterWeight: 150,
      ratio: "1:2:2",
      ambientTemp: 24, // ~5.5 saat
      targetBakingTime: targetDate,
    };

    const res = calculateStarterFeeding(input);

    expect(res.suggestedFeedingTime).toBeDefined();
    expect(typeof res.suggestedFeedingTime).toBe("string");
  });
});
