import { describe, it, expect } from "vitest";
import { manualOrderProblem, type ManualOrderDraft } from "./manualOrder";

const base: ManualOrderDraft = {
  customerName: "Ayşe",
  phone: "",
  deliveryMethod: "courier",
  deliveryAddress: "Sokak 1",
  neighborhood: "Barış",
  itemCount: 1,
  shippingFee: 0,
};

describe("manualOrderProblem", () => {
  it("accepts a courier order without a phone", () => {
    expect(manualOrderProblem(base)).toBeNull();
  });

  it("does not ask address or neighborhood for pickup", () => {
    expect(manualOrderProblem({ ...base, deliveryMethod: "pickup", deliveryAddress: "", neighborhood: "" })).toBeNull();
  });

  it("asks address and neighborhood for courier", () => {
    expect(manualOrderProblem({ ...base, deliveryAddress: " " })).toBe("Teslimat adresini yaz.");
    expect(manualOrderProblem({ ...base, neighborhood: "" })).toBe("Mahalleyi seç.");
  });

  it("requires a name and at least one item", () => {
    expect(manualOrderProblem({ ...base, customerName: "" })).toBe("Müşteri adını yaz.");
    expect(manualOrderProblem({ ...base, itemCount: 0 })).toBe("En az bir ürün ekle.");
  });

  it("rejects a short phone or negative fee", () => {
    expect(manualOrderProblem({ ...base, phone: "0532" })).toBe("Telefon numarası eksik görünüyor.");
    expect(manualOrderProblem({ ...base, phone: "0532 111 22 33" })).toBeNull();
    expect(manualOrderProblem({ ...base, shippingFee: -1 })).toBe("Teslimat ücreti geçersiz.");
  });
});
