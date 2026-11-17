import { describe, expect, it } from "vitest";
import {
  buildFinancialRecordsCsv,
  buildSuppliersCsv,
  computeCfoSummary,
  computeFinancialSignedEffect,
  computeSupplierSymmetricBalance,
  computeSupplierTxDelta,
  extractStornoTargetId,
  normalizeFinancialRecords,
  normalizeSupplierTransactions,
  toIstanbulDateStr,
} from "./index";

describe("CFO finans, tedarikçi simetrisi ve storno hesapları", () => {
  it("İstanbul tarihini UTC kayması olmadan doğru dönüştürür", () => {
    expect(toIstanbulDateStr("2026-11-15", "")).toBe("2026-11-15");
    expect(toIstanbulDateStr("2026-11-15T22:30:00Z", "")).toBe("2026-11-16");
    expect(toIstanbulDateStr(null, "2026-11-01")).toBe("2026-11-01");
  });

  it("financial_records için işaretli etkiyi ve storno eşleşmesini doğru kurar", () => {
    const gidId = "11111111-1111-4111-8111-111111111111";
    const stornoId = "22222222-2222-4222-8222-222222222222";
    const aktifId = "33333333-3333-4333-8333-333333333333";

    expect(computeFinancialSignedEffect("gider", 500)).toBe(-500);
    expect(computeFinancialSignedEffect("gelir", 500)).toBe(500);
    expect(computeFinancialSignedEffect("storno_gider", 500)).toBe(500);
    expect(computeFinancialSignedEffect("storno_gelir", 500)).toBe(-500);
    expect(extractStornoTargetId(`[STORNO:${gidId}] Yanlış tutar`)).toBe(gidId);

    const normalized = normalizeFinancialRecords([
      {
        id: gidId,
        type: "gider",
        category: "hammadde_un",
        amount: 1200,
        description: "Taş değirmen un",
        payment_method: "havale",
        date: "2026-11-10T09:00:00Z",
        created_at: "2026-11-10T09:00:00Z",
      },
      {
        id: stornoId,
        type: "storno_gider",
        category: "hammadde_un",
        amount: 1200,
        description: `[STORNO:${gidId}] Çift fatura girişi`,
        payment_method: "havale",
        date: "2026-11-11T09:00:00Z",
        created_at: "2026-11-11T09:00:00Z",
      },
      {
        id: aktifId,
        type: "gider",
        category: "ambalaj_etiket",
        amount: 450,
        description: "Kraft torba + QR etiket",
        payment_method: "nakit",
        date: "2026-11-12T09:00:00Z",
        created_at: "2026-11-12T09:00:00Z",
      },
    ]);

    expect(normalized.find((r) => r.id === gidId)?.isReversed).toBe(true);
    expect(normalized.find((r) => r.id === stornoId)?.reversesRecordId).toBe(gidId);
    expect(normalized.find((r) => r.id === aktifId)?.isReversed).toBe(false);
  });

  it("tedarikçi carisi simetrik bakiye (alis - odeme ve storno) matematiğini korur", () => {
    const alisId = "aaaa1111-1111-4111-8111-111111111111";
    expect(computeSupplierTxDelta("alis", 1000)).toBe(1000);
    expect(computeSupplierTxDelta("odeme", 400)).toBe(-400);
    expect(computeSupplierTxDelta("storno_alis", 1000)).toBe(-1000);
    expect(computeSupplierTxDelta("storno_odeme", 400)).toBe(400);

    const rows = [
      {
        id: alisId,
        supplier_id: "sup-1",
        type: "alis",
        amount: 3500,
        invoice_no: "FAT-001",
        description: "Tam buğday unu",
        date: "2026-11-05T09:00:00Z",
        created_at: "2026-11-05T09:00:00Z",
      },
      {
        id: "bbbb2222-2222-4222-8222-222222222222",
        supplier_id: "sup-1",
        type: "odeme",
        amount: 1500,
        invoice_no: null,
        description: "Kısmi havale",
        date: "2026-11-08T09:00:00Z",
        created_at: "2026-11-08T09:00:00Z",
      },
      {
        id: "cccc3333-3333-4333-8333-333333333333",
        supplier_id: "sup-1",
        type: "alis",
        amount: 800,
        invoice_no: "FAT-002",
        description: "Ek maya + tuz",
        date: "2026-11-10T09:00:00Z",
        created_at: "2026-11-10T09:00:00Z",
      },
      {
        id: "dddd4444-4444-4444-8444-444444444444",
        supplier_id: "sup-1",
        type: "storno_alis",
        amount: 3500,
        invoice_no: `STORNO:${alisId}`,
        description: "[STORNO] İptal edilen ilk fatura",
        date: "2026-11-11T09:00:00Z",
        created_at: "2026-11-11T09:00:00Z",
      },
    ];

    expect(computeSupplierSymmetricBalance(rows)).toBe(-700);
    const normalized = normalizeSupplierTransactions(rows);
    expect(normalized.find((t) => t.id === alisId)?.isReversed).toBe(true);
    expect(normalized.find((t) => t.id === "dddd4444-4444-4444-8444-444444444444")?.reversesTransactionId).toBe(
      alisId
    );
  });

  it("perakende + B2B + storno + gider özetini çifte sayım olmadan hesaplar", () => {
    const revTargetId = "99999999-9999-4999-8999-999999999999";
    const cancelledExpId = "88888888-8888-4888-8888-888888888888";

    const summary = computeCfoSummary({
      periodFrom: "2026-11-01",
      periodTo: "2026-11-30",
      orders: [
        { id: "o1", total_amount: 2060, status: "teslim_edildi", cari_id: null, delivery_date: "2026-11-15" },
        { id: "o2", total_amount: 3000, status: "teslim_edildi", cari_id: "cari-1", delivery_date: "2026-11-15" },
        { id: "o3", total_amount: 500, status: "iptal", cari_id: null, delivery_date: "2026-11-15" },
      ],
      payments: [
        { id: "p1", amount: 2060, status: "completed", paid_at: "2026-11-15T15:00:00Z", cari_transaction_id: null },
        {
          id: "p2",
          amount: 1000,
          status: "completed",
          paid_at: "2026-11-15T15:00:00Z",
          cari_transaction_id: "tx-linked",
        },
      ],
      cariAccounts: [
        { id: "cari-1", balance: 17405, account_type: "musteri", archived_at: null },
        { id: "cari-2", balance: 3680, account_type: "musteri", archived_at: null },
        { id: "cari-gider", balance: 9999, account_type: "gider", archived_at: null },
      ],
      cariTransactions: [
        { id: "b1", account_id: "cari-1", type: "satis", amount: 10000, delta: 10000, date: "2026-11-12T00:00:00Z" },
        { id: "b2", account_id: "cari-1", type: "tahsilat", amount: 4000, delta: -4000, date: "2026-11-13T00:00:00Z" },
        {
          id: revTargetId,
          account_id: "cari-2",
          type: "satis",
          amount: 5000,
          delta: 5000,
          date: "2026-11-14T00:00:00Z",
        },
        {
          id: "b3-storno",
          account_id: "cari-2",
          type: "storno",
          amount: 5000,
          delta: -5000,
          reverses_id: revTargetId,
          date: "2026-11-14T01:00:00Z",
        },
        { id: "b4-gider", account_id: "cari-gider", type: "satis", amount: 7777, delta: 7777, date: "2026-11-14T00:00:00Z" },
      ],
      financialRecords: [
        {
          id: "f1",
          type: "gider",
          category: "hammadde_un",
          amount: 3200,
          description: "Un faturası",
          payment_method: "havale",
          date: "2026-11-10T10:00:00Z",
          created_at: "2026-11-10T10:00:00Z",
        },
        {
          id: "f2",
          type: "gider",
          category: "enerji_firin",
          amount: 800,
          description: "Fırın doğalgaz",
          payment_method: "kredi_karti",
          date: "2026-11-12T10:00:00Z",
          created_at: "2026-11-12T10:00:00Z",
        },
        {
          id: cancelledExpId,
          type: "gider",
          category: "diger",
          amount: 999,
          description: "Hatalı gider",
          payment_method: "nakit",
          date: "2026-11-13T10:00:00Z",
          created_at: "2026-11-13T10:00:00Z",
        },
        {
          id: "f3-storno",
          type: "storno_gider",
          category: "diger",
          amount: 999,
          description: `[STORNO:${cancelledExpId}] İptal`,
          payment_method: "nakit",
          date: "2026-11-14T10:00:00Z",
          created_at: "2026-11-14T10:00:00Z",
        },
      ],
      suppliers: [
        {
          id: "s1",
          name: "Taş Değirmen",
          category: "Un",
          contact_person: "Ali",
          phone: "555",
          email: "",
          address: "",
          balance: 4500,
          created_at: "",
          updated_at: "",
        },
      ],
    });

    expect(summary.retailDeliveredSales).toBe(2060);
    expect(summary.retailCollectedCash).toBe(2060);
    expect(summary.b2bNetSales).toBe(10000);
    expect(summary.b2bCollectedCash).toBe(4000);
    expect(summary.totalGrossSales).toBe(12060);
    expect(summary.totalCashIn).toBe(6060);
    expect(summary.totalOperatingExpenses).toBe(4000);
    expect(summary.expensesByCategory).toEqual({
      hammadde_un: 3200,
      enerji_firin: 800,
    });
    expect(summary.netOperatingProfit).toBe(8060);
    expect(summary.netOperatingMarginPct).toBe(66.8);
    expect(summary.netCashFlow).toBe(2060);
    expect(summary.totalB2BReceivables).toBe(21085);
    expect(summary.totalSupplierPayables).toBe(4500);
    expect(summary.netWorkingCapital).toBe(16585);
  });

  it("Excel Türkçe CSV çıktısını UTF-8 BOM ve noktalı virgül ile üretir", () => {
    const recs = normalizeFinancialRecords([
      {
        id: "r1",
        type: "gider",
        category: "hammadde_un",
        amount: 1500,
        description: "Organik taş un",
        payment_method: "havale",
        date: "2026-11-15T12:00:00Z",
        created_at: "2026-11-15T12:00:00Z",
      },
    ]);
    const csv = buildFinancialRecordsCsv(recs);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Tarih;Tür;Kategori");
    expect(csv).toContain("Un, Tahıl & Maya");
    expect(csv).toContain("1500,00");

    const supCsv = buildSuppliersCsv([
      {
        id: "s1",
        name: "Anadolu Değirmen",
        category: "Un",
        contactPerson: "Mehmet",
        phone: "0555",
        email: "",
        address: "Beylikdüzü",
        balance: 2500,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    expect(supCsv.startsWith("\uFEFF")).toBe(true);
    expect(supCsv).toContain("Tedarikçi Adı;Kategori");
    expect(supCsv).toContain("2500,00");
  });
});
