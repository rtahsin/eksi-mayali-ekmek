import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireActiveCourierOrAdmin = vi.fn();
const mockWriteAuditLog = vi.fn();
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireActiveCourierOrAdmin: (req: Request, opts?: unknown) => mockRequireActiveCourierOrAdmin(req, opts),
}));

vi.mock("@/lib/security/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock("@/lib/security/linkToken", () => ({
  signSlipToken: (txId: string, ver: number) => `tok-${txId}-v${ver}`,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

import { POST } from "./route";

function buildReq(body: unknown, id = "ORD-1001"): Request {
  return new Request(`http://localhost:3000/api/orders/${id}/deliver-b2b`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders/[id]/deliver-b2b", () => {
  const orderRow = {
    id: "ORD-1001",
    order_number: "SIP-2611-021",
    status: "kuryede",
    cari_id: "cari-1",
    courier_id: "cour-1",
    delivery_date: "2026-11-15",
    shipping_fee: 0,
  };

  const accountRow = {
    id: "cari-1",
    name: "Mandıra Plus",
    company_title: "Mandıra Plus Ltd.",
    contact_person: "Kemal Bey",
    phone: "05321112233",
    address: "Cumhuriyet Mah.",
    district: "Beylikdüzü",
    neighborhood: "Cumhuriyet",
    tax_id: "1234567890",
    tax_office: "Beylikdüzü",
    credit_limit: 5000,
    share_token_version: 2,
    custom_prices: { "p-1": 80 },
    balance: 1000,
    archived_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireActiveCourierOrAdmin.mockResolvedValue({
      ok: true,
      auth: { isAuthenticated: true, isAdmin: false, role: "courier", userId: "user-cour-1" },
      courierDbId: "cour-1",
      isActive: true,
      isOnShift: true,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: orderRow, error: null }),
            }),
          }),
        };
      }
      if (table === "current_accounts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: accountRow, error: null }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  product_id: "p-1",
                  product_name: "Köy Ekmeği",
                  unit_price: 80,
                  weight: 800,
                  image_url: null,
                  capacity_units: 1,
                },
              ],
              error: null,
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
                  id: "p-1",
                  name: "Köy Ekmeği",
                  price: 100,
                  weight: 800,
                  weight_unit: "g",
                  image_url: null,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
  });

  it("forbids courier when order is assigned to another courier", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ...orderRow, courier_id: "cour-OTHER" },
            error: null,
          }),
        }),
      }),
    }));

    const res = await POST(
      buildReq({
        deliveredItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 3 }],
      }),
      { params: Promise.resolve({ id: "ORD-1001" }) },
    );

    expect(res.status).toBe(403);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects non-cari order with 400 NOT_CARI_ORDER", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { ...orderRow, cari_id: null },
            error: null,
          }),
        }),
      }),
    }));

    const res = await POST(
      buildReq({
        deliveredItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 3 }],
      }),
      { params: Promise.resolve({ id: "ORD-1001" }) },
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("NOT_CARI_ORDER");
  });

  it("forces allowOverLimit=false for courier and ignores courier unitPrice override", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        already: false,
        net_total: 160,
        collected: 100,
        payment_id: "pay-1",
        sale_transaction: {
          transaction_id: "tx-sale-1",
          slip_number: "FİŞ-2611-005",
          delta: 160,
          balance_after: 1160,
        },
        payment_transaction: {
          transaction_id: "tx-pay-1",
          slip_number: "FİŞ-2611-006",
          delta: -100,
          balance_after: 1060,
        },
      },
      error: null,
    });

    const res = await POST(
      buildReq({
        deliveredItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 3, unitPrice: 1 }],
        returnItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 1 }],
        collectedAmount: 100,
        paymentMethod: "cash",
        allowOverLimit: true,
        note: "1 bayat iade alındı",
      }),
      { params: Promise.resolve({ id: "ORD-1001" }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.saleTransaction.slipNumber).toBe("FİŞ-2611-005");
    expect(json.signedSlipUrl).toContain("/fis/tx-sale-1?t=tok-tx-sale-1-v2");
    expect(json.balanceAfter).toBe(1060);
    expect(json.paymentMethod).toBe("nakit");

    const [, rpcArgs] = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(rpcArgs.p_allow_over_limit).toBe(false);
    expect((rpcArgs.p_delivered_items as Array<Record<string, unknown>>)[0].unitPrice).toBe(80);
    expect((rpcArgs.p_return_items as Array<Record<string, unknown>>)[0].unitPrice).toBe(80);
  });

  it("maps CREDIT_LIMIT_EXCEEDED RPC error to 409", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "CREDIT_LIMIT_EXCEEDED" },
    });

    const res = await POST(
      buildReq({
        deliveredItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 5 }],
      }),
      { params: Promise.resolve({ id: "ORD-1001" }) },
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("CREDIT_LIMIT_EXCEEDED");
  });

  it("allows admin allowOverLimit=true and admin unitPrice override", async () => {
    mockRequireActiveCourierOrAdmin.mockResolvedValueOnce({
      ok: true,
      auth: { isAuthenticated: true, isAdmin: true, role: "admin", userId: "admin-1" },
      courierDbId: null,
      isActive: true,
      isOnShift: false,
    });

    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        already: false,
        net_total: 450,
        collected: 0,
        sale_transaction: {
          transaction_id: "tx-sale-2",
          slip_number: "FİŞ-2611-007",
          delta: 450,
          balance_after: 1450,
        },
        payment_transaction: null,
      },
      error: null,
    });

    const res = await POST(
      buildReq({
        deliveredItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 5, unitPrice: 90 }],
        allowOverLimit: true,
      }),
      { params: Promise.resolve({ id: "ORD-1001" }) },
    );

    expect(res.status).toBe(200);
    const [, rpcArgs] = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(rpcArgs.p_allow_over_limit).toBe(true);
    expect((rpcArgs.p_delivered_items as Array<Record<string, unknown>>)[0].unitPrice).toBe(90);
  });

  it("returns 500 hard fail when RPC errors unexpectedly", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "SERIALIZATION_FAILURE" },
    });

    const res = await POST(
      buildReq({
        deliveredItems: [{ productId: "p-1", productName: "Köy Ekmeği", quantity: 2 }],
      }),
      { params: Promise.resolve({ id: "ORD-1001" }) },
    );

    expect(res.status).toBe(500);
  });
});
