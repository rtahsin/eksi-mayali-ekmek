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

function buildReq(body?: unknown): Request {
  return new Request("http://localhost:3000/api/admin/cari/standing-orders/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? "{}" : JSON.stringify(body),
  });
}

describe("POST /api/admin/cari/standing-orders/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCapability.mockResolvedValue({
      ok: true,
      auth: { isAuthenticated: true, isAdmin: true, role: "admin", userId: "admin-1" },
    });

    const accounts = [
      {
        id: "cari-1",
        name: "Bistro Moda",
        phone: "05321112233",
        address: "",
        district: "Büyükçekmece",
        neighborhood: "Marmara",
        default_courier_id: "22222222-2222-4222-8222-222222222222",
        custom_prices: { "p-1": 75 },
        standing_order: {
          enabled: true,
          schedule: {
            "1": { "p-1": 10, "p-2": 5 }, // Pazartesi (2026-11-16)
            "7": { "p-1": 2 },
          },
          notes: "Sabah 07:30 bırakılacak",
        },
      },
      {
        id: "cari-disabled",
        name: "Pasif Rutin Kafe",
        phone: "",
        address: "Adres",
        district: null,
        neighborhood: null,
        default_courier_id: null,
        custom_prices: null,
        standing_order: {
          enabled: false,
          schedule: { "1": { "p-1": 8 } },
        },
      },
      {
        id: "cari-existing",
        name: "Zaten Oluşmuş Şarküteri",
        phone: "05330001122",
        address: "İnönü Cad. No:5",
        district: "Beylikdüzü",
        neighborhood: "Barış",
        default_courier_id: null,
        custom_prices: null,
        standing_order: {
          enabled: true,
          schedule: { "1": { "p-2": 3 } },
        },
      },
    ];

    const products = [
      { id: "p-1", name: "Köy Ekmeği", price: 95, image_url: null, weight: 800, is_active: true },
      { id: "p-2", name: "Çavdar", price: 110, image_url: null, weight: 650, is_active: true },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "current_accounts") {
        return {
          select: () => ({
            is: () => ({
              eq: vi.fn().mockResolvedValue({ data: accounts, error: null }),
            }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({ data: products, error: null }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
  });

  it("rejects unauthorized actor", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const res = await POST(buildReq({ deliveryDate: "2026-11-16" }));
    expect(res.status).toBe(403);
  });

  it("rejects non-ISO deliveryDate with 400", async () => {
    const res = await POST(buildReq({ deliveryDate: "16-11-2026" }));
    expect(res.status).toBe(400);
  });

  it("creates idempotent standing orders for Istanbul ISO weekday with custom prices and skips existing", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: { order_id: "ORD-1", order_number: "SIP-2611-101", is_existing: false },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { order_id: "ORD-2", order_number: "SIP-2611-102", is_existing: true },
        error: null,
      });

    // 2026-11-16 = Pazartesi (ISO weekday "1")
    const res = await POST(buildReq({ deliveryDate: "2026-11-16" }));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.deliveryDate).toBe("2026-11-16");
    expect(json.weekday).toBe("1");
    expect(json.createdCount).toBe(1);
    expect(json.skippedExisting).toBe(1);
    expect(json.orders).toEqual([
      {
        accountId: "cari-1",
        businessName: "Bistro Moda",
        orderId: "ORD-1",
        orderNumber: "SIP-2611-101",
      },
    ]);

    expect(mockRpc).toHaveBeenCalledTimes(2);
    const [, call1] = mockRpc.mock.calls[0] as [string, { p_order: Record<string, unknown>; p_items: Array<Record<string, unknown>> }];
    expect(call1.p_order).toMatchObject({
      idempotency_key: "standing:cari-1:2026-11-16",
      source: "standing_order",
      status: "hazirlaniyor",
      payment_method: "cari",
      delivery_method: "courier",
      district: "Büyükçekmece",
      neighborhood: "Marmara",
      delivery_address: "Marmara — Bistro Moda",
      courier_id: "22222222-2222-4222-8222-222222222222",
      bypass_limits: true,
      subtotal: 10 * 75 + 5 * 110,
      total_amount: 1300,
    });
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
  });

  it("maps Sunday correctly to ISO weekday 7", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { order_id: "ORD-7", order_number: "SIP-2611-107", is_existing: false },
      error: null,
    });

    // 2026-11-15 = Pazar (ISO weekday "7")
    const res = await POST(buildReq({ deliveryDate: "2026-11-15" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.weekday).toBe("7");
    expect(json.createdCount).toBe(1);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});
