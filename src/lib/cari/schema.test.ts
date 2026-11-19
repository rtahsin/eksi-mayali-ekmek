import { describe, expect, it } from "vitest";
import {
  CreateCariAccountSchema,
  HotSaleRequestSchema,
  PatchCariAccountSchema,
  RecordCariTransactionSchema,
} from "./schema";

describe("cari/schema Zod doğrulamaları", () => {
  it("RecordCariTransactionSchema devir icin 0 tutari reddeder", () => {
    const res = RecordCariTransactionSchema.safeParse({
      kind: "devir",
      accountId: "cari-1",
      amount: 0,
      description: "Açılış düzeltmesi",
    });
    expect(res.success).toBe(false);
  });

  it("RecordCariTransactionSchema set_balance ve storno bicimlerini kurusa yuvarlayarak kabul eder", () => {
    const setBal = RecordCariTransactionSchema.safeParse({
      kind: "set_balance",
      accountId: "cari-1",
      targetBalance: 125.456,
      description: "Mutabakat sonucu sabitleme",
    });
    expect(setBal.success).toBe(true);
    if (setBal.success && setBal.data.kind === "set_balance") {
      expect(setBal.data.targetBalance).toBe(125.46);
    }

    const stornoOk = RecordCariTransactionSchema.safeParse({
      kind: "storno",
      accountId: "cari-1",
      reversesId: "11111111-1111-4111-8111-111111111111",
    });
    expect(stornoOk.success).toBe(true);

    const stornoBadUuid = RecordCariTransactionSchema.safeParse({
      kind: "storno",
      accountId: "cari-1",
      reversesId: "not-a-uuid",
    });
    expect(stornoBadUuid.success).toBe(false);
  });

  it("HotSaleRequestSchema katalog ve ozel serbest kalemleri birlikte dogrular", () => {
    const res = HotSaleRequestSchema.safeParse({
      accountId: "cari_b2b_1",
      items: [
        { productId: "prod_1", quantity: 2 },
        { customName: "Galeta Tepsi", unitPrice: 50, quantity: 1 },
      ],
      paymentMethod: "kredi_karti",
      collectedAmount: 100,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.returnItems).toEqual([]);
      expect(res.data.allowOverLimit).toBe(false);
    }
  });

  it("CreateCariAccountSchema zorunlu businessName ve opsiyonel acilis bakiyesini dogrular", () => {
    const missingName = CreateCariAccountSchema.safeParse({
      phone: "05321112233",
    });
    expect(missingName.success).toBe(false);

    const valid = CreateCariAccountSchema.safeParse({
      businessName: "Bistro Moda",
      creditLimit: "2500",
      openingBalance: "500",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.accountType).toBe("musteri");
    }
  });

  it("CreateCariAccountSchema yeni hesapta accountType gider degerini reddeder, PatchCariAccountSchema mevcut gider carisini korur", () => {
    const giderCreate = CreateCariAccountSchema.safeParse({
      businessName: "Eski Gider Denemesi",
      accountType: "gider",
    });
    expect(giderCreate.success).toBe(false);

    const musteriCreate = CreateCariAccountSchema.safeParse({
      businessName: "Beylikdüzü Şarküteri",
      accountType: "musteri",
    });
    expect(musteriCreate.success).toBe(true);

    const giderPatch = PatchCariAccountSchema.safeParse({
      businessName: "Legacy Gider Carisi",
      accountType: "gider",
    });
    expect(giderPatch.success).toBe(true);
  });
});
