import { describe, expect, it } from "vitest";
import type { RyeDecisions } from "@/types/game";
import { RYE_MASTER, simulateRye } from "./rye";

const rye = (p: Partial<RyeDecisions>) => simulateRye({ ...RYE_MASTER, ...p }).result;

describe("Gece Yarısı (çavdar) motoru", () => {
  it("Tahsin'in tarifi: ≥ 90 puan, pH < 5, nişasta saldırısı düşük, iç ~98 °C", () => {
    const r = rye({});
    expect(r.scores.toplam).toBeGreaterThanOrEqual(90);
    expect(r.pH).toBeLessThan(5);
    expect(r.starchAttack).toBeLessThan(0.3);
    expect(r.coreC).toBeGreaterThanOrEqual(96);
    expect(r.proof).toBeGreaterThan(0.85);
    expect(r.proof).toBeLessThan(1.15);
  });
  it("ekşi maya azsa asit amilazı frenleyemez: nişasta saldırısı, yapışkan iç", () => {
    const r = rye({ sourGrams: 300 });
    expect(r.starchAttack).toBeGreaterThan(0.5);
    expect(r.title).toBe("Yapışkan tuğla");
    expect(r.tips).toContain("asit_az");
  });
  it("ılık suyla haşlama enzimleri söndürmez; kaynar su daha iyi", () => {
    expect(rye({ scaldWater: "ilik" }).starchAttack).toBeGreaterThan(rye({}).starchAttack);
    expect(rye({ scaldWater: "ilik" }).scores.toplam).toBeLessThan(rye({}).scores.toplam);
  });
  it("çavdarı yoğurmak kazandırmaz", () => {
    expect(rye({ mix: "yogur" }).scores.toplam).toBeLessThan(rye({}).scores.toplam);
  });
  it("sabit 220 °C'de iki saat üstü yakar; düşen fırın korur", () => {
    expect(rye({ fallingOven: false }).title).toBe("Kömür");
  });
  it("az ve fazla mayalanma cezalandırılır; dinlenmeden kesmek iç yapıyı bozar", () => {
    expect(rye({ proofHours: 0.25 }).tips).toContain("mayalanma_az");
    expect(rye({ proofHours: 4 }).tips).toContain("mayalanma_fazla");
    const early = rye({ restHours: 6 });
    expect(early.title).toBe("Sabırsız fırıncı");
    expect(early.scores.ic).toBeLessThan(rye({}).scores.ic - 30);
  });
  it("ters çevirmeden alt kabuk nemli; buhar tahliyesi olmadan kabuk soluk", () => {
    expect(rye({ flip: false }).scores.kabuk).toBeLessThan(rye({}).scores.kabuk);
    expect(rye({ vents: 0 }).crust).toBeLessThan(rye({}).crust - 0.2);
  });
});
