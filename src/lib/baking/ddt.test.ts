import { describe, it, expect } from "vitest";
import {
  calculateDDTWaterTemp,
  calculateIceRequirement,
  FRICTION_PRESETS,
} from "./ddt";
import { DDTInput, IceCalculationInput } from "./types";

describe("DDT (İstenen Hamur Sıcaklığı) ve Buz Hesaplayıcı (Hand-Calculated Golden Fixtures)", () => {
  it("Standart 3 faktörlü DDT hesabı (Elle hesaplanmış altın örnek 1)", () => {
    // Hedef DDT: 26°C
    // Oda Sıcaklığı: 22°C
    // Un Sıcaklığı: 20°C
    // Yoğurma Yöntemi: Ev Tipi Mikser (Sürtünme = 5°C)
    // Beklenen Su Sıcaklığı = (3 * 26) - (22 + 20 + 5) = 78 - 47 = 31°C
    const input: DDTInput = {
      targetDDT: 26,
      roomTemp: 22,
      flourTemp: 20,
      kneadingMethod: "stand_mixer",
    };

    const res = calculateDDTWaterTemp(input);

    expect(res.requiredWaterTemp).toBe(31);
    expect(res.frictionFactor).toBe(5);
    expect(res.isFourFactor).toBe(false);
    expect(res.status).toBe("warm");
  });

  it("4 faktörlü DDT hesabı (Ön maya sıcaklığı dahil - Altın örnek 2)", () => {
    // Hedef DDT: 25°C
    // Oda Sıcaklığı: 24°C
    // Un Sıcaklığı: 23°C
    // Maya Sıcaklığı: 24°C
    // Elle yoğurma (Sürtünme = 1°C)
    // Beklenen Su Sıcaklığı = (4 * 25) - (24 + 23 + 24 + 1) = 100 - 72 = 28°C
    const input: DDTInput = {
      targetDDT: 25,
      roomTemp: 24,
      flourTemp: 23,
      starterTemp: 24,
      kneadingMethod: "hand",
    };

    const res = calculateDDTWaterTemp(input);

    expect(res.requiredWaterTemp).toBe(28);
    expect(res.frictionFactor).toBe(1);
    expect(res.isFourFactor).toBe(true);
    expect(res.status).toBe("warm");
  });

  it("Spiral mikser ile yüksek sürtünme ve soğuk su ihtiyacı", () => {
    // Hedef DDT: 24°C
    // Oda: 26°C
    // Un: 25°C
    // Spiral Mikser (Sürtünme = 10°C)
    // Su = (3 * 24) - (26 + 25 + 10) = 72 - 61 = 11°C
    const input: DDTInput = {
      targetDDT: 24,
      roomTemp: 26,
      flourTemp: 25,
      kneadingMethod: "spiral_mixer",
    };

    const res = calculateDDTWaterTemp(input);

    expect(res.requiredWaterTemp).toBe(11);
    expect(res.status).toBe("chilled");
  });

  it("Yaz aylarında aşırı sıcak ortamda buz ihtiyacı uyarısı (< 4°C)", () => {
    // Hedef DDT: 24°C
    // Oda: 30°C
    // Un: 28°C
    // Spiral Mikser: 10°C
    // Su = (3 * 24) - (30 + 28 + 10) = 72 - 68 = 4°C
    // Eğer oda 32°C olsaydı: 72 - 70 = 2°C
    const input: DDTInput = {
      targetDDT: 24,
      roomTemp: 32,
      flourTemp: 28,
      kneadingMethod: "spiral_mixer",
    };

    const res = calculateDDTWaterTemp(input);

    expect(res.requiredWaterTemp).toBe(2);
    expect(res.status).toBe("needs_ice");
    expect(res.note).toContain("buz hesabı");
  });

  it("Termal şok / 40°C üzeri uyarı", () => {
    // Kışın soğuk mutfakta: Hedef 26°C, Oda 15°C, Un 15°C, Elle yoğurma (1°C)
    // Su = (3 * 26) - (15 + 15 + 1) = 78 - 31 = 47°C
    const input: DDTInput = {
      targetDDT: 26,
      roomTemp: 15,
      flourTemp: 15,
      kneadingMethod: "hand",
    };

    const res = calculateDDTWaterTemp(input);

    expect(res.requiredWaterTemp).toBe(47);
    expect(res.status).toBe("too_hot_warning");
    expect(res.note).toContain("DİKKAT");
  });

  it("Kırılmış buz hesaplama motoru (Elle hesaplanmış altın örnek)", () => {
    // Formül: Buz = Toplam Su * (Musluk - Hedef) / (Musluk + 80)
    // Toplam Su: 400g
    // Musluk Suyu: 25°C
    // Hedef Su: 10°C
    // Pay: 400 * (25 - 10) = 400 * 15 = 6000
    // Payda: 25 + 80 = 105
    // Buz: 6000 / 105 = 57.14... => 57.1g
    // Kalan Sıvı Su: 400 - 57.14... = 342.85... => 342.9g
    const input: IceCalculationInput = {
      targetWaterTemp: 10,
      tapWaterTemp: 25,
      totalWaterWeight: 400,
    };

    const res = calculateIceRequirement(input);

    expect(res.iceWeight).toBe(57.1);
    expect(res.tapWaterWeight).toBe(342.9);
    expect(res.totalWater).toBe(400);
  });

  it("Musluk suyu zaten hedeften soğuksa buz gerekmez", () => {
    const input: IceCalculationInput = {
      targetWaterTemp: 20,
      tapWaterTemp: 18,
      totalWaterWeight: 350,
    };

    const res = calculateIceRequirement(input);

    expect(res.iceWeight).toBe(0);
    expect(res.tapWaterWeight).toBe(350);
  });
});
