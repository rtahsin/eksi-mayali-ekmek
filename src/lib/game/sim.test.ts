import { describe, expect, it } from "vitest";
import {
  MASTER_DECISIONS,
  doughTemperature,
  internalTempAt,
  maturityAtShape,
  pokeResult,
  simulateBread,
  starterVigor,
  waterTempFor,
} from "./sim";

const play = (over: Partial<typeof MASTER_DECISIONS>) => simulateBread({ ...MASTER_DECISIONS, ...over });

describe("EkmekLab simülatörü — Tahsin'in köy ekmeği", () => {
  it("usta ayarı usta işi çıkar", () => {
    const r = play({});
    expect(r.title).toBe("Usta işi");
    expect(r.scores.toplam).toBeGreaterThanOrEqual(90);
    expect(r.tips).toEqual([]);
    expect(r.hydration).toBe(75);
    expect(r.levainPct).toBe(20);
    expect(r.doughTemp).toBeGreaterThanOrEqual(26);
    expect(r.doughTemp).toBeLessThanOrEqual(28.5);
    expect(r.internalTemp).toBeGreaterThanOrEqual(96);
  });

  it("DDT: dolap suyu + iyi yoğurma 27 °C'ye yakın; formül tersine çalışır", () => {
    expect(doughTemperature(4, 0.9)).toBeCloseTo(26.95, 1);
    expect(waterTempFor(27, 0.9)).toBeCloseTo(4.2, 0);
    expect(doughTemperature(35, 0.9)).toBeGreaterThan(34);
  });

  it("maya 4–5 saatte tepe yapar; 8 saat ekşitir ama bozmaz", () => {
    expect(starterVigor(4.5)).toBeCloseTo(1);
    expect(starterVigor(2)).toBeLessThan(0.4);
    const sour = play({ levainHours: 8 });
    expect(sour.sourness).toBeGreaterThan(play({}).sourness);
    expect(sour.scores.toplam).toBeGreaterThanOrEqual(70);
  });

  it("ılık su hamuru ısıtır, uzun mayalanmada fazla kabarır", () => {
    const r = play({ waterTempC: 35, bulkHours: 4 });
    expect(r.tips).toContain("fazla_kabardi");
    expect(r.scores.toplam).toBeLessThan(70);
  });

  it("erken şekil verilen hamur 12 °C dolapta kurtulur", () => {
    const early = { levainGrams: 700, bulkHours: 2, foldTimes: [0.5, 1, 1.5, 2] };
    const cold = play({ ...early, fridgePlan: "dort" });
    const warm = play({ ...early, fridgePlan: "on_iki_sonra_dort" });
    expect(cold.tips).toContain("az_kabardi");
    expect(warm.scores.toplam).toBeGreaterThan(cold.scores.toplam);
  });

  it("parmak testi şekil anındaki olgunluğa göre: usta ayarı 4 °C, kısa mayalanma 12 °C", () => {
    expect(pokeResult(maturityAtShape(MASTER_DECISIONS))).toBe("yavas");
    expect(pokeResult(maturityAtShape({ ...MASTER_DECISIONS, bulkHours: 2 }))).toBe("hizli");
    expect(pokeResult(maturityAtShape({ ...MASTER_DECISIONS, bulkHours: 5 }))).toBe("donmuyor");
  });

  it("tuz otolize konursa usta uyarır; tuzsuz yavan", () => {
    expect(play({ saltTiming: "otoliz" }).tips).toContain("tuz_otoliz");
    expect(play({ saltGrams: 0 }).tips).toContain("tuz_yok");
  });

  it("bıçak dik tutulursa kulak kalkmaz; buharsız fırın açılmaz", () => {
    const base = play({});
    expect(play({ cut: { ...MASTER_DECISIONS.cut, blade: 90 } }).ear).toBeLessThan(base.ear / 2);
    expect(play({ steam: false }).tips).toContain("buhar_yok");
    expect(play({ ventMinute: null }).tips).toContain("buhar_tahliye_yok");
  });

  it("iç sıcaklık 40 dakikada 96 °C'yi geçer; sıcak kesilen ekmek hamurumsu", () => {
    expect(internalTempAt(40)).toBeGreaterThan(96);
    expect(internalTempAt(25)).toBeLessThan(93);
    const hot = play({ cutWaitHours: 0 });
    expect(hot.gummy).toBeGreaterThan(0.3);
    expect(hot.tips).toContain("erken_kesti");
  });

  it("siyez: az su kaldırır, bir gün beklemek ister; köy ayarıyla yayılır", () => {
    const siyezMaster = play({ level: "siyez", waterGrams: 2800, levainGrams: 700, foldTimes: [0.5, 1, 1.5, 2, 2.5, 2.75], cutWaitHours: 24 });
    const siyezWet = play({ level: "siyez", cutWaitHours: 24 });
    expect(siyezMaster.scores.toplam).toBeGreaterThanOrEqual(85);
    expect(siyezWet.tips).toContain("su_fazla");
    expect(play({ level: "siyez", waterGrams: 2800, levainGrams: 700, cutWaitHours: 3 }).tips).toContain("erken_kesti");
  });
});
