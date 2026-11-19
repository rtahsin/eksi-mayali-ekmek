import { describe, expect, it } from "vitest";
import {
  formatCariDateRangeLabel,
  isTransactionInDateRange,
  resolveCariDateRange,
  summarizeBalanceByDate,
} from "./balanceSummary";

describe("resolveCariDateRange", () => {
  it("tüm zamanlar için sınırsız aralık döner", () => {
    expect(resolveCariDateRange("all", "2026-11-19")).toEqual({
      startDate: null,
      endDate: null,
    });
  });

  it("bu ay ve geçen ay sınırlarını doğru hesaplar (yıl geçişi dahil)", () => {
    expect(resolveCariDateRange("this_month", "2026-11-19")).toEqual({
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    });
    expect(resolveCariDateRange("last_month", "2026-11-19")).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
    expect(resolveCariDateRange("last_month", "2026-01-10")).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
    expect(resolveCariDateRange("this_month", "2024-02-15")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });

  it("son 30 gün ve özel tarih filtrelerini doğrular", () => {
    expect(resolveCariDateRange("last_30", "2026-11-19")).toEqual({
      startDate: "2026-10-20",
      endDate: null,
    });
    expect(resolveCariDateRange("custom", "2026-11-19", "2026-11-05", "2026-11-15")).toEqual({
      startDate: "2026-11-05",
      endDate: "2026-11-15",
    });
    expect(resolveCariDateRange("custom", "2026-11-19", "gecersiz", "")).toEqual({
      startDate: null,
      endDate: null,
    });
  });
});

describe("summarizeBalanceByDate", () => {
  const sampleTxs = [
    { date: "2026-10-25", delta: 1000 },
    { date: "2026-10-28", delta: -400 },
    { date: "2026-11-02", delta: 750.5 },
    { date: "2026-11-02", delta: -250.25 },
    { date: "2026-11-10", delta: 300 },
    { date: "2026-11-10", delta: -300 }, // aynı gün storno
    { date: "2026-11-18", delta: -500.25 },
    { date: "2026-12-01", delta: 900 }, // dönem sonrası
  ];

  it("boş harekette sıfır özet döner", () => {
    const res = summarizeBalanceByDate([], { startDate: null, endDate: null });
    expect(res).toEqual({
      range: { startDate: null, endDate: null },
      isInvalidRange: false,
      openingBalance: 0,
      periodDebt: 0,
      periodCredit: 0,
      periodNet: 0,
      closingBalance: 0,
      transactionCount: 0,
      dailyRows: [],
    });
  });

  it("seçili dönem için dönem başı devir, borç, alacak, net ve dönem sonu bakiyesini simetrik hesaplar", () => {
    const res = summarizeBalanceByDate(sampleTxs, {
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    });

    expect(res.isInvalidRange).toBe(false);
    // Ekim toplamı: +1000 - 400 = 600
    expect(res.openingBalance).toBe(600);
    // Kasım borçları: 750.50 + 300 = 1050.50
    expect(res.periodDebt).toBe(1050.5);
    // Kasım alacakları: 250.25 + 300 + 500.25 = 1050.50
    expect(res.periodCredit).toBe(1050.5);
    // Kasım net: 0
    expect(res.periodNet).toBe(0);
    // Kasım sonu bakiye (Aralık hareketi dahil değil): 600
    expect(res.closingBalance).toBe(600);
    expect(res.transactionCount).toBe(5);

    // Günlük döküm en yeni tarih en üstte olmalı
    expect(res.dailyRows).toEqual([
      {
        date: "2026-11-18",
        transactionCount: 1,
        debt: 0,
        credit: 500.25,
        net: -500.25,
        closingBalance: 600,
      },
      {
        date: "2026-11-10",
        transactionCount: 2,
        debt: 300,
        credit: 300,
        net: 0,
        closingBalance: 1100.25,
      },
      {
        date: "2026-11-02",
        transactionCount: 2,
        debt: 750.5,
        credit: 250.25,
        net: 500.25,
        closingBalance: 1100.25,
      },
    ]);
  });

  it("dönemler arası storno ve negatif (alacaklı) bakiyede kuruş hassasiyetini korur", () => {
    const txs = [
      { date: "2026-10-31", delta: 120.1 },
      { date: "2026-11-01", delta: -120.1 }, // ertesi ay storno
      { date: "2026-11-03", delta: -50.2 }, // fazla ödeme -> alacaklı bakiye
    ];
    const res = summarizeBalanceByDate(txs, {
      startDate: "2026-11-01",
      endDate: "2026-11-30",
    });

    expect(res.openingBalance).toBe(120.1);
    expect(res.periodDebt).toBe(0);
    expect(res.periodCredit).toBe(170.3);
    expect(res.periodNet).toBe(-170.3);
    expect(res.closingBalance).toBe(-50.2);
    expect(res.dailyRows[1].closingBalance).toBe(0);
    expect(Object.is(res.dailyRows[1].closingBalance, -0)).toBe(false);
  });

  it("geçersiz tarih aralığında (startDate > endDate) isInvalidRange=true döner", () => {
    const range = { startDate: "2026-11-20", endDate: "2026-11-10" };
    const res = summarizeBalanceByDate(sampleTxs, range);
    expect(res.isInvalidRange).toBe(true);
    expect(res.dailyRows).toEqual([]);
    expect(isTransactionInDateRange("2026-11-15", range)).toBe(false);
  });

  it("etiket biçimleyici dönem ve tek gün seçimlerini okunaklı yazar", () => {
    expect(formatCariDateRangeLabel("all", { startDate: null, endDate: null })).toBe("Tüm Zamanlar");
    expect(formatCariDateRangeLabel("this_month", { startDate: "2026-11-01", endDate: "2026-11-30" })).toBe("Bu Ay");
    expect(formatCariDateRangeLabel("custom", { startDate: "2026-11-19", endDate: "2026-11-19" })).toBe(
      "19 Kasım Perşembe",
    );
  });
});
