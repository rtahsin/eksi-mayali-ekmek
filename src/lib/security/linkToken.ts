import crypto from "crypto";

/**
 * İmzalı bağlantı token'ları (sipariş takibi, fiş/ekstre).
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

function normalizeVersion(version: number): number | null {
  return Number.isInteger(version) && version >= 1 ? version : null;
}

const VERSIONED_TOKEN_RE = /^v(\d+)\.([A-Za-z0-9_-]{32})$/;

function signVersioned(purpose: "account" | "slip", subject: string, version: number = 1): string | null {
  const v = normalizeVersion(version);
  if (!v) return null;
  if (v === 1) return mac(purpose, subject);
  const sig = mac(purpose, `${subject}:v${v}`);
  return sig ? `v${v}.${sig}` : null;
}

function verifyVersioned(
  purpose: "account" | "slip",
  subject: string,
  token: string | null | undefined,
  expectedVersion: number = 1
): boolean {
  const v = normalizeVersion(expectedVersion);
  if (!v || !token || typeof token !== "string") return false;

  const match = VERSIONED_TOKEN_RE.exec(token);
  if (match) {
    const tokenVersion = Number(match[1]);
    if (!Number.isSafeInteger(tokenVersion) || tokenVersion !== v) return false;
    return safeEqual(mac(purpose, `${subject}:v${tokenVersion}`), match[2]);
  }

  // Geriye dönük uyumluluk: token'da `v` yoksa yalnız `version === 1` iken geçerlidir
  if (v !== 1) return false;
  return safeEqual(mac(purpose, subject), token);
}

/** Sipariş takip token'ı (sipariş `id`'sine bağlı, süresiz). */
export function signOrderToken(orderId: string): string | null {
  return mac("order", orderId);
}

export function verifyOrderToken(orderId: string, token: string | null | undefined): boolean {
  if (!token || typeof token !== "string" || token.length !== 32) return false;
  return safeEqual(signOrderToken(orderId), token);
}

/** Cari ekstre linki token'ı (hesaba ve opsiyonel `share_token_version`'a bağlı). */
export function signAccountToken(accountId: string, version: number = 1): string | null {
  return signVersioned("account", accountId, version);
}

export function verifyAccountToken(
  accountId: string,
  token: string | null | undefined,
  version: number = 1
): boolean {
  return verifyVersioned("account", accountId, token, version);
}

/** Tek fiş / makbuz linki token'ı (harekete ve opsiyonel `share_token_version`'a bağlı). */
export function signSlipToken(transactionId: string, version: number = 1): string | null {
  return signVersioned("slip", transactionId, version);
}

export function verifySlipToken(
  transactionId: string,
  token: string | null | undefined,
  version: number = 1
): boolean {
  return verifyVersioned("slip", transactionId, token, version);
}

function safeEqual(expected: string | null, token: string | null | undefined): boolean {
  if (!expected || !token || typeof token !== "string") return false;
  // Bayt uzunluğu (çok baytlı karakterli token timingSafeEqual'ı fırlatmasın → 500 yerine geçersiz)
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
