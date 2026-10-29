import { describe, expect, it } from "vitest";
import { mergeOrders, orderSearchFilter } from "./orderQueries";

describe("mergeOrders", () => {
  it("tekilleştirir, sonraki liste ezer, en yeni önce sıralar", () => {
    const a = [
      { id: "1", createdAt: "2026-10-01T08:00:00Z", v: "eski" },
      { id: "2", createdAt: "2026-10-03T08:00:00Z", v: "x" },
    ];
    const b = [
      { id: "1", createdAt: "2026-10-01T08:00:00Z", v: "yeni" },
      { id: "3", createdAt: "2026-09-01T08:00:00Z", v: "y" },
    ];
    const m = mergeOrders(a, b);
    expect(m.map((o) => o.id)).toEqual(["2", "1", "3"]);
    expect(m.find((o) => o.id === "1")?.v).toBe("yeni");
  });
});

describe("orderSearchFilter", () => {
  it("kısa sorguda null", () => {
    expect(orderSearchFilter("ay")).toBeNull();
    expect(orderSearchFilter("  ")).toBeNull();
  });

  it("ad ve sipariş numarası", () => {
    expect(orderSearchFilter("Ayşe")).toBe('customer_name.ilike."*Ayşe*",order_number.ilike."*Ayşe*"');
    expect(orderSearchFilter("SIP-2610")).toContain('order_number.ilike."*SIP-2610*"');
  });

  it("telefonda son 10 hane", () => {
    expect(orderSearchFilter("0532 123 45 67")).toContain('phone.ilike."*5321234567*"');
  });

  it("filtre sözdizimini bozan karakterleri atar", () => {
    const parts = orderSearchFilter("a,b(c).d%e*f")!.split(",");
    expect(parts).toHaveLength(2);
    for (const p of parts) expect(p).toMatch(/^\w+\.ilike\."\*[\p{L}\p{N} -]+\*"$/u);
  });
});
