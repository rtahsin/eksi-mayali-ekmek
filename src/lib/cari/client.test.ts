import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchCariAccountDetail,
  fetchCariAccounts,
  generateStandingOrdersClient,
  getShareUrl,
  recordLedger,
  revokeCariShareLinksClient,
} from "./client";

describe("cari/client tipli API istemcisi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchCariAccounts ve fetchCariAccountDetail URL kodlamasi ve ?include=transactions ekler", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accounts: [{ id: "cari_1", businessName: "Moda" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            account: { id: "cari/1", businessName: "Moda" },
            transactions: [{ id: "tx-1", delta: 100 }],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const accounts = await fetchCariAccounts();
    expect(accounts).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/admin/cari/accounts",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );

    const detail = await fetchCariAccountDetail("cari/1", { includeTransactions: true });
    expect(detail.account.id).toBe("cari/1");
    expect(detail.transactions).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/admin/cari/accounts/cari%2F1?include=transactions",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("recordLedger basarili ve hatali yanitlari uyumlu zarfa cevirir", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            transactionId: "tx-9",
            slipNumber: "FİŞ-2611-009",
            balanceAfter: 350,
            shareUrl: "https://ekmeklab.com/fis/tx-9?t=v2.abc",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Cari hesap arşivlenmiş" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        })
      );

    const ok = await recordLedger("cari_1", {
      kind: "tahsilat",
      amount: 100,
      paymentMethod: "nakit",
    });
    expect(ok).toEqual({
      success: true,
      transactionId: "tx-9",
      slipNumber: "FİŞ-2611-009",
      balanceAfter: 350,
      shareUrl: "https://ekmeklab.com/fis/tx-9?t=v2.abc",
    });

    const fail = await recordLedger("cari_1", {
      kind: "tahsilat",
      amount: 100,
      paymentMethod: "nakit",
    });
    expect(fail).toEqual({
      success: false,
      error: "Cari hesap arşivlenmiş",
    });
  });

  it("getShareUrl hata durumunda null doner, revoke ve standing-orders dogru endpointi cagirir", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: "https://ekmeklab.com/ekstre/c1?t=v3.sig" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Yetkisiz" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, shareTokenVersion: 4 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            deliveryDate: "2026-11-19",
            createdCount: 2,
            skippedExisting: 1,
            errors: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    expect(await getShareUrl({ accountId: "c1" })).toBe("https://ekmeklab.com/ekstre/c1?t=v3.sig");
    expect(await getShareUrl({ transactionId: "tx-bad" })).toBeNull();
    expect(await revokeCariShareLinksClient("c1")).toEqual({ shareTokenVersion: 4 });
    expect(await generateStandingOrdersClient()).toEqual({
      deliveryDate: "2026-11-19",
      createdCount: 2,
      skippedExisting: 1,
      errors: [],
    });
  });
});
