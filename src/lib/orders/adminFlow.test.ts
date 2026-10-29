import { describe, expect, it } from "vitest";
import type { AdminOrder } from "@/types/admin";
import { canCancel, compareForWork, inStatusGroup, isUncollected, nextStep, orderMessage, paymentLabel, statusLabel } from "./adminFlow";

function order(over: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: "o1",
    customerName: "Ayşe Yılmaz",
    phone: "05001112233",
    deliveryAddress: "",
    deliveryMethod: "courier",
    deliveryDate: "2026-10-28",
    items: [{ productId: "p1", productName: "Köy Ekmeği", quantity: 2, unitPrice: 110, totalPrice: 220 }],
    subtotal: 220,
    shippingFee: 0,
    totalAmount: 220,
    status: "bekliyor",
    paymentMethod: "cash_on_delivery",
    paymentStatus: "pending",
    source: "web",
    createdAt: "2026-10-28T08:00:00Z",
    ...over,
  } as AdminOrder;
}

describe("sipariş adımları", () => {
  it("yeni → hazırlık → fırın → yol → teslim", () => {
    expect(nextStep(order())?.status).toBe("hazirlaniyor");
    expect(nextStep(order({ status: "hazirlaniyor" }))?.status).toBe("firinda");
    expect(nextStep(order({ status: "firinda" }))?.label).toBe("Yola çıktı");
    expect(nextStep(order({ status: "kuryede" }))?.status).toBe("teslim_edildi");
  });

  it("gel-al siparişinde yol yerine 'hazır' yazılır", () => {
    expect(nextStep(order({ status: "firinda", deliveryMethod: "pickup" }))?.label).toBe("Hazır, alınacak");
    expect(statusLabel("kuryede", "pickup")).toBe("Hazır, alınacak");
    expect(statusLabel("kuryede")).toBe("Yolda");
  });

  it("teslim edilmiş ve iptal siparişte adım ve iptal yok", () => {
    expect(nextStep(order({ status: "teslim_edildi" }))).toBeNull();
    expect(nextStep(order({ status: "iptal" }))).toBeNull();
    expect(canCancel("teslim_edildi")).toBe(false);
    expect(canCancel("iptal")).toBe(false);
    expect(canCancel("firinda")).toBe(true);
  });
});

describe("filtre ve sıra", () => {
  it("açık grup teslim ve iptali dışarıda bırakır", () => {
    expect(inStatusGroup("kuryede", "acik")).toBe(true);
    expect(inStatusGroup("teslim_edildi", "acik")).toBe(false);
    expect(inStatusGroup("firinda", "hazirlik")).toBe(true);
  });

  it("tahsil edilmeyen: teslim edilmiş, ödenmemiş, cari olmayan", () => {
    expect(isUncollected(order({ status: "teslim_edildi" }))).toBe(true);
    expect(isUncollected(order({ status: "teslim_edildi", paymentStatus: "paid" }))).toBe(false);
    expect(isUncollected(order({ status: "teslim_edildi", cariId: "c1" }))).toBe(false);
    expect(isUncollected(order({ status: "kuryede" }))).toBe(false);
  });

  it("iş bekleyen önce, aynı durumda mahalleye göre", () => {
    const list = [
      order({ id: "a", status: "teslim_edildi" }),
      order({ id: "b", status: "firinda", neighborhood: "Yakuplu" }),
      order({ id: "c", status: "firinda", neighborhood: "Adnan Kahveci" }),
      order({ id: "d", status: "bekliyor" }),
    ].sort(compareForWork);
    expect(list.map((o) => o.id)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("WhatsApp metni", () => {
  it("ilk adı ve ayardaki aralığı kullanır", () => {
    const text = orderMessage("alindi", order(), { window: "14:00 - 18:00", dateLabel: "Yarın" });
    expect(text).toContain("Merhaba Ayşe,");
    expect(text).toContain("2× Köy Ekmeği");
    expect(text).toContain("Yarın, 14:00 - 18:00");
    expect(text).not.toContain("Takip");
  });

  it("gel-al siparişinde saat aralığı yazılmaz", () => {
    const text = orderMessage("alindi", order({ deliveryMethod: "pickup" }), { window: "14:00 - 18:00", dateLabel: "Yarın" });
    expect(text).toContain("Fırından teslim alma: Yarın.");
    expect(text).not.toContain("14:00");
  });

  it("siparişteki aralık ayardakinden önce gelir", () => {
    const text = orderMessage("yolda", order({ deliveryTimeWindow: "15:00 - 17:00" }), { window: "14:00 - 18:00", dateLabel: "Bugün" });
    expect(text).toContain("15:00 - 17:00");
  });
});

describe("paymentLabel", () => {
  it("does not say 'kapıda' for pickup orders", () => {
    expect(paymentLabel("cash_on_delivery")).toBe("Kapıda nakit");
    expect(paymentLabel("cash_on_delivery", "pickup")).toBe("Nakit");
    expect(paymentLabel("pos_at_door", "pickup")).toBe("Kart");
    expect(paymentLabel("transfer", "pickup")).toBe("Havale");
  });
});
