import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockSendThresholdSummary = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/notify/telegram", () => ({
  sendThresholdSummary: (...args: unknown[]) => mockSendThresholdSummary(...args),
}));

import { GET } from "./route";

describe("GET /api/cron/threshold", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns 500 if CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const req = new Request("http://localhost:3000/api/cron/threshold");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("CRON_SECRET");
  });

  it("returns 401 if Authorization header is missing", async () => {
    process.env.CRON_SECRET = "test-secret-123";
    const req = new Request("http://localhost:3000/api/cron/threshold");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 if Authorization header is invalid", async () => {
    process.env.CRON_SECRET = "test-secret-123";
    const req = new Request("http://localhost:3000/api/cron/threshold", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 and calls RPC and notification on valid CRON_SECRET", async () => {
    process.env.CRON_SECRET = "test-secret-123";
    mockRpc.mockResolvedValueOnce({
      data: {
        processed: 1,
        decisions: [
          {
            product_id: "prod-1",
            product_name: "Köy Ekmeği",
            sale_date: "2026-10-09",
            decision: "kesinlesti",
            ordered_quantity: 12,
            threshold: 10,
          },
        ],
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/cron/threshold", {
      headers: {
        authorization: "Bearer test-secret-123",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.processed).toBe(1);
    expect(json.decisions).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledWith("decide_threshold_bakes", expect.any(Object));
    expect(mockSendThresholdSummary).toHaveBeenCalledWith(json.decisions);
  });
});
