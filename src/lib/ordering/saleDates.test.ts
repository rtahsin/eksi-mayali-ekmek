import { describe, it, expect, vi } from "vitest";
import {
  weekdayLabel,
  upcomingSaleDates,
  formatTrDayMonth,
  getSaleScheduleBadge,
  ensureSaleDatesWindow,
} from "./saleDates";

describe("weekdayLabel pure function (I-06)", () => {
  it("handles empty or null-like inputs", () => {
    expect(weekdayLabel([])).toBe("");
  });

  it("formats single weekday correctly", () => {
    expect(weekdayLabel([5])).toBe("Cuma");
    expect(weekdayLabel([1])).toBe("Pazartesi");
    expect(weekdayLabel([7])).toBe("Pazar");
  });

  it("formats two weekdays with 've'", () => {
    expect(weekdayLabel([2, 5])).toBe("Salı ve Cuma");
    expect(weekdayLabel([5, 2])).toBe("Salı ve Cuma"); // sorts automatically
  });

  it("formats multiple weekdays with commas and 've'", () => {
    expect(weekdayLabel([1, 3, 5])).toBe("Pazartesi, Çarşamba ve Cuma");
    expect(weekdayLabel([6, 7])).toBe("Cumartesi ve Pazar");
  });

  it("handles all 7 weekdays as 'Her gün'", () => {
    expect(weekdayLabel([1, 2, 3, 4, 5, 6, 7])).toBe("Her gün");
  });
});

describe("formatTrDayMonth pure function", () => {
  it("formats ISO date to 'D Ay' format", () => {
    expect(formatTrDayMonth("2026-10-10")).toBe("10 Eki");
    expect(formatTrDayMonth("2026-01-05")).toBe("5 Oca");
    expect(formatTrDayMonth("2026-12-31")).toBe("31 Ara");
  });
});

describe("upcomingSaleDates pure function (I-06)", () => {
  it("returns empty array for empty weekdays or weeks <= 0", () => {
    expect(upcomingSaleDates([], "2026-10-07", 8)).toEqual([]);
    expect(upcomingSaleDates(null, "2026-10-07", 8)).toEqual([]);
    expect(upcomingSaleDates([5], "2026-10-07", 0)).toEqual([]);
  });

  it("generates 8 upcoming dates for a single weekday (Cuma = 5)", () => {
    // 2026-10-07 is Wednesday (3). Next Friday is 2026-10-09.
    const dates = upcomingSaleDates([5], "2026-10-07", 8);
    expect(dates).toHaveLength(8);
    expect(dates[0]).toBe("2026-10-09");
    expect(dates[1]).toBe("2026-10-16");
    expect(dates[2]).toBe("2026-10-23");
    expect(dates[3]).toBe("2026-10-30");
    expect(dates[4]).toBe("2026-11-06");
    expect(dates[5]).toBe("2026-11-13");
    expect(dates[6]).toBe("2026-11-20");
    expect(dates[7]).toBe("2026-11-27");
  });

  it("includes start date if it matches the weekday", () => {
    // 2026-10-09 is Friday (5).
    const dates = upcomingSaleDates([5], "2026-10-09", 2);
    expect(dates).toHaveLength(2);
    expect(dates[0]).toBe("2026-10-09");
    expect(dates[1]).toBe("2026-10-16");
  });

  it("generates interleaved dates for multiple weekdays in chronological order", () => {
    // 2026-10-05 is Monday (1). Weekdays: Tuesday (2) & Friday (5)
    const dates = upcomingSaleDates([2, 5], "2026-10-05", 2);
    expect(dates).toEqual([
      "2026-10-06", // Tue
      "2026-10-09", // Fri
      "2026-10-13", // Tue
      "2026-10-16", // Fri
    ]);
  });

  it("handles year roll-over seamlessly", () => {
    // 2026-12-23 is Wednesday. Fridays: 2026-12-25, 2027-01-01
    const dates = upcomingSaleDates([5], "2026-12-23", 2);
    expect(dates).toEqual(["2026-12-25", "2027-01-01"]);
  });
});

describe("getSaleScheduleBadge pure function (I-06)", () => {
  it("returns null when product is not available", () => {
    expect(getSaleScheduleBadge({ isAvailable: false })).toBeNull();
  });

  it("returns 'Her gün' for products with no saleWeekdays or all 7 days", () => {
    expect(getSaleScheduleBadge({ saleWeekdays: null })).toBe("Her gün");
    expect(getSaleScheduleBadge({ saleWeekdays: [] })).toBe("Her gün");
    expect(getSaleScheduleBadge({ saleWeekdays: [1, 2, 3, 4, 5, 6, 7] })).toBe("Her gün");
  });

  it("returns 'Her Cuma · sıradaki 9 Eki' for single day", () => {
    const badge = getSaleScheduleBadge({ saleWeekdays: [5] }, "2026-10-07");
    expect(badge).toBe("Her Cuma · sıradaki 9 Eki");
  });

  it("returns 'Salı ve Cuma · sıradaki 6 Eki' for multiple days", () => {
    const badge = getSaleScheduleBadge({ saleWeekdays: [2, 5] }, "2026-10-05");
    expect(badge).toBe("Salı ve Cuma · sıradaki 6 Eki");
  });
});

describe("ensureSaleDatesWindow async helper", () => {
  it("fetches active products and upserts 8 weeks of sale dates", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        not: vi.fn().mockResolvedValue({
          data: [
            { id: "prod-gece-yarisi", sale_weekdays: [5], daily_limit: 25 },
          ],
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "products") {
          return { select: mockSelect };
        }
        if (table === "product_sale_dates") {
          return { upsert: mockUpsert };
        }
        return {};
      }),
    } as unknown as Parameters<typeof ensureSaleDatesWindow>[0];

    const res = await ensureSaleDatesWindow(mockSupabase, 8, "2026-10-07");
    expect(res.productsCount).toBe(1);
    expect(res.datesAdded).toBe(8);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ product_id: "prod-gece-yarisi", sale_date: "2026-10-09", quantity_limit: 25 }),
      ]),
      { onConflict: "product_id, sale_date", ignoreDuplicates: true }
    );
  });
});
