import { describe, it, expect, afterEach } from "vitest";
import { appEnv } from "./env";

describe("appEnv() detection", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalVercelEnv = env.VERCEL_ENV;
  const originalNodeEnv = env.NODE_ENV;

  afterEach(() => {
    env.VERCEL_ENV = originalVercelEnv;
    env.NODE_ENV = originalNodeEnv;
  });

  it("VERCEL_ENV=production iken 'production' döner", () => {
    env.VERCEL_ENV = "production";
    expect(appEnv()).toBe("production");
  });

  it("VERCEL_ENV=preview iken 'preview' döner", () => {
    env.VERCEL_ENV = "preview";
    expect(appEnv()).toBe("preview");
  });

  it("VERCEL_ENV=development iken 'development' döner", () => {
    env.VERCEL_ENV = "development";
    expect(appEnv()).toBe("development");
  });

  it("VERCEL_ENV tanımsız ve NODE_ENV=production iken 'production' döner", () => {
    delete env.VERCEL_ENV;
    env.NODE_ENV = "production";
    expect(appEnv()).toBe("production");
  });

  it("VERCEL_ENV tanımsız ve NODE_ENV test iken 'development' döner", () => {
    delete env.VERCEL_ENV;
    env.NODE_ENV = "test";
    expect(appEnv()).toBe("development");
  });
});
