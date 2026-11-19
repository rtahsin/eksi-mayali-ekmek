import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STORE_SETTINGS } from "@/lib/settings/schema";
import type { StoreSettings } from "@/types/settings";

const mockCheckRateLimit = vi.fn();
const mockVerifyApiAuth = vi.fn();
const mockGetStoreSettings = vi.fn();
const mockGetCartAvailability = vi.fn();
const mockSignOrderToken = vi.fn();
const mockNotifyNewOrder = vi.fn();
const mockAfter = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockInsert = vi.fn();

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: (cb: () => unknown) => mockAfter(cb),
  };
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/kernel/log", () => ({
  logError: vi.fn(),
}));

vi.mock("@/lib/security/rateLimiter", () => ({
  checkRateLimit: (key: string, max: number, win: number) => mockCheckRateLimit(key, max, win),
  hashIp: (value: string) => `hash_${value}`,
  ipRateLimitKey: (prefix: string) => `${prefix}_hashedip`,
  sanitizeInput: (text: string, maxLen = 500) => text.trim().slice(0, maxLen),
}));

vi.mock("@/lib/security/apiAuth", () => ({
  verifyApiAuth: (req: Request) => mockVerifyApiAuth(req),
}));

vi.mock("@/lib/settings/server", () => ({
  getStoreSettings: (client: unknown, opts?: { failClosed?: boolean }) =>
    mockGetStoreSettings(client, opts),
}));

vi.mock("@/lib/ordering/loadAvailability", () => ({
  getCartAvailability: (
    client: unknown,
    settings: StoreSettings,
    items: Array<{ productId: string; quantity: number }>
  ) => mockGetCartAvailability(client, settings, items),
}));

vi.mock("@/lib/security/linkToken", () => ({
  signOrderToken: (id: string) => mockSignOrderToken(id),
}));

vi.mock("@/lib/notify/telegram", () => ({
  notifyNewOrder: (payload: unknown) => mockNotifyNewOrder(payload),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: Record<string, unknown>) => mockRpc(fn, args),
  })),
}));

import { POST } from "./route";

interface CreateOrderBody {
  items: Array<Record<string, unknown>>;
  customerInfo: {
    name: string;
    phone: string;
    neighborhood: string;
    addressDetail: string;
    deliveryDate: string;
    note?: string;
  };
  deliveryMethod: "courier";
  paymentMethod: "whatsapp" | "cash_on_delivery" | "pos_at_door";
  idempotencyKey: string;
  termsAccepted?: boolean;
}

function buildValidBody(overrides?: Partial<CreateOrderBody>): CreateOrderBody {
  return {
    items: [{ productId: "prod-1", quantity: 2 }],
    customerInfo: {
      name: "Ayşe Yılmaz",
      phone: "0532 123 45 67",
      neighborhood: "Barış",
      addressDetail: "Atatürk Bulvarı No:12 D:4",
      deliveryDate: "2026-11-20",
      note: "Zil çalışmıyor",
    },
    deliveryMethod: "courier",
    paymentMethod: "cash_on_delivery",
    idempotencyKey: "idem_key_1234567890_abcdef",
    termsAccepted: true,
    ...overrides,
  };
}

function buildReq(body: unknown): Request {
  return new Request("http://localhost:3000/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9, retryAfterSeconds: 0 });
    mockVerifyApiAuth.mockResolvedValue({
      isAuthenticated: false,
      userId: null,
      isAdmin: false,
      isCourier: false,
      courierDbId: null,
    });
    mockGetStoreSettings.mockResolvedValue({ ...DEFAULT_STORE_SETTINGS });
    mockGetCartAvailability.mockResolvedValue([
      { date: "2026-11-20", available: true },
    ]);
    mockSignOrderToken.mockReturnValue("signed-tracking-token-32-chars-ok");
    mockNotifyNewOrder.mockResolvedValue(undefined);

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: () => ({
                  neq: vi.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              };
            }
            return {
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          },
          insert: mockInsert,
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "prod-1",
                  name: "Ekşi Mayalı Köy Ekmeği",
                  price: 185,
                  image_url: "/img/koy.jpg",
                  weight: 900,
                  made_to_order: true,
                  is_available: true,
                  is_active: true,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          insert: mockInsert,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    mockRpc.mockResolvedValue({
      data: {
        success: true,
        order_id: "ORD-TEST1234",
        order_number: "SIP-2611-001",
        is_existing: false,
      },
      error: null,
    });
  });

  it("termsAccepted false olduğunda 400 döner", async () => {
    const res = await POST(buildReq(buildValidBody({ termsAccepted: false })));

    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("termsAccepted eksik olduğunda 400 döner", async () => {
    const body = buildValidBody();
    delete body.termsAccepted;

    const res = await POST(buildReq(body));

    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("hizmet dışı mahalle gönderildiğinde 400 NEIGHBORHOOD_NOT_SERVED döner", async () => {
    const body = buildValidBody();
    body.customerInfo.neighborhood = "Kadıköy";

    const res = await POST(buildReq(body));

    expect(res.status).toBe(400);
    const json = (await res.json()) as { success: boolean; code?: string };
    expect(json.success).toBe(false);
    expect(json.code).toBe("NEIGHBORHOOD_NOT_SERVED");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("getStoreSettings failClosed hata attığında sessiz varsayılana düşmeden 500 döner", async () => {
    mockGetStoreSettings.mockRejectedValueOnce(new Error("SETTINGS_STORE_UNAVAILABLE"));

    const res = await POST(buildReq(buildValidBody()));

    expect(res.status).toBe(500);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(false);
    expect(mockGetStoreSettings).toHaveBeenCalledWith(expect.anything(), { failClosed: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("istemciden sahte düşük fiyat gönderilse bile DB fiyatıyla hesap yapıp RPC'ye doğru tutarı geçer", async () => {
    const body = buildValidBody({
      items: [
        {
          productId: "prod-1",
          quantity: 2,
          unitPrice: 1,
          price: 1,
          totalPrice: 2,
        },
      ],
    });

    const res = await POST(buildReq(body));

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      order: { subtotal: number; totalAmount: number; items: Array<{ unitPrice: number; totalPrice: number }> };
    };
    expect(json.success).toBe(true);
    expect(json.order.subtotal).toBe(370);
    expect(json.order.totalAmount).toBe(370);
    expect(json.order.items[0].unitPrice).toBe(185);
    expect(json.order.items[0].totalPrice).toBe(370);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcArgs] = mockRpc.mock.calls[0] as [
      string,
      {
        p_order: { subtotal: number; shipping_fee: number; total_amount: number };
        p_items: Array<{ product_id: string; unit_price: number; total_price: number; quantity: number }>;
      }
    ];
    expect(rpcName).toBe("create_order_atomic");
    expect(rpcArgs.p_order.subtotal).toBe(370);
    expect(rpcArgs.p_order.shipping_fee).toBe(0);
    expect(rpcArgs.p_order.total_amount).toBe(370);
    expect(rpcArgs.p_items[0]).toMatchObject({
      product_id: "prod-1",
      quantity: 2,
      unit_price: 185,
      total_price: 370,
    });
  });

  it("idempotency key + farklı telefon çakışmasında 409 IDEMPOTENCY_CONFLICT döner", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "ORD-EXISTING",
                  order_number: "SIP-2611-009",
                  customer_name: "Başka Müşteri",
                  phone: "05559998877",
                  delivery_address: "Barış Mah., No:1 / Beylikdüzü",
                  subtotal: 185,
                  shipping_fee: 0,
                  total_amount: 185,
                  status: "bekliyor",
                  payment_method: "cash_on_delivery",
                  created_at: "2026-11-19T08:00:00Z",
                  order_items: [],
                },
                error: null,
              }),
            }),
          }),
          insert: mockInsert,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = await POST(buildReq(buildValidBody()));

    expect(res.status).toBe(409);
    const json = (await res.json()) as { success: boolean; code?: string };
    expect(json.success).toBe(false);
    expect(json.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("RPC DAILY_CAPACITY_FULL hatasında 409 döner", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "DAILY_CAPACITY_FULL: kapasite dolu" },
    });

    const res = await POST(buildReq(buildValidBody()));

    expect(res.status).toBe(409);
    const json = (await res.json()) as { success: boolean; code?: string };
    expect(json.success).toBe(false);
    expect(json.code).toBe("DAILY_CAPACITY_FULL");
  });

  it("RPC PRODUCT_LIMIT_REACHED hatasında 409 döner", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "PRODUCT_LIMIT_REACHED: ürün limiti aşıldı" },
    });

    const res = await POST(buildReq(buildValidBody()));

    expect(res.status).toBe(409);
    const json = (await res.json()) as { success: boolean; code?: string };
    expect(json.success).toBe(false);
    expect(json.code).toBe("PRODUCT_LIMIT_REACHED");
  });

  it("RPC beklenmeyen veritabanı hatasında parçalı insert fallback yapmadan 500 hard-fail döner", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "deadlock detected while updating orders" },
    });

    const res = await POST(buildReq(buildValidBody()));

    expect(res.status).toBe(500);
    const json = (await res.json()) as { success: boolean };
    expect(json.success).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
