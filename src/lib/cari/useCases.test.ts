import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  signAccountToken,
  signOrderToken,
  signSlipToken,
  verifyAccountToken,
  verifySlipToken,
} from "@/lib/security/linkToken";
import type { CariAccount, CariTransaction } from "@/types/admin";
import type { LedgerRow } from "./ledger";
import type {
  CariAuditEntry,
  CariAuditLogger,
  CariRepository,
  CreateStandingOrderRpcParams,
  HotSaleAccountRecord,
  RecordCariTransactionRpcResult,
  SlipOrderRecord,
  StandingOrderAccountRecord,
  StandingOrderProductRecord,
} from "./repo";
import {
  buildCariShareUrl,
  CariServiceError,
  generateStandingOrdersForDate,
  getCariAccountDetail,
  getCustomerStatement,
  getSlipDetail,
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

  const standingAccounts: StandingOrderAccountRecord[] = [];
  const standingProducts: StandingOrderProductRecord[] = [];
  const standingRpcCalls: CreateStandingOrderRpcParams[] = [];
  let standingOrderHandler:
    | ((params: CreateStandingOrderRpcParams) => Promise<{
        order_id?: string;
        order_number?: string;
        is_existing?: boolean;
      }>)
    | null = null;
  const ledgerRows = new Map<string, LedgerRow>();
  const reversedLedgerIds = new Set<string>();
  const slipOrders = new Map<string, SlipOrderRecord>();
  const orderSaleSnapshots = new Map<string, { delta: number; balanceAfter: number }>();

  ledgerRows.set("11111111-1111-4111-8111-111111111111", {
    id: "11111111-1111-4111-8111-111111111111",
    account_id: baseAcc.id,
    type: "satis",
    amount: 500,
    delta: 500,
    description: "İlk teslimat",
    payment_method: null,
    date: "2026-11-15",
    created_at: "2026-11-15T08:00:00Z",
    slip_number: "FİŞ-2611-001",
    order_id: null,
    balance_after: 500,
    items: [{ productName: "Köy Ekmeği", quantity: 5, unitPrice: 100, lineTotal: 500, unit: "800 g" }],
    reverses_id: null,
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
    listActiveCustomerStandingAccounts: async () => standingAccounts,
    listActiveStandingProducts: async () => standingProducts,
    createStandingOrderAtomic: async (params) => {
      standingRpcCalls.push(params);
      if (standingOrderHandler) {
        return standingOrderHandler(params);
      }
      return {
        order_id: `ORD-${standingRpcCalls.length}`,
        order_number: `SIP-2611-00${standingRpcCalls.length}`,
        is_existing: false,
      };
    },
    getStatementAccountById: async (id) => {
      const a = accounts.get(id);
      if (!a) return null;
      return {
        id: a.id,
        name: a.name,
        contact_person: "Ali Bey",
        phone: "05320000000",
        tax_id: "1234567890",
        balance: a.balance,
        share_token_version: a.shareTokenVersion,
      };
    },
    getLedgerRowById: async (id) => ledgerRows.get(id) ?? null,
    getSlipAccountById: async (id) => {
      const a = accounts.get(id);
      if (!a) return null;
      return {
        name: a.name,
        tax_id: "1234567890",
        phone: "05320000000",
        address: "Atatürk Blv.",
        neighborhood: "Cumhuriyet",
        share_token_version: a.shareTokenVersion,
      };
    },
    listSlipProductMeta: async () => [
      { name: "Köy Ekmeği", image_url: "/img/koy.webp", weight: 800 },
    ],
    getTransactionSlipNumber: async (id) => ledgerRows.get(id)?.slip_number ?? null,
    isTransactionReversed: async (txId) => reversedLedgerIds.has(txId),
    getSlipOrderById: async (id) => slipOrders.get(id) ?? null,
    getLatestOrderSaleSnapshot: async (orderId) => orderSaleSnapshots.get(orderId) ?? null,
  };

  const audit: CariAuditLogger = async (entry) => {
    auditLogs.push(entry);
  };

  return {
    repo,
    audit,
    auditLogs,
    standingAccounts,
    standingProducts,
    standingRpcCalls,
    setStandingOrderHandler: (
      fn: (params: CreateStandingOrderRpcParams) => Promise<{
        order_id?: string;
        order_number?: string;
        is_existing?: boolean;
      }>
    ) => {
      standingOrderHandler = fn;
    },
    ledgerRows,
    reversedLedgerIds,
    slipOrders,
    orderSaleSnapshots,
  };
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

  it("generateStandingOrdersForDate ozel fiyat, mevcut atlama ve pasif urun hatasini yonetir", async () => {
    const {
      repo,
      audit,
      auditLogs,
      standingAccounts,
      standingProducts,
      standingRpcCalls,
      setStandingOrderHandler,
    } = makeFakeRepo();

    standingProducts.push(
      { id: "p-1", name: "Köy Ekmeği", price: 100, image_url: null, weight: 800, is_active: true },
      { id: "p-2", name: "Siyez", price: 140, image_url: null, weight: 700, is_active: true }
    );
    standingAccounts.push(
      {
        id: "cari-1",
        name: "Bistro Moda",
        phone: "05321112233",
        address: "",
        district: "Beylikdüzü",
        neighborhood: "Marmara",
        default_courier_id: null,
        custom_prices: { "p-1": 80 },
        standing_order: { enabled: true, schedule: { "1": { "p-1": 10, "p-2": 2 } }, notes: "Sabah" },
      },
      {
        id: "cari-missing",
        name: "Eksik Ürünlü Kafe",
        phone: "",
        address: "Cadde",
        district: null,
        neighborhood: null,
        default_courier_id: null,
        custom_prices: null,
        standing_order: { enabled: true, schedule: { "1": { "p-archived": 4 } } },
      }
    );

    setStandingOrderHandler(async () => ({
      order_id: "ORD-NEW",
      order_number: "SIP-2611-201",
      is_existing: false,
    }));

    const result = await generateStandingOrdersForDate({
      repo,
      audit,
      actor: ADMIN_ACTOR,
      deliveryDate: "2026-11-16", // Pazartesi => "1"
    });

    expect(result.weekday).toBe("1");
    expect(result.createdCount).toBe(1);
    expect(result.skippedExisting).toBe(0);
    expect(result.orders).toEqual([
      {
        accountId: "cari-1",
        businessName: "Bistro Moda",
        orderId: "ORD-NEW",
        orderNumber: "SIP-2611-201",
      },
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.accountId).toBe("cari-missing");
    expect(standingRpcCalls[0]?.p_order).toMatchObject({
      subtotal: 10 * 80 + 2 * 140,
      total_amount: 1080,
      idempotency_key: "standing:cari-1:2026-11-16",
    });
    expect(auditLogs).toHaveLength(1);
  });

  it("getCustomerStatement token surumunu dogrular, eski surumu 404 ile reddeder ve guncel fis tokeni uretir", async () => {
    const { repo } = makeFakeRepo({ shareTokenVersion: 2 });
    const oldToken = signAccountToken("cari_test_1", 1);
    const validToken = signAccountToken("cari_test_1", 2);

    await expect(
      getCustomerStatement({
        repo,
        id: "cari_test_1",
        token: oldToken,
        checkIsAdmin: async () => false,
      })
    ).rejects.toMatchObject({ status: 404 });

    const statement = await getCustomerStatement({
      repo,
      id: "cari_test_1",
      token: validToken,
      checkIsAdmin: async () => false,
    });

    expect(statement.cari.businessName).toBe("Bistro Moda");
    expect(statement.transactions).toHaveLength(1);
    expect(statement.transactions[0]?.slipToken?.startsWith("v2.")).toBe(true);
  });

  it("getSlipDetail cari hareketi ve siparis fisinde yuruyen bakiye + token kontrolu uygular", async () => {
    const { repo, reversedLedgerIds, slipOrders, orderSaleSnapshots } = makeFakeRepo({
      shareTokenVersion: 2,
    });
    const txId = "11111111-1111-4111-8111-111111111111";
    const validSlipToken = signSlipToken(txId, 2);
    reversedLedgerIds.add(txId);

    const slip = await getSlipDetail({
      repo,
      id: txId,
      token: validSlipToken,
      checkIsAdmin: async () => false,
    });

    expect(slip.isProductSale).toBe(true);
    expect(slip.cancelled).toBe(true);
    expect(slip.items[0]).toMatchObject({
      name: "Köy Ekmeği",
      totalPrice: 500,
      weight: 800,
      imageUrl: "/img/koy.webp",
    });
    expect(slip.previousBalance).toBe(0);
    expect(slip.newBalance).toBe(500);

    const orderId = "ord_test_123";
    slipOrders.set(orderId, {
      id: orderId,
      order_number: "SIP-2611-300",
      cari_id: "cari_test_1",
      customer_name: "Bistro Moda",
      phone: "05320000000",
      delivery_address: "Atatürk Blv.",
      neighborhood: "Cumhuriyet",
      delivery_date: "2026-11-18",
      delivery_time_window: "08:00-10:00",
      status: "teslim_edildi",
      subtotal: 400,
      total_amount: 400,
      created_at: "2026-11-18T06:00:00Z",
      order_items: [
        {
          product_name: "Köy Ekmeği",
          quantity: 4,
          unit_price: 100,
          total_price: 400,
          image_url: null,
          weight: null,
        },
      ],
    });
    orderSaleSnapshots.set(orderId, { delta: 400, balanceAfter: 900 });

    const orderToken = signOrderToken(orderId);
    const orderSlip = await getSlipDetail({
      repo,
      id: orderId,
      token: orderToken,
      checkIsAdmin: async () => false,
    });

    expect(orderSlip.orderNumber).toBe("SIP-2611-300");
    expect(orderSlip.previousBalance).toBe(500);
    expect(orderSlip.newBalance).toBe(900);
    expect(orderSlip.items[0]?.weight).toBe(800);

    await expect(
      getSlipDetail({
        repo,
        id: orderId,
        token: null,
        checkIsAdmin: async () => false,
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});
