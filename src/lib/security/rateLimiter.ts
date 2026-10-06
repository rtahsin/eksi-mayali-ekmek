import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Distributed sliding window rate limiter backed by Supabase PostgreSQL (rate_limit_buckets).
 * Prevents DDoS, brute-force attacks, and serverless state partitioning across instances.
 *
 * @param key Unique key to identify client or resource (e.g. `order_ip_${clientIp}`)
 * @param maxRequests Maximum requests allowed within window (default 5)
 * @param windowMs Window duration in milliseconds (default 600,000 = 10 mins)
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 600000
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  if (!supabase) {
    console.error("[RateLimiter] Database admin client unavailable for rate limiting");
    throw new Error("RATE_LIMITER_UNAVAILABLE: Supabase admin client could not be initialized");
  }

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
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
}

/**
 * Sanitizes user input text to prevent XSS and injection attacks.
 */
export function sanitizeInput(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/\0/g, "") // Remove null bytes
    .replace(/<[^>]*>?/gm, "") // Strip HTML/script tags
    .replace(/[\u0000-\u001F\u007F]/g, " ") // Kontrol karakterleri boşluk olsun; kesme işareti ve noktalı virgül korunur (React çıktıyı zaten kaçırır)
    .trim()
    .slice(0, maxLength);
}

/** İstemci IP'si (Vercel: x-forwarded-for ilk değer). */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";
}
