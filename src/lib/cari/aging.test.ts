import { describe, expect, it } from "vitest";
import { computeAccountAgingFifo, type CariAccountAging, type CariAgingTransaction } from "./aging";
import { roundCariMoney } from "./pricing";

function assertAgingInvariants(result: CariAccountAging): void {
  const bucketSum = roundCariMoney(
    result.current0to7 + result.days8to15 + result.days16to30 + result.over30,
  );
  expect(bucketSum).toBe(result.totalOpenReceivable);
  expect(result.totalOpenReceivable).toBe(Math.max(0, result.netBalance));
  expect(Object.is(result.netBalance, -0)).toBe(false);
  expect(Object.is(result.totalOpenReceivable, -0)).toBe(false);
  expect(Object.is(result.current0to7, -0)).toBe(false);
  expect(Object.is(result.days8to15, -0)).toBe(false);
  expect(Object.is(result.days16to30, -0)).toBe(false);
  expect(Object.is(result.over30, -0)).toBe(false);
}

describe("computeAccountAgingFifo", () => {
  const TODAY = "2026-11-19";

  it("boş harekette tüm kovalar ve göstergeler sıfır/null döner", () => {
    const res = computeAccountAgingFifo([], TODAY);
    assertAgingInvariants(res);
    expect(res).toEqual({
      netBalance: 0,
      totalOpenReceivable: 0,
      current0to7: 0,
      days8to15: 0,
      days16to30: 0,
      over30: 0,
      oldestUnpaidDate: null,
      oldestUnpaidDays: 0,
      lastCollectionDate: null,
    });
  });

  it("tam ödenmiş hesapta açık alacak 0 ₺ olur ve son tahsilat tarihi korunur", () => {
    const txs: CariAgingTransaction[] = [
      { id: "s1", date: "2026-10-01", type: "satis", delta: 1250 },
      { id: "s2", date: "2026-10-20", type: "satis", delta: 750 },
      { id: "t1", date: "2026-10-25", type: "tahsilat", delta: -1000 },
      { id: "t2", date: "2026-11-12", type: "tahsilat", delta: -1000 },
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    expect(res).toEqual({
      netBalance: 0,
      totalOpenReceivable: 0,
      current0to7: 0,
      days8to15: 0,
      days16to30: 0,
      over30: 0,
      oldestUnpaidDate: null,
      oldestUnpaidDays: 0,
      lastCollectionDate: "2026-11-12",
    });
  });

  it("45 günlük borca kısmi tahsilat yapıldığında FIFO gereği önce en eski borçtan düşer", () => {
    // 2026-11-19 - 45 gün = 2026-10-05
    const txs: CariAgingTransaction[] = [
      { id: "s-new", date: "2026-11-15", type: "satis", delta: 600 }, // 4 gün önce
      { id: "s-old", date: "2026-10-05", type: "satis", delta: 1000 }, // 45 gün önce (bilerek sonra verildi)
      { id: "t1", date: "2026-11-16", type: "tahsilat", delta: -700 },
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    expect(res).toEqual({
      netBalance: 900,
      totalOpenReceivable: 900,
      current0to7: 600,
      days8to15: 0,
      days16to30: 0,
      over30: 300,
      oldestUnpaidDate: "2026-10-05",
      oldestUnpaidDays: 45,
      lastCollectionDate: "2026-11-16",
    });
  });

  it("çoklu faturada 4 vade kovasının gün sınırlarını (0–7 / 8–15 / 16–30 / 30+) ve FIFO aktarımını doğru hesaplar", () => {
    const txs: CariAgingTransaction[] = [
      { id: "d-40", date: "2026-10-10", type: "satis", delta: 500 }, // 40 gün -> tamamen kapanacak
      { id: "d-31", date: "2026-10-19", type: "satis", delta: 400 }, // 31 gün (over30) -> 100 ₺ düşülecek, 300 ₺ kalacak
      { id: "d-30", date: "2026-10-20", type: "satis", delta: 250 }, // 30 gün (16–30)
      { id: "d-16", date: "2026-11-03", type: "satis", delta: 150 }, // 16 gün (16–30)
      { id: "d-15", date: "2026-11-04", type: "satis", delta: 320 }, // 15 gün (8–15)
      { id: "d-8", date: "2026-11-11", type: "satis", delta: 180 }, // 8 gün (8–15)
      { id: "d-7", date: "2026-11-12", type: "satis", delta: 210 }, // 7 gün (0–7)
      { id: "d-0", date: "2026-11-19", type: "satis", delta: 90 }, // 0 gün (0–7)
      { id: "t1", date: "2026-11-10", type: "tahsilat", delta: -600 }, // 500 (d-40) + 100 (d-31) mahsup
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    expect(res).toEqual({
      netBalance: 1500,
      totalOpenReceivable: 1500,
      current0to7: 300, // 210 + 90
      days8to15: 500, // 320 + 180
      days16to30: 400, // 250 + 150
      over30: 300, // 400 - 100
      oldestUnpaidDate: "2026-10-19",
      oldestUnpaidDays: 31,
      lastCollectionDate: "2026-11-10",
    });
  });

  it("storno edilmiş satış ve storno edilmiş tahsilatı eşleştirip yaşlandırmadan dışlar", () => {
    const txs: CariAgingTransaction[] = [
      // Storno edilmiş 45 günlük satış (yaşlandırmaya girmemeli)
      { id: "sale-cancelled", date: "2026-10-05", type: "satis", delta: 2000, reversedById: "storno-sale" },
      { id: "storno-sale", date: "2026-10-06", type: "storno", delta: -2000, reversesId: "sale-cancelled" },
      // Aktif 10 günlük satış
      { id: "sale-active", date: "2026-11-09", type: "satis", delta: 850 },
      // Storno edilmiş tahsilat (borcu düşürmemeli ve lastCollectionDate sayılmamalı)
      { id: "pay-cancelled", date: "2026-11-18", type: "tahsilat", delta: -850, reversedById: "storno-pay" },
      { id: "storno-pay", date: "2026-11-18", type: "storno", delta: 850, reversesId: "pay-cancelled" },
      // Aktif kısmi tahsilat
      { id: "pay-active", date: "2026-11-14", type: "tahsilat", delta: -250 },
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    expect(res).toEqual({
      netBalance: 600,
      totalOpenReceivable: 600,
      current0to7: 0,
      days8to15: 600,
      days16to30: 0,
      over30: 0,
      oldestUnpaidDate: "2026-11-09",
      oldestUnpaidDays: 10,
      lastCollectionDate: "2026-11-14",
    });
  });

  it("reversedById alanı dolmasa bile storno kaydının reversesId referansıyla orijinal işlemi eşleştirir", () => {
    const txs: CariAgingTransaction[] = [
      { id: "s1", date: "2026-09-01", type: "satis", delta: 900 },
      { id: "st1", date: "2026-09-02", type: "storno", delta: -900, reversesId: "s1" },
      { id: "s2", date: "2026-11-17", type: "satis", delta: 400 },
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    expect(res.netBalance).toBe(400);
    expect(res.totalOpenReceivable).toBe(400);
    expect(res.over30).toBe(0);
    expect(res.current0to7).toBe(400);
    expect(res.oldestUnpaidDate).toBe("2026-11-17");
    expect(res.oldestUnpaidDays).toBe(2);
  });

  it("fazla ödeme / avans durumunda (alacaklı bakiye) açık alacak 0 ₺ olur", () => {
    const txs: CariAgingTransaction[] = [
      { id: "s1", date: "2026-10-01", type: "satis", delta: 450 },
      { id: "t1", date: "2026-11-15", type: "tahsilat", delta: -700 },
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    expect(res).toEqual({
      netBalance: -250,
      totalOpenReceivable: 0,
      current0to7: 0,
      days8to15: 0,
      days16to30: 0,
      over30: 0,
      oldestUnpaidDate: null,
      oldestUnpaidDays: 0,
      lastCollectionDate: "2026-11-15",
    });
  });

  it("kuruş hassasiyetinde (0.1 + 0.2, 33.33 vb.) 0,00 ₺ sapma değişmezini korur", () => {
    const txs: CariAgingTransaction[] = [
      { id: "d1", date: "2026-10-01", type: "satis", delta: 33.33 }, // 49 gün
      { id: "d2", date: "2026-10-25", type: "satis", delta: 33.33 }, // 25 gün
      { id: "d3", date: "2026-11-08", type: "satis", delta: 33.34 }, // 11 gün
      { id: "d4", date: "2026-11-18", type: "satis", delta: 0.1 }, // 1 gün
      { id: "d5", date: "2026-11-19", type: "satis", delta: 0.2 }, // 0 gün
      { id: "t1", date: "2026-11-10", type: "tahsilat", delta: -10.11 },
      { id: "t2", date: "2026-11-18", type: "devir", delta: -0.02 },
    ];

    const res = computeAccountAgingFifo(txs, TODAY);
    assertAgingInvariants(res);
    // Toplam borç = 100.30, Toplam alacak = 10.13 => Net = 90.17
    expect(res.netBalance).toBe(90.17);
    expect(res.totalOpenReceivable).toBe(90.17);
    expect(res.over30).toBe(23.2); // 33.33 - 10.13
    expect(res.days16to30).toBe(33.33);
    expect(res.days8to15).toBe(33.34);
    expect(res.current0to7).toBe(0.3);
    expect(res.lastCollectionDate).toBe("2026-11-10");
  });
});
