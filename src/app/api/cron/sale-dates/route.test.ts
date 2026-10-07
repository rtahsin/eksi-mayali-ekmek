import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";

const mockEnsureSaleDatesWindow = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

vi.mock("@/lib/ordering/saleDates", () => ({
  ensureSaleDatesWindow: (...args: unknown[]) => mockEnsureSaleDatesWindow(...args),
}));

describe("GET /api/cron/sale-dates", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 500 if CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const req = new Request("http://localhost/api/cron/sale-dates");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("CRON_SECRET");
  });

  it("returns 401 if authorization header is missing or incorrect", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";

    const reqMissing = new Request("http://localhost/api/cron/sale-dates");
    const resMissing = await GET(reqMissing);
    expect(resMissing.status).toBe(401);

    const reqWrong = new Request("http://localhost/api/cron/sale-dates", {
      headers: { authorization: "Bearer wrong-key" },
    });
    const resWrong = await GET(reqWrong);
    expect(resWrong.status).toBe(401);
  });

  it("successfully triggers ensureSaleDatesWindow and returns 200 with valid authorization", async () => {
    process.env.CRON_SECRET = "super-secret-key-123";
    mockEnsureSaleDatesWindow.mockResolvedValueOnce({
      productsCount: 2,
      datesAdded: 16,
    });

    const req = new Request("http://localhost/api/cron/sale-dates", {
      headers: { authorization: "Bearer super-secret-key-123" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.productsCount).toBe(2);
    expect(json.datesAdded).toBe(16);
    expect(mockEnsureSaleDatesWindow).toHaveBeenCalled();
  });
});
