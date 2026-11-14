import { describe, expect, it } from "vitest";
import { findHealthTerms, hasBenefitVerb } from "@/lib/knowledge/lint";
import { buildCartWhatsappMessage, buildCartWhatsappUrl } from "./whatsappCart";

describe("whatsappCart", () => {
  it("form boşken sepet kalemlerini, ücretsiz teslimatı ve adres istemini birleştirir", () => {
    const msg = buildCartWhatsappMessage({
      items: [
        { name: "Klasik Köy Ekmeği", quantity: 2, price: 150 },
        { name: "Ev Yoğurdu", quantity: 1, price: 220 },
      ],
    });

    expect(msg).toContain("• 2× Klasik Köy Ekmeği — 300 ₺");
    expect(msg).toContain("• 1× Ev Yoğurdu — 220 ₺");
    expect(msg).toContain("Toplam: 520 ₺ (Teslimat Ücretsiz)");
    expect(msg.endsWith("Mahalle / adres bilgimi buradan iletiyorum:")).toBe(true);
    expect(findHealthTerms(msg)).toEqual([]);
    expect(hasBenefitVerb(msg)).toBe(false);
  });

  it("dolu form alanlarını ekler ve açık adres varken adres istemi satırını eklemez", () => {
    const msg = buildCartWhatsappMessage({
      items: [{ name: "Klasik Köy Ekmeği", quantity: 2, price: 150 }],
      deliveryDateLabel: "Yarın",
      paymentMethod: "pos_at_door",
      customerInfo: {
        name: "Ayşe Yılmaz",
        neighborhood: "Barış Mah.",
        addressDetail: "Çiftlik Cad. No: 14 D: 6",
        deliveryDate: "2026-11-15",
        note: "Zili çalmayınız",
      },
    });

    expect(msg).toContain("• 2× Klasik Köy Ekmeği — 300 ₺");
    expect(msg).toContain("Toplam: 300 ₺ (Teslimat Ücretsiz)");
    expect(msg).toContain("Teslim günü: Yarın (15 Kasım Pazar)");
    expect(msg).toContain("Ödeme tercihi: Kapıda kart");
    expect(msg).toContain("Ad Soyad: Ayşe Yılmaz");
    expect(msg).toContain("Mahalle: Barış Mah. / Beylikdüzü");
    expect(msg).toContain("Adres: Çiftlik Cad. No: 14 D: 6");
    expect(msg).toContain("Not: Zili çalmayınız");
    expect(msg).not.toContain("Mahalle / adres bilgimi buradan iletiyorum:");
  });

  it("yalnızca mahalle seçilip açık adres boş bırakıldığında adres istemini korur", () => {
    const msg = buildCartWhatsappMessage({
      items: [{ name: "Cevizli Siyez", quantity: 1, price: 200 }],
      customerInfo: {
        neighborhood: "Adnan Kahveci",
        addressDetail: "   ",
      },
    });

    expect(msg).toContain("Mahalle: Adnan Kahveci Mah. / Beylikdüzü");
    expect(msg.endsWith("Mahalle / adres bilgimi buradan iletiyorum:")).toBe(true);
  });

  it("wa.me bağlantısını whatsappLink üzerinden encode ederek üretir", () => {
    const url = buildCartWhatsappUrl({
      items: [{ name: "Klasik Köy Ekmeği", quantity: 2, price: 150 }],
      whatsappPhone: "0501 012 66 53",
    });

    expect(url.startsWith("https://wa.me/905010126653?text=")).toBe(true);
    const decoded = decodeURIComponent(url.split("?text=")[1] ?? "");
    expect(decoded).toContain("• 2× Klasik Köy Ekmeği — 300 ₺");
    expect(decoded).toContain("Toplam: 300 ₺ (Teslimat Ücretsiz)");
  });
});
