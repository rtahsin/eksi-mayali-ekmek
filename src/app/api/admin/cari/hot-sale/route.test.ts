import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { verifySlipToken } from "@/lib/security/linkToken";

const mockRequireCapability = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockWriteAuditLog = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireCapability: (req: Request, cap: string) => mockRequireCapability(req, cap),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/security/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock("@/lib/kernel/log", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

import { POST } from "./route";

interface MockProductRow {
  id: string;
  name: string;
  price: number;
  weight?: number | null;
  weight_unit?: string | null;
  is_active?: boolean | null;
}

interface MockAccountRow {
  id: string;
  name: string;
  company_title: string | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  tax_id: string | null;
  tax_office: string | null;
  credit_limit: number;
  share_token_version: number;
  custom_prices: Record<string, number>;
  balance: number;
  archived_at: string | null;
}

function makeSupabaseMock(opts: {
  account?: MockAccountRow | null;
  products?: MockProductRow[];
  rpcResult?: { data: unknown; error: { message: string } | null };
}) {
  const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
  const selectedColumns: Record<string, string[]> = { current_accounts: [], products: [] };
  const txInsertMock = vi.fn();

  const client = {
    from: vi.fn((table: string) => {
      if (table === "current_accounts") {
        return {
          select: (cols: string) => {
            selectedColumns.current_accounts.push(cols);
            return {
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.account === undefined ? null : opts.account,
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "products") {
        return {
          select: (cols: string) => {
            selectedColumns.products.push(cols);
            return {
              in: async (_col: string, ids: string[]) => ({
                data: (opts.products ?? []).filter((p) => ids.includes(p.id)),
                error: null,
              }),
            };
          },
        };
      }
      if (table === "account_transactions") {
        return { insert: txInsertMock };
      }
      return {};
    }),
    rpc: vi.fn(async (fn: string, params: Record<string, unknown>) => {
      rpcCalls.push({ fn, params });
      return opts.rpcResult ?? { data: null, error: null };
    }),
  };

  return { client, rpcCalls, selectedColumns, txInsertMock };
}

const SAMPLE_ACCOUNT: MockAccountRow = {
  id: "cari_b2b_1",
  name: "Klasik Şarküteri",
  company_title: "Klasik Gıda Ltd. Şti.",
  contact_person: "Ahmet Yılmaz",
  phone: "05321112233",
  address: "Atatürk Bulvarı No:12",
  district: "Beylikdüzü",
  neighborhood: "Adnan Kahveci",
  tax_id: "1234567890",
  tax_office: "Beylikdüzü VD",
  credit_limit: 5000,
  share_token_version: 3,
  custom_prices: { prod_1: 85, prod_sample: 0 },
  balance: 1200,
  archived_at: null,
};

const SAMPLE_PRODUCTS: MockProductRow[] = [
  { id: "prod_1", name: "Siyez Ekşi Maya", price: 120, weight: 800, weight_unit: "g", is_active: true },
  { id: "prod_2", name: "Köy Bageti", price: 60, weight: null, weight_unit: null, is_active: true },
  { id: "prod_sample", name: "Tadım Dilim", price: 40, weight: 200, weight_unit: "g", is_active: true },
];

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/admin/cari/hot-sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/cari/hot-sale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret-key-for-hmac";
  });

  it("checks cari.hot_sale capability and forwards guard 403 when rejected (e.g. staff)", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 }),
    });

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_1", quantity: 2 }],
      }),
    );

    expect(mockRequireCapability).toHaveBeenCalledWith(expect.any(Request), "cari.hot_sale");
    expect(res.status).toBe(403);
  });

  it("forbids courier from passing allowOverLimit=true", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_courier", role: "courier", isAdmin: false, isCourier: true },
    });

    const { client, rpcCalls } = makeSupabaseMock({ account: SAMPLE_ACCOUNT, products: SAMPLE_PRODUCTS });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_1", quantity: 10 }],
        allowOverLimit: true,
      }),
    );

    expect(res.status).toBe(403);
    expect(rpcCalls).toHaveLength(0);
  });

  it("computes prices server-side with custom_prices + returnItems, calls atomic RPC, and returns v-versioned signed link", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_courier", role: "courier", isAdmin: false, isCourier: true },
    });

    const { client, rpcCalls } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: {
        data: {
          sale_transaction: {
            transaction_id: "tx_sale_100",
            slip_number: "FİŞ-2611-001",
            delta: 250,
            balance_after: 1450,
          },
          payment_transaction: {
            transaction_id: "tx_pay_101",
            slip_number: "FİŞ-2611-002",
            delta: -100,
            balance_after: 1350,
          },
          balance_after: 1350,
        },
        error: null,
      },
    });
    mockCreateAdminClient.mockReturnValue(client);

    // 2 * prod_1 (custom price 85 = 170) + 2 * prod_2 (catalog 60 = 120) = 290 gross
    // return: 1 * prod_2 (60) => netAmount = 230
    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [
          { productId: "prod_1", quantity: 2 },
          { productId: "prod_2", quantity: 2 },
        ],
        returnItems: [{ productId: "prod_2", quantity: 1 }],
        collectedAmount: 100,
        paymentMethod: "havale",
        date: "2026-11-15",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.grossTotal).toBe(290);
    expect(body.returnTotal).toBe(60);
    expect(body.netAmount).toBe(230);
    expect(body.collectedAmount).toBe(100);
    expect(body.balanceAfter).toBe(1350);

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].fn).toBe("record_b2b_hot_sale_atomic");
    expect(rpcCalls[0].params.p_amount).toBe(230);
    expect(rpcCalls[0].params.p_collected_amount).toBe(100);
    expect(rpcCalls[0].params.p_payment_method).toBe("banka_havale");
    expect(rpcCalls[0].params.p_allow_over_limit).toBe(false);

    const signedUrl = String(body.signedSlipUrl);
    const parsedUrl = new URL(signedUrl);
    expect(parsedUrl.pathname).toBe("/fis/tx_sale_100");
    const token = parsedUrl.searchParams.get("t");
    expect(token?.startsWith("v3.")).toBe(true);
    expect(verifySlipToken("tx_sale_100", token, 3)).toBe(true);
    expect(verifySlipToken("tx_sale_100", token, 4)).toBe(false);

    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
  });

  it("allows admin to pass allowOverLimit=true to RPC", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_admin", role: "admin", isAdmin: true, isCourier: false },
    });

    const { client, rpcCalls } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: {
        data: {
          sale_transaction: {
            transaction_id: "tx_sale_200",
            slip_number: "FİŞ-2611-010",
            delta: 170,
            balance_after: 5370,
          },
          payment_transaction: null,
          balance_after: 5370,
        },
        error: null,
      },
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_1", quantity: 2 }],
        allowOverLimit: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(rpcCalls[0].params.p_allow_over_limit).toBe(true);
  });

  it("returns 400 when returnItems exceed or equal delivered gross total (netAmount <= 0)", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_admin", role: "admin", isAdmin: true, isCourier: false },
    });

    const { client, rpcCalls } = makeSupabaseMock({ account: SAMPLE_ACCOUNT, products: SAMPLE_PRODUCTS });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_2", quantity: 1 }], // 60 TL
        returnItems: [{ productId: "prod_1", quantity: 1 }], // 85 TL
      }),
    );

    expect(res.status).toBe(400);
    expect(rpcCalls).toHaveLength(0);
  });

  it("returns 409 Conflict when RPC throws CREDIT_LIMIT_EXCEEDED", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_courier", role: "courier", isAdmin: false, isCourier: true },
    });

    const { client, txInsertMock } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: { data: null, error: { message: "CREDIT_LIMIT_EXCEEDED" } },
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_1", quantity: 60 }],
      }),
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("CREDIT_LIMIT_EXCEEDED");
    expect(txInsertMock).not.toHaveBeenCalled();
  });

  it("returns 400 when account is archived", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_admin", role: "admin", isAdmin: true, isCourier: false },
    });

    const { client, rpcCalls } = makeSupabaseMock({
      account: { ...SAMPLE_ACCOUNT, archived_at: "2026-11-10T10:00:00Z" },
      products: SAMPLE_PRODUCTS,
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_1", quantity: 1 }],
      }),
    );

    expect(res.status).toBe(400);
    expect(rpcCalls).toHaveLength(0);
  });

  it("hard fails with 500 on unexpected RPC error and never falls back to partial inserts", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_admin", role: "admin", isAdmin: true, isCourier: false },
    });

    const { client, txInsertMock } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: { data: null, error: { message: "DB_DEADLOCK_TIMEOUT" } },
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [{ productId: "prod_1", quantity: 1 }],
      }),
    );

    expect(res.status).toBe(500);
    expect(txInsertMock).not.toHaveBeenCalled();
  });

  it("queries tax_id + weight_unit/is_active (no tax_number/unit_label) and maps kredi_karti -> pos", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_courier", role: "courier", isAdmin: false, isCourier: true },
    });

    const { client, rpcCalls, selectedColumns } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: {
        data: {
          sale_transaction: {
            transaction_id: "tx_pos_1",
            slip_number: "FİŞ-2611-011",
            delta: 145,
            balance_after: 1345,
          },
          payment_transaction: {
            transaction_id: "tx_pos_pay_1",
            slip_number: "FİŞ-2611-012",
            delta: -145,
            balance_after: 1200,
          },
          balance_after: 1200,
        },
        error: null,
      },
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [
          { productId: "prod_1", quantity: 1 }, // 85 TL, 800g
          { productId: "prod_2", quantity: 1 }, // 60 TL, adet
          { productId: "prod_sample", quantity: 1 }, // 0 TL bedelsiz numune
        ],
        collectedAmount: 145,
        paymentMethod: "kredi_karti",
        date: "2026-11-15",
      }),
    );

    expect(res.status).toBe(200);
    expect(selectedColumns.current_accounts[0]).toContain("tax_id");
    expect(selectedColumns.current_accounts[0]).not.toContain("tax_number");
    expect(selectedColumns.products[0]).toContain("weight_unit");
    expect(selectedColumns.products[0]).toContain("is_active");
    expect(selectedColumns.products[0]).not.toContain("unit_label");

    const body = (await res.json()) as {
      account: { taxNumber?: string };
      items: Array<{ productId: string | null; unit: string; unitPrice: number }>;
      paymentMethod?: string;
    };
    expect(body.account.taxNumber).toBe("1234567890");
    expect(body.paymentMethod).toBe("kredi_karti");
    expect(body.items.find((i) => i.productId === "prod_1")?.unit).toBe("800g");
    expect(body.items.find((i) => i.productId === "prod_2")?.unit).toBe("adet");
    expect(body.items.find((i) => i.productId === "prod_sample")?.unitPrice).toBe(0);
    expect(rpcCalls[0].params.p_payment_method).toBe("pos");
  });

  it("ignores unitPriceOverride from courier and enforces server custom_prices/catalog price", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_courier", role: "courier", isAdmin: false, isCourier: true },
    });

    const { client, rpcCalls } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: {
        data: {
          sale_transaction: {
            transaction_id: "tx_ovr_courier",
            slip_number: "FİŞ-2611-013",
            delta: 145,
            balance_after: 1345,
          },
          payment_transaction: null,
          balance_after: 1345,
        },
        error: null,
      },
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [
          { productId: "prod_1", quantity: 1, unitPriceOverride: 1 }, // courier override MUST be ignored -> 85
          { productId: "prod_2", quantity: 1, unitPriceOverride: 5 }, // courier override MUST be ignored -> 60
        ],
        date: "2026-11-15",
      }),
    );

    expect(res.status).toBe(200);
    expect(rpcCalls[0].params.p_amount).toBe(145);
  });

  it("allows admin unitPriceOverride and custom freeform items (productId: null)", async () => {
    mockRequireCapability.mockResolvedValueOnce({
      ok: true,
      auth: { userId: "u_admin", role: "admin", isAdmin: true, isCourier: false },
    });

    const { client, rpcCalls } = makeSupabaseMock({
      account: SAMPLE_ACCOUNT,
      products: SAMPLE_PRODUCTS,
      rpcResult: {
        data: {
          sale_transaction: {
            transaction_id: "tx_admin_custom",
            slip_number: "FİŞ-2611-014",
            delta: 190,
            balance_after: 1390,
          },
          payment_transaction: null,
          balance_after: 1390,
        },
        error: null,
      },
    });
    mockCreateAdminClient.mockReturnValue(client);

    const res = await POST(
      makeRequest({
        accountId: "cari_b2b_1",
        items: [
          { productId: "prod_1", quantity: 1, unitPriceOverride: 90 }, // admin override -> 90
          { customName: "Özel Galeta Tepsisi", unitPrice: 50, quantity: 2 }, // custom item -> 100
          { productId: null, customName: "Numune Çavdar", unitPrice: 0, quantity: 1 }, // 0 TL sample custom item
        ],
        date: "2026-11-15",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      netAmount: number;
      items: Array<{ productId: string | null; name: string; unitPrice: number; unit: string }>;
    };
    expect(body.netAmount).toBe(190);
    expect(rpcCalls[0].params.p_amount).toBe(190);
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: "prod_1", unitPrice: 90 }),
        expect.objectContaining({ productId: null, name: "Özel Galeta Tepsisi", unitPrice: 50, unit: "adet" }),
        expect.objectContaining({ productId: null, name: "Numune Çavdar", unitPrice: 0, unit: "adet" }),
      ]),
    );
  });
});
