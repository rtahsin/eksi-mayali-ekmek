import crypto from "crypto";

/**
 * İmzalı bağlantı token'ları (sipariş takibi; Faz 3'te fiş/ekstre).
 * Anahtar: `LINK_SIGNING_SECRET`, yoksa service-role anahtarından türetilir
 * (ek ortam değişkeni gerektirmez; service-role anahtarı değişirse eski linkler geçersizleşir).
 */
function signingKey(): Buffer | null {
  const explicit = process.env.LINK_SIGNING_SECRET;
  if (explicit && explicit.length >= 32) return Buffer.from(explicit, "utf8");

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return crypto.createHmac("sha256", serviceKey).update("ekmeklab-link-signing-v1").digest();
}

function mac(purpose: string, subject: string): string | null {
  const key = signingKey();
  if (!key) return null;
  return crypto
    .createHmac("sha256", key)
    .update(`${purpose}:${subject}`)
    .digest("base64url")
    .slice(0, 32); // 192 bit — tahmin edilemez, linkte kısa
}

/** Sipariş takip token'ı (sipariş `id`'sine bağlı, süresiz). */
export function signOrderToken(orderId: string): string | null {
  return mac("order", orderId);
}

export function verifyOrderToken(orderId: string, token: string | null | undefined): boolean {
  if (!token || typeof token !== "string" || token.length !== 32) return false;
  const expected = signOrderToken(orderId);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
