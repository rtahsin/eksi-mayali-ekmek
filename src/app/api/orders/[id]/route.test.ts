import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackingOrder } from "@/types/tracking";

const mockCheckRateLimit = vi.fn();
const mockVerifyApiAuth = vi.fn();
const mockVerifyOrderToken = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/kernel/log", () => ({
  logError: vi.fn(),
}));

vi.mock("@/lib/security/apiAuth", () => ({
  verifyApiAuth: (req: Request) => mockVerifyApiAuth(req),
}));

vi.mock("@/lib/security/rateLimiter", () => ({
  checkRateLimit: (key: string, max: number, win: number) => mockCheckRateLimit(key, max, win),
  ipRateLimitKey: (prefix: string) => `${prefix}_hashedip`,
}));

vi.mock("@/lib/security/linkToken", () => ({
  verifyOrderToken: (id: string, token: string | null) => mockVerifyOrderToken(id, token),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: (table: string) => mockFrom(table),
  })),
}));

import { GET } from "./route";

const SAMPLE_ORDER_ROW = {
  id: "ORD-A1B2C3D4",
  order_number: "SIP-2611-015",
  user_id: null,
  courier_id: null,
  cari_id: null,
  customer_name: "Ayşe Yılmaz",
  phone: "05321234567",
  neighborhood: "Barış",
  address_detail: "Atatürk Bulvarı No:12 D:4",
  delivery_date: "2026-11-20",
  delivery_time_window: "14:00 - 18:00",
  status: "bekliyor",
  payment_method: "cash_on_delivery",
  subtotal: 370,
  shipping_fee: 0,
  total_amount: 370,
  order_notes: "Zil çalışmıyor, arayınız",
  cancel_reason: null,
  created_at: "2026-11-19T09:00:00Z",
  order_items: [
    {
      product_id: "prod-1",
      product_name: "Ekşi Mayalı Köy Ekmeği",
      quantity: 2,
      unit_price: 185,
      total_price: 370,
    },
  ],
};

function buildGetRequest(id: string, query = ""): Request {
  return new Request(`http://localhost:3000/api/orders/${id}${query}`, {
    method: "GET",
  });
}

describe("GET /api/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 29, retryAfterSeconds: 0 });
    mockVerifyApiAuth.mockResolvedValue({
      isAuthenticated: false,
      userId: null,
      isAdmin: false,
      isCourier: false,
      courierDbId: null,
    });
    mockVerifyOrderToken.mockReturnValue(false);

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: SAMPLE_ORDER_ROW, error: null }),
            }),
          }),
        };
      }
      if (table === "order_status_history") {
        return {
          select: () => ({
            eq: () => ({
              order: vi.fn().mockResolvedValue({
                data: [{ to_status: "bekliyor", created_at: "2026-11-19T09:00:00Z" }],
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("yetkisiz (token ve phone yok) istekte finansal tutarları, adresi, notu ve ürün fiyatlarını maskeler", async () => {
    const res = await GET(buildGetRequest("ORD-A1B2C3D4"), {
      params: Promise.resolve({ id: "ORD-A1B2C3D4" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; order: TrackingOrder };
    expect(json.success).toBe(true);

    const { order } = json;
    expect(order.isMasked).toBe(true);
    expect(order.totalAmount).toBeNull();
    expect(order.subtotal).toBeNull();
    expect(order.shippingFee).toBeNull();
    expect(order.paymentMethod).toBeNull();
    expect(order.addressDetail).toBeNull();
    expect(order.orderNotes).toBeNull();
    expect(order.items).toHaveLength(1);
    expect(order.items[0].unitPrice).toBeNull();
    expect(order.items[0].totalPrice).toBeNull();
    expect(order.phone).toBe("05** *** ** **");
    expect(order.phone).not.toContain("5321234567");
    expect(order.customerName).toBe("A*** Y*****");
  });

  it("geçerli ?t= tracking token ile tam finansal ve adres verisini döner", async () => {
    mockVerifyOrderToken.mockImplementation(
      (id: string, token: string | null) => id === "ORD-A1B2C3D4" && token === "valid-token-123"
    );

    const res = await GET(buildGetRequest("ORD-A1B2C3D4", "?t=valid-token-123"), {
      params: Promise.resolve({ id: "ORD-A1B2C3D4" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; order: TrackingOrder };
    expect(json.success).toBe(true);

    const { order } = json;
    expect(order.isMasked).toBe(false);
    expect(order.totalAmount).toBe(370);
    expect(order.subtotal).toBe(370);
    expect(order.shippingFee).toBe(0);
    expect(order.addressDetail).toBe("Atatürk Bulvarı No:12 D:4");
    expect(order.orderNotes).toBe("Zil çalışmıyor, arayınız");
    expect(order.customerName).toBe("Ayşe Yılmaz");
    expect(order.items[0].unitPrice).toBe(185);
    expect(order.items[0].totalPrice).toBe(370);
  });

  it("eşleşen ?phone= parametresi ile tam finansal ve adres verisini döner", async () => {
    const res = await GET(
      buildGetRequest("ORD-A1B2C3D4", `?phone=${encodeURIComponent("+90 532 123 45 67")}`),
      { params: Promise.resolve({ id: "ORD-A1B2C3D4" }) }
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; order: TrackingOrder };
    expect(json.success).toBe(true);

    const { order } = json;
    expect(order.isMasked).toBe(false);
    expect(order.totalAmount).toBe(370);
    expect(order.subtotal).toBe(370);
    expect(order.shippingFee).toBe(0);
    expect(order.addressDetail).toBe("Atatürk Bulvarı No:12 D:4");
    expect(order.orderNotes).toBe("Zil çalışmıyor, arayınız");
    expect(order.items[0].unitPrice).toBe(185);
    expect(order.items[0].totalPrice).toBe(370);
  });

  it("yanlış ?phone= gönderildiğinde 403 PHONE_MISMATCH döner", async () => {
    const res = await GET(buildGetRequest("ORD-A1B2C3D4", "?phone=05559998877"), {
      params: Promise.resolve({ id: "ORD-A1B2C3D4" }),
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as { error: string; code: string };
    expect(json.code).toBe("PHONE_MISMATCH");
  });

  it("çoklu hatalı telefon denemesinde rate-limit aşıldığında 429 TOO_MANY_VERIFY_ATTEMPTS döner", async () => {
    const hitCounts = new Map<string, number>();
    mockCheckRateLimit.mockImplementation(async (key: string, max: number) => {
      const next = (hitCounts.get(key) ?? 0) + 1;
      hitCounts.set(key, next);
      if (next > max) {
        return { allowed: false, remaining: 0, retryAfterSeconds: 600 };
      }
      return { allowed: true, remaining: max - next, retryAfterSeconds: 0 };
    });

    // Route'taki telefon doğrulama limiti: order_phone_verify_<orderId>, 5 deneme / 600000ms
    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await GET(buildGetRequest("ORD-A1B2C3D4", "?phone=05550000000"), {
        params: Promise.resolve({ id: "ORD-A1B2C3D4" }),
      });
      expect(res.status).toBe(403);
    }

    const blockedRes = await GET(buildGetRequest("ORD-A1B2C3D4", "?phone=05550000000"), {
      params: Promise.resolve({ id: "ORD-A1B2C3D4" }),
    });
    expect(blockedRes.status).toBe(429);
    const json = (await blockedRes.json()) as { code: string; error: string };
    expect(json.code).toBe("TOO_MANY_VERIFY_ATTEMPTS");
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      "order_phone_verify_ORD-A1B2C3D4_hashedip",
      5,
      600000
    );
  });
});
