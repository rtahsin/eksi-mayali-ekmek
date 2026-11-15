import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  signAccountToken,
  signOrderToken,
  signSlipToken,
  verifyAccountToken,
  verifyOrderToken,
  verifySlipToken,
} from "./linkToken";

describe("sipariş takip token'ı", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.LINK_SIGNING_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-xxxxxxxxxxxxxxxx";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("imzalanan token doğrulanır, başka siparişte geçersiz", () => {
    const token = signOrderToken("ORD-ABCD1234");
    expect(token).toHaveLength(32);
    expect(verifyOrderToken("ORD-ABCD1234", token)).toBe(true);
    expect(verifyOrderToken("ORD-ABCD1235", token)).toBe(false);
  });

  it("bozuk/eksik token reddedilir", () => {
    expect(verifyOrderToken("ORD-ABCD1234", null)).toBe(false);
    expect(verifyOrderToken("ORD-ABCD1234", "x".repeat(32))).toBe(false);
    expect(verifyOrderToken("ORD-ABCD1234", "kisa")).toBe(false);
  });

  it("anahtar değişince eski token geçersiz", () => {
    const token = signOrderToken("ORD-ABCD1234");
    process.env.LINK_SIGNING_SECRET = "a".repeat(40);
    expect(verifyOrderToken("ORD-ABCD1234", token)).toBe(false);
  });

  it("anahtar yoksa token üretilmez", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(signOrderToken("ORD-ABCD1234")).toBeNull();
  });
});

describe("ekstre / fiş token'ları ve share_token_version (v)", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.LINK_SIGNING_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-xxxxxxxxxxxxxxxx";
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("amaçlar birbirine karışmaz", () => {
    const acc = signAccountToken("cari_1");
    const slip = signSlipToken("cari_1");
    expect(acc).not.toBe(slip);
    expect(verifyAccountToken("cari_1", acc)).toBe(true);
    expect(verifySlipToken("cari_1", acc)).toBe(false);
    expect(verifyAccountToken("cari_2", acc)).toBe(false);
  });

  it("çok baytlı karakterli token hata fırlatmaz, geçersiz sayılır", () => {
    expect(verifySlipToken("tx_1", "é".repeat(32))).toBe(false);
    expect(verifyAccountToken("cari_1", "ş".repeat(32))).toBe(false);
  });

  it("v olmadan üretilen eski tokenlar yalnız version=1 iken geçerlidir (geriye dönük uyumluluk)", () => {
    const legacyAccount = signAccountToken("cari_legacy");
    const legacySlip = signSlipToken("tx_legacy");

    expect(legacyAccount).toHaveLength(32);
    expect(legacySlip).toHaveLength(32);

    expect(verifyAccountToken("cari_legacy", legacyAccount)).toBe(true);
    expect(verifyAccountToken("cari_legacy", legacyAccount, 1)).toBe(true);
    expect(verifyAccountToken("cari_legacy", legacyAccount, 2)).toBe(false);

    expect(verifySlipToken("tx_legacy", legacySlip)).toBe(true);
    expect(verifySlipToken("tx_legacy", legacySlip, 1)).toBe(true);
    expect(verifySlipToken("tx_legacy", legacySlip, 2)).toBe(false);
  });

  it("v>=2 ile üretilen tokenlar tam sürüm eşleşmesi ister ve sürüm artınca iptal olur", () => {
    const v2Account = signAccountToken("cari_1", 2);
    const v2Slip = signSlipToken("tx_1", 2);

    expect(v2Account?.startsWith("v2.")).toBe(true);
    expect(v2Slip?.startsWith("v2.")).toBe(true);

    expect(verifyAccountToken("cari_1", v2Account, 2)).toBe(true);
    expect(verifyAccountToken("cari_1", v2Account, 1)).toBe(false);
    expect(verifyAccountToken("cari_1", v2Account, 3)).toBe(false);
    expect(verifyAccountToken("cari_1", v2Account)).toBe(false);

    expect(verifySlipToken("tx_1", v2Slip, 2)).toBe(true);
    expect(verifySlipToken("tx_1", v2Slip, 1)).toBe(false);
    expect(verifySlipToken("tx_1", v2Slip, 3)).toBe(false);
    expect(verifySlipToken("tx_1", v2Account, 2)).toBe(false);
  });

  it("geçersiz sürüm numaraları reddedilir", () => {
    expect(signAccountToken("cari_1", 0)).toBeNull();
    expect(signAccountToken("cari_1", -1)).toBeNull();
    expect(verifyAccountToken("cari_1", signAccountToken("cari_1", 2), 0)).toBe(false);
  });
});
