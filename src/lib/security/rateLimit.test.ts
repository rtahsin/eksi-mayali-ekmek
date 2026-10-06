import { describe, it, expect } from "vitest";
import { rateLimit, type RateLimitStore } from "./rateLimiter";

describe("rateLimit factory & store behavior", () => {
  it("61. çağrı reddedilir (limit: 60)", async () => {
    let callCount = 0;
    const memoryStore: RateLimitStore = {
      async hit(_key, limit) {
        callCount++;
        if (callCount > limit) {
          return { allowed: false, remaining: 0, retryAfterSeconds: 60 };
        }
        return { allowed: true, remaining: limit - callCount, retryAfterSeconds: 0 };
      },
    };

    const limiter = rateLimit(memoryStore, { failMode: "closed" });

    for (let i = 1; i <= 60; i++) {
      const res = await limiter("test_key", 60, 60000);
      expect(res.allowed).toBe(true);
    }

    // 61. çağrı
    const res61 = await limiter("test_key", 60, 60000);
    expect(res61.allowed).toBe(false);
  });

  it("depo hata atınca open geçirir, closed reddeder", async () => {
    const errorStore: RateLimitStore = {
      async hit() {
        throw new Error("DB_CONNECTION_FAILURE");
      },
    };

    const openLimiter = rateLimit(errorStore, { failMode: "open" });
    const openRes = await openLimiter("any_key", 60, 60000);
    expect(openRes.allowed).toBe(true);

    const closedLimiter = rateLimit(errorStore, { failMode: "closed" });
    const closedRes = await closedLimiter("any_key", 60, 60000);
    expect(closedRes.allowed).toBe(false);
  });
});
