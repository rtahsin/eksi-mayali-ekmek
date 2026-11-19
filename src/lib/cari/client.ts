import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type ApiRequestOptions,
} from "@/lib/kernel/apiClient";
import { getErrorMessage } from "@/lib/utils/error";
import type {
  B2BHotSalePaymentMethod,
  B2BHotSaleResult,
  CariAccount,
  CariTransaction,
} from "@/types/admin";
import type { CariProfileInput } from "./account";
import type { LastOrderLine } from "./pricing";
import type {
  CreateCariAccountInput,
  HotSaleLineInput,
  PatchCariAccountInput,
} from "./schema";

/** Cari defter yazımı — tüm hareketler `/api/admin/cari/transactions` üzerinden (tek atomik RPC). */
export type LedgerWrite =
  | {
      kind: "satis";
      items?: { name: string; quantity: number; unitPrice: number; productId?: string }[];
      amount?: number;
      description?: string;
      date?: string;
      orderId?: string;
    }
  | {
      kind: "tahsilat";
      amount: number;
      paymentMethod: "nakit" | "pos" | "banka_havale" | "diger";
      description?: string;
      date?: string;
      orderId?: string;
    }
  | { kind: "devir"; amount: number; description: string; date?: string }
  | { kind: "set_balance"; targetBalance: number; description: string }
  | { kind: "storno"; reversesId: string; description?: string };

export interface LedgerWriteResult {
  success: boolean;
  error?: string;
  transactionId?: string;
  slipNumber?: string;
  balanceAfter?: number;
  shareUrl?: string | null;
}

/** Müşteriye gönderilecek imzalı ekstre / fiş linki. */
export type ShareTarget =
  | { accountId: string }
  | { transactionId: string }
  | { orderId: string };

export interface GenerateStandingOrdersSummary {
  deliveryDate: string;
  createdCount: number;
  skippedExisting: number;
  errors: Array<{ businessName: string; error: string }>;
}

export interface B2BHotSaleClientInput {
  accountId: string;
  items: HotSaleLineInput[];
  returnItems?: HotSaleLineInput[];
  collectedAmount?: number;
  paymentMethod?: B2BHotSalePaymentMethod;
  description?: string;
  date?: string;
  allowOverLimit?: boolean;
}

export interface CariLastOrderResult {
  items: LastOrderLine[];
  sourceDate: string | null;
  sourceKind: "order" | "ledger" | null;
}

export interface CreateAdminCariOrderItemInput {
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice?: number;
  imageUrl?: string;
  weight?: number;
}

export interface CreateAdminCariOrderInput {
  idempotencyKey: string;
  customerName: string;
  phone: string;
  deliveryAddress: string;
  district?: string;
  neighborhood: string;
  deliveryMethod: "courier" | "pickup";
  deliveryDate: string;
  deliveryTimeWindow?: string;
  items: CreateAdminCariOrderItemInput[];
  shippingFee: number;
  paymentMethod: "cash_on_delivery" | "pos_at_door" | "transfer" | "cari";
  source: "whatsapp" | "phone" | "in_store" | "web" | "admin" | "standing_order";
  status: "bekliyor" | "hazirlaniyor";
  cariId: string;
  courierId?: string | null;
  courierNotes?: string;
  orderNotes: string;
}

export interface CreateAdminCariOrderResult {
  id: string;
  orderNumber: string;
  existing: boolean;
}

export async function fetchCariAccounts(options?: ApiRequestOptions): Promise<CariAccount[]> {
  const res = await apiGet<{ accounts?: CariAccount[] }>("/api/admin/cari/accounts", options);
  return Array.isArray(res?.accounts) ? res.accounts : [];
}

export async function fetchCariAccountDetail(
  id: string,
  opts?: { includeTransactions?: boolean } & ApiRequestOptions
): Promise<{ account: CariAccount; transactions?: CariTransaction[] }> {
  const { includeTransactions, ...reqOpts } = opts ?? {};
  const qs = includeTransactions ? "?include=transactions" : "";
  return apiGet<{ account: CariAccount; transactions?: CariTransaction[] }>(
    `/api/admin/cari/accounts/${encodeURIComponent(id)}${qs}`,
    reqOpts
  );
}

export async function createCariAccountClient(
  input: CreateCariAccountInput | (CariProfileInput & { openingBalance?: number })
): Promise<{ id: string }> {
  const res = await apiPost<{ success?: boolean; id?: string }>(
    "/api/admin/cari/accounts",
    input
  );
  return { id: typeof res?.id === "string" ? res.id : "" };
}

export async function updateCariAccountClient(
  id: string,
  input: PatchCariAccountInput | (CariProfileInput & { archived?: boolean })
): Promise<void> {
  await apiPatch(`/api/admin/cari/accounts/${encodeURIComponent(id)}`, input);
}

export async function deleteCariAccountClient(id: string): Promise<void> {
  await apiDelete(`/api/admin/cari/accounts/${encodeURIComponent(id)}`);
}

export async function revokeCariShareLinksClient(
  id: string
): Promise<{ shareTokenVersion: number }> {
  const res = await apiPost<{ success?: boolean; shareTokenVersion?: number }>(
    `/api/admin/cari/accounts/${encodeURIComponent(id)}/revoke-link`
  );
  return {
    shareTokenVersion:
      typeof res?.shareTokenVersion === "number" ? res.shareTokenVersion : 1,
  };
}

export async function recordLedger(
  accountId: string,
  tx: LedgerWrite
): Promise<LedgerWriteResult> {
  try {
    const r = await apiPost<Record<string, unknown>>("/api/admin/cari/transactions", {
      ...tx,
      accountId,
    });
    return {
      success: true,
      transactionId: typeof r.transactionId === "string" ? r.transactionId : undefined,
      slipNumber: typeof r.slipNumber === "string" ? r.slipNumber : undefined,
      balanceAfter: typeof r.balanceAfter === "number" ? r.balanceAfter : undefined,
      shareUrl: typeof r.shareUrl === "string" ? r.shareUrl : null,
    };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function getShareUrl(target: ShareTarget): Promise<string | null> {
  const entries = Object.entries(target);
  if (entries.length === 0) return null;
  const [key, value] = entries[0] as [string, string];
  const qs = `${key}=${encodeURIComponent(value)}`;
  try {
    const data = await apiGet<{ url?: unknown }>(`/api/admin/cari/share?${qs}`);
    return typeof data?.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

export async function generateStandingOrdersClient(
  deliveryDate?: string
): Promise<GenerateStandingOrdersSummary> {
  const data = await apiPost<Partial<GenerateStandingOrdersSummary>>(
    "/api/admin/cari/standing-orders/generate",
    deliveryDate ? { deliveryDate } : {}
  );
  if (!data?.deliveryDate) {
    throw new Error("Yarınki rutin siparişler oluşturulamadı.");
  }
  return {
    deliveryDate: data.deliveryDate,
    createdCount: data.createdCount ?? 0,
    skippedExisting: data.skippedExisting ?? 0,
    errors: Array.isArray(data.errors) ? data.errors : [],
  };
}

export async function submitB2BHotSaleClient(
  input: B2BHotSaleClientInput,
  options?: ApiRequestOptions
): Promise<B2BHotSaleResult> {
  const data = await apiPost<B2BHotSaleResult>("/api/admin/cari/hot-sale", input, options);
  if (!data || !data.success) {
    throw new Error("Sıcak satış fişi kesilemedi.");
  }
  return data;
}

export async function fetchCariLastOrderClient(
  accountId: string,
  options?: ApiRequestOptions
): Promise<CariLastOrderResult> {
  const data = await apiGet<Partial<CariLastOrderResult>>(
    `/api/admin/cari/accounts/${encodeURIComponent(accountId)}/last-order`,
    options
  );
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    sourceDate: typeof data?.sourceDate === "string" ? data.sourceDate : null,
    sourceKind:
      data?.sourceKind === "order" || data?.sourceKind === "ledger"
        ? data.sourceKind
        : null,
  };
}

export async function createAdminCariOrderClient(
  input: CreateAdminCariOrderInput,
  options?: ApiRequestOptions
): Promise<CreateAdminCariOrderResult> {
  const data = await apiPost<{
    id?: string;
    orderNumber?: string;
    existing?: boolean;
  }>("/api/admin/orders", input, options);
  if (!data?.id) {
    throw new Error("Sipariş kaydedilemedi.");
  }
  return {
    id: data.id,
    orderNumber:
      typeof data.orderNumber === "string" && data.orderNumber ? data.orderNumber : data.id,
    existing: Boolean(data.existing),
  };
}
