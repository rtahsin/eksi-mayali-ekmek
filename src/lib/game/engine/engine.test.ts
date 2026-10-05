import { describe, expect, it } from "vitest";
import type { BakeDecisions, FlourKind, StarterDay, StarterSpot } from "@/types/game";
import { MASTER_DECISIONS, simulateBake, sampleAt } from "./bake";
import { ctmi, pHFromAcid } from "./kinetics";
import { GUILDS } from "./params";
import { newStarter, runStarterDay, starterProfile, TAHSIN_STARTER, testFeed, matureStarterState } from "./starter";

function grow(flour: FlourKind, spot: StarterSpot, days: number) {
  let st = newStarter(flour);
  const out: StarterDay[] = [];
  for (let i = 0; i < days; i++) {
    const r = runStarterDay(st, { spot, feed: "1:1:1" });
    st = r.next;
    out.push(r.day);
  }
  return { st, days: out };
}

const bake = (p: Partial<BakeDecisions>) => simulateBake({ ...MASTER_DECISIONS, ...p }).result;

describe("kinetik", () => {
  it("kardinal sıcaklık modeli optimumda 1, sınırlarda 0 (Gänzle 1998: F. sanfranciscensis 33/41 °C)", () => {
    const p = GUILDS.lacS;
    expect(ctmi(p.Topt, p.Tmin, p.Topt, p.Tmax)).toBeCloseTo(1, 5);
    expect(ctmi(41, p.Tmin, p.Topt, p.Tmax)).toBe(0);
    expect(ctmi(36, GUILDS.yst.Tmin, GUILDS.yst.Topt, GUILDS.yst.Tmax)).toBe(0);
  });
  it("asit biriktikçe pH düşer; tampon (kepek) düşüşü yavaşlatır", () => {
    expect(pHFromAcid(0, 1)).toBeCloseTo(6.2, 5);
    expect(pHFromAcid(120, 1)).toBeLessThan(4);
    expect(pHFromAcid(60, 1.4)).toBeGreaterThan(pHFromAcid(60, 1));
  });
});

describe("Bölüm 1: kendiliğinden ekşi maya", () => {
  it("1. gün sahte kabarma (enterobakteriler), 3. gün sessizlik, 5–7. gün hazır", () => {
    const { days } = grow("tam_bugday", "tezgah", 8);
    expect(days[0].stage).toBe("sahte_kabarma");
    expect(days[0].peakRise).toBeGreaterThan(1);
    expect(days[2].peakRise).toBeLessThan(0.6);
    expect(days[2].stage).toBe("sessizlik");
    const ready = days.find((d) => d.stage === "hazir")?.day ?? 99;
    expect(ready).toBeGreaterThanOrEqual(5);
    expect(ready).toBeLessThanOrEqual(7);
  });
  it("olgun mayada bakteri ~10⁹, maya ~10⁷, pH ≤ 4, enterobakteriler elenmiş", () => {
    const { st } = grow("tam_bugday", "tezgah", 10);
    expect(st.pop.lacS).toBeGreaterThan(8.8);
    expect(st.pop.yst).toBeGreaterThan(7);
    expect(st.pop.yst).toBeLessThan(8);
    expect(st.pop.ent).toBeLessThan(2);
    expect(st.pH).toBeLessThan(4.1);
  });
  it("tam çavdar daha hızlı, beyaz un ve serin yer daha yavaş", () => {
    const day = (f: FlourKind, s: StarterSpot) => grow(f, s, 12).days.find((d) => d.stage === "hazir")?.day ?? 99;
    const bugday = day("tam_bugday", "tezgah");
    expect(day("tam_cavdar", "ilik")).toBeLessThan(bugday);
    expect(day("beyaz", "tezgah")).toBeGreaterThan(bugday);
    expect(day("tam_bugday", "serin")).toBeGreaterThan(day("beyaz", "tezgah"));
  });
  it("olgun maya 1:1:1 beslemeden ~3–5 saatte iki katına çıkar (Tahsin: 4–5 saatte tepe)", () => {
    const t = testFeed(matureStarterState(TAHSIN_STARTER));
    expect(t.doubleHour).not.toBeNull();
    expect(t.doubleHour!).toBeGreaterThanOrEqual(2);
    expect(t.doubleHour!).toBeLessThanOrEqual(5);
  });
  it("karne üretir", () => {
    const g = grow("tam_bugday", "tezgah", 8);
    const p = starterProfile("Hamurabi", g.st, g.days);
    expect(p.name).toBe("Hamurabi");
    expect(p.readyDay).not.toBeNull();
    expect(p.labPerYeast).toBeGreaterThanOrEqual(10);
    expect(p.labPerYeast).toBeLessThanOrEqual(1000);
  });
});

describe("Pişirme günü motoru", () => {
  it("usta ayarı: hamur ~27 °C, mayalanmada ~iki kat, fırında olgunluk ~1, puan ≥ 90", () => {
    const r = bake({});
    expect(r.doughTemp).toBeCloseTo(27, 0);
    expect(r.bulkRise).toBeGreaterThan(0.7);
    expect(r.bulkRise).toBeLessThan(1.2);
    expect(r.proof).toBeGreaterThan(0.9);
    expect(r.proof).toBeLessThan(1.1);
    expect(r.scores.toplam).toBeGreaterThanOrEqual(90);
  });
  it("ılık su + uzun mayalanma pide yapar; kısa mayalanmayı 12 °C dolap kurtarır", () => {
    expect(bake({ waterTempC: 30, bulkHours: 5 }).title).toBe("Pide oldu");
    const short = bake({ bulkHours: 1.5 });
    const rescued = bake({ bulkHours: 1.5, fridgePlan: "on_iki_sonra_dort" });
    expect(short.tips).toContain("az_kabardi");
    expect(rescued.proof).toBeGreaterThan(short.proof + 0.25);
    expect(rescued.scores.toplam).toBeGreaterThan(short.scores.toplam);
  });
  it("asit ve pH: hamur mayalandıkça pH düşer, fırına girerken ~4,5–5,3", () => {
    const run = simulateBake(MASTER_DECISIONS);
    const atMix = sampleAt(run, run.marks.yogurma + 0.1);
    const atOven = sampleAt(run, run.marks.firin - 0.05);
    expect(atMix.pH).toBeGreaterThan(atOven.pH);
    expect(atOven.pH).toBeGreaterThan(4.5);
    expect(atOven.pH).toBeLessThan(5.3);
  });
  it("dolapta maya neredeyse durur, bakteriler asit üretmeyi sürdürür; asetik payı artar", () => {
    const run = simulateBake(MASTER_DECISIONS);
    const a = sampleAt(run, run.marks.dolap + 4);
    const b = sampleAt(run, run.marks.firin - 0.1);
    expect(b.pop.yst - a.pop.yst).toBeLessThan(0.1);
    expect(b.lactic + b.acetic).toBeGreaterThan(a.lactic + a.acetic);
  });
  it("fırın olayları sırayla: maya ölür → nişasta jelleşir → iç pişer", () => {
    const run = simulateBake(MASTER_DECISIONS);
    const t = (k: string) => run.events.find((e) => e.key === k)?.t ?? Infinity;
    expect(t("maya_oldu")).toBeLessThan(t("ic_pisti"));
    expect(t("nisasta_jel")).toBeLessThan(t("ic_pisti"));
    expect(t("firin")).toBeLessThan(t("maya_oldu"));
  });
  it("tuzsuz hamur daha hızlı mayalanır ve yavan olur", () => {
    const r = bake({ saltGrams: 0 });
    expect(r.proof).toBeGreaterThan(bake({}).proof);
    expect(r.scores.lezzet).toBeLessThan(30);
  });
});
