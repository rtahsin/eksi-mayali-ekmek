import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireCapability = vi.fn();
const mockWriteAuditLog = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireCapability: (req: Request, cap: string) => mockRequireCapability(req, cap),
}));

vi.mock("@/lib/security/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

import { POST } from "./route";

function buildReq(body: unknown): Request {
  return new Request("http://localhost:3000/api/admin/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_IDEM = "11111111-1111-4111-8111-111111111111";
const VALID_COURIER = "22222222-2222-4222-8222-222222222222";

describe("POST /api/admin/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCapability.mockResolvedValue({
      ok: true,
      auth: {
        isAuthenticated: true,
        isAdmin: true,
        role: "admin",
        userId: "admin-1",
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "current_accounts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "cari-1",
                  archived_at: null,
                  district: "Büyükçekmece",
                  custom_prices: { "ekmek-1": 85 },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "ekmek-1",
                  name: "Ekşi Mayalı Tam Buğday",
                  price: 110,
                  image_url: null,
                  weight: 700,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockRpc.mockResolvedValue({
      data: { order_id: "ORD-100", order_number: "SIP-2611-010", is_existing: false },
      error: null,
    });
  });

  it("rejects unauthorized request", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const res = await POST(buildReq({}));
    expect(res.status).toBe(403);
  });

  it("supports admin catalog price override, freeform items, cari district fallback, and courier pre-assignment", async () => {
    const res = await POST(
      buildReq({
        idempotencyKey: VALID_IDEM,
        customerName: "Kafe Maya",
        phone: "05321112233",
        deliveryAddress: "Cumhuriyet — Kafe Maya",
        neighborhood: "Cumhuriyet",
        deliveryMethod: "courier",
        deliveryDate: "2026-11-16",
        shippingFee: 0,
        paymentMethod: "cari",
        source: "admin",
        status: "hazirlaniyor",
        cariId: "cari-1",
        courierId: VALID_COURIER,
        courierNotes: "Arka kapıdan teslim",
        items: [
          { productId: "ekmek-1", productName: "Ekşi Mayalı", quantity: 4, unitPrice: 80 },
          { productId: null, productName: "Özel Toptan Tepsi", quantity: 2, unitPrice: 250 },
        ],
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orderNumber).toBe("SIP-2611-010");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [, rpcPayload] = mockRpc.mock.calls[0] as [string, { p_order: Record<string, unknown>; p_items: Array<Record<string, unknown>> }];
    expect(rpcPayload.p_order.district).toBe("Büyükçekmece");
    expect(rpcPayload.p_order.courier_id).toBe(VALID_COURIER);
    expect(rpcPayload.p_order.courier_notes).toBe("Arka kapıdan teslim");
    expect(rpcPayload.p_order.source).toBe("admin");
    expect(rpcPayload.p_order.subtotal).toBe(4 * 80 + 2 * 250);
    expect(rpcPayload.p_items[0].unit_price).toBe(80);
    expect(rpcPayload.p_items[1]).toMatchObject({
      product_id: null,
      product_name: "Özel Toptan Tepsi",
      quantity: 2,
      unit_price: 250,
      total_price: 500,
      capacity_units: 0,
    });
  });

  it("ignores client unitPrice override when actor is staff and falls back to cari customPrices", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: {
        isAuthenticated: true,
        isAdmin: false,
        role: "staff",
        userId: "staff-1",
      },
    });

    const res = await POST(
      buildReq({
        idempotencyKey: VALID_IDEM,
        customerName: "Kafe Maya",
        deliveryMethod: "courier",
        deliveryDate: "2026-11-16",
        shippingFee: 0,
        paymentMethod: "cari",
        source: "standing_order",
        cariId: "cari-1",
        items: [{ productId: "ekmek-1", productName: "Ekşi Mayalı", quantity: 3, unitPrice: 1 }],
      }),
    );

    expect(res.status).toBe(200);
    const [, rpcPayload] = mockRpc.mock.calls[0] as [string, { p_order: Record<string, unknown>; p_items: Array<Record<string, unknown>> }];
    expect(rpcPayload.p_items[0].unit_price).toBe(85);
    expect(rpcPayload.p_order.subtotal).toBe(255);
  });

  it("hard-fails with 500 if create_order_atomic errors", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "DB_FATAL" },
    });

    const res = await POST(
      buildReq({
        idempotencyKey: VALID_IDEM,
        customerName: "Kafe Maya",
        deliveryMethod: "pickup",
        deliveryDate: "2026-11-16",
        shippingFee: 0,
        paymentMethod: "cari",
        items: [{ productId: null, productName: "Serbest Kalem", quantity: 1, unitPrice: 100 }],
      }),
    );

    expect(res.status).toBe(500);
  });
});
