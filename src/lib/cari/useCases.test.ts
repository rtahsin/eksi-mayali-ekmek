import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAccountToken, verifySlipToken } from "@/lib/security/linkToken";
import type { CariAccount, CariTransaction } from "@/types/admin";
import type {
  CariAuditEntry,
  CariAuditLogger,
  CariRepository,
  HotSaleAccountRecord,
  RecordCariTransactionRpcResult,
} from "./repo";
import {
  buildCariShareUrl,
  CariServiceError,
  getCariAccountDetail,
  recordCariLedgerTransaction,
  revokeCariShareLinks,
  updateCariAccount,
  type CariActor,
} from "./useCases";

vi.mock("server-only", () => ({}));

interface FakeAccount {
  id: string;
  name: string;
  balance: number;
  shareTokenVersion: number;
  archivedAt: string | null;
}

function makeFakeRepo(initialAccount?: Partial<FakeAccount>) {
  const accounts = new Map<string, FakeAccount>();
  const txToAccount = new Map<string, string>();
  const transactionsByAccount = new Map<string, CariTransaction[]>();
  const auditLogs: CariAuditEntry[] = [];

  const baseAcc: FakeAccount = {
    id: initialAccount?.id ?? "cari_test_1",
    name: initialAccount?.name ?? "Bistro Moda",
    balance: initialAccount?.balance ?? 500,
    shareTokenVersion: initialAccount?.shareTokenVersion ?? 1,
    archivedAt: initialAccount?.archivedAt ?? null,
  };
  accounts.set(baseAcc.id, baseAcc);
  txToAccount.set("11111111-1111-4111-8111-111111111111", baseAcc.id);
  transactionsByAccount.set(baseAcc.id, [
    {
      id: "11111111-1111-4111-8111-111111111111",
      cariId: baseAcc.id,
      date: "2026-11-15",
      type: "satis",
      amount: 500,
      delta: 500,
      description: "İlk teslimat",
      balanceAfter: 500,
    },
  ]);

  const toFullAccount = (a: FakeAccount): CariAccount => ({
    id: a.id,
    businessName: a.name,
    contactPerson: "",
    phone: "05320000000",
    address: "Atatürk Blv.",
    district: "Beylikdüzü",
    neighborhood: "Cumhuriyet",
    creditLimit: 5000,
    shareTokenVersion: a.shareTokenVersion,
    balance: a.balance,
    accountType: "musteri",
    archivedAt: a.archivedAt,
    createdAt: "2026-11-01T08:00:00Z",
  });

  const repo: CariRepository = {
    listAccounts: async () => Array.from(accounts.values()).map(toFullAccount),
    getAccountById: async (id) => {
      const a = accounts.get(id);
      return a ? toFullAccount(a) : null;
    },
    getAccountBalanceSummary: async (id) => {
      const a = accounts.get(id);
      return a ? { id: a.id, name: a.name, balance: a.balance } : null;
    },
    getAccountTokenState: async (id) => {
      const a = accounts.get(id);
      return a ? { id: a.id, name: a.name, shareTokenVersion: a.shareTokenVersion } : null;
    },
    getTransactionAccountTokenVersion: async (txId) => {
      const accId = txToAccount.get(txId);
      if (!accId) return null;
      return accounts.get(accId)?.shareTokenVersion ?? 1;
    },
    listAccountTransactions: async (accountId) => transactionsByAccount.get(accountId) ?? [],
    insertAccount: async () => {},
    deleteAccountRowById: async () => {},
    updateAccount: async (id, patch, opts) => {
      const a = accounts.get(id);
      if (!a) return false;
      if (opts?.requireZeroBalance && a.balance !== 0) return false;
      if (typeof patch.archived_at === "string" || patch.archived_at === null) {
        a.archivedAt = patch.archived_at as string | null;
      }
      return true;
    },
    compareAndSwapTokenVersion: async (id, expected, next) => {
      const a = accounts.get(id);
      if (!a) return null;
      if (expected !== null && a.shareTokenVersion !== expected) return null;
      a.shareTokenVersion = next;
      return next;
    },
    recordTransactionAtomic: async (params): Promise<RecordCariTransactionRpcResult> => {
      const txId = "22222222-2222-4222-8222-222222222222";
      const a = accounts.get(params.p_account_id)!;
      const delta = params.p_type === "tahsilat" ? -params.p_amount : params.p_amount;
      a.balance += delta;
      txToAccount.set(txId, a.id);
      return {
        transaction_id: txId,
        slip_number: "FİŞ-2611-099",
        delta,
        balance_after: a.balance,
      };
    },
    deleteCariAccountAtomic: async () => {},
    getHotSaleAccount: async (): Promise<HotSaleAccountRecord | null> => null,
    getHotSaleProducts: async () => [],
    recordHotSaleAtomic: async () => null,
    getLastNonCancelledOrders: async () => [],
    getRecentSalesAndStornos: async () => ({ sales: [], reversedIds: new Set() }),
  };

  const audit: CariAuditLogger = async (entry) => {
    auditLogs.push(entry);
  };

  return { repo, audit, auditLogs };
}

const ADMIN_ACTOR: CariActor = { userId: "admin-1", role: "admin", isAdmin: true };

describe("cari/useCases sunucu katmanı", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret-key-for-hmac";
  });

  it("revokeCariShareLinks (v1 -> v2) sonrası recordCariLedgerTransaction v2 token uretir", async () => {
    const { repo, audit, auditLogs } = makeFakeRepo({ shareTokenVersion: 1 });

    const revoked = await revokeCariShareLinks({
      repo,
      audit,
      actor: ADMIN_ACTOR,
      id: "cari_test_1",
    });
    expect(revoked.shareTokenVersion).toBe(2);
    expect(auditLogs).toHaveLength(1);

    const txRes = await recordCariLedgerTransaction({
      repo,
      actor: ADMIN_ACTOR,
      input: {
        kind: "tahsilat",
        accountId: "cari_test_1",
        amount: 200,
        paymentMethod: "nakit",
      },
    });

    expect(txRes.shareUrl).toBeTruthy();
    const url = new URL(txRes.shareUrl!);
    const token = url.searchParams.get("t");
    expect(token?.startsWith("v2.")).toBe(true);
    expect(verifySlipToken(txRes.transactionId!, token, 2)).toBe(true);
    expect(verifySlipToken(txRes.transactionId!, token, 1)).toBe(false);
  });

  it("buildCariShareUrl hem accountId hem transactionId icin guncel share_token_version kullanir", async () => {
    const { repo } = makeFakeRepo({ shareTokenVersion: 3 });

    const accShare = await buildCariShareUrl({
      repo,
      accountId: "cari_test_1",
      transactionId: null,
      orderId: null,
    });
    const accToken = new URL(accShare.url).searchParams.get("t");
    expect(accToken?.startsWith("v3.")).toBe(true);
    expect(verifyAccountToken("cari_test_1", accToken, 3)).toBe(true);
    expect(verifyAccountToken("cari_test_1", accToken, 1)).toBe(false);

    const slipShare = await buildCariShareUrl({
      repo,
      accountId: null,
      transactionId: "11111111-1111-4111-8111-111111111111",
      orderId: null,
    });
    const slipToken = new URL(slipShare.url).searchParams.get("t");
    expect(slipToken?.startsWith("v3.")).toBe(true);
    expect(verifySlipToken("11111111-1111-4111-8111-111111111111", slipToken, 3)).toBe(true);
  });

  it("getCariAccountDetail includeTransactions secenegine gore hareketleri dondurur ve bakiyeli arsivi 409 ile engeller", async () => {
    const { repo, audit } = makeFakeRepo({ balance: 450 });

    const basic = await getCariAccountDetail({ repo, id: "cari_test_1", includeTransactions: false });
    expect(basic.account.id).toBe("cari_test_1");
    expect(basic.transactions).toBeUndefined();

    const full = await getCariAccountDetail({ repo, id: "cari_test_1", includeTransactions: true });
    expect(full.transactions).toHaveLength(1);

    await expect(
      updateCariAccount({
        repo,
        audit,
        actor: ADMIN_ACTOR,
        id: "cari_test_1",
        input: { archived: true },
      })
    ).rejects.toThrowError(CariServiceError);
  });
});
