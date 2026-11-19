import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseFinanceRepository,
  mapFinanceRpcError,
  type FinanceAdminClient,
} from "./repo";

describe("finance repo (034 RPC hata eşleme & sayfalı okuma)", () => {
  it("mapFinanceRpcError tüm 034 RPC hata kodlarını doğru HTTP durum kodlarına ve bilinmeyenleri 500 Hard Fail'e eşler", () => {
    expect(mapFinanceRpcError({ message: "RECORD_NOT_FOUND: id-1" }, "fb", "FB")).toMatchObject({
      status: 404,
      code: "RECORD_NOT_FOUND",
    });
    expect(mapFinanceRpcError({ message: "SUPPLIER_NOT_FOUND: s-1" }, "fb", "FB")).toMatchObject({
      status: 404,
      code: "SUPPLIER_NOT_FOUND",
    });
    expect(mapFinanceRpcError({ message: "TX_NOT_FOUND: tx-1" }, "fb", "FB")).toMatchObject({
      status: 404,
      code: "TX_NOT_FOUND",
    });
    expect(mapFinanceRpcError({ message: "CANNOT_STORNO_A_STORNO" }, "fb", "FB")).toMatchObject({
      status: 400,
      code: "CANNOT_STORNO_A_STORNO",
    });
    expect(mapFinanceRpcError({ message: "ALREADY_REVERSED" }, "fb", "FB")).toMatchObject({
      status: 409,
      code: "ALREADY_REVERSED",
    });
    expect(
      mapFinanceRpcError(
        { code: "23505", message: "duplicate key value violates unique constraint uq_financial_records_reverses" },
        "fb",
        "FB"
      )
    ).toMatchObject({
      status: 409,
      code: "ALREADY_REVERSED",
    });
    expect(mapFinanceRpcError({ message: "INVALID_TYPE: foo" }, "fb", "FB")).toMatchObject({
      status: 400,
      code: "INVALID_TYPE",
    });
    expect(mapFinanceRpcError({ message: "INVALID_AMOUNT" }, "fb", "FB")).toMatchObject({
      status: 400,
      code: "INVALID_AMOUNT",
    });
    expect(mapFinanceRpcError({ message: "connection reset" }, "Fallback", "HARD_FAIL")).toMatchObject({
      status: 500,
      code: "HARD_FAIL",
    });
  });

  it("loadOverviewDatasets 1000 satırdan fazla kaydı sessiz kesmeden birden çok sayfada çeker", async () => {
    const manyFinancialRecords = Array.from({ length: 1250 }, (_, idx) => ({
      id: `fin-${idx}`,
      type: "gider",
      category: "diger",
      amount: 10,
      description: `Kayıt ${idx}`,
      payment_method: "nakit",
      date: "2026-11-10T12:00:00Z",
      created_at: "2026-11-10T12:00:00Z",
      reverses_id: null,
    }));

    const rangeCalls: Array<{ table: string; start: number; end: number }> = [];

    const makeBuilder = (table: string, rows: unknown[]) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        or: () => chain,
        order: () => chain,
        range: (start: number, end: number) => {
          rangeCalls.push({ table, start, end });
          return Promise.resolve({ data: rows.slice(start, end + 1), error: null });
        },
      };
      return chain;
    };

    const fakeClient = {
      from: vi.fn((table: string) =>
        makeBuilder(table, table === "financial_records" ? manyFinancialRecords : [])
      ),
      rpc: vi.fn(),
    } as unknown as FinanceAdminClient;

    const repo = createSupabaseFinanceRepository(fakeClient);
    const datasets = await repo.loadOverviewDatasets({ from: "2026-11-01", to: "2026-11-30" });

    expect(datasets.financialRecords).toHaveLength(1250);
    expect(rangeCalls.filter((c) => c.table === "financial_records")).toEqual([
      { table: "financial_records", start: 0, end: 999 },
      { table: "financial_records", start: 1000, end: 1999 },
    ]);
  });

  it("loadOverviewDatasets sayfa sınırında tekrarlanan satırları id bazlı deduplikasyon ile eler ve account_transactions payment_method seçer", async () => {
    const page1 = Array.from({ length: 1000 }, (_, idx) => ({
      id: `tx-${idx}`,
      account_id: "a1",
      type: "tahsilat",
      amount: 100,
      delta: -100,
      payment_method: "havale",
      reverses_id: null,
      date: "2026-11-10T12:00:00Z",
    }));
    // Eşzamanlı yazım simülasyonu: tx-998 ve tx-999 ikinci sayfada tekrar gelsin
    const page2 = [
      page1[998],
      page1[999],
      {
        id: "tx-1000",
        account_id: "a1",
        type: "tahsilat",
        amount: 200,
        delta: -200,
        payment_method: "nakit",
        reverses_id: null,
        date: "2026-11-11T12:00:00Z",
      },
    ];

    const selectClauses: Record<string, string> = {};

    const makeBuilder = (table: string) => {
      const chain = {
        select: (cols: string) => {
          selectClauses[table] = cols;
          return chain;
        },
        eq: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        or: () => chain,
        order: () => chain,
        range: (start: number) => {
          if (table === "account_transactions") {
            return Promise.resolve({ data: start === 0 ? page1 : page2, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
      };
      return chain;
    };

    const fakeClient = {
      from: vi.fn((table: string) => makeBuilder(table)),
      rpc: vi.fn(),
    } as unknown as FinanceAdminClient;

    const repo = createSupabaseFinanceRepository(fakeClient);
    const datasets = await repo.loadOverviewDatasets({ from: "2026-11-01", to: "2026-11-30" });

    expect(selectClauses.account_transactions).toContain("payment_method");
    expect(datasets.cariTransactions).toHaveLength(1001);
    expect(new Set(datasets.cariTransactions.map((t) => t.id)).size).toBe(1001);
  });
});
