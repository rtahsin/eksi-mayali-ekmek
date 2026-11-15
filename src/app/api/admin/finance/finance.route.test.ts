import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdmin = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireAdmin: (req: Request) => mockRequireAdmin(req),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET, POST } from "./route";
import { POST as SUPPLIER_POST } from "./suppliers/route";

describe("/api/admin/finance & /api/admin/finance/suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      auth: { isAuthenticated: true, isAdmin: true, userId: "admin-uuid-1", role: "superadmin" },
    });
  });

  it("yetkisiz veya staff isteklerini 401/403 ile reddeder", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const res = await GET(new Request("http://localhost:3000/api/admin/finance"));
    expect(res.status).toBe(403);

    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });
    const supRes = await SUPPLIER_POST(
      new Request("http://localhost:3000/api/admin/finance/suppliers", {
        method: "POST",
        body: JSON.stringify({ action: "upsert_supplier", name: "Test Un" }),
      })
    );
    expect(supRes.status).toBe(403);
  });

  it("GET /api/admin/finance geçersiz tarih aralığını 400 ile reddeder ve geçerli özeti döner", async () => {
    const badRes = await GET(
      new Request("http://localhost:3000/api/admin/finance?from=2026-11-20&to=2026-11-10")
    );
    expect(badRes.status).toBe(400);

    const makeBuilder = (rows: unknown[]) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        limit: () => Promise.resolve({ data: rows, error: null }),
        then: (resolve: (val: { data: unknown[]; error: null }) => void) =>
          resolve({ data: rows, error: null }),
      };
      return chain;
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return makeBuilder([
          { id: "o1", total_amount: 2060, status: "teslim_edildi", cari_id: null, delivery_date: "2026-11-15" },
        ]);
      }
      if (table === "payments") {
        return makeBuilder([
          { id: "p1", amount: 2060, status: "completed", paid_at: "2026-11-15T12:00:00Z", cari_transaction_id: null },
        ]);
      }
      if (table === "account_transactions") {
        return makeBuilder([
          { id: "c1", account_id: "a1", type: "satis", amount: 5000, delta: 5000, date: "2026-11-12T00:00:00Z" },
        ]);
      }
      if (table === "current_accounts") {
        return makeBuilder([
          { id: "a1", name: "Ofsüt", balance: 3680, account_type: "musteri", archived_at: null },
        ]);
      }
      if (table === "financial_records") {
        return makeBuilder([
          {
            id: "f1",
            type: "gider",
            category: "hammadde_un",
            amount: 1200,
            description: "Değirmen un",
            payment_method: "havale",
            date: "2026-11-10T12:00:00Z",
            created_at: "2026-11-10T12:00:00Z",
          },
        ]);
      }
      if (table === "suppliers") {
        return makeBuilder([
          {
            id: "s1",
            name: "Değirmen A.Ş.",
            category: "Un",
            contact_person: "Ali",
            phone: "555",
            email: null,
            address: null,
            balance: 2000,
            created_at: "2026-11-01T00:00:00Z",
            updated_at: "2026-11-01T00:00:00Z",
          },
        ]);
      }
      if (table === "supplier_transactions") {
        return makeBuilder([]);
      }
      return makeBuilder([]);
    });

    const okRes = await GET(
      new Request("http://localhost:3000/api/admin/finance?from=2026-11-01&to=2026-11-30")
    );
    expect(okRes.status).toBe(200);
    const json = await okRes.json();
    expect(json.success).toBe(true);
    expect(json.summary.totalGrossSales).toBe(7060);
    expect(json.summary.totalOperatingExpenses).toBe(1200);
    expect(json.summary.netOperatingProfit).toBe(5860);
    expect(json.summary.totalB2BReceivables).toBe(3680);
    expect(json.summary.totalSupplierPayables).toBe(2000);
  });

  it("POST /api/admin/finance gider ekler ve çift storno denemesini 409 ile engeller", async () => {
    const insertCalls: Record<string, unknown>[] = [];
    const targetUuid = "11111111-1111-4111-8111-111111111111";

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "financial_records") {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertCalls.push(payload);
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: targetUuid,
                      ...payload,
                      created_at: "2026-11-16T09:00:00Z",
                    },
                    error: null,
                  }),
              }),
            };
          }),
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: targetUuid,
                    type: "gider",
                    category: "enerji_firin",
                    amount: 800,
                    payment_method: "nakit",
                    description: "Elektrik",
                  },
                  error: null,
                }),
            }),
            like: () => ({
              limit: () => Promise.resolve({ data: [{ id: "existing-storno" }], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const createRes = await POST(
      new Request("http://localhost:3000/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_record",
          type: "gider",
          category: "enerji_firin",
          amount: 800,
          paymentMethod: "nakit",
          date: "2026-11-16",
          description: "Taş fırın elektrik faturası",
        }),
      })
    );
    expect(createRes.status).toBe(201);
    expect(insertCalls[0].type).toBe("gider");
    expect(insertCalls[0].date).toBe("2026-11-16T12:00:00+03:00");

    const dupStornoRes = await POST(
      new Request("http://localhost:3000/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storno_record",
          recordId: targetUuid,
          reason: "Yanlış fatura",
        }),
      })
    );
    expect(dupStornoRes.status).toBe(409);
  });

  it("POST /api/admin/finance/suppliers tedarikçi açar, mal alımı ve ödeme sonrası simetrik bakiye hesaplar", async () => {
    let updatedBalance: number | null = null;
    const txHistory: Array<{ type: string; amount: number }> = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "financial_records") {
        return {
          insert: vi.fn(() => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: "fin-linked-1" }, error: null }),
            }),
          })),
        };
      }
      if (table === "suppliers") {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    ...payload,
                    created_at: "2026-11-16T09:00:00Z",
                    updated_at: "2026-11-16T09:00:00Z",
                  },
                  error: null,
                }),
            }),
          })),
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: "sup-1",
                    name: "Bursa Taş Değirmen",
                    category: "Un",
                    balance: updatedBalance ?? 0,
                  },
                  error: null,
                }),
            }),
          }),
          update: (payload: { balance?: number }) => {
            if (typeof payload.balance === "number") {
              updatedBalance = payload.balance;
            }
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      if (table === "supplier_transactions") {
        return {
          insert: vi.fn((payload: { type: string; amount: number }) => {
            txHistory.push({ type: payload.type, amount: payload.amount });
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: `tx-${txHistory.length}`,
                      supplier_id: "sup-1",
                      type: payload.type,
                      amount: payload.amount,
                      invoice_no: null,
                      description: "Hareket",
                      date: "2026-11-16T12:00:00+03:00",
                      created_at: "2026-11-16T09:00:00Z",
                    },
                    error: null,
                  }),
              }),
            };
          }),
          select: () => ({
            eq: () => Promise.resolve({ data: txHistory, error: null }),
          }),
        };
      }
      return {};
    });

    const createSup = await SUPPLIER_POST(
      new Request("http://localhost:3000/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_supplier",
          name: "Bursa Taş Değirmen",
          category: "Un & Tahıl",
        }),
      })
    );
    expect(createSup.status).toBe(201);

    const buyRes = await SUPPLIER_POST(
      new Request("http://localhost:3000/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_transaction",
          supplierId: "sup-1",
          type: "alis",
          amount: 4200,
          invoiceNo: "F-101",
          description: "20 çuval atalık buğday unu",
          date: "2026-11-16",
        }),
      })
    );
    expect(buyRes.status).toBe(201);
    expect((await buyRes.json()).newBalance).toBe(4200);

    const payRes = await SUPPLIER_POST(
      new Request("http://localhost:3000/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record_transaction",
          supplierId: "sup-1",
          type: "odeme",
          amount: 1500,
          description: "Havale ödeme",
          date: "2026-11-16",
          alsoRecordExpense: true,
          expenseCategory: "hammadde_un",
          paymentMethod: "havale",
        }),
      })
    );
    expect(payRes.status).toBe(201);
    const payJson = await payRes.json();
    expect(payJson.newBalance).toBe(2700);
    expect(payJson.recordedExpenseId).toBe("fin-linked-1");
  });
});
