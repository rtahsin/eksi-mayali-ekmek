import { describe, expect, it } from "vitest";
import { formatMoney } from "./currency";

describe("müşteri tutarları", () => {
  it.each([[250, "250\u00a0₺"], [1250.5, "1.250,50\u00a0₺"], [0, "0\u00a0₺"], [-0, "0\u00a0₺"], [9876543.21, "9.876.543,21\u00a0₺"], [-12.5, "-12,50\u00a0₺"]])("%s Türkçe para biçiminde ve bölünmeyen birimle gösterilir", (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
  it.each([null, undefined, NaN, Infinity, -Infinity])("bilinmeyen tutarı sıfırmış gibi göstermez: %s", (value) => {
    expect(formatMoney(value)).toBe("—");
  });
});
