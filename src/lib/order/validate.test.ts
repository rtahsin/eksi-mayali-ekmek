import { describe, expect, it, vi } from "vitest";
import { normalizePhone, stripMah, validateCheckout } from "./validate";
import { submitOrder } from "./createOrder";
import { sanitizeAuthRedirectPath } from "@/hooks/useCustomerAuth";

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
  it("0090 ve +90 05... kopyala-yapıştır biçimlerini 05XXXXXXXXX yapar", () => {
    expect(normalizePhone("00905321234567")).toBe("05321234567");
    expect(normalizePhone("0090 532 123 45 67")).toBe("05321234567");
    expect(normalizePhone("0090 0532 123 45 67")).toBe("05321234567");
    expect(normalizePhone("+90 0532 123 45 67")).toBe("05321234567");
    expect(normalizePhone("9005321234567")).toBe("05321234567");
  });
  it("iOS Rehber ve WhatsApp görünmez Unicode karakterlerini temizler", () => {
    expect(normalizePhone("\u202A+90 (532) 123 - 45 - 67\u202C")).toBe("05321234567");
    expect(normalizePhone("\u200E+90\u00A00532\u00A0123\u00A045\u00A067\u200F")).toBe("05321234567");
    expect(normalizePhone("\u20660090 (532) 123 45 67\u2069")).toBe("05321234567");
  });
  it("sabit hat ve kısa numarayı reddeder", () => {
    expect(normalizePhone("0212 123 45 67")).toBeNull();
    expect(normalizePhone("+90 212 123 45 67")).toBeNull();
    expect(normalizePhone("0090 212 123 45 67")).toBeNull();
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

describe("submitOrder telefon normalizasyonu", () => {
  it("iOS/WhatsApp kopyala-yapıştır telefonunu sunucuya 11 hane olarak gönderir", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        order: { id: "ORD-1", orderNumber: "SIP-2611-001" },
        trackingToken: "tok",
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    try {
      await submitOrder({
        items: [
          {
            productId: "p1",
            name: "Karakılçık",
            price: 150,
            quantity: 1,
            maxStock: 10,
            imageUrl: "/img.webp",
            weight: 850,
          },
        ],
        customerInfo: {
          name: "Ali Veli",
          phone: "\u202A+90 (532) 123 - 45 - 67\u202C",
          neighborhood: "Barış",
          addressDetail: "Çiftlik Cad. No: 14",
          deliveryDate: "2026-11-14",
        },
        paymentMethod: "cash_on_delivery",
        idempotencyKey: "IDEM-123e4567-e89b-12d3-a456-426614174000",
        termsAccepted: true,
      });
      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body as string) as {
        customerInfo: { phone: string };
      };
      expect(sentBody.customerInfo.phone).toBe("05321234567");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("sanitizeAuthRedirectPath", () => {
  it("güvenli iç yolları korur ve auth/redirect sorgu parametrelerini temizler", () => {
    expect(sanitizeAuthRedirectPath("/hesabim/adresler")).toBe("/hesabim/adresler");
    expect(sanitizeAuthRedirectPath("/siparis-takip/SIP-2611-001?t=abc")).toBe("/siparis-takip/SIP-2611-001?t=abc");
    expect(sanitizeAuthRedirectPath("/?auth=login&redirect=%2Fhesabim")).toBe("/");
  });
  it("dış yönlendirmeleri reddeder", () => {
    expect(sanitizeAuthRedirectPath("//evil.com")).toBeNull();
    expect(sanitizeAuthRedirectPath("https://evil.com")).toBeNull();
    expect(sanitizeAuthRedirectPath("/\\evil.com")).toBeNull();
  });
});
