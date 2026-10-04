import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signOrderToken, verifyOrderToken } from "./linkToken";

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
