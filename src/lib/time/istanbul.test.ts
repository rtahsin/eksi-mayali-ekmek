import { describe, expect, it } from "vitest";
import {
  addDays,
  formatTrDate,
  isIsoDate,
  isPastCutoff,
  istanbulToday,
  istanbulWeekday,
  normalizeDeliveryDate,
  relativeTrDate,
} from "./istanbul";

describe("istanbulToday", () => {
  it("UTC 21:30 → İstanbul'da ertesi gün (UTC+3)", () => {
    expect(istanbulToday(new Date("2026-10-04T21:30:00Z"))).toBe("2026-10-05");
  });
  it("UTC 20:59 → aynı gün (İstanbul 23:59)", () => {
    expect(istanbulToday(new Date("2026-10-04T20:59:00Z"))).toBe("2026-10-04");
  });
  it("UTC 23:59 → İstanbul ertesi gün 02:59 (eski UTC hatası K1)", () => {
    const d = new Date("2026-10-04T23:59:00Z");
    expect(d.toISOString().slice(0, 10)).toBe("2026-10-04");
    expect(istanbulToday(d)).toBe("2026-10-05");
  });
});

describe("isPastCutoff (İstanbul saati)", () => {
  it("11:59 İstanbul → 12:00 cutoff geçmedi", () => {
    expect(isPastCutoff("12:00", new Date("2026-10-04T08:59:00Z"))).toBe(false);
  });
  it("12:00 İstanbul → 12:00 cutoff geçti", () => {
    expect(isPastCutoff("12:00", new Date("2026-10-04T09:00:00Z"))).toBe(true);
  });
  it("geçersiz cutoff → false", () => {
    expect(isPastCutoff("25:99", new Date())).toBe(false);
  });
});

describe("tarih yardımcıları", () => {
  it("addDays ay ve yıl sınırını geçer", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("istanbulWeekday: 4 Ekim 2026 Pazar", () => {
    expect(istanbulWeekday("2026-10-04")).toBe(0);
  });
  it("isIsoDate geçersiz tarihleri reddeder", () => {
    expect(isIsoDate("2026-10-04")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("today")).toBe(false);
    expect(isIsoDate("custom:2026-10-04")).toBe(false);
  });
  it("formatTrDate", () => {
    expect(formatTrDate("2026-10-05")).toBe("Pzt 5 Eki");
    expect(formatTrDate("2026-10-05", "long")).toBe("5 Ekim Pazartesi");
  });
  it("relativeTrDate", () => {
    const now = new Date("2026-10-04T09:00:00Z");
    expect(relativeTrDate("2026-10-04", now)).toBe("Bugün");
    expect(relativeTrDate("2026-10-05", now)).toBe("Yarın");
    expect(relativeTrDate("2026-10-06", now)).toBe("Sal 6 Eki");
  });
});

describe("normalizeDeliveryDate (014 öncesi eski kayıtlar)", () => {
  const createdAt = "2026-10-03T22:30:00Z"; // İstanbul 4 Eki 01:30
  it("ISO aynen döner", () => {
    expect(normalizeDeliveryDate("2026-10-09", createdAt)).toBe("2026-10-09");
  });
  it("today → sipariş anının İstanbul günü", () => {
    expect(normalizeDeliveryDate("today", createdAt)).toBe("2026-10-04");
  });
  it("tomorrow → sipariş anı + 1", () => {
    expect(normalizeDeliveryDate("tomorrow", createdAt)).toBe("2026-10-05");
  });
  it("custom:YYYY-MM-DD → tarih", () => {
    expect(normalizeDeliveryDate("custom:2026-10-12", createdAt)).toBe("2026-10-12");
  });
});
