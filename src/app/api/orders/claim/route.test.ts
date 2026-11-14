import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyApiAuth = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockVerifyOrderToken = vi.fn();
const mockSignOrderToken = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  verifyApiAuth: (req: Request) => mockVerifyApiAuth(req),
}));

vi.mock("@/lib/security/rateLimiter", () => ({
  checkRateLimit: (key: string, max: number, win: number) => mockCheckRateLimit(key, max, win),
  ipRateLimitKey: (prefix: string) => `${prefix}_hashedip`,
}));

vi.mock("@/lib/security/linkToken", () => ({
  verifyOrderToken: (id: string, token: string) => mockVerifyOrderToken(id, token),
  signOrderToken: (id: string) => mockSignOrderToken(id),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockImplementation(() => ({
    from: (table: string) => mockFrom(table),
  })),
}));

import { POST, normalizeTrPhoneLast10 } from "./route";

describe("POST /api/orders/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 });
    mockVerifyApiAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-123",
      isAdmin: false,
    });
    mockSignOrderToken.mockReturnValue("t".repeat(32));
  });

  it("normalizeTrPhoneLast10 farklı biçimlerdeki Türk numaralarından son 10 rakamı çıkarır", () => {
    expect(normalizeTrPhoneLast10("0532 123 45 67")).toBe("5321234567");
    expect(normalizeTrPhoneLast10("+90 (532) 123-45-67")).toBe("5321234567");
    expect(normalizeTrPhoneLast10("5321234567")).toBe("5321234567");
    expect(normalizeTrPhoneLast10("12345")).toBeNull();
  });

  it("oturum açmamış kullanıcıyı 401 ile reddeder", async () => {
    mockVerifyApiAuth.mockResolvedValueOnce({ isAuthenticated: false, userId: null });

    const req = new Request("http://localhost:3000/api/orders/claim", {
      method: "POST",
      body: JSON.stringify({ orderNumber: "SIP-2611-001", phone: "05321234567" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("mevcut imzalı token ile toplu cihaz siparişi bağlama akışını destekler", async () => {
    mockVerifyOrderToken.mockImplementation((id: string, token: string) => id === "ORD-AAA1" && token.length === 32);

    const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: "ORD-AAA1" }], error: null });
    const mockIsCari = vi.fn().mockReturnValue({ select: mockSelect });
    const mockIsUser = vi.fn().mockReturnValue({ is: mockIsCari });
    const mockIn = vi.fn().mockReturnValue({ is: mockIsUser });
    const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
    mockFrom.mockReturnValue({ update: mockUpdate });

    const req = new Request("http://localhost:3000/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orders: [
          { id: "ORD-AAA1", token: "a".repeat(32) },
          { id: "ORD-BAD2", token: "b".repeat(32) },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, claimed: 1 });
    expect(mockIn).toHaveBeenCalledWith("id", ["ORD-AAA1"]);
  });

  it("orderNumber + phone eşleştiğinde sahipsiz siparişi kullanıcıya bağlar", async () => {
    // 1. çağrı: orders.select(...).eq(...).is(...).is(...).maybeSingle()
    const mockMaybeSingleLookup = vi.fn().mockResolvedValue({
      data: {
        id: "ORD-IG999",
        order_number: "SIP-2611-042",
        phone: "+90 532 987 65 43",
        delivery_date: "2026-11-15",
        total_amount: 340,
        created_at: "2026-11-14T08:00:00Z",
      },
      error: null,
    });
    const mockIsCariSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleLookup });
    const mockIsUserSelect = vi.fn().mockReturnValue({ is: mockIsCariSelect });
    const mockEqSelect = vi.fn().mockReturnValue({ is: mockIsUserSelect });
    const mockSelectLookup = vi.fn().mockReturnValue({ eq: mockEqSelect });

    // 2. çağrı: orders.update(...).eq(...).is(...).is(...).select(...).maybeSingle()
    const mockMaybeSingleUpdate = vi.fn().mockResolvedValue({
      data: { id: "ORD-IG999", order_number: "SIP-2611-042" },
      error: null,
    });
    const mockSelectUpdate = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleUpdate });
    const mockIsCariUpdate = vi.fn().mockReturnValue({ select: mockSelectUpdate });
    const mockIsUserUpdate = vi.fn().mockReturnValue({ is: mockIsCariUpdate });
    const mockEqUpdate = vi.fn().mockReturnValue({ is: mockIsUserUpdate });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    mockFrom.mockReturnValue({
      select: mockSelectLookup,
      update: mockUpdate,
    });

    const req = new Request("http://localhost:3000/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: " #sip-2611-042 ",
        phone: "0532 987 65 43",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.linked).toBe(1);
    expect(json.orderId).toBe("ORD-IG999");
    expect(json.orderNumber).toBe("SIP-2611-042");
    expect(mockEqSelect).toHaveBeenCalledWith("order_number", "SIP-2611-042");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123" })
    );
  });

  it("telefon uyuşmadığında 404 döner ve finansal tutar sızdırmaz", async () => {
    const mockMaybeSingleLookup = vi.fn().mockResolvedValue({
      data: {
        id: "ORD-SECRET",
        order_number: "SIP-2611-042",
        phone: "05329876543",
        delivery_date: "2026-11-15",
        total_amount: 1250,
        created_at: "2026-11-14T08:00:00Z",
      },
      error: null,
    });
    const mockIsCariSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleLookup });
    const mockIsUserSelect = vi.fn().mockReturnValue({ is: mockIsCariSelect });
    const mockEqSelect = vi.fn().mockReturnValue({ is: mockIsUserSelect });
    const mockSelectLookup = vi.fn().mockReturnValue({ eq: mockEqSelect });
    const mockUpdate = vi.fn();

    mockFrom.mockReturnValue({
      select: mockSelectLookup,
      update: mockUpdate,
    });

    const req = new Request("http://localhost:3000/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "SIP-2611-042",
        phone: "0555 111 22 33",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const rawText = await res.text();
    expect(rawText).not.toContain("1250");
    expect(rawText).not.toContain("ORD-SECRET");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("dakikalık brute-force limiti aşıldığında 429 döner", async () => {
    mockCheckRateLimit
      .mockResolvedValueOnce({ allowed: true }) // genel IP limiti
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 45 }) // telefon IP limiti
      .mockResolvedValueOnce({ allowed: true });

    const req = new Request("http://localhost:3000/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "SIP-2611-042",
        phone: "0532 987 65 43",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("hatalı SIP formatında veritabanına gitmeden 400 döner", async () => {
    const req = new Request("http://localhost:3000/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "YANLIS-KOD",
        phone: "0532 987 65 43",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
