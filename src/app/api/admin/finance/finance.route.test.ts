import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdmin = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireAdmin: (req: Request) => mockRequireAdmin(req),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import { GET, POST } from "./route";
import { POST as SUPPLIER_POST } from "./suppliers/route";

describe("/api/admin/finance & /api/admin/finance/suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      auth: {
        isAuthenticated: true,
        isAdmin: true,
        userId: "11111111-1111-4111-8111-111111111111",
        role: "superadmin",
      },
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

  it("GET /api/admin/finance geçersiz tarih aralığını 400 ile reddeder, sayfalı sorgu + ±1 gün payments filtresi ile özeti döner", async () => {
    const badRes = await GET(
      new Request("http://localhost:3000/api/admin/finance?from=2026-11-20&to=2026-11-10")
    );
    expect(badRes.status).toBe(400);

    const orFilters: Record<string, string> = {};
    const selectClauses: Record<string, string> = {};
    const rangeCalls: Array<{ table: string; from: number; to: number }> = [];

    const makePagedBuilder = (table: string, rows: unknown[]) => {
      const chain = {
        select: (cols: string) => {
          selectClauses[table] = cols;
          return chain;
        },
        eq: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        or: (expr: string) => {
          orFilters[table] = expr;
          return chain;
        },
        order: () => chain,
        range: (start: number, end: number) => {
          rangeCalls.push({ table, from: start, to: end });
          return Promise.resolve({ data: rows.slice(start, end + 1), error: null });
        },
      };
      return chain;
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return makePagedBuilder(table, [
          { id: "o1", total_amount: 2060, status: "teslim_edildi", cari_id: null, delivery_date: "2026-11-15" },
        ]);
      }
      if (table === "payments") {
        return makePagedBuilder(table, [
          { id: "p1", amount: 2060, status: "completed", paid_at: "2026-11-15T12:00:00Z", cari_transaction_id: null },
        ]);
      }
      if (table === "account_transactions") {
        return makePagedBuilder(table, [
          { id: "c1", account_id: "a1", type: "satis", amount: 5000, delta: 5000, date: "2026-11-12T00:00:00Z" },
        ]);
      }
      if (table === "current_accounts") {
        return makePagedBuilder(table, [
          { id: "a1", name: "Ofsüt", balance: 3680, account_type: "musteri", archived_at: null },
        ]);
      }
      if (table === "financial_records") {
        return makePagedBuilder(table, [
          {
            id: "f1",
            type: "gider",
            category: "hammadde_un",
            amount: 1200,
            description: "Değirmen un",
            payment_method: "havale",
            date: "2026-11-10T12:00:00Z",
            created_at: "2026-11-10T12:00:00Z",
            reverses_id: null,
          },
        ]);
      }
      if (table === "suppliers") {
        return makePagedBuilder(table, [
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
        return makePagedBuilder(table, []);
      }
      return makePagedBuilder(table, []);
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

    // ±1 gün tamponlu payments UTC tarih filtresi (paid_at + created_at fallback)
    expect(orFilters.payments).toContain("2026-10-31T00:00:00.000Z");
    expect(orFilters.payments).toContain("2026-12-01T23:59:59.999Z");
    expect(orFilters.payments).toContain("paid_at.is.null");

    // 034 yeni kolonları seçilmiş olmalı
    expect(selectClauses.financial_records).toContain("reverses_id");
    expect(selectClauses.supplier_transactions).toContain("reverses_id");
    expect(selectClauses.supplier_transactions).toContain("balance_after");
    expect(selectClauses.supplier_transactions).toContain("linked_financial_record_id");

    // 1000'lik sayfalama çağrıları kullanılmalı
    expect(rangeCalls.some((c) => c.table === "financial_records" && c.from === 0 && c.to === 999)).toBe(true);
    expect(rangeCalls.some((c) => c.table === "supplier_transactions" && c.from === 0 && c.to === 999)).toBe(true);
  });

  it("POST /api/admin/finance atomik RPC ile gider ekler, çift stornoyu 409 ve storno-stornoyu 400 ile engeller", async () => {
    const targetUuid = "22222222-2222-4222-8222-222222222222";
    const stornoUuid = "33333333-3333-4333-8333-333333333333";

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    mockRpc.mockImplementation((fn: string, params: Record<string, unknown>) => {
      if (fn === "record_financial_record_atomic") {
        return Promise.resolve({
          data: {
            id: targetUuid,
            type: params.p_type,
            category: params.p_category,
            amount: params.p_amount,
            description: params.p_description,
            payment_method: params.p_payment_method,
            date: params.p_date,
            created_at: "2026-11-16T09:00:00Z",
            reverses_id: null,
          },
          error: null,
        });
      }
      if (fn === "storno_financial_record_atomic") {
        if (params.p_record_id === targetUuid) {
          return Promise.resolve({
            data: null,
            error: { message: "ALREADY_REVERSED" },
          });
        }
        if (params.p_record_id === stornoUuid) {
          return Promise.resolve({
            data: null,
            error: { message: "CANNOT_STORNO_A_STORNO" },
          });
        }
      }
      return Promise.resolve({ data: null, error: { message: "UNEXPECTED" } });
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
    expect(mockRpc).toHaveBeenCalledWith(
      "record_financial_record_atomic",
      expect.objectContaining({
        p_type: "gider",
        p_amount: 800,
        p_date: "2026-11-16T12:00:00+03:00",
        p_created_by: "11111111-1111-4111-8111-111111111111",
      })
    );

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
    expect((await dupStornoRes.json()).code).toBe("ALREADY_REVERSED");

    const stornoOfStornoRes = await POST(
      new Request("http://localhost:3000/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storno_record",
          recordId: stornoUuid,
          reason: "Storno iptali",
        }),
      })
    );
    expect(stornoOfStornoRes.status).toBe(400);
    expect((await stornoOfStornoRes.json()).code).toBe("CANNOT_STORNO_A_STORNO");
  });

  it("POST /api/admin/finance/suppliers atomik RPC ile alış, gider bağlantılı ödeme ve storno (reversedExpenseId) yürütür", async () => {
    const payTxId = "aaaa1111-1111-4111-8111-111111111111";
    const stornoTxId = "bbbb2222-2222-4222-8222-222222222222";
    const linkedExpId = "cccc3333-3333-4333-8333-333333333333";
    const reversedExpId = "dddd4444-4444-4444-8444-444444444444";

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
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
        };
      }
      return {};
    });

    mockRpc.mockImplementation((fn: string, params: Record<string, unknown>) => {
      if (fn === "record_supplier_transaction_atomic") {
        if (params.p_type === "alis") {
          return Promise.resolve({
            data: {
              transaction: {
                id: "eeee5555-5555-4555-8555-555555555555",
                supplier_id: params.p_supplier_id,
                type: "alis",
                amount: params.p_amount,
                invoice_no: params.p_invoice_no,
                description: params.p_description,
                date: params.p_date,
                created_at: "2026-11-16T09:00:00Z",
                reverses_id: null,
                balance_after: 4200,
                payment_method: null,
                expense_category: params.p_expense_category,
                linked_financial_record_id: null,
              },
              new_balance: 4200,
              recorded_expense_id: null,
            },
            error: null,
          });
        }
        return Promise.resolve({
          data: {
            transaction: {
              id: payTxId,
              supplier_id: params.p_supplier_id,
              type: "odeme",
              amount: params.p_amount,
              invoice_no: null,
              description: params.p_description,
              date: params.p_date,
              created_at: "2026-11-16T09:05:00Z",
              reverses_id: null,
              balance_after: 2700,
              payment_method: params.p_payment_method,
              expense_category: params.p_expense_category,
              linked_financial_record_id: linkedExpId,
            },
            new_balance: 2700,
            recorded_expense_id: linkedExpId,
          },
          error: null,
        });
      }
      if (fn === "storno_supplier_transaction_atomic") {
        if (params.p_transaction_id === payTxId) {
          return Promise.resolve({
            data: {
              transaction: {
                id: stornoTxId,
                supplier_id: params.p_supplier_id,
                type: "storno_odeme",
                amount: 1500,
                invoice_no: `STORNO:${payTxId}`,
                description: `[STORNO] ${params.p_reason}`,
                date: params.p_date,
                created_at: "2026-11-16T10:00:00Z",
                reverses_id: payTxId,
                balance_after: 4200,
                payment_method: "havale",
                expense_category: "hammadde_un",
                linked_financial_record_id: reversedExpId,
              },
              new_balance: 4200,
              reversed_expense_id: reversedExpId,
            },
            error: null,
          });
        }
        return Promise.resolve({
          data: null,
          error: { message: "CANNOT_STORNO_A_STORNO" },
        });
      }
      return Promise.resolve({ data: null, error: { message: "UNEXPECTED" } });
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
          expenseCategory: "hammadde_un",
        }),
      })
    );
    expect(buyRes.status).toBe(201);
    const buyJson = await buyRes.json();
    expect(buyJson.newBalance).toBe(4200);
    expect(buyJson.transaction.expenseCategory).toBe("hammadde_un");
    expect(buyJson.transaction.balanceAfter).toBe(4200);

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
    expect(payJson.recordedExpenseId).toBe(linkedExpId);

    const stornoRes = await SUPPLIER_POST(
      new Request("http://localhost:3000/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storno_transaction",
          supplierId: "sup-1",
          transactionId: payTxId,
          reason: "Havale iadesi",
        }),
      })
    );
    expect(stornoRes.status).toBe(200);
    const stornoJson = await stornoRes.json();
    expect(stornoJson.newBalance).toBe(4200);
    expect(stornoJson.reversedExpenseId).toBe(reversedExpId);
    expect(stornoJson.transaction.reversesTransactionId).toBe(payTxId);

    const stornoOfStorno = await SUPPLIER_POST(
      new Request("http://localhost:3000/api/admin/finance/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "storno_transaction",
          supplierId: "sup-1",
          transactionId: stornoTxId,
          reason: "Storno iptali",
        }),
      })
    );
    expect(stornoOfStorno.status).toBe(400);
    expect((await stornoOfStorno.json()).code).toBe("CANNOT_STORNO_A_STORNO");
  });
});
