import { describe, expect, it } from "vitest";
import type { AdminOrder } from "@/types/admin";
import { summarizeDay } from "./daySummary";

const order = (over: Partial<AdminOrder>): AdminOrder =>
  ({
    id: Math.random().toString(36),
    deliveryDate: "2026-10-05",
    deliveryMethod: "courier",
    status: "hazirlaniyor",
    paymentMethod: "cash_on_delivery",
    paymentStatus: "pending",
    totalAmount: 100,
    items: [],
    ...over,
  }) as AdminOrder;

describe("gün özeti ve Z-kasa mutabakatı", () => {
  it("tahsilatı ödeme şekline göre ayırır; cari ve ödenmiş tahsilata girmez", () => {
    const s = summarizeDay(
      [
        order({ totalAmount: 120 }),
        order({ paymentMethod: "pos_at_door", totalAmount: 80 }),
        order({ cariId: "cari_1", paymentMethod: "cari", totalAmount: 500 }),
        order({ paymentStatus: "paid", totalAmount: 60 }),
        order({ status: "teslim_edildi", totalAmount: 999 }),
        order({ status: "iptal", totalAmount: 999 }),
        order({ status: "bekliyor", totalAmount: 40 }),
        order({ deliveryDate: "2026-10-06", totalAmount: 999 }),
      ],
      "2026-10-05"
    );
    expect(s).toMatchObject({
      total: 6,
      activeOrderCount: 6,
      unconfirmed: 1,
      delivered: 1,
      toDeliver: 5,
      collectCash: 160,
      collectPos: 80,
      onAccount: 500,
    });
  });

  it("Z-mutabakat metriklerini (brüt ciro, nakit/POS tahsilat, işlenen/bekleyen cari) simetrik hesaplar", () => {
    const s = summarizeDay(
      [
        // Teslim edilip nakit tahsil edilen
        order({ status: "teslim_edildi", paymentMethod: "cash_on_delivery", paymentStatus: "paid", totalAmount: 300 }),
        // Teslim edilip POS tahsil edilen
        order({ status: "teslim_edildi", paymentMethod: "pos_at_door", paymentStatus: "paid", totalAmount: 450 }),
        // Online ödenmiş ancak henüz yolda olan kart tahsilatı
        order({ status: "kuryede", paymentMethod: "online", paymentStatus: "paid", totalAmount: 200 }),
        // Havale ile ödenmiş
        order({ status: "teslim_edildi", paymentMethod: "transfer", paymentStatus: "paid", totalAmount: 150 }),
        // Teslim edilmiş cari sipariş -> cariye borç yazıldı (bookedCari)
        order({ status: "teslim_edildi", cariId: "cari_a", paymentMethod: "cari", paymentStatus: "paid", totalAmount: 1200 }),
        // Henüz teslim edilmemiş cari sipariş -> bekleyen cari (pendingCari, borç henüz yazılmadı)
        order({ status: "firinda", cariId: "cari_b", paymentMethod: "cari", paymentStatus: "pending", totalAmount: 800 }),
        // Kapıda nakit tahsil edilecek açık sipariş
        order({ status: "kuryede", paymentMethod: "cash_on_delivery", paymentStatus: "pending", totalAmount: 180 }),
        // Kapıda POS tahsil edilecek açık sipariş
        order({ status: "hazirlaniyor", paymentMethod: "pos_at_door", paymentStatus: "pending", totalAmount: 220 }),
        // Teslim edilmiş ama parası alınmamış cari-dışı sipariş
        order({ status: "teslim_edildi", paymentMethod: "cash_on_delivery", paymentStatus: "pending", totalAmount: 90 }),
        // İptal edilmiş sipariş -> hiçbir ciro veya kasaya girmez
        order({ status: "iptal", paymentMethod: "cash_on_delivery", paymentStatus: "paid", totalAmount: 5000 }),
      ],
      "2026-10-05"
    );

    expect(s.activeOrderCount).toBe(9);
    expect(s.grossRevenue).toBe(300 + 450 + 200 + 150 + 1200 + 800 + 180 + 220 + 90);
    expect(s.collectedCash).toBe(300);
    expect(s.collectedPos).toBe(650); // 450 pos_at_door + 200 online
    expect(s.collectedTransfer).toBe(150);
    expect(s.bookedCari).toBe(1200);
    expect(s.pendingCari).toBe(800);
    expect(s.onAccount).toBe(800);
    expect(s.collectCash).toBe(180);
    expect(s.collectPos).toBe(220);
    expect(s.uncollectedDelivered).toBe(90);

    // Z-Mutabakat simetrisi: tüm kalemlerin toplamı kuruşu kuruşuna brüt ciroya eşittir
    const accountedTotal =
      s.collectedCash +
      s.collectedPos +
      s.collectedTransfer +
      s.bookedCari +
      s.pendingCari +
      s.collectCash +
      s.collectPos +
      s.collectTransfer +
      s.uncollectedDelivered;
    expect(accountedTotal).toBe(s.grossRevenue);
  });

  it("kurye ve Gel-Al (pickup) bekleyen teslimat sayılarını ayrı ve toplamla tutarlı sayar", () => {
    const s = summarizeDay(
      [
        order({ status: "hazirlaniyor", deliveryMethod: "courier" }),
        order({ status: "kuryede", deliveryMethod: "courier" }),
        order({ status: "bekliyor", deliveryMethod: "courier" }),
        order({ status: "firinda", deliveryMethod: "pickup" }),
        order({ status: "kuryede", deliveryMethod: "pickup" }),
        order({ status: "teslim_edildi", deliveryMethod: "courier" }),
        order({ status: "teslim_edildi", deliveryMethod: "pickup" }),
        order({ status: "iptal", deliveryMethod: "courier" }),
      ],
      "2026-10-05"
    );

    expect(s.toDeliver).toBe(5);
    expect(s.courierToDeliver).toBe(3);
    expect(s.pickupToDeliver).toBe(2);
    expect(s.delivered).toBe(2);
  });
});
