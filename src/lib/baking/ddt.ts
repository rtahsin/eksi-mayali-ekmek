/**
 * İstenen Hamur Sıcaklığı (DDT - Desired Dough Temperature) Motoru (P2-06)
 *
 * Fermantasyon hızını ve hamur tutarlılığını kontrol eden en kritik değişken
 * yoğurma sonu hedef hamur sıcaklığıdır.
 */

import {
  DDTInput,
  DDTResult,
  IceCalculationInput,
  IceCalculationResult,
  KneadingMethod,
} from "./types";
import { roundTo } from "./bakersPercentage";

export const FRICTION_PRESETS: Record<KneadingMethod, { label: string; defaultTemp: number; desc: string }> = {
  hand: {
    label: "Elle Yoğurma",
    defaultTemp: 1,
    desc: "El ile hafif yoğurma veya katlama (0°C - 2°C sürtünme)",
  },
  stand_mixer: {
    label: "Ev Tipi Mikser",
    defaultTemp: 5,
    desc: "Stand mikser kanca ile yoğurma (4°C - 6°C sürtünme)",
  },
  spiral_mixer: {
    label: "Spiral / Profesyonel Mikser",
    defaultTemp: 10,
    desc: "Atölye/fırın tipi hızlı spiral mikser (8°C - 12°C sürtünme)",
  },
  custom: {
    label: "Özel Sürtünme",
    defaultTemp: 5,
    desc: "Kendi ekipmanınız için belirlenmiş sürtünme değeri",
  },
};

/**
 * DDT için gereken su sıcaklığını hesaplar
 */
export function calculateDDTWaterTemp(input: DDTInput): DDTResult {
  const {
    targetDDT,
    roomTemp,
    flourTemp,
    kneadingMethod,
    customFriction,
    starterTemp,
  } = input;

  const frictionFactor =
    kneadingMethod === "custom" && customFriction !== undefined
      ? customFriction
      : FRICTION_PRESETS[kneadingMethod].defaultTemp;

  const isFourFactor = typeof starterTemp === "number" && !isNaN(starterTemp);

  let requiredWaterTemp: number;

  if (isFourFactor) {
    // 4 Faktörlü Formül: (4 * DDT) - (Oda + Un + Maya + Sürtünme)
    requiredWaterTemp = 4 * targetDDT - (roomTemp + flourTemp + starterTemp + frictionFactor);
  } else {
    // 3 Faktörlü Formül: (3 * DDT) - (Oda + Un + Sürtünme)
    requiredWaterTemp = 3 * targetDDT - (roomTemp + flourTemp + frictionFactor);
  }

  requiredWaterTemp = roundTo(requiredWaterTemp, 1);

  // Durum ve uyarı belirleme
  let status: DDTResult["status"] = "ideal";
  let note = "Normal musluk suyu veya hafif ılık su ile dengelenebilir.";

  if (requiredWaterTemp > 40) {
    status = "too_hot_warning";
    note = "DİKKAT: 40°C üzerindeki su sıcaklığı maya hücrelerine ve enzim dengesine zarar verebilir. Unu veya ortamı soğutmayı değerlendirin.";
  } else if (requiredWaterTemp >= 28) {
    status = "warm";
    note = "Ilık su kullanmanız gerekiyor. Hamurun erken aşırı gazlanmaması için mayalanmayı yakından izleyin.";
  } else if (requiredWaterTemp >= 15 && requiredWaterTemp < 28) {
    status = "ideal";
    note = "İdeal oda/musluk suyu aralığı.";
  } else if (requiredWaterTemp >= 4 && requiredWaterTemp < 15) {
    status = "chilled";
    note = "Buzdolabında soğutulmuş su kullanmanız önerilir.";
  } else {
    status = "needs_ice";
    note = "Gereken sıcaklık 4°C altında. Sıvı su tek başına yetersiz kalabilir, buz hesabı yapınız.";
  }

  return {
    requiredWaterTemp,
    frictionFactor,
    isFourFactor,
    status,
    note,
  };
}

/**
 * Buz İhtiyacı Hesaplayıcı
 * Gereken su sıcaklığı musluk suyundan düşük olduğunda
 * erime gizli ısısı (80 cal/g) baz alınarak kırılmış buz miktarını bulur.
 *
 * Formül: Buz (g) = Toplam Su * (Musluk Suyu - Hedef Su) / (Musluk Suyu + 80)
 */
export function calculateIceRequirement(
  input: IceCalculationInput
): IceCalculationResult {
  const { targetWaterTemp, tapWaterTemp, totalWaterWeight } = input;

  if (targetWaterTemp >= tapWaterTemp || totalWaterWeight <= 0) {
    return {
      iceWeight: 0,
      tapWaterWeight: totalWaterWeight,
      totalWater: totalWaterWeight,
    };
  }

  const numerator = totalWaterWeight * (tapWaterTemp - targetWaterTemp);
  const denominator = tapWaterTemp + 80; // 80 cal/g buzun gizli erime ısısı
  const iceWeight = Math.min(totalWaterWeight, Math.max(0, numerator / denominator));
  const tapWaterWeight = totalWaterWeight - iceWeight;

  return {
    iceWeight: roundTo(iceWeight, 1),
    tapWaterWeight: roundTo(tapWaterWeight, 1),
    totalWater: roundTo(totalWaterWeight, 1),
  };
}
