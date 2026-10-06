import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export interface RateLimiterOptions {
  failMode: "open" | "closed";
}

export type RateLimiter = (
  key: string,
  limit: number,
  windowMs: number
) => Promise<RateLimitResult>;

/**
 * Enjekte edilebilir rate limiter fabrikası.
 * failMode: 'open' durumunda depo hatasında istek geçer, 'closed' durumunda reddedilir.
 */
export function rateLimit(
  store: RateLimitStore,
  opts: RateLimiterOptions
): RateLimiter {
  return async (key: string, limit: number, windowMs: number) => {
    try {
      const res = await store.hit(key, limit, windowMs);
      return {
        allowed: res.allowed,
        remaining: res.remaining,
        retryAfterSeconds: res.retryAfterSeconds,
      };
    } catch {
      if (opts.failMode === "open") {
        return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
      }
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(windowMs / 1000) };
    }
  };
}

/**
 * Postgres (Supabase rate_limit_buckets tablosu) deposu.
 */
export const postgresRateLimitStore: RateLimitStore = {
  async hit(key: string, limit: number, windowMs: number) {
    const supabase = createAdminClient();
    if (!supabase) {
      console.error("[RateLimiter] Database admin client unavailable for rate limiting");
      throw new Error("RATE_LIMITER_UNAVAILABLE: Supabase admin client could not be initialized");
    }

    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error(`[RateLimiter] check_rate_limit RPC failed for key '${key}':`, error.message);
      throw new Error(`RATE_LIMIT_CHECK_FAILED: ${error.message}`);
    }

    const result = typeof data === "string" ? JSON.parse(data) : data;
    return {
      allowed: Boolean(result?.allowed),
      remaining: Number(result?.remaining ?? 0),
      retryAfterSeconds: Number(result?.retryAfterSeconds ?? 0),
    };
  },
};

/**
 * Geriye dönük uyumluluk için checkRateLimit fonksiyonu.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 600000
): Promise<RateLimitResult> {
  return postgresRateLimitStore.hit(key, maxRequests, windowMs);
}

/**
 * IP karması oluşturur (gizlilik ve tek biçimlilik için).
 */
export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Tek kaynak istemci IP bulucu (Vercel: x-forwarded-for ilk değer).
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
}

/**
 * İstemci IP'sini karma haline getirerek rate limit anahtarı üretir.
 */
export function ipRateLimitKey(prefix: string, req: Request): string {
  const ip = getClientIp(req);
  return `${prefix}_${hashIp(ip)}`;
}

/**
 * XSS ve enjeksiyon engellemek için girdi temizleme.
 */
export function sanitizeInput(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/\0/g, "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}
