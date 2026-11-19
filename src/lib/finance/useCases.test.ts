import { describe, expect, it } from "vitest";
import { createFakeFinanceRepository } from "./__fixtures__/fakeFinanceRepo";
import { FinanceRepoError } from "./repo";
import { getFinanceOverview, handleFinancePost, handleSuppliersPost } from "./useCases";

const ACTOR = { userId: "11111111-1111-4111-8111-111111111111", role: "superadmin" };

describe("finance useCases (FakeFinanceRepository)", () => {
  it("perakende + B2B + gider özetini çifte sayım olmadan döndürür ve geçersiz aralığı 400 ile reddeder", async () => {
    const store = createFakeFinanceRepository({
      orders: [{ id: "o1", total_amount: 1500, status: "teslim_edildi", cari_id: null, delivery_date: "2026-11-15" }],
      payments: [{ id: "p1", amount: 1500, status: "completed", paid_at: "2026-11-15T12:00:00Z", cari_transaction_id: null }],
      cariAccounts: [{ id: "a1", name: "Ofsüt", balance: 3680, account_type: "musteri", archived_at: null }],
      cariTransactions: [{ id: "t1", account_id: "a1", type: "satis", amount: 4000, delta: 4000, date: "2026-11-10T10:00:00Z" }],
    });

    const bad = await getFinanceOverview(store.repo, { from: "2026-11-20", to: "2026-11-10" });
    expect(bad.ok).toBe(false);
    expect(bad.status).toBe(400);

    const ok = await getFinanceOverview(store.repo, { from: "2026-11-01", to: "2026-11-30" });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.body.summary.totalGrossSales).toBe(5500);
      expect(ok.body.summary.totalB2BReceivables).toBe(3680);
    }
  });

  it("gider ekler, storno keser, ikinci stornoyu 409 ve stornonun stornosunu 400 ile engeller", async () => {
    const store = createFakeFinanceRepository();

    const created = await handleFinancePost(store.repo, ACTOR, {
      action: "create_record",
      type: "gider",
      category: "enerji_firin",
      amount: 950,
      paymentMethod: "nakit",
      date: "2026-11-17",
      description: "Fırın odun alımı",
    });
    expect(created.ok).toBe(true);
    expect(created.status).toBe(201);
    if (!created.ok) return;

    const recordId = created.body.record.id;
    expect(store.auditLogs).toHaveLength(1);

    const storno = await handleFinancePost(store.repo, ACTOR, {
      action: "storno_record",
      recordId,
      reason: "Yanlış tarih",
    });
    expect(storno.ok).toBe(true);
    expect(storno.status).toBe(200);
    if (!storno.ok) return;
    expect(storno.body.record.reversesRecordId).toBe(recordId);

    const dup = await handleFinancePost(store.repo, ACTOR, {
      action: "storno_record",
      recordId,
      reason: "Tekrar",
    });
    expect(dup.ok).toBe(false);
    expect(dup.status).toBe(409);
    if (!dup.ok) {
      expect(dup.body.code).toBe("ALREADY_REVERSED");
    }

    const stornoOfStorno = await handleFinancePost(store.repo, ACTOR, {
      action: "storno_record",
      recordId: storno.body.record.id,
      reason: "Olmamalı",
    });
    expect(stornoOfStorno.ok).toBe(false);
    expect(stornoOfStorno.status).toBe(400);
    if (!stornoOfStorno.ok) {
      expect(stornoOfStorno.body.code).toBe("CANNOT_STORNO_A_STORNO");
    }
  });

  it("tedarikçi carisinde alış (expenseCategory) + gider bağlantılı ödeme + storno ile bağlı gider terslemesini atomik korur", async () => {
    const store = createFakeFinanceRepository();

    const supRes = await handleSuppliersPost(store.repo, ACTOR, {
      action: "upsert_supplier",
      name: "Bursa Taş Değirmen",
    });
    expect(supRes.ok).toBe(true);
    expect(supRes.status).toBe(201);
    if (!supRes.ok || !("supplier" in supRes.body)) return;

    const supplierId = supRes.body.supplier.id;

    const buy = await handleSuppliersPost(store.repo, ACTOR, {
      action: "record_transaction",
      supplierId,
      type: "alis",
      amount: 3000,
      date: "2026-11-17",
      expenseCategory: "hammadde_un",
    });
    expect(buy.ok).toBe(true);
    if (!buy.ok || !("newBalance" in buy.body) || !("recordedExpenseId" in buy.body)) return;
    expect(buy.body.newBalance).toBe(3000);
    expect(buy.body.transaction.balanceAfter).toBe(3000);
    expect(buy.body.transaction.expenseCategory).toBe("hammadde_un");
    expect(buy.body.transaction.paymentMethod).toBeNull();
    expect(buy.body.recordedExpenseId).toBeNull();

    const pay = await handleSuppliersPost(store.repo, ACTOR, {
      action: "record_transaction",
      supplierId,
      type: "odeme",
      amount: 1200,
      date: "2026-11-17",
      alsoRecordExpense: true,
      expenseCategory: "hammadde_un",
      paymentMethod: "havale",
    });
    expect(pay.ok).toBe(true);
    if (!pay.ok || !("recordedExpenseId" in pay.body)) return;
    expect(pay.body.newBalance).toBe(1800);
    expect(pay.body.transaction.balanceAfter).toBe(1800);
    expect(pay.body.transaction.paymentMethod).toBe("havale");
    expect(pay.body.recordedExpenseId).toBeTruthy();
    expect(pay.body.transaction.linkedFinancialRecordId).toBe(pay.body.recordedExpenseId);

    // Bağlı giderli ödemenin stornosu hem bakiyeyi geri alır hem bağlı gideri storno eder
    const stornoPay = await handleSuppliersPost(store.repo, ACTOR, {
      action: "storno_transaction",
      supplierId,
      transactionId: pay.body.transaction.id,
      reason: "Banka iadesi",
    });
    expect(stornoPay.ok).toBe(true);
    expect(stornoPay.status).toBe(200);
    if (!stornoPay.ok || !("newBalance" in stornoPay.body)) return;
    expect(stornoPay.body.newBalance).toBe(3000);
    expect(stornoPay.body.transaction.balanceAfter).toBe(3000);
    expect(stornoPay.body.transaction.reversesTransactionId).toBe(pay.body.transaction.id);
    if ("reversedExpenseId" in stornoPay.body) {
      const reversedId = stornoPay.body.reversedExpenseId;
      expect(reversedId).toBeTruthy();
      const reversedFin = store.financialRecords.find((r) => r.id === reversedId);
      expect(reversedFin?.type).toBe("storno_gider");
      expect(reversedFin?.reverses_id).toBe(pay.body.recordedExpenseId);
    }

    // Aynı tedarikçi hareketine ikinci storno -> 409 ALREADY_REVERSED
    const dupStorno = await handleSuppliersPost(store.repo, ACTOR, {
      action: "storno_transaction",
      supplierId,
      transactionId: pay.body.transaction.id,
      reason: "Tekrar iptal",
    });
    expect(dupStorno.ok).toBe(false);
    expect(dupStorno.status).toBe(409);
    if (!dupStorno.ok) {
      expect(dupStorno.body.code).toBe("ALREADY_REVERSED");
    }

    // Storno kaydının stornosu -> 400 CANNOT_STORNO_A_STORNO
    const stornoOfStorno = await handleSuppliersPost(store.repo, ACTOR, {
      action: "storno_transaction",
      supplierId,
      transactionId: stornoPay.body.transaction.id,
      reason: "Storno iptali yasak",
    });
    expect(stornoOfStorno.ok).toBe(false);
    expect(stornoOfStorno.status).toBe(400);
    if (!stornoOfStorno.ok) {
      expect(stornoOfStorno.body.code).toBe("CANNOT_STORNO_A_STORNO");
    }

    // Alış stornosu -> bakiye 0'a döner, reversedExpenseId null
    const stornoBuy = await handleSuppliersPost(store.repo, ACTOR, {
      action: "storno_transaction",
      supplierId,
      transactionId: buy.body.transaction.id,
      reason: "Fatura iptali",
    });
    expect(stornoBuy.ok).toBe(true);
    if (stornoBuy.ok && "newBalance" in stornoBuy.body && "reversedExpenseId" in stornoBuy.body) {
      expect(stornoBuy.body.newBalance).toBe(0);
      expect(stornoBuy.body.reversedExpenseId).toBeNull();
    }
  });

  it("FinanceRepoError 500 hard-fail hatalarını temiz FinanceActionResult olarak döndürür", async () => {
    const store = createFakeFinanceRepository();
    const brokenRepo = {
      ...store.repo,
      async recordFinancialRecordAtomic() {
        throw new FinanceRepoError(500, "RPC çöktü", "FINANCE_INSERT_FAILED");
      },
    };

    const res = await handleFinancePost(brokenRepo, ACTOR, {
      action: "create_record",
      type: "gider",
      category: "diger",
      amount: 100,
      paymentMethod: "nakit",
      description: "Test",
    });
    expect(res).toEqual({
      ok: false,
      status: 500,
      body: { error: "RPC çöktü", code: "FINANCE_INSERT_FAILED" },
    });
  });

  it("getFinanceOverview supplierTransactions geçirerek Tahakkuk (P&L) vs Nakit Akışı, kanal toplamları ve FIFO aging döndürür", async () => {
    const linkedExpId = "44444444-4444-4444-8444-444444444444";
    const store = createFakeFinanceRepository({
      orders: [
        { id: "o1", total_amount: 4000, status: "teslim_edildi", cari_id: null, delivery_date: "2026-11-15" },
      ],
      payments: [
        { id: "p1", amount: 4000, method: "pos", status: "completed", paid_at: "2026-11-15T12:00:00Z", cari_transaction_id: null },
      ],
      cariAccounts: [
        { id: "a1", name: "Ofsüt", balance: 3000, account_type: "musteri", archived_at: null },
      ],
      cariTransactions: [
        { id: "ct1", account_id: "a1", type: "satis", amount: 5000, delta: 5000, date: "2026-11-01T10:00:00Z" },
        { id: "ct2", account_id: "a1", type: "tahsilat", amount: 2000, delta: -2000, payment_method: "havale", date: "2026-11-10T10:00:00Z" },
      ],
      financialRecords: [
        {
          id: "f1",
          type: "gider",
          category: "enerji_firin",
          amount: 500,
          description: "Elektrik",
          payment_method: "nakit",
          date: "2026-11-10T10:00:00Z",
          created_at: "2026-11-10T10:00:00Z",
          reverses_id: null,
        },
        {
          id: linkedExpId,
          type: "gider",
          category: "hammadde_un",
          amount: 1000,
          description: "[Tedarikçi Ödemesi: Un A.Ş.] Eski bağlı gider",
          payment_method: "havale",
          date: "2026-11-14T10:00:00Z",
          created_at: "2026-11-14T10:00:00Z",
          reverses_id: null,
        },
      ],
      suppliers: [
        {
          id: "s1",
          name: "Un A.Ş.",
          category: "Un",
          contact_person: null,
          phone: null,
          email: null,
          address: null,
          balance: 2000,
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-14T00:00:00Z",
        },
      ],
      supplierTransactions: [
        {
          id: "st1",
          supplier_id: "s1",
          type: "alis",
          amount: 3000,
          invoice_no: "F-100",
          description: "Un faturası",
          date: "2026-11-12T10:00:00Z",
          created_at: "2026-11-12T10:00:00Z",
          expense_category: "hammadde_un",
        },
        {
          id: "st2",
          supplier_id: "s1",
          type: "odeme",
          amount: 1000,
          invoice_no: null,
          description: "Kısmi havale",
          date: "2026-11-14T10:00:00Z",
          created_at: "2026-11-14T10:00:00Z",
          payment_method: "havale",
          linked_financial_record_id: linkedExpId,
        },
      ],
    });

    const overview = await getFinanceOverview(store.repo, {
      from: "2026-11-01",
      to: "2026-11-19",
      today: "2026-11-19",
    });
    expect(overview.ok).toBe(true);
    if (!overview.ok) return;

    const { summary } = overview.body;
    expect(summary.totalGrossSales).toBe(9000);
    expect(summary.totalCashIn).toBe(6000);
    expect(summary.directOperatingExpenses).toBe(500);
    expect(summary.supplierAccrualPurchases).toBe(3000);
    expect(summary.supplierCashPayments).toBe(1000);
    expect(summary.totalOperatingExpenses).toBe(3500);
    expect(summary.totalCashOut).toBe(1500);
    expect(summary.netOperatingProfit).toBe(5500);
    expect(summary.netCashFlow).toBe(4500);
    expect(summary.netOperatingProfit).not.toBe(summary.netCashFlow);
    expect(summary.expensesByCategory).toEqual({ enerji_firin: 500, hammadde_un: 3000 });

    const sumIn = summary.cashFlowByChannel.reduce((s, c) => s + c.cashIn, 0);
    const sumOut = summary.cashFlowByChannel.reduce((s, c) => s + c.cashOut, 0);
    expect(sumIn).toBe(summary.totalCashIn);
    expect(sumOut).toBe(summary.totalCashOut);

    // 2026-11-01 satış (5000) - 2000 tahsilat = 3000, 18 gün yaş -> days16to30
    expect(summary.b2bReceivablesAging).toEqual({
      current0to7: 0,
      days8to15: 0,
      days16to30: 3000,
      over30: 0,
      total: 3000,
    });
  });
});
