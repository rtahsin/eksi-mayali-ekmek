import { describe, expect, it } from "vitest";
import { computeDeliveryDates, isDeliveryDateAllowed } from "./dates";

const base = {
  orderAcceptanceOpen: true,
  openWeekdays: [0, 1, 2, 3, 4, 5, 6],
  closedDates: [] as string[],
  maxDaysAhead: 7,
};

// 4 Ekim 2026 Pazar
const morning = new Date("2026-10-04T07:00:00Z"); // İstanbul 10:00
const afternoon = new Date("2026-10-04T10:00:00Z"); // İstanbul 13:00
const lateNightUtc = new Date("2026-10-04T22:30:00Z"); // İstanbul 5 Eki 01:30

describe("computeDeliveryDates", () => {
  it("bugün dahil 8 gün (0..7)", () => {
    const dates = computeDeliveryDates(base, morning);
    expect(dates).toHaveLength(8);
    expect(dates[0]).toEqual({ date: "2026-10-04", label: "Bugün" });
    expect(dates[1].label).toBe("Yarın");
    expect(dates.at(-1)?.date).toBe("2026-10-11");
  });

  it.each(["2026-10-04T13:00:00+03:00", "2026-10-04T19:00:00+03:00", "2026-10-04T23:59:59+03:00"])("saat sınırı olmadan bugün seçilebilir: %s", (instant) => {
    const now = new Date(instant);
    const dates = computeDeliveryDates(base, now);
    expect(dates[0]).toEqual({ date: "2026-10-04", label: "Bugün" });
    expect(dates).toHaveLength(8);
    expect(isDeliveryDateAllowed("2026-10-04", base, now)).toBe(true);
  });

  it("UTC gece yarısından sonra İstanbul günü kullanılır", () => {
    const dates = computeDeliveryDates(base, lateNightUtc);
    expect(dates[0]).toEqual({ date: "2026-10-05", label: "Bugün" });
  });

  it("kapalı hafta günleri ve kapalı tarihler atlanır", () => {
    const dates = computeDeliveryDates(
      { ...base, openWeekdays: [1, 2, 3, 4, 5, 6], closedDates: ["2026-10-06"] },
      morning
    );
    const list = dates.map((d) => d.date);
    expect(list).not.toContain("2026-10-04"); // Pazar
    expect(list).not.toContain("2026-10-11"); // Pazar
    expect(list).not.toContain("2026-10-06"); // kapalı tarih
    expect(list[0]).toBe("2026-10-05");
  });

  it("sipariş alımı kapalıysa hiç tarih yok", () => {
    expect(computeDeliveryDates({ ...base, orderAcceptanceOpen: false }, morning)).toEqual([]);
  });

  it("maxDaysAhead 0 olduğunda öğleden sonra da yalnız bugün seçilir", () => {
    expect(computeDeliveryDates({ ...base, maxDaysAhead: 0 }, afternoon)).toEqual([{ date: "2026-10-04", label: "Bugün" }]);
  });

  it("isDeliveryDateAllowed sunucu doğrulaması", () => {
    expect(isDeliveryDateAllowed("2026-10-04", base, morning)).toBe(true);
    expect(isDeliveryDateAllowed("2026-10-04", base, afternoon)).toBe(true);
    expect(isDeliveryDateAllowed("2026-10-03", base, afternoon)).toBe(false);
    expect(isDeliveryDateAllowed("2026-10-12", base, morning)).toBe(false);
  });
});
