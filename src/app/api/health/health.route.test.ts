import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdmin = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireAdmin: (req: Request) => mockRequireAdmin(req),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: "013_security_hardening" },
          { id: "014_order_core" },
          { id: "015_flexible_products" },
          { id: "016_ledger" },
          { id: "017_ledger_hardening" },
          { id: "018_order_lifecycle" },
          { id: "021_funnel_events" },
          { id: "022_media_bucket" },
          { id: "023_record_order_payment" },
          { id: "024_single_writer" },
          { id: "025_funnel_events_v2" },
          { id: "026_threshold_bakes" },
        ],
        error: null,
      }),
    }),
  })),
}));

import { GET } from "./route";

describe("GET /api/health (P1-11 observability)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { ok: true } on public healthcheck without detail query", async () => {
    const req = new Request("http://localhost:3000/api/health");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.timestamp).toBeDefined();
    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });

  it("rejects unauthorized access on ?detail=1 when requireAdmin fails", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const req = new Request("http://localhost:3000/api/health?detail=1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns full migrations diff on ?detail=1 when admin is authenticated", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: true,
      auth: { isAuthenticated: true, isAdmin: true },
    });

    const req = new Request("http://localhost:3000/api/health?detail=1");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.database.migrations.allApplied).toBe(true);
    expect(json.database.migrations.missing).toEqual([]);
    expect(json.database.migrations.expected.length).toBeGreaterThanOrEqual(10);
  });
});
