import "server-only";

import { logError } from "@/lib/kernel/log";
import { signAccountToken, signOrderToken, signSlipToken } from "@/lib/security/linkToken";
import { SITE_URL } from "@/lib/site";
import { istanbulToday } from "@/lib/time/istanbul";
import type {
  B2BHotSaleAccountSummary,
  B2BHotSalePaymentMethod,
  B2BHotSaleResult,
  B2BHotSaleTransactionSummary,
  CariAccount,
  CariTransaction,
} from "@/types/admin";
import { parseCustomPrices, profileToRow } from "./account";
import {
  mapHotSalePaymentMethodToDb,
  parseLastOrderLedgerItems,
  resolveHotSaleLines,
  roundCariMoney,
  type HotSaleCatalogProduct,
  type LastOrderLine,
} from "./pricing";
import {
  isCatalogHotSaleLine,
  type CreateCariAccountInput,
  type HotSaleRequestInput,
  type LedgerTransactionItemInput,
  type PatchCariAccountInput,
  type RecordCariTransactionInput,
} from "./schema";
import type { CariAuditLogger, CariRepository } from "./repo";

export class CariServiceError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "CariServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface CariActor {
  userId: string;
  role: string;
  isAdmin: boolean;
}

const RPC_TRANSACTION_ERRORS: Record<string, string> = {
  CARI_NOT_FOUND: "Cari hesap bulunamadı.",
  CARI_ARCHIVED: "Bu cari hesap arşivlenmiş; yeni hareket eklenemez.",
  INVALID_AMOUNT: "Tutar geçersiz.",
  STORNO_TARGET_NOT_FOUND: "İptal edilecek hareket bulunamadı.",
  CANNOT_STORNO_A_STORNO: "Bir iptal kaydı tekrar iptal edilemez.",
  ALREADY_REVERSED: "Bu hareket zaten iptal edilmiş.",
};

function mapRpcTransactionError(message: string): string | null {
  for (const [code, text] of Object.entries(RPC_TRANSACTION_ERRORS)) {
    if (message.includes(code)) return text;
  }
  return null;
}

function getErrorMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

function parseRpcTxSummary(raw: unknown): B2BHotSaleTransactionSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : "";
  if (!transactionId) return null;
  return {
    transactionId,
    slipNumber: typeof obj.slip_number === "string" ? obj.slip_number : "",
    delta: roundCariMoney(Number(obj.delta) || 0),
    balanceAfter: roundCariMoney(Number(obj.balance_after) || 0),
  };
}

export async function listCariAccounts(repo: CariRepository): Promise<CariAccount[]> {
  return repo.listAccounts();
}

export async function createCariAccount(params: {
  repo: CariRepository;
  audit: CariAuditLogger;
  actor: CariActor;
  input: CreateCariAccountInput;
}): Promise<{ success: true; id: string }> {
  const { repo, audit, actor, input } = params;
  const {
    openingBalance,
    creditLimit,
    district,
    companyTitle,
    defaultCourierId,
    standingOrder,
    customPrices,
    ...baseProfile
  } = input;

  const opening =
    typeof openingBalance === "number" && Number.isFinite(openingBalance)
      ? roundCariMoney(openingBalance)
      : 0;
  const safeCreditLimit =
    typeof creditLimit === "number" && Number.isFinite(creditLimit)
      ? roundCariMoney(creditLimit)
      : 0;
  const safeDistrict = district?.trim() || "Beylikdüzü";
  const safeCompanyTitle = companyTitle?.trim() || null;

  const id = `cari_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = new Date().toISOString();

  await repo.insertAccount({
    id,
    ...profileToRow({ ...baseProfile, customPrices, defaultCourierId, standingOrder }),
    custom_prices: customPrices ?? {},
    balance: 0,
    credit_limit: safeCreditLimit,
    district: safeDistrict,
    company_title: safeCompanyTitle,
    default_courier_id: defaultCourierId ?? null,
    standing_order: standingOrder ?? {},
    share_token_version: 1,
    status: "active",
    created_at: now,
    updated_at: now,
  });

  if (opening !== 0) {
    try {
      await repo.recordTransactionAtomic({
        p_account_id: id,
        p_type: "devir",
        p_amount: opening,
        p_description: "Açılış bakiyesi",
        p_payment_method: null,
        p_date: null,
        p_items: null,
        p_order_id: null,
        p_reverses_id: null,
        p_created_by: actor.userId,
        p_target_balance: null,
      });
    } catch (err) {
      await repo.deleteAccountRowById(id);
      throw err;
    }
  }

  await audit({
    actorId: actor.userId,
    actorRole: actor.role || "unknown",
    action: "cari.account.create",
    entityType: "current_account",
    entityId: id,
    summary: `Cari hesap açıldı: ${baseProfile.businessName}`,
    metadata: {
      district: safeDistrict,
      creditLimit: safeCreditLimit,
      companyTitle: safeCompanyTitle,
      defaultCourierId: defaultCourierId ?? null,
      standingOrderEnabled: standingOrder?.enabled ?? false,
      openingBalance: opening,
      customPriceCount: customPrices ? Object.keys(customPrices).length : 0,
    },
  });

  return { success: true, id };
}

export async function getCariAccountDetail(params: {
  repo: CariRepository;
  id: string;
  includeTransactions?: boolean;
}): Promise<{ account: CariAccount; transactions?: CariTransaction[] }> {
  const { repo, id, includeTransactions } = params;

  if (!includeTransactions) {
    const account = await repo.getAccountById(id);
    if (!account) {
      throw new CariServiceError("Cari hesap bulunamadı.", 404);
    }
    return { account };
  }

  const [account, transactions] = await Promise.all([
    repo.getAccountById(id),
    repo.listAccountTransactions(id),
  ]);
  if (!account) {
    throw new CariServiceError("Cari hesap bulunamadı.", 404);
  }
  return { account, transactions };
}

export async function updateCariAccount(params: {
  repo: CariRepository;
  audit: CariAuditLogger;
  actor: CariActor;
  id: string;
  input: PatchCariAccountInput;
}): Promise<{ success: true }> {
  const { repo, audit, actor, id, input } = params;
  const {
    archived,
    district,
    companyTitle,
    creditLimit,
    defaultCourierId,
    standingOrder,
    customPrices,
    ...profile
  } = input;

  const acc = await repo.getAccountBalanceSummary(id);
  if (!acc) {
    throw new CariServiceError("Cari hesap bulunamadı.", 404);
  }

  const update: Record<string, unknown> = {
    ...profileToRow({
      ...profile,
      ...(customPrices !== undefined ? { customPrices } : {}),
      ...(defaultCourierId !== undefined ? { defaultCourierId } : {}),
      ...(standingOrder !== undefined ? { standingOrder } : {}),
    }),
    updated_at: new Date().toISOString(),
  };
  if (customPrices !== undefined) {
    update.custom_prices = customPrices;
  }
  if (creditLimit !== undefined) {
    update.credit_limit = roundCariMoney(creditLimit);
  }
  if (district !== undefined) {
    update.district = district.trim() || "Beylikdüzü";
  }
  if (companyTitle !== undefined) {
    update.company_title = companyTitle.trim() || null;
  }
  if (defaultCourierId !== undefined) {
    update.default_courier_id = defaultCourierId;
  }
  if (standingOrder !== undefined) {
    update.standing_order = standingOrder;
  }

  if (archived === true) {
    if (acc.balance !== 0) {
      throw new CariServiceError(
        `Bakiyesi ${acc.balance.toLocaleString("tr-TR")} ₺ olan cari arşivlenemez. Önce bakiyeyi kapatın.`,
        409
      );
    }
    update.archived_at = new Date().toISOString();
  } else if (archived === false) {
    update.archived_at = null;
  }

  const updated = await repo.updateAccount(id, update, {
    requireZeroBalance: archived === true,
  });
  if (!updated) {
    throw new CariServiceError(
      "Bakiye bu arada değişti; cari arşivlenmedi. Sayfayı yenileyip tekrar deneyin.",
      409
    );
  }

  const accountName = profile.businessName || acc.name || id;
  await audit({
    actorId: actor.userId,
    actorRole: actor.role || "unknown",
    action:
      archived === true
        ? "cari.account.archive"
        : archived === false
          ? "cari.account.unarchive"
          : "cari.account.update",
    entityType: "current_account",
    entityId: id,
    summary: `Cari güncellendi: ${accountName}`,
    metadata: {
      archived: archived ?? null,
      district: district ?? undefined,
      creditLimit: creditLimit ?? undefined,
      companyTitle: companyTitle ?? undefined,
      defaultCourierId: defaultCourierId ?? undefined,
      standingOrderEnabled: standingOrder !== undefined ? standingOrder.enabled : undefined,
      customPriceCount: customPrices !== undefined ? Object.keys(customPrices).length : undefined,
    },
  });

  return { success: true };
}

export async function deleteTrialCariAccount(params: {
  repo: CariRepository;
  audit: CariAuditLogger;
  actor: CariActor;
  id: string;
}): Promise<{ success: true }> {
  const { repo, audit, actor, id } = params;

  try {
    await repo.deleteCariAccountAtomic(id);
  } catch (err) {
    const msg = getErrorMsg(err);
    if (msg.includes("CARI_HAS_HISTORY")) {
      throw new CariServiceError(
        "Bu caride iptal edilmemiş hareketler var; kalıcı silinemez. Gerçek hesapsa arşivleyin, denemeyse önce hareketleri iptal edin.",
        409
      );
    }
    if (msg.includes("CARI_NOT_FOUND")) {
      throw new CariServiceError("Cari hesap bulunamadı.", 404);
    }
    throw err;
  }

  await audit({
    actorId: actor.userId,
    actorRole: actor.role || "unknown",
    action: "cari.account.delete",
    entityType: "current_account",
    entityId: id,
    summary: `Deneme cari hesabı kalıcı silindi (${id})`,
  });

  return { success: true };
}

export async function revokeCariShareLinks(params: {
  repo: CariRepository;
  audit: CariAuditLogger;
  actor: CariActor;
  id: string;
}): Promise<{ success: true; accountId: string; shareTokenVersion: number }> {
  const { repo, audit, actor, id } = params;
  if (!id) {
    throw new CariServiceError("Cari hesap kimliği gerekli.", 400);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const tokenState = await repo.getAccountTokenState(id);
    if (!tokenState) {
      throw new CariServiceError("Cari hesap bulunamadı.", 404);
    }

    const previousVersion = tokenState.shareTokenVersion;
    const nextVersion = previousVersion + 1;
    const nowIso = new Date().toISOString();

    let finalVersion = await repo.compareAndSwapTokenVersion(
      id,
      previousVersion,
      nextVersion,
      nowIso
    );
    if (finalVersion === null && previousVersion === 1) {
      finalVersion = await repo.compareAndSwapTokenVersion(id, null, nextVersion, nowIso);
    }

    if (finalVersion !== null) {
      await audit({
        actorId: actor.userId,
        actorRole: actor.role || "unknown",
        action: "cari.share_link.revoke",
        entityType: "current_account",
        entityId: id,
        summary: `Eski cari paylaşım linkleri iptal edildi: ${tokenState.name} (v${previousVersion} -> v${finalVersion})`,
        metadata: {
          previousVersion,
          newVersion: finalVersion,
        },
      });

      return {
        success: true,
        accountId: id,
        shareTokenVersion: finalVersion,
      };
    }
  }

  throw new CariServiceError("Eşzamanlı güncelleme algılandı, lütfen tekrar deneyin.", 409);
}

export async function getCariLastOrder(params: {
  repo: CariRepository;
  id: string;
}): Promise<{
  items: LastOrderLine[];
  sourceDate: string | null;
  sourceKind: "order" | "ledger" | null;
}> {
  const { repo, id } = params;
  if (!id || !id.trim()) {
    throw new CariServiceError("Cari kimliği zorunludur.", 400);
  }

  const orderRows = await repo.getLastNonCancelledOrders(id, 5);
  for (const row of orderRows) {
    const items: LastOrderLine[] = [];
    for (const it of row.order_items ?? []) {
      const qty = Math.trunc(Number(it.quantity));
      const price = roundCariMoney(Number(it.unit_price) || 0);
      const name = (it.product_name ?? "").trim();
      if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
        continue;
      }
      items.push({
        productId: it.product_id && it.product_id.trim() ? it.product_id.trim() : null,
        name,
        quantity: qty,
        unitPrice: price,
      });
    }
    if (items.length > 0) {
      return {
        items,
        sourceDate: row.delivery_date ?? null,
        sourceKind: "order",
      };
    }
  }

  const { sales, reversedIds } = await repo.getRecentSalesAndStornos(id, 20);
  for (const tx of sales) {
    if (reversedIds.has(tx.id)) continue;
    const items = parseLastOrderLedgerItems(tx.items);
    if (items.length > 0) {
      return {
        items,
        sourceDate: tx.date ?? null,
        sourceKind: "ledger",
      };
    }
  }

  return {
    items: [],
    sourceDate: null,
    sourceKind: null,
  };
}

export async function recordCariLedgerTransaction(params: {
  repo: CariRepository;
  actor: CariActor;
  input: RecordCariTransactionInput;
}): Promise<{
  success: true;
  unchanged?: boolean;
  transactionId?: string;
  slipNumber?: string;
  delta?: number;
  balanceAfter: number;
  shareUrl?: string | null;
}> {
  const { repo, actor, input } = params;

  let type: "satis" | "tahsilat" | "devir" | "storno";
  let amount: number;
  let items: LedgerTransactionItemInput[] | null = null;
  let paymentMethod: string | null = null;
  let orderId: string | null = null;
  let reversesId: string | null = null;
  let txDate: string | null = null;
  let text = "description" in input ? (input.description ?? null) : null;
  let targetBalance: number | null = null;

  switch (input.kind) {
    case "satis": {
      type = "satis";
      items = input.items.length ? input.items : null;
      const fromItems = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      amount = input.items.length ? roundCariMoney(fromItems) : (input.amount ?? 0);
      if (!(amount > 0)) {
        throw new CariServiceError("Fiş tutarı 0 olamaz", 400);
      }
      orderId = input.orderId ?? null;
      txDate = input.date ?? null;
      break;
    }
    case "tahsilat":
      type = "tahsilat";
      amount = input.amount;
      paymentMethod = input.paymentMethod;
      orderId = input.orderId ?? null;
      txDate = input.date ?? null;
      break;
    case "devir":
      type = "devir";
      amount = input.amount;
      txDate = input.date ?? null;
      break;
    case "set_balance":
      type = "devir";
      amount = 0;
      targetBalance = input.targetBalance;
      text = `Bakiye düzeltme: ${input.description} (hedef ${input.targetBalance.toLocaleString("tr-TR")} ₺)`;
      break;
    case "storno":
      type = "storno";
      amount = 0;
      reversesId = input.reversesId;
      text = input.description ? `İptal: ${input.description}` : "İptal (ters kayıt)";
      break;
  }

  let res;
  try {
    res = await repo.recordTransactionAtomic({
      p_account_id: input.accountId,
      p_type: type,
      p_amount: amount,
      p_description: text,
      p_payment_method: paymentMethod,
      p_date: txDate,
      p_items: items,
      p_order_id: orderId,
      p_reverses_id: reversesId,
      p_created_by: actor.userId,
      p_target_balance: targetBalance,
    });
  } catch (err) {
    const friendly = mapRpcTransactionError(getErrorMsg(err));
    if (friendly) {
      throw new CariServiceError(friendly, 409);
    }
    throw err;
  }

  if (res.unchanged || !res.transaction_id) {
    return {
      success: true,
      unchanged: true,
      balanceAfter: Number(res.balance_after),
    };
  }

  const tokenState = await repo.getAccountTokenState(input.accountId);
  const shareTokenVersion = tokenState?.shareTokenVersion ?? 1;
  const token = signSlipToken(res.transaction_id, shareTokenVersion);

  return {
    success: true,
    transactionId: res.transaction_id,
    slipNumber: res.slip_number,
    delta: Number(res.delta),
    balanceAfter: Number(res.balance_after),
    shareUrl: token ? `${SITE_URL}/fis/${res.transaction_id}?t=${token}` : null,
  };
}

export async function buildCariShareUrl(params: {
  repo: CariRepository;
  accountId: string | null;
  transactionId: string | null;
  orderId: string | null;
}): Promise<{ url: string }> {
  const { repo, accountId, transactionId, orderId } = params;

  if (accountId && /^[A-Za-z0-9_-]{1,80}$/.test(accountId)) {
    const tokenState = await repo.getAccountTokenState(accountId);
    if (!tokenState) {
      throw new CariServiceError("Cari hesap bulunamadı.", 404);
    }
    const token = signAccountToken(accountId, tokenState.shareTokenVersion);
    if (!token) {
      throw new CariServiceError("İmza anahtarı yok", 500);
    }
    return { url: `${SITE_URL}/ekstre/${encodeURIComponent(accountId)}?t=${token}` };
  }

  if (transactionId && /^[0-9a-f-]{36}$/i.test(transactionId)) {
    const version = await repo.getTransactionAccountTokenVersion(transactionId);
    if (version === null) {
      throw new CariServiceError("Fiş bulunamadı.", 404);
    }
    const token = signSlipToken(transactionId, version);
    if (!token) {
      throw new CariServiceError("İmza anahtarı yok", 500);
    }
    return { url: `${SITE_URL}/fis/${transactionId}?t=${token}` };
  }

  if (orderId && /^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    const token = signOrderToken(orderId);
    if (!token) {
      throw new CariServiceError("İmza anahtarı yok", 500);
    }
    return { url: `${SITE_URL}/fis/${orderId}?t=${token}` };
  }

  throw new CariServiceError("accountId, transactionId veya orderId gerekli", 400);
}

export async function executeB2BHotSale(params: {
  repo: CariRepository;
  audit: CariAuditLogger;
  actor: CariActor;
  input: HotSaleRequestInput;
}): Promise<B2BHotSaleResult> {
  const { repo, audit, actor, input } = params;

  if (input.allowOverLimit && !actor.isAdmin) {
    throw new CariServiceError(
      "Kredi limitini aşan sıcak satış onayı yalnızca yönetici (admin) tarafından verilebilir.",
      403
    );
  }

  const acc = await repo.getHotSaleAccount(input.accountId);
  if (!acc) {
    throw new CariServiceError("Cari hesap bulunamadı.", 404);
  }
  if (acc.archived_at) {
    throw new CariServiceError(
      "Arşivlenmiş cari hesaba sıcak satış yapılamaz.",
      400,
      "ARCHIVED_ACCOUNT"
    );
  }

  const catalogProductIds = Array.from(
    new Set(
      [...input.items, ...input.returnItems]
        .filter(isCatalogHotSaleLine)
        .map((line) => line.productId)
    )
  );

  const productRows = await repo.getHotSaleProducts(catalogProductIds);
  const productById = new Map<string, HotSaleCatalogProduct>();
  for (const prod of productRows) {
    productById.set(prod.id, prod);
  }

  const customPrices = parseCustomPrices(acc.custom_prices);
  const resolved = resolveHotSaleLines({
    items: input.items,
    returnItems: input.returnItems,
    productById,
    customPrices,
    isAdmin: actor.isAdmin,
  });

  if (!resolved.ok) {
    throw new CariServiceError(resolved.error, 400);
  }

  const {
    items: resolvedItems,
    grossTotal,
    returnTotal,
    netAmount,
    overrideUsed,
    customItemCount,
  } = resolved;

  const collectedAmount = roundCariMoney(input.collectedAmount);
  const saleDate = input.date ?? istanbulToday();
  const effectivePaymentMethod: B2BHotSalePaymentMethod | undefined =
    collectedAmount > 0 ? (input.paymentMethod ?? "nakit") : undefined;
  const description =
    input.description?.trim() ||
    (returnTotal > 0 ? "Araçtan sıcak satış + bayat/fire iade" : "Araçtan sıcak satış");

  let rpcRaw: unknown;
  try {
    rpcRaw = await repo.recordHotSaleAtomic({
      p_account_id: acc.id,
      p_items: resolvedItems,
      p_amount: netAmount,
      p_collected_amount: collectedAmount,
      p_payment_method: mapHotSalePaymentMethodToDb(effectivePaymentMethod),
      p_description: description,
      p_date: saleDate,
      p_created_by: actor.userId,
      p_allow_over_limit: Boolean(input.allowOverLimit && actor.isAdmin),
    });
  } catch (err) {
    const msg = getErrorMsg(err);
    if (msg.includes("CREDIT_LIMIT_EXCEEDED")) {
      throw new CariServiceError(
        "Cari kredi limiti aşılıyor. Tahsilat alın veya yönetici onayı ile işlem yapın.",
        409,
        "CREDIT_LIMIT_EXCEEDED"
      );
    }
    if (msg.includes("ARCHIVED_ACCOUNT")) {
      throw new CariServiceError(
        "Arşivlenmiş cari hesaba sıcak satış yapılamaz.",
        400,
        "ARCHIVED_ACCOUNT"
      );
    }
    if (msg.includes("CARI_NOT_FOUND")) {
      throw new CariServiceError("Cari hesap bulunamadı.", 404);
    }
    if (msg.includes("INVALID_AMOUNT") || msg.includes("INVALID_COLLECTED_AMOUNT")) {
      throw new CariServiceError("Geçersiz satış veya tahsilat tutarı.", 400);
    }
    // Hard Fail: asla parçalı insert fallback'e düşülmez
    logError("POST /api/admin/cari/hot-sale RPC failed:", err);
    throw new CariServiceError(
      "Atomik sıcak satış kaydı başarısız oldu; işlem iptal edildi.",
      500
    );
  }

  const rpcObj =
    rpcRaw && typeof rpcRaw === "object" && !Array.isArray(rpcRaw)
      ? (rpcRaw as Record<string, unknown>)
      : null;
  const saleTransaction = parseRpcTxSummary(rpcObj?.sale_transaction);
  if (!saleTransaction) {
    logError("POST /api/admin/cari/hot-sale malformed RPC payload:", rpcRaw);
    throw new CariServiceError("Sıcak satış fiş yanıtı doğrulanamadı.", 500);
  }

  const paymentTransaction = parseRpcTxSummary(rpcObj?.payment_transaction);
  const rawBalanceAfter = Number(rpcObj?.balance_after);
  const balanceAfter = Number.isFinite(rawBalanceAfter)
    ? roundCariMoney(rawBalanceAfter)
    : (paymentTransaction?.balanceAfter ?? saleTransaction.balanceAfter);
  const shareTokenVersion = Math.max(1, Math.trunc(Number(acc.share_token_version) || 1));
  const slipToken = signSlipToken(saleTransaction.transactionId, shareTokenVersion);
  if (!slipToken) {
    logError("POST /api/admin/cari/hot-sale missing HMAC secret for slip token", {
      txId: saleTransaction.transactionId,
    });
    throw new CariServiceError("Fiş paylaşım anahtarı yapılandırılmamış.", 500);
  }
  const signedSlipUrl = `${SITE_URL}/fis/${saleTransaction.transactionId}?t=${encodeURIComponent(slipToken)}`;

  const accountSummary: B2BHotSaleAccountSummary = {
    id: acc.id,
    businessName: acc.name,
    companyTitle: acc.company_title?.trim() || undefined,
    contactPerson: acc.contact_person ?? "",
    phone: acc.phone ?? "",
    address: acc.address ?? "",
    district: acc.district?.trim() || "Beylikdüzü",
    neighborhood: acc.neighborhood ?? "",
    taxNumber: acc.tax_id?.trim() || undefined,
    taxOffice: acc.tax_office?.trim() || undefined,
    creditLimit: roundCariMoney(Number(acc.credit_limit) || 0),
    shareTokenVersion,
  };

  await audit({
    actorId: actor.userId,
    actorRole: actor.role || "unknown",
    action: "cari.hot_sale",
    entityType: "account_transaction",
    entityId: saleTransaction.transactionId,
    summary: `B2B sıcak satış: ${acc.name} (${saleTransaction.slipNumber}) — Net ${netAmount.toFixed(2)} ₺, Tahsilat ${collectedAmount.toFixed(2)} ₺`,
    metadata: {
      accountId: acc.id,
      slipNumber: saleTransaction.slipNumber,
      paymentSlipNumber: paymentTransaction?.slipNumber ?? null,
      grossTotal,
      returnTotal,
      netAmount,
      collectedAmount,
      paymentMethod: effectivePaymentMethod ?? null,
      allowOverLimit: Boolean(input.allowOverLimit && actor.isAdmin),
      overrideUsed,
      customItemCount,
      balanceAfter,
      itemCount: resolvedItems.length,
    },
  });

  return {
    success: true,
    saleTransaction,
    paymentTransaction,
    balanceAfter,
    signedSlipUrl,
    account: accountSummary,
    items: resolvedItems,
    grossTotal,
    returnTotal,
    netAmount,
    collectedAmount,
    paymentMethod: effectivePaymentMethod,
    date: saleDate,
    description,
  };
}
