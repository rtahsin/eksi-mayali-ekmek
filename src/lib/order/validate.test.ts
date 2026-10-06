import { describe, expect, it } from "vitest";
import { normalizePhone, stripMah, validateCheckout } from "./validate";

describe("stripMah", () => {
  it("Mah. / Mahallesi / Mah ekini temizler", () => {
    expect(stripMah("Barış Mah.")).toBe("Barış");
    expect(stripMah("Barış Mahallesi")).toBe("Barış");
    expect(stripMah("Adnan Kahveci Mah")).toBe("Adnan Kahveci");
    expect(stripMah("Sahil")).toBe("Sahil");
  });
});

describe("normalizePhone", () => {
  it("biçimleri 05XXXXXXXXX yapar", () => {
    expect(normalizePhone("0501 012 66 53")).toBe("05010126653");
    expect(normalizePhone("+90 501 012 66 53")).toBe("05010126653");
    expect(normalizePhone("5010126653")).toBe("05010126653");
  });
  it("sabit hat ve kısa numarayı reddeder", () => {
    expect(normalizePhone("0212 123 45 67")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("validateCheckout", () => {
  const ok = { deliveryDate: "2026-10-07", name: "Ali Veli", phone: "0501 012 66 53", neighborhood: "Barış", addressDetail: "Çiftlik Cad. 14/6", termsAccepted: true };
  it("geçerli formda hata yok", () => expect(validateCheckout(ok)).toEqual({}));
  it("boş formda tüm eksikleri birden verir", () => {
    const e = validateCheckout({ deliveryDate: "", name: "", phone: "", neighborhood: "", addressDetail: "", termsAccepted: false });
    expect(Object.keys(e)).toHaveLength(6);
  });
});
