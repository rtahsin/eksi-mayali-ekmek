import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/settings/server", () => ({
  getStoreSettings: vi.fn().mockResolvedValue({
    orderCutoffTime: "12:00",
    orderAcceptanceOpen: true,
    deliveryFee: 50,
    freeDeliveryThreshold: 500,
    minOrderAmount: 200,
    openWeekdays: [1, 2, 3, 4, 5],
    closedDates: [],
    customClosedRanges: [],
    sameDayDelivery: false,
    estimatedDeliveryDays: 1,
    maxDailyCapacity: 50,
    productCapacities: {},
    prepLeadDays: 1,
    deliveryNeighborhoods: [],
    whatsappPhone: "905551112233",
  }),
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn: () => Promise<unknown>) => fn),
  revalidateTag: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/settings route", () => {
  it("Cache-Control beklenen değer döner (public, s-maxage=60, stale-while-revalidate=300)", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toBe("public, s-maxage=60, stale-while-revalidate=300");

    const json = await response.json();
    expect(json.settings).toBeDefined();
    // isCutoffPassed yanıttan çıkarılmış olmalı
    expect(json.isCutoffPassed).toBeUndefined();
  });
});
