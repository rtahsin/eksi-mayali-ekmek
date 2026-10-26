import { describe, it, expect } from "vitest";
import { BakeLogInputSchema, bakeClock, fitWithin, isPhotoType, mergeItems, photoPath, rowToBakeLog, totalLoaves } from "./log";

const url = (p: string) => `https://cdn.test/${p}`;

describe("fırından çıktı kaydı", () => {
  it("formu doğrular; boş not null olur", () => {
    const ok = BakeLogInputSchema.parse({ items: [{ productId: "p1", name: "Karakılçık", quantity: 12 }], note: "  " });
    expect(ok.note).toBeNull();
    expect(BakeLogInputSchema.safeParse({ items: [{ productId: "p1", name: "X", quantity: 0 }] }).success).toBe(false);
    expect(BakeLogInputSchema.safeParse({ items: [], note: "x".repeat(141) }).success).toBe(false);
  });

  it("aynı ürünü birleştirir, sıfır adetleri atar", () => {
    expect(
      mergeItems([
        { productId: "a", name: "A", quantity: 4 },
        { productId: "b", name: "B", quantity: 0 },
        { productId: "a", name: "A", quantity: 6 },
      ]),
    ).toEqual([{ productId: "a", name: "A", quantity: 10 }]);
  });

  it("fotoğraf yolu 027 kısıtıyla aynı biçimde", () => {
    const p = photoPath("2026-10-27", "0b6f3c1e-1d2a-4c3b-9e8f-112233445566", "image/webp");
    expect(p).toBe("firin/2026-10-27/0b6f3c1e-1d2a-4c3b-9e8f-112233445566.webp");
    expect(p).toMatch(/^firin\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/[a-f0-9-]{36}\.(webp|jpg)$/);
    expect(isPhotoType("image/jpeg")).toBe(true);
    expect(isPhotoType("image/heic")).toBe(false);
  });

  it("uzun kenarı sınırlar, küçüğü büyütmez", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("satırı eşler, bozuk ürün satırını atlar", () => {
    const log = rowToBakeLog(
      {
        id: "1",
        baked_at: "2026-10-27T07:40:00Z",
        day: "2026-10-27",
        items: [{ productId: "a", name: "A", quantity: 5 }, { bozuk: true }],
        photo_path: "firin/2026-10-27/x.webp",
        note: null,
        hidden: false,
      },
      url,
    );
    expect(log.items).toHaveLength(1);
    expect(log.photoUrl).toBe("https://cdn.test/firin/2026-10-27/x.webp");
    expect(totalLoaves(log)).toBe(5);
    expect(bakeClock(log.bakedAt)).toBe("10:40");
  });
});
