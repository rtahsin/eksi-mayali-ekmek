import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchFinanceDashboardData,
  getPreviousMonthRange,
  parsePositiveAmountInput,
  submitSupplierTransaction,
} from "./client";

describe("finance client servisi ve saf yardımcıları", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("getPreviousMonthRange ve parsePositiveAmountInput sınır durumlarını doğru işler", () => {
    expect(getPreviousMonthRange("2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
    expect(getPreviousMonthRange("2026-03-10")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });

    expect(parsePositiveAmountInput("125,50")).toBe(125.5);
    expect(parsePositiveAmountInput("0")).toBeNull();
    expect(parsePositiveAmountInput("-10")).toBeNull();
    expect(parsePositiveAmountInput("abc")).toBeNull();
  });

  it("fetchFinanceDashboardData ve submitSupplierTransaction doğru uçlara gider", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith("/api/admin/finance?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              records: [],
              suppliers: [],
              supplierTransactions: [],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            newBalance: 2500,
            recordedExpenseId: null,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchFinanceDashboardData({ from: "2026-11-01", to: "2026-11-17" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/finance?from=2026-11-01&to=2026-11-17",
      expect.objectContaining({ method: "GET" })
    );

    const txRes = await submitSupplierTransaction({
      supplierId: "sup-1",
      type: "alis",
      amount: 2500,
      invoiceNo: "F-01",
      description: "Taş un",
      date: "2026-11-17",
      alsoRecordExpense: false,
      expenseCategory: "hammadde_un",
      paymentMethod: "havale",
    });
    expect(txRes.newBalance).toBe(2500);
  });
});
