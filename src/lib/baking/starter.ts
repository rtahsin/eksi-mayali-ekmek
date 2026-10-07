/**
 * Ekşi Maya Besleme ve Zamanlayıcı Motoru (P2-06)
 *
 * Besleme oranları (Maya:Un:Su), hedef maya gramajı ve ortam sıcaklığına bağlı
 * olarak mayanın hacimce iki-üç katına çıkıp zirveye (peak) ulaşacağı anı modeller.
 */

import {
  StarterFeedingInput,
  StarterFeedingRatio,
  StarterFeedingResult,
} from "./types";
import { roundTo } from "./bakersPercentage";

export interface RatioProfile {
  ratioNumber: number; // 1:R:R 'deki R değeri
  baseHoursAt24C: number; // 24°C'de ortalama zirve süresi (saat)
  windowSpanHours: number; // Zirve penceresi genişliği (+/- saat)
  description: string;
}

export const RATIO_PROFILES: Record<StarterFeedingRatio, RatioProfile> = {
  "1:1:1": {
    ratioNumber: 1,
    baseHoursAt24C: 3.5,
    windowSpanHours: 0.75,
    description: "Hızlı kabarma (~3-4 saat). Gün içi acil pişirmeler için uygundur.",
  },
  "1:2:2": {
    ratioNumber: 2,
    baseHoursAt24C: 5.5,
    windowSpanHours: 1.0,
    description: "Dengeli standart atölye beslemesi (~5-6 saat).",
  },
  "1:3:3": {
    ratioNumber: 3,
    baseHoursAt24C: 7.5,
    windowSpanHours: 1.2,
    description: "Orta-uzun kabarma (~7-8 saat). Sabah yoğurması için sabah erken besleme.",
  },
  "1:4:4": {
    ratioNumber: 4,
    baseHoursAt24C: 9.5,
    windowSpanHours: 1.5,
    description: "Geniş zamanlı besleme (~9-10 saat).",
  },
  "1:5:5": {
    ratioNumber: 5,
    baseHoursAt24C: 11.5,
    windowSpanHours: 1.5,
    description: "Gece beslemesi (~11-12 saat). Akşamdan besleyip sabah yoğurmak için idealdir.",
  },
};

/**
 * Sıcaklık düzeltme faktörü (Q10 kuralı bazlı)
 * 24°C referans alınır.
 */
export function calculateTempMultiplier(tempC: number): number {
  const clampedTemp = Math.min(32, Math.max(16, tempC));
  const delta = clampedTemp - 24;
  // Her 1°C artış hızı ~%8 artırır, dolayısıyla süreyi kısaltır
  const speedFactor = Math.pow(1.08, delta);
  return 1 / speedFactor;
}

export function calculateStarterFeeding(
  input: StarterFeedingInput
): StarterFeedingResult {
  const { targetStarterWeight, ratio, ambientTemp, targetBakingTime } = input;
  const profile = RATIO_PROFILES[ratio];

  // 1. Gramaj dağılımı: 1 : R : R => Toplam parça = 1 + 2R
  const totalParts = 1 + 2 * profile.ratioNumber;
  const seedStarterWeight = targetStarterWeight / totalParts;
  const flourWeight = (targetStarterWeight * profile.ratioNumber) / totalParts;
  const waterWeight = (targetStarterWeight * profile.ratioNumber) / totalParts;

  // 2. Sıcaklığa göre zirve süresi tahmini
  const tempMultiplier = calculateTempMultiplier(ambientTemp);
  const estimatedPeakHours = roundTo(profile.baseHoursAt24C * tempMultiplier, 1);
  const peakWindowStartHours = roundTo(
    Math.max(1, estimatedPeakHours - profile.windowSpanHours * tempMultiplier),
    1
  );
  const peakWindowEndHours = roundTo(
    estimatedPeakHours + profile.windowSpanHours * tempMultiplier,
    1
  );

  // 3. Hedef yoğurma saatine göre besleme saati geriye doğru hesaplanır
  let suggestedFeedingTime: string | undefined;
  if (targetBakingTime) {
    const targetDate =
      typeof targetBakingTime === "string"
        ? new Date(targetBakingTime)
        : new Date(targetBakingTime.getTime());

    if (!isNaN(targetDate.getTime())) {
      const feedingMs = targetDate.getTime() - estimatedPeakHours * 3600 * 1000;
      const feedingDate = new Date(feedingMs);
      suggestedFeedingTime = feedingDate.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      });
    }
  }

  return {
    seedStarterWeight: roundTo(seedStarterWeight, 1),
    flourWeight: roundTo(flourWeight, 1),
    waterWeight: roundTo(waterWeight, 1),
    totalWeight: roundTo(targetStarterWeight, 1),
    estimatedPeakHours,
    peakWindowStartHours,
    peakWindowEndHours,
    suggestedFeedingTime,
  };
}
