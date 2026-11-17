import { describe, expect, it } from "vitest";
import { createFakeFinanceRepository } from "./__fixtures__/fakeFinanceRepo";
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

    const dup = await handleFinancePost(store.repo, ACTOR, {
      action: "storno_record",
      recordId,
      reason: "Tekrar",
    });
    expect(dup.ok).toBe(false);
    expect(dup.status).toBe(409);

    const stornoOfStorno = await handleFinancePost(store.repo, ACTOR, {
      action: "storno_record",
      recordId: storno.body.record.id,
      reason: "Olmamalı",
    });
    expect(stornoOfStorno.ok).toBe(false);
    expect(stornoOfStorno.status).toBe(400);
  });

  it("tedarikçi carisinde mal alımı + gider bağlantılı ödeme + storno sonrası bakiyeyi simetrik korur", async () => {
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
    });
    expect(buy.ok).toBe(true);
    if (!buy.ok || !("newBalance" in buy.body)) return;
    expect(buy.body.newBalance).toBe(3000);

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
    expect(pay.body.recordedExpenseId).toBeTruthy();

    const stornoBuy = await handleSuppliersPost(store.repo, ACTOR, {
      action: "storno_transaction",
      supplierId,
      transactionId: buy.body.transaction.id,
      reason: "Fatura iptali",
    });
    expect(stornoBuy.ok).toBe(true);
    if (stornoBuy.ok && "newBalance" in stornoBuy.body) {
      expect(stornoBuy.body.newBalance).toBe(-1200);
    }
  });
});
