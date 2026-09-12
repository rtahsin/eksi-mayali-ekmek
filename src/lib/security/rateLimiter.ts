/**
 * In-memory sliding window rate limiter for public API endpoints.
 * Automatically evicts stale buckets every 5 minutes.
 */

interface RateBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateBucket>();

// Periodic cleanup of stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      // Filter out timestamps older than 30 minutes
      bucket.timestamps = bucket.timestamps.filter((t) => now - t < 1800000);
      if (bucket.timestamps.length === 0) {
        buckets.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks if an identifier (IP address, phone number, etc.) is within rate limits.
 *
 * @param key Unique key to identify the client (e.g., `ip_1.2.3.4` or `phone_0532...`)
 * @param maxRequests Maximum requests allowed within the window
 * @param windowMs Window duration in milliseconds (e.g., 600000 for 10 minutes)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowMs: number = 600000
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Remove timestamps outside the active window
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  // Add current timestamp
  bucket.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - bucket.timestamps.length,
    retryAfterSeconds: 0,
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
    .replace(/[<>'"`;]/g, "") // Strip dangerous injection characters
    .trim()
    .slice(0, maxLength);
}
