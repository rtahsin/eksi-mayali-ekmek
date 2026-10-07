import { describe, it, expect } from "vitest";
import { thresholdState, nextSaleDate, formatCountdown, getProductThresholdDisplay } from "./threshold";

describe("thresholdState pure function (I-05)", () => {
  it("returns toplaniyor status when orders are below threshold", () => {
    const res = thresholdState(7, 10, null);
    expect(res.status).toBe("toplaniyor");
    expect(res.current).toBe(7);
    expect(res.threshold).toBe(10);
    expect(res.remainingToThreshold).toBe(3);
    expect(res.isReached).toBe(false);
    expect(res.isSoldOut).toBe(false);
    expect(res.label).toBe("7/10");
    expect(res.badgeLabel).toBe("3 adet kaldı");
    expect(res.progressPercent).toBe(70);
  });

  it("returns kesinlesti status without limit when orders reach threshold", () => {
    const res = thresholdState(10, 10, null);
    expect(res.status).toBe("kesinlesti");
    expect(res.isReached).toBe(true);
    expect(res.isSoldOut).toBe(false);
    expect(res.label).toBe("Kesinleşti");
    expect(res.badgeLabel).toBe("Kesinleşti");
    expect(res.progressPercent).toBe(100);
  });

  it("returns kesinlesti status with remaining count when orders reach threshold but below limit", () => {
    const res = thresholdState(12, 10, 25);
    expect(res.status).toBe("kesinlesti");
    expect(res.isReached).toBe(true);
    expect(res.isSoldOut).toBe(false);
    expect(res.label).toBe("Kesinleşti · 12/25");
    expect(res.badgeLabel).toBe("13 adet kaldı");
    expect(res.remainingToLimit).toBe(13);
    expect(res.progressPercent).toBe(48); // 12 / 25
  });

  it("returns tukendi status when orders reach upper limit", () => {
    const res = thresholdState(25, 10, 25);
    expect(res.status).toBe("tukendi");
    expect(res.isReached).toBe(true);
    expect(res.isSoldOut).toBe(true);
    expect(res.label).toBe("Kesinleşti · Tükendi");
    expect(res.badgeLabel).toBe("Tükendi");
    expect(res.progressPercent).toBe(100);
  });

  it("handles 0 or negative numbers gracefully", () => {
    const res = thresholdState(-5, 10, null);
    expect(res.current).toBe(0);
    expect(res.remainingToThreshold).toBe(10);
    expect(res.progressPercent).toBe(0);
  });
});

describe("nextSaleDate pure function (I-05)", () => {
  it("finds next Friday (5) from a Monday", () => {
    // 2026-10-05 is Monday
    const nextFriday = nextSaleDate([5], "2026-10-05");
    expect(nextFriday).toBe("2026-10-09");
  });

  it("finds next Friday (5) when given a Friday and allowSameDate is false", () => {
    // 2026-10-09 is Friday
    const nextFriday = nextSaleDate([5], "2026-10-09", false);
    expect(nextFriday).toBe("2026-10-16");
  });

  it("returns the same Friday if allowSameDate is true", () => {
    const sameFriday = nextSaleDate([5], "2026-10-09", true);
    expect(sameFriday).toBe("2026-10-09");
  });

  it("finds nearest day in multi-day schedule (e.g. Wednesday=3 and Saturday=6)", () => {
    // 2026-10-05 is Monday -> next is Wednesday 2026-10-07
    expect(nextSaleDate([3, 6], "2026-10-05")).toBe("2026-10-07");
    // From Wednesday 2026-10-07 -> next is Saturday 2026-10-10
    expect(nextSaleDate([3, 6], "2026-10-07")).toBe("2026-10-10");
  });

  it("handles Sunday (7 or 0)", () => {
    // 2026-10-09 is Friday -> next Sunday is 2026-10-11
    expect(nextSaleDate([7], "2026-10-09")).toBe("2026-10-11");
  });
});

describe("formatCountdown and getProductThresholdDisplay (I-05)", () => {
  it("formats countdown correctly with Turkish dative suffix", () => {
    // 2026-10-07 is Wednesday, 2026-10-09 is Friday (diff = 2)
    const cd = formatCountdown("2026-10-09", "2026-10-07");
    expect(cd).toBe("Cuma'ya 2 gün");

    // Same day
    expect(formatCountdown("2026-10-07", "2026-10-07")).toBe("Bugün fırında");

    // Tomorrow (diff = 1)
    expect(formatCountdown("2026-10-08", "2026-10-07")).toBe("Perşembe'ye 1 gün");
  });

  it("returns everyday bread info when product has no threshold", () => {
    const res = getProductThresholdDisplay({ orderThreshold: null }, "2026-10-07");
    expect(res.isThreshold).toBe(false);
    expect(res.displayLabel).toBe("Bugün fırında");
  });

  it("returns gathering state label '7/10 · Cuma'ya 2 gün' for threshold bread", () => {
    const res = getProductThresholdDisplay(
      {
        orderThreshold: 10,
        saleDates: [
          {
            date: "2026-10-09",
            limit: null,
            status: "toplaniyor",
            orderedCount: 7,
          },
        ],
      },
      "2026-10-07"
    );

    expect(res.isThreshold).toBe(true);
    expect(res.displayLabel).toBe("7/10 · Cuma'ya 2 gün");
    expect(res.state?.progressPercent).toBe(70);
  });

  it("returns 'Kesinleşti' when threshold is reached", () => {
    const res = getProductThresholdDisplay(
      {
        orderThreshold: 10,
        saleDates: [
          {
            date: "2026-10-09",
            limit: null,
            status: "kesinlesti",
            orderedCount: 10,
          },
        ],
      },
      "2026-10-07"
    );

    expect(res.isThreshold).toBe(true);
    expect(res.displayLabel).toBe("Kesinleşti");
  });

  it("returns 'Kesinleşti · 12/25' when threshold reached and upper limit exists", () => {
    const res = getProductThresholdDisplay(
      {
        orderThreshold: 10,
        dailyLimit: 25,
        saleDates: [
          {
            date: "2026-10-09",
            limit: 25,
            status: "kesinlesti",
            orderedCount: 12,
          },
        ],
      },
      "2026-10-07"
    );

    expect(res.isThreshold).toBe(true);
    expect(res.displayLabel).toBe("Kesinleşti · 12/25");
  });

  it("returns 'Tükendi' when upper limit is reached", () => {
    const res = getProductThresholdDisplay(
      {
        orderThreshold: 10,
        dailyLimit: 25,
        saleDates: [
          {
            date: "2026-10-09",
            limit: 25,
            status: "kesinlesti",
            orderedCount: 25,
          },
        ],
      },
      "2026-10-07"
    );

    expect(res.isThreshold).toBe(true);
    expect(res.displayLabel).toBe("Tükendi");
  });
});

