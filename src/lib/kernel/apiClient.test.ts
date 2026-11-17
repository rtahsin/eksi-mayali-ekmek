import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiGet, apiPost } from "./apiClient";

describe("kernel apiClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("varsayılan no-store + same-origin ile GET isteği atar ve JSON döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, count: 4 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const data = await apiGet<{ ok: boolean; count: number }>("/api/test");
    expect(data).toEqual({ ok: true, count: 4 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      })
    );
  });

  it("düz hata zarfı ve Retry-After başlığını ApiClientError içine ayrıştırır", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Çok fazla istek",
          code: "RATE_LIMITED",
          details: { phone: ["Geçersiz telefon"] },
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "45" },
        }
      )
    ) as unknown as typeof fetch;

    await expect(apiPost("/api/test", { a: 1 })).rejects.toMatchObject({
      name: "ApiClientError",
      status: 429,
      code: "RATE_LIMITED",
      message: "Çok fazla istek",
      details: { phone: ["Geçersiz telefon"] },
      retryAfterSeconds: 45,
    });
  });

  it("JSON olmayan hata gövdesinde HTTP durum koduyla temiz ApiClientError üretir", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Bad Gateway", { status: 502 })
    ) as unknown as typeof fetch;

    try {
      await apiGet("/api/test");
      expect.fail("Hata fırlatılmalıydı");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(502);
      expect(apiErr.code).toBe("INTERNAL_ERROR");
      expect(apiErr.message).toBe("HTTP 502");
    }
  });
});
