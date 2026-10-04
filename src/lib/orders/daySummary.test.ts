import { describe, expect, it } from "vitest";
import type { AdminOrder } from "@/types/admin";
import { summarizeDay } from "./daySummary";

const order = (over: Partial<AdminOrder>): AdminOrder =>
  ({
    id: Math.random().toString(36),
    deliveryDate: "2026-10-05",
    status: "hazirlaniyor",
    paymentMethod: "cash_on_delivery",
    paymentStatus: "pending",
    totalAmount: 100,
    items: [],
    ...over,
  }) as AdminOrder;

describe("gün özeti", () => {
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
    expect(s).toMatchObject({ total: 6, unconfirmed: 1, delivered: 1, toDeliver: 5, collectCash: 160, collectPos: 80, onAccount: 500 });
  });
});
