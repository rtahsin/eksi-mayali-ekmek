import { describe, expect, it } from "vitest";
import {
  FinancePostSchema,
  SuppliersPostSchema,
  parseFinanceDateRange,
} from "./schema";

describe("finance zod şemaları ve tarih aralığı doğrulaması", () => {
  it("parseFinanceDateRange varsayılan ay başı-bugün üretir ve ters aralığı reddeder", () => {
    expect(parseFinanceDateRange(undefined, undefined, "2026-11-17")).toEqual({
      ok: true,
      from: "2026-11-01",
      to: "2026-11-17",
    });

    expect(parseFinanceDateRange("2026-11-20", "2026-11-10", "2026-11-17")).toEqual({
      ok: false,
      error: "Geçersiz tarih aralığı",
      code: "INVALID_DATE_RANGE",
    });

    expect(parseFinanceDateRange("17-11-2026", "2026-11-17", "2026-11-17")).toEqual({
      ok: false,
      error: "Geçersiz tarih aralığı",
      code: "INVALID_DATE_RANGE",
    });
  });

  it("FinancePostSchema tutarı kuruşa yuvarlar ve geçersiz storno UUID'sini reddeder", () => {
    const valid = FinancePostSchema.safeParse({
      action: "create_record",
      type: "gider",
      category: "enerji_firin",
      amount: "123.456",
      description: "Elektrik faturası",
    });
    expect(valid.success).toBe(true);
    if (valid.success && valid.data.action === "create_record") {
      expect(valid.data.amount).toBe(123.46);
      expect(valid.data.paymentMethod).toBe("nakit");
    }

    const badStorno = FinancePostSchema.safeParse({
      action: "storno_record",
      recordId: "not-a-uuid",
      reason: "Hatalı kayıt",
    });
    expect(badStorno.success).toBe(false);
  });

  it("SuppliersPostSchema tedarikçi açılış/hareket/storno girişlerini doğrular", () => {
    const upsert = SuppliersPostSchema.safeParse({
      action: "upsert_supplier",
      name: "Anadolu Taş Değirmen",
    });
    expect(upsert.success).toBe(true);
    if (upsert.success && upsert.data.action === "upsert_supplier") {
      expect(upsert.data.category).toBe("Un & Tahıl");
    }

    const zeroTx = SuppliersPostSchema.safeParse({
      action: "record_transaction",
      supplierId: "sup-1",
      type: "alis",
      amount: 0,
    });
    expect(zeroTx.success).toBe(false);
  });
});
