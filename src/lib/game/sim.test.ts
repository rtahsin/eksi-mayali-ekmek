import { describe, expect, it } from "vitest";
import { MASTER_DECISIONS, doughTemperature, simulateBread, starterVigor } from "./sim";

const play = (over: Partial<typeof MASTER_DECISIONS>) => simulateBread({ ...MASTER_DECISIONS, ...over });

describe("EkmekLab simülatörü — Tahsin'in reçetesi", () => {
  it("usta ayarı usta işi çıkar", () => {
    const r = play({});
    expect(r.title).toBe("Usta işi");
    expect(r.scores.toplam).toBeGreaterThanOrEqual(88);
    expect(r.tips).toEqual([]);
    expect(r.doughTemp).toBeGreaterThanOrEqual(26);
    expect(r.doughTemp).toBeLessThanOrEqual(28.5);
  });

  it("maya 4–5 saatte tepe yapar; erken kullanılan zayıf", () => {
    expect(starterVigor(4.5)).toBeCloseTo(1);
    expect(starterVigor(2)).toBeLessThan(0.4);
    expect(starterVigor(8)).toBeGreaterThan(0.6);
  });

  it("8 saat bekleyen maya ekşitir ama ekmeği bozmaz", () => {
    const r = play({ levainHours: 8 });
    expect(r.sourness).toBeGreaterThan(0.45);
    expect(r.scores.toplam).toBeGreaterThanOrEqual(70);
  });

  it("ılık su hamuru ısıtır, uzun mayalanmada fazla kabarır", () => {
    expect(doughTemperature("ilik", 0.9)).toBeGreaterThan(35);
    const r = play({ waterTemp: "ilik", bulkHours: 4 });
    expect(r.tips).toContain("hamur_sicak");
    expect(r.scores.toplam).toBeLessThan(70);
  });

  it("erken şekil verilen hamur 12 °C dolapta kurtulur, 4 °C'de az kabarır", () => {
    const early = { levainPct: 17.5, bulkHours: 2, foldTimes: [0.5, 1, 1.5, 2] };
    const cold = play({ ...early, fridgePlan: "dort" });
    const warm = play({ ...early, fridgePlan: "on_iki_sonra_dort" });
    expect(cold.tips).toContain("az_kabardi");
    expect(warm.proof).toBeGreaterThan(cold.proof);
    expect(warm.scores.toplam).toBeGreaterThan(cold.scores.toplam);
  });

  it("tuzsuz ekmek yavan, sıcak kesilen ekmek hamurumsu", () => {
    expect(play({ saltPct: 0 }).tips).toContain("tuz_yok");
    const hot = play({ cutWait: "hemen" });
    expect(hot.gummy).toBeGreaterThan(0.3);
    expect(hot.tips).toContain("erken_kesti");
  });

  it("erken maya ve çiğ iç lezzeti düşürür", () => {
    expect(play({ levainHours: 1.5 }).scores.lezzet).toBeLessThan(85);
    expect(play({ bakeMinutes: 25, cutWait: "hemen" }).scores.lezzet).toBeLessThan(80);
  });

  it("buharsız fırında kulak kalkmaz", () => {
    expect(play({ steamMinutes: 0 }).ear).toBeLessThan(play({}).ear / 2);
  });
});
