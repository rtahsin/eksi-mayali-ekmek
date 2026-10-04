import { describe, expect, it } from "vitest";
import { defaultDeliveryPayment } from "./delivery";

describe("teslimde varsayılan ödeme", () => {
  it("siparişin ödeme yöntemini izler", () => {
    expect(defaultDeliveryPayment("cash_on_delivery", false)).toBe("cash");
    expect(defaultDeliveryPayment("pos_at_door", false)).toBe("pos");
    expect(defaultDeliveryPayment("transfer", true)).toBe("transfer");
  });

  it("cariye yazılan sipariş tahsil edilmiş sayılmaz", () => {
    expect(defaultDeliveryPayment("cari", true)).toBe("unpaid");
    expect(defaultDeliveryPayment(undefined, true)).toBe("unpaid");
    expect(defaultDeliveryPayment("online", false)).toBe("cash");
  });
});
