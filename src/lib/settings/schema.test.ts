import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORE_SETTINGS,
  StoreSettingsSchema,
  computeShippingFee,
  parseStoredSettings,
  toPublicSettings,
  toWhatsAppNumber,
} from "./schema";

describe("parseStoredSettings", () => {
  it("boş/bozuk kayıt → varsayılanlar", () => {
    expect(parseStoredSettings(null)).toEqual(DEFAULT_STORE_SETTINGS);
    expect(parseStoredSettings("bozuk")).toEqual(DEFAULT_STORE_SETTINGS);
  });

  it("eski canlı kayıt biçimi okunur, eksik alanlar varsayılan", () => {
    const s = parseStoredSettings({
      freeShippingThreshold: 1000,
      shippingFee: 150,
      deliveryWindow: "14:00 - 18:00",
      whatsappPhone: "05010126653",
      orderAcceptanceOpen: true,
      announcementText: "",
      orderCutoffTime: "12:00",
      updatedBy: "x",
    });
    expect(s.whatsappPhone).toBe("05010126653");
    expect(s.minBasketAmount).toBe(0);
    expect(s.maxDaysAhead).toBe(7);
    expect(s.neighborhoods.length).toBeGreaterThan(5);
  });

  it("tek bozuk alan sadece kendisini varsayılana düşürür", () => {
    const s = parseStoredSettings({ shippingFee: -5, freeShippingThreshold: 800 });
    expect(s.shippingFee).toBe(DEFAULT_STORE_SETTINGS.shippingFee);
    expect(s.freeShippingThreshold).toBe(800);
  });

  it("eski ayrı cutoff anahtarı kullanılır", () => {
    expect(parseStoredSettings({}, "11:30").orderCutoffTime).toBe("11:30");
    expect(parseStoredSettings({}, { cutoff_time: "10:15" }).orderCutoffTime).toBe("10:15");
    expect(parseStoredSettings({ orderCutoffTime: "13:00" }, "11:30").orderCutoffTime).toBe("13:00");
  });

  it("mahallelerden 'Mah.' eki atılır", () => {
    expect(parseStoredSettings({ neighborhoods: ["Barış Mah.", "Sahil"] }).neighborhoods).toEqual(["Barış", "Sahil"]);
  });
});

describe("StoreSettingsSchema (admin formu)", () => {
  it("geçersiz cutoff ve boş gün listesini reddeder", () => {
    expect(StoreSettingsSchema.safeParse({ ...DEFAULT_STORE_SETTINGS, orderCutoffTime: "24:00" }).success).toBe(false);
    expect(StoreSettingsSchema.safeParse({ ...DEFAULT_STORE_SETTINGS, openWeekdays: [] }).success).toBe(false);
    expect(StoreSettingsSchema.safeParse(DEFAULT_STORE_SETTINGS).success).toBe(true);
  });
});

describe("computeShippingFee", () => {
  const s = { shippingFee: 150, freeShippingThreshold: 1000 };
  it("eşik altı ücretli, eşik ve üstü ücretsiz", () => {
    expect(computeShippingFee(999, s)).toBe(150);
    expect(computeShippingFee(1000, s)).toBe(0);
  });
  it("boş sepet 0", () => {
    expect(computeShippingFee(0, s)).toBe(0);
  });
  it("eşik 0 → her zaman ücret", () => {
    expect(computeShippingFee(5000, { shippingFee: 100, freeShippingThreshold: 0 })).toBe(100);
  });
});

describe("yardımcılar", () => {
  it("toWhatsAppNumber", () => {
    expect(toWhatsAppNumber("0501 012 66 53")).toBe("905010126653");
    expect(toWhatsAppNumber("+90 501 012 66 53")).toBe("905010126653");
    expect(toWhatsAppNumber("5010126653")).toBe("905010126653");
  });
  it("toPublicSettings iç alanları gizler", () => {
    const pub = toPublicSettings(DEFAULT_STORE_SETTINGS) as Record<string, unknown>;
    expect(pub.dailyBreadCapacity).toBeUndefined();
    expect(pub.wholesaleDailyLoaves).toBeUndefined();
  });
});
