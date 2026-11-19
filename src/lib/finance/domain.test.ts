import { describe, expect, it } from "vitest";
import {
  buildFinancialRecordsCsv,
  buildSuppliersCsv,
  computeB2BReceivablesAging,
  computeCfoSummary,
  computeFinancialSignedEffect,
  computeSupplierSymmetricBalance,
  computeSupplierTxDelta,
  extractStornoTargetId,
  normalizeCashFlowChannel,
  normalizeFinancialRecords,
  normalizeSupplierTransactions,
  round2,
  summarizeSupplierBalanceByDate,
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
      supplierTransactions: [],
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

  it("normalizeFinancialRecords ve normalizeSupplierTransactions önce reverses_id kolonunu kullanır, yeni tedarikçi kolonlarını taşır", () => {
    const finTarget = "11111111-1111-4111-8111-111111111111";
    const finStorno = "22222222-2222-4222-8222-222222222222";
    const finNormalized = normalizeFinancialRecords([
      {
        id: finTarget,
        type: "gider",
        category: "hammadde_un",
        amount: 750,
        description: "Taş un",
        payment_method: "havale",
        date: "2026-11-12T09:00:00Z",
        created_at: "2026-11-12T09:00:00Z",
        reverses_id: null,
      },
      {
        id: finStorno,
        type: "storno_gider",
        category: "hammadde_un",
        amount: 750,
        description: "Açıklamada etiket olmadan ters kayıt",
        payment_method: "havale",
        date: "2026-11-13T09:00:00Z",
        created_at: "2026-11-13T09:00:00Z",
        reverses_id: finTarget,
      },
    ]);
    expect(finNormalized.find((r) => r.id === finTarget)?.isReversed).toBe(true);
    expect(finNormalized.find((r) => r.id === finStorno)?.reversesRecordId).toBe(finTarget);

    const txTarget = "aaaa1111-1111-4111-8111-111111111111";
    const txStorno = "bbbb2222-2222-4222-8222-222222222222";
    const linkedExp = "cccc3333-3333-4333-8333-333333333333";
    const txNormalized = normalizeSupplierTransactions([
      {
        id: txTarget,
        supplier_id: "sup-1",
        type: "odeme",
        amount: 1200,
        invoice_no: null,
        description: "Havale ödeme",
        date: "2026-11-12T09:00:00Z",
        created_at: "2026-11-12T09:00:00Z",
        reverses_id: null,
        balance_after: "1800.50",
        payment_method: "havale",
        expense_category: "hammadde_un",
        linked_financial_record_id: linkedExp,
      },
      {
        id: txStorno,
        supplier_id: "sup-1",
        type: "storno_odeme",
        amount: 1200,
        invoice_no: null,
        description: "Etiketsiz kolon bazlı storno",
        date: "2026-11-13T09:00:00Z",
        created_at: "2026-11-13T09:00:00Z",
        reverses_id: txTarget,
        balance_after: 3000.5,
        payment_method: "havale",
        expense_category: "hammadde_un",
        linked_financial_record_id: finStorno,
      },
    ]);

    const normalizedTarget = txNormalized.find((t) => t.id === txTarget);
    const normalizedStorno = txNormalized.find((t) => t.id === txStorno);
    expect(normalizedTarget?.isReversed).toBe(true);
    expect(normalizedTarget?.balanceAfter).toBe(1800.5);
    expect(normalizedTarget?.paymentMethod).toBe("havale");
    expect(normalizedTarget?.expenseCategory).toBe("hammadde_un");
    expect(normalizedTarget?.linkedFinancialRecordId).toBe(linkedExp);
    expect(normalizedStorno?.reversesTransactionId).toBe(txTarget);
    expect(normalizedStorno?.balanceAfter).toBe(3000.5);
    expect(normalizedStorno?.linkedFinancialRecordId).toBe(finStorno);
  });

  it("computeCfoSummary totalSupplierPayables hesabında negatif tedarikçi avansını borçtan düşmez", () => {
    const summary = computeCfoSummary({
      periodFrom: "2026-11-01",
      periodTo: "2026-11-30",
      orders: [],
      payments: [],
      cariAccounts: [{ id: "c1", balance: 10000, account_type: "musteri", archived_at: null }],
      cariTransactions: [],
      financialRecords: [],
      suppliers: [
        {
          id: "s1",
          name: "Borçlu Tedarikçi",
          category: "Un",
          contact_person: null,
          phone: null,
          email: null,
          address: null,
          balance: 4500,
          created_at: "",
          updated_at: "",
        },
        {
          id: "s2",
          name: "Avans Verilen Tedarikçi",
          category: "Süt",
          contact_person: null,
          phone: null,
          email: null,
          address: null,
          balance: -1500,
          created_at: "",
          updated_at: "",
        },
        {
          id: "s3",
          name: "İkinci Borçlu",
          category: "Ambalaj",
          contact_person: null,
          phone: null,
          email: null,
          address: null,
          balance: 500,
          created_at: "",
          updated_at: "",
        },
      ],
      supplierTransactions: [],
    });

    expect(summary.totalSupplierPayables).toBe(5000);
    expect(summary.totalSupplierAdvances).toBe(1500);
    expect(summary.netWorkingCapital).toBe(5000);
  });

  it("Tahakkuk (P&L) vs Nakit Akışı ayrımı: veresiye alış vs ödeme, bağlı gider çifte sayım koruması ve kanal değişmezleri", () => {
    const linkedExpId = "11111111-1111-4111-8111-111111111111";
    const linkedStornoSourceId = "22222222-2222-4222-8222-222222222222";
    const linkedStornoExpId = "33333333-3333-4333-8333-333333333333";

    expect(normalizeCashFlowChannel("cash")).toBe("nakit");
    expect(normalizeCashFlowChannel("POS")).toBe("kart");
    expect(normalizeCashFlowChannel("kredi_karti")).toBe("kart");
    expect(normalizeCashFlowChannel("card")).toBe("kart");
    expect(normalizeCashFlowChannel("banka_havale")).toBe("havale");
    expect(normalizeCashFlowChannel("eft")).toBe("havale");
    expect(normalizeCashFlowChannel("cek")).toBe("diger");
    expect(normalizeCashFlowChannel(null)).toBe("diger");

    const summary = computeCfoSummary({
      periodFrom: "2026-11-01",
      periodTo: "2026-11-30",
      asOfDate: "2026-11-30",
      orders: [
        { id: "o1", total_amount: 5000, status: "teslim_edildi", cari_id: null, delivery_date: "2026-11-10" },
      ],
      payments: [
        { id: "p1", amount: 3000, method: "nakit", status: "completed", paid_at: "2026-11-10T10:00:00Z", cari_transaction_id: null },
        { id: "p2", amount: 2000, method: "pos", status: "completed", paid_at: "2026-11-10T11:00:00Z", cari_transaction_id: null },
      ],
      cariAccounts: [
        { id: "c1", balance: 5000, account_type: "musteri", archived_at: null },
      ],
      cariTransactions: [
        { id: "ct1", account_id: "c1", type: "satis", amount: 8000, delta: 8000, date: "2026-11-12T10:00:00Z" },
        { id: "ct2", account_id: "c1", type: "tahsilat", amount: 3000, delta: -3000, payment_method: "banka_havale", date: "2026-11-15T10:00:00Z" },
      ],
      financialRecords: [
        {
          id: "f-direct",
          type: "gider",
          category: "enerji_firin",
          amount: 1000,
          description: "Fırın doğalgaz",
          payment_method: "kredi_karti",
          date: "2026-11-12T10:00:00Z",
          created_at: "2026-11-12T10:00:00Z",
        },
        {
          id: "f-income",
          type: "gelir",
          category: "diger",
          amount: 500,
          description: "Atölye workshop ücreti",
          payment_method: "cash",
          date: "2026-11-14T10:00:00Z",
          created_at: "2026-11-14T10:00:00Z",
        },
        // Eski alsoRecordExpense=true ile üretilmiş bağlı gider kopyası -> çifte sayılmamalı!
        {
          id: linkedExpId,
          type: "gider",
          category: "hammadde_un",
          amount: 2000,
          description: "[Tedarikçi Ödemesi: Taş Değirmen] Havale",
          payment_method: "havale",
          date: "2026-11-16T10:00:00Z",
          created_at: "2026-11-16T10:00:00Z",
        },
        // Bağlı bir gider kopyasının sonradan kesilmiş stornosu -> yine hariç tutulmalı!
        {
          id: linkedStornoSourceId,
          type: "gider",
          category: "hammadde_un",
          amount: 750,
          description: "Eski bağlı kopya",
          payment_method: "havale",
          date: "2026-11-17T10:00:00Z",
          created_at: "2026-11-17T10:00:00Z",
        },
        {
          id: linkedStornoExpId,
          type: "storno_gider",
          category: "hammadde_un",
          amount: 750,
          description: `[STORNO:${linkedStornoSourceId}] İptal`,
          payment_method: "havale",
          date: "2026-11-18T10:00:00Z",
          created_at: "2026-11-18T10:00:00Z",
          reverses_id: linkedStornoSourceId,
        },
      ],
      suppliers: [
        {
          id: "s1",
          name: "Taş Değirmen",
          category: "Un",
          contact_person: null,
          phone: null,
          email: null,
          address: null,
          balance: 4000,
          created_at: "",
          updated_at: "",
        },
      ],
      supplierTransactions: [
        {
          id: "st1",
          supplier_id: "s1",
          type: "alis",
          amount: 6000,
          invoice_no: "FAT-10",
          description: "Organik un alımı",
          date: "2026-11-11T10:00:00Z",
          created_at: "2026-11-11T10:00:00Z",
          expense_category: "hammadde_un",
        },
        {
          id: "st2",
          supplier_id: "s1",
          type: "odeme",
          amount: 2000,
          invoice_no: null,
          description: "Kısmi havale",
          date: "2026-11-16T10:00:00Z",
          created_at: "2026-11-16T10:00:00Z",
          payment_method: "havale",
          expense_category: "hammadde_un",
          linked_financial_record_id: linkedExpId,
        },
        // İptal edilmiş bir eski ödeme + stornosu -> sıfır etki + linked gider kopyası hariç
        {
          id: "st3",
          supplier_id: "s1",
          type: "odeme",
          amount: 750,
          invoice_no: null,
          description: "Hatalı ödeme",
          date: "2026-11-17T10:00:00Z",
          created_at: "2026-11-17T10:00:00Z",
          payment_method: "havale",
          linked_financial_record_id: linkedStornoSourceId,
        },
        {
          id: "st4",
          supplier_id: "s1",
          type: "storno_odeme",
          amount: 750,
          invoice_no: "STORNO:st3",
          description: "[STORNO] Banka iadesi",
          date: "2026-11-18T10:00:00Z",
          created_at: "2026-11-18T10:00:00Z",
          reverses_id: "st3",
          payment_method: "havale",
        },
      ],
    });

    expect(summary.totalGrossSales).toBe(13500);
    expect(summary.totalCashIn).toBe(8500);
    expect(summary.directOperatingExpenses).toBe(1000);
    expect(summary.supplierAccrualPurchases).toBe(6000);
    expect(summary.supplierCashPayments).toBe(2000);
    expect(summary.totalOperatingExpenses).toBe(7000);
    expect(summary.totalCashOut).toBe(3000);
    expect(summary.netOperatingProfit).toBe(6500);
    expect(summary.netCashFlow).toBe(5500);
    expect(summary.netOperatingProfit).not.toBe(summary.netCashFlow);
    expect(summary.expensesByCategory).toEqual({
      enerji_firin: 1000,
      hammadde_un: 6000,
    });

    // Ödeme kanalı değişmezleri: Σ cashIn === totalCashIn, Σ cashOut === totalCashOut (0,00 ₺ sapma)
    const sumCashIn = round2(summary.cashFlowByChannel.reduce((s, c) => s + c.cashIn, 0));
    const sumCashOut = round2(summary.cashFlowByChannel.reduce((s, c) => s + c.cashOut, 0));
    expect(sumCashIn).toBe(summary.totalCashIn);
    expect(sumCashOut).toBe(summary.totalCashOut);

    const byKey = Object.fromEntries(summary.cashFlowByChannel.map((c) => [c.channel, c]));
    expect(byKey.nakit).toMatchObject({ cashIn: 3500, cashOut: 0, net: 3500 });
    expect(byKey.kart).toMatchObject({ cashIn: 2000, cashOut: 1000, net: 1000 });
    expect(byKey.havale).toMatchObject({ cashIn: 3000, cashOut: 2000, net: 1000 });
    expect(byKey.diger).toMatchObject({ cashIn: 0, cashOut: 0, net: 0 });
  });

  it("computeB2BReceivablesAging kronolojik FIFO mahsup ile yaşlandırma yapar, arşiv/gider/storno dışlar", () => {
    const reversedId = "rev-tx-1";
    const aging = computeB2BReceivablesAging(
      [
        { id: "c1", balance: 2700, account_type: "musteri", archived_at: null },
        { id: "c2", balance: 500, account_type: "musteri", archived_at: null },
        { id: "c-arch", balance: 9000, account_type: "musteri", archived_at: "2026-11-01T00:00:00Z" },
        { id: "c-gider", balance: 4000, account_type: "gider", archived_at: null },
      ],
      [
        // c1: 40g önce 1000, 20g önce 1500, 10g önce 800, 3g önce 600; 1200 tahsilat (FIFO -> 40g kapanır, 20g'den 200 düşer -> 1300 kalır)
        { id: "t1", account_id: "c1", type: "satis", amount: 1000, delta: 1000, date: "2026-10-10T10:00:00Z" },
        { id: "t2", account_id: "c1", type: "satis", amount: 1500, delta: 1500, date: "2026-10-30T10:00:00Z" },
        { id: "t3", account_id: "c1", type: "satis", amount: 800, delta: 800, date: "2026-11-09T10:00:00Z" },
        { id: "t4", account_id: "c1", type: "satis", amount: 600, delta: 600, date: "2026-11-16T10:00:00Z" },
        { id: "t5", account_id: "c1", type: "tahsilat", amount: 1200, delta: -1200, date: "2026-11-12T10:00:00Z" },
        // Storno edilmiş satış (hariç tutulmalı)
        { id: reversedId, account_id: "c1", type: "satis", amount: 3000, delta: 3000, date: "2026-10-01T10:00:00Z" },
        { id: "t-storno", account_id: "c1", type: "storno", amount: 3000, delta: -3000, reverses_id: reversedId, date: "2026-10-02T10:00:00Z" },
        // c2: 45g önce 500 ödenmemiş
        { id: "t6", account_id: "c2", type: "satis", amount: 500, delta: 500, date: "2026-10-05T10:00:00Z" },
        // Arşiv ve gider carisi hareketleri (hariç)
        { id: "t-arch", account_id: "c-arch", type: "satis", amount: 9000, delta: 9000, date: "2026-10-01T10:00:00Z" },
        { id: "t-gider", account_id: "c-gider", type: "satis", amount: 4000, delta: 4000, date: "2026-10-01T10:00:00Z" },
      ],
      "2026-11-19"
    );

    expect(aging).toEqual({
      current0to7: 600,
      days8to15: 800,
      days16to30: 1300,
      over30: 500,
      total: 3200,
    });
    expect(round2(aging.current0to7 + aging.days8to15 + aging.days16to30 + aging.over30)).toBe(aging.total);
  });

  it("summarizeSupplierBalanceByDate dönem başı devir, alış, ödeme, net ve dönem sonu bakiyeyi tutarlı hesaplar", () => {
    const txs = normalizeSupplierTransactions([
      // Dönem öncesi: +5000 - 2000 = 3000 devir
      { id: "s-pre-1", supplier_id: "sup-1", type: "alis", amount: 5000, invoice_no: "F1", description: "Un", date: "2026-10-10T10:00:00Z", created_at: "2026-10-10T10:00:00Z" },
      { id: "s-pre-2", supplier_id: "sup-1", type: "odeme", amount: 2000, invoice_no: null, description: "Havale", date: "2026-10-20T10:00:00Z", created_at: "2026-10-20T10:00:00Z" },
      // Dönem içi (Kasım): +4000 alış + 1000 alış - 1000 storno_alis = 4000 net alış; 1500 ödeme
      { id: "s-in-1", supplier_id: "sup-1", type: "alis", amount: 4000, invoice_no: "F2", description: "Siyez unu", date: "2026-11-05T10:00:00Z", created_at: "2026-11-05T10:00:00Z" },
      { id: "s-in-2", supplier_id: "sup-1", type: "alis", amount: 1000, invoice_no: "F3", description: "Hatalı fatura", date: "2026-11-08T10:00:00Z", created_at: "2026-11-08T10:00:00Z" },
      { id: "s-in-3", supplier_id: "sup-1", type: "storno_alis", amount: 1000, invoice_no: "STORNO:s-in-2", description: "[STORNO] İptal", date: "2026-11-09T10:00:00Z", created_at: "2026-11-09T10:00:00Z", reverses_id: "s-in-2" },
      { id: "s-in-4", supplier_id: "sup-1", type: "odeme", amount: 1500, invoice_no: null, description: "Kısmi ödeme", date: "2026-11-15T10:00:00Z", created_at: "2026-11-15T10:00:00Z" },
      // Dönem sonrası (Aralık) -> dönem sonu bakiyeye dahil olmamalı
      { id: "s-post-1", supplier_id: "sup-1", type: "alis", amount: 900, invoice_no: "F4", description: "Aralık alım", date: "2026-12-02T10:00:00Z", created_at: "2026-12-02T10:00:00Z" },
      // Başka tedarikçi -> hariç
      { id: "s-other", supplier_id: "sup-2", type: "alis", amount: 7777, invoice_no: "F9", description: "Diğer", date: "2026-11-10T10:00:00Z", created_at: "2026-11-10T10:00:00Z" },
    ]);

    const res = summarizeSupplierBalanceByDate(txs, "sup-1", "2026-11-01", "2026-11-30");
    expect(res).toEqual({
      supplierId: "sup-1",
      fromDate: "2026-11-01",
      toDate: "2026-11-30",
      openingBalance: 3000,
      periodPurchases: 4000,
      periodPayments: 1500,
      periodNet: 2500,
      closingBalance: 5500,
    });
    expect(round2(res.periodPurchases - res.periodPayments)).toBe(res.periodNet);
    expect(round2(res.openingBalance + res.periodNet)).toBe(res.closingBalance);
  });

  it("kanonik payments.method değerlerini (transfer, online_card, pos_at_door, cash_on_delivery) doğru kanallara ayırır ve Σ cashIn === totalCashIn korur", () => {
    expect(normalizeCashFlowChannel("transfer")).toBe("havale");
    expect(normalizeCashFlowChannel("bank_transfer")).toBe("havale");
    expect(normalizeCashFlowChannel("wire")).toBe("havale");
    expect(normalizeCashFlowChannel("online_card")).toBe("kart");
    expect(normalizeCashFlowChannel("online")).toBe("kart");
    expect(normalizeCashFlowChannel("pos_at_door")).toBe("kart");
    expect(normalizeCashFlowChannel("credit_card")).toBe("kart");
    expect(normalizeCashFlowChannel("debit_card")).toBe("kart");
    expect(normalizeCashFlowChannel("cash_on_delivery")).toBe("nakit");
    expect(normalizeCashFlowChannel("cash")).toBe("nakit");

    const summary = computeCfoSummary({
      periodFrom: "2026-11-01",
      periodTo: "2026-11-30",
      orders: [],
      payments: [
        { id: "p-tr", amount: 1250, method: "transfer", status: "completed", paid_at: "2026-11-10T10:00:00Z", cari_transaction_id: null },
        { id: "p-oc", amount: 850, method: "online_card", status: "completed", paid_at: "2026-11-11T10:00:00Z", cari_transaction_id: null },
        { id: "p-pos", amount: 640, method: "pos_at_door", status: "completed", paid_at: "2026-11-12T10:00:00Z", cari_transaction_id: null },
        { id: "p-cod", amount: 460, method: "cash_on_delivery", status: "completed", paid_at: "2026-11-13T10:00:00Z", cari_transaction_id: null },
      ],
      cariAccounts: [],
      cariTransactions: [],
      financialRecords: [],
      suppliers: [],
      supplierTransactions: [],
    });

    expect(summary.totalCashIn).toBe(3200);
    const sumCashIn = round2(summary.cashFlowByChannel.reduce((s, c) => s + c.cashIn, 0));
    expect(sumCashIn).toBe(summary.totalCashIn);

    const byKey = Object.fromEntries(summary.cashFlowByChannel.map((c) => [c.channel, c]));
    expect(byKey.havale).toMatchObject({ cashIn: 1250, cashOut: 0, net: 1250 });
    expect(byKey.kart).toMatchObject({ cashIn: 1490, cashOut: 0, net: 1490 });
    expect(byKey.nakit).toMatchObject({ cashIn: 460, cashOut: 0, net: 460 });
    expect(byKey.diger).toMatchObject({ cashIn: 0, cashOut: 0, net: 0 });
  });
});
