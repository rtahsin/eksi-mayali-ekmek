import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDeliveryDates } from "./clientAvailability";

afterEach(() => vi.unstubAllGlobals());

describe("teslim günü yanıtı", () => {
  it("isteği doğru sepet ve iptal sinyaliyle gönderir", async () => {
    const dates = [{ date: "2026-11-20", label: "Cum 20 Kas", available: true, reason: null, remainingCapacity: 5 }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dates }) });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const items = [{ productId: "bread", quantity: 2 }];
    expect(await fetchDeliveryDates(items, controller.signal)).toEqual(dates);
    expect(fetchMock).toHaveBeenCalledWith("/api/availability", expect.objectContaining({ signal: controller.signal, body: JSON.stringify({ items }) }));
  });

  it("bozuk yanıtı veya sunucu hatasını uygun gün gibi göstermez", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dates: [{ date: "yarın", available: "yes" }] }) }));
    await expect(fetchDeliveryDates([])).rejects.toThrow();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchDeliveryDates([])).rejects.toThrow("HTTP 503");
  });
});
