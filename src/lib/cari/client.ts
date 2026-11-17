import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type ApiRequestOptions,
} from "@/lib/kernel/apiClient";
import { getErrorMessage } from "@/lib/utils/error";
import type { CariAccount, CariTransaction } from "@/types/admin";
import type { CariProfileInput } from "./account";
import type { CreateCariAccountInput, PatchCariAccountInput } from "./schema";

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
