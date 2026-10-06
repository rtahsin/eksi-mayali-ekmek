import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdmin = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireAdmin: (req: Request) => mockRequireAdmin(req),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    rpc: mockRpc,
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  })),
}));

import { POST, GET } from "./route";

describe("POST /api/admin/orders/[id]/payments (P1-09 single-writer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      auth: { isAuthenticated: true, isAdmin: true, userId: "admin-1" },
    });
  });

  it("rejects unauthorized access when requireAdmin fails", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const req = new Request("http://localhost:3000/api/admin/orders/ORD-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ORD-1" }) });
    expect(res.status).toBe(401);
  });

  it("rejects invalid or non-positive amount with 400", async () => {
    const req = new Request("http://localhost:3000/api/admin/orders/ORD-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: -50, method: "cash" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ORD-1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("INVALID_AMOUNT");
  });

  it("calls record_order_payment RPC and returns success on valid payload", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        payment_id: "pay-123",
        payment_status: "paid",
        total_paid: 100,
        cari_transaction_id: null,
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/admin/orders/ORD-1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 100,
        method: "pos",
        status: "completed",
        note: "Kartla tahsil edildi",
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ORD-1" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.payment_id).toBe("pay-123");
    expect(json.data.payment_status).toBe("paid");

    expect(mockRpc).toHaveBeenCalledWith("record_order_payment", {
      p_order_id: "ORD-1",
      p_amount: 100,
      p_method: "pos",
      p_status: "completed",
      p_collected_by: "admin",
      p_courier_id: null,
      p_transaction_ref: null,
      p_note: "Kartla tahsil edildi",
      p_paid_at: null,
    });
  });

  it("returns 400 when RPC returns error", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "CANNOT_PAY_CANCELLED_ORDER" },
    });

    const req = new Request("http://localhost:3000/api/admin/orders/ORD-1/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "ORD-1" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("CANNOT_PAY_CANCELLED_ORDER");
  });

  it("handles GET /api/admin/orders/[id]/payments", async () => {
    const req = new Request("http://localhost:3000/api/admin/orders/ORD-1/payments");
    const res = await GET(req, { params: Promise.resolve({ id: "ORD-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
