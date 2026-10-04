import { describe, expect, it } from "vitest";
import {
  type AvailabilityProduct,
  type AvailabilityUsage,
  evaluateCartDates,
  evaluateDate,
  expandBundles,
  reservationKey,
} from "./availability";

const today = "2026-10-05"; // Pazartesi

const product = (over: Partial<AvailabilityProduct> & { id: string }): AvailabilityProduct => ({
  name: over.id,
  isActive: true,
  isAvailable: true,
  availability: "daily",
  saleDates: new Map(),
  dailyLimit: null,
  leadTimeDays: 0,
  capacityUnits: 1,
  ...over,
});

const emptyUsage = (): AvailabilityUsage => ({
  reserved: new Map(),
  capacityUsed: new Map(),
  capacityOverride: new Map(),
  defaultCapacity: null,
});

const catalog = new Map<string, AvailabilityProduct>([
  ["koy", product({ id: "koy", name: "Köy Ekmeği" })],
  ["tereyag", product({ id: "tereyag", name: "Tereyağı", capacityUnits: 0 })],
  [
    "ozel",
    product({
      id: "ozel",
      name: "Cevizli Özel",
      availability: "dates",
      saleDates: new Map([
        ["2026-10-10", 5],
        ["2026-10-07", null],
      ]),
    }),
  ],
  ["lead", product({ id: "lead", name: "Pasta", leadTimeDays: 2 })],
  ["limitli", product({ id: "limitli", name: "Siyez", dailyLimit: 3 })],
  ["tukendi", product({ id: "tukendi", name: "Yoğurt", isAvailable: false })],
  ["paket", product({ id: "paket", name: "Kahvaltı Paketi", capacityUnits: 2 })],
]);

describe("evaluateDate", () => {
  it("boş sepet her gün uygun", () => {
    expect(evaluateDate(today, catalog, [], emptyUsage(), today).available).toBe(true);
  });

  it("sadece eşlikçi siparişi uygun ve kapasite tüketmez", () => {
    const usage = { ...emptyUsage(), defaultCapacity: 0 };
    expect(evaluateDate(today, catalog, [{ productId: "tereyag", quantity: 3 }], usage, today).available).toBe(true);
  });

  it("tükendi / bilinmeyen ürün → uygun değil", () => {
    expect(evaluateDate(today, catalog, [{ productId: "tukendi", quantity: 1 }], emptyUsage(), today).reason).toContain(
      "satışta değil"
    );
    expect(evaluateDate(today, catalog, [{ productId: "yok", quantity: 1 }], emptyUsage(), today).available).toBe(false);
  });

  it("satış günü ürünü yalnız o günlerde", () => {
    const r = evaluateDate("2026-10-08", catalog, [{ productId: "ozel", quantity: 1 }], emptyUsage(), today);
    expect(r.available).toBe(false);
    expect(r.reason).toContain("Çar 7 Eki");
    expect(evaluateDate("2026-10-07", catalog, [{ productId: "ozel", quantity: 1 }], emptyUsage(), today).available).toBe(true);
  });

  it("satış gününe özel limit, alınmış adetleri düşer", () => {
    const usage = emptyUsage();
    usage.reserved.set(reservationKey("ozel", "2026-10-10"), 4);
    expect(evaluateDate("2026-10-10", catalog, [{ productId: "ozel", quantity: 1 }], usage, today).available).toBe(true);
    const r = evaluateDate("2026-10-10", catalog, [{ productId: "ozel", quantity: 2 }], usage, today);
    expect(r.available).toBe(false);
    expect(r.reason).toContain("en fazla 1");
  });

  it("günlük ürün limiti; aynı ürün iki satırda toplanır", () => {
    const usage = emptyUsage();
    usage.reserved.set(reservationKey("limitli", today), 3);
    expect(evaluateDate(today, catalog, [{ productId: "limitli", quantity: 1 }], usage, today).reason).toContain("tükendi");
    expect(
      evaluateDate(
        today,
        catalog,
        [
          { productId: "limitli", quantity: 2 },
          { productId: "limitli", quantity: 2 },
        ],
        emptyUsage(),
        today
      ).available
    ).toBe(false);
  });

  it("hazırlık süresi", () => {
    expect(evaluateDate("2026-10-06", catalog, [{ productId: "lead", quantity: 1 }], emptyUsage(), today).available).toBe(false);
    expect(evaluateDate("2026-10-07", catalog, [{ productId: "lead", quantity: 1 }], emptyUsage(), today).available).toBe(true);
  });

  it("günlük kapasite: varsayılan ve güne özel değer", () => {
    const usage = { ...emptyUsage(), defaultCapacity: 10 };
    usage.capacityUsed.set(today, 9);
    expect(evaluateDate(today, catalog, [{ productId: "koy", quantity: 1 }], usage, today)).toMatchObject({
      available: true,
      remainingCapacity: 1,
    });
    expect(evaluateDate(today, catalog, [{ productId: "paket", quantity: 1 }], usage, today).available).toBe(false);

    usage.capacityOverride.set(today, 20);
    expect(evaluateDate(today, catalog, [{ productId: "paket", quantity: 5 }], usage, today).available).toBe(true);
  });

  it("kapasite yoksa sınırsız", () => {
    expect(evaluateDate(today, catalog, [{ productId: "koy", quantity: 500 }], emptyUsage(), today)).toMatchObject({
      available: true,
      remainingCapacity: null,
    });
  });
});

describe("evaluateCartDates", () => {
  it("sepetin tarihleri ürünlerin kesişimidir", () => {
    const base = ["2026-10-05", "2026-10-06", "2026-10-07"].map((date) => ({ date, label: date }));
    const res = evaluateCartDates(
      base,
      catalog,
      [
        { productId: "ozel", quantity: 1 },
        { productId: "lead", quantity: 1 },
      ],
      emptyUsage(),
      today
    );
    expect(res.filter((r) => r.available).map((r) => r.date)).toEqual(["2026-10-07"]);
  });
});

describe("expandBundles", () => {
  it("paket içindekilere açılır, normal ürün kendisi kalır", () => {
    const totals = expandBundles([
      { productId: "paket", quantity: 2, components: [{ productId: "koy", quantity: 1 }, { productId: "tereyag", quantity: 1 }] },
      { productId: "koy", quantity: 3 },
    ]);
    expect(totals.get("koy")).toBe(5);
    expect(totals.get("tereyag")).toBe(2);
    expect(totals.has("paket")).toBe(false);
  });
});
