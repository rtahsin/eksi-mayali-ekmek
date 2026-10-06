import { describe, it, expect } from "vitest";
import { config } from "./proxy";

describe("Proxy Route Matcher", () => {
  it("config.matcher tam olarak 4 korumalı desen içerir", () => {
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher).toHaveLength(4);
    expect(config.matcher).toEqual([
      "/admin/:path*",
      "/kurye/:path*",
      "/hesabim/:path*",
      "/api/admin/:path*",
    ]);
  });
});
