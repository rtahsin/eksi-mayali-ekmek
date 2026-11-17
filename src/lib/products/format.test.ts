import { describe, expect, it } from "vitest";
import { formatProductAmount } from "./format";

describe("ürün miktarı gösterimi", () => {
  it("sütü litre, ekmeği gram ve adetli ürünü adet olarak gösterir", () => {
    expect(formatProductAmount({ weight: 3000, weightUnit: "ml" })).toBe("3 L");
    expect(formatProductAmount({ weight: 1500, weightUnit: "ml" })).toBe("1,5 L");
    expect(formatProductAmount({ weight: 500, weightUnit: "ml" })).toBe("500 ml");
    expect(formatProductAmount({ weight: 1000, weightUnit: "g" })).toBe("1.000 g");
    expect(formatProductAmount({ weight: 6, weightUnit: "adet" })).toBe("6 adet");
  });
  it("eski sepetlerde eksik birime gram varsayımı ve boş miktara boş etiket uygular", () => {
    expect(formatProductAmount({ weight: 800 })).toBe("800 g");
    expect(formatProductAmount({ weight: 0 })).toBe("");
  });
});
