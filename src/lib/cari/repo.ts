import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import type { CariAccount, CariTransaction } from "@/types/admin";
import { parseCustomPrices, parseStandingOrder } from "./account";
import { LEDGER_SELECT, mapLedger, type LedgerRow } from "./ledger";
import { roundCariMoney, type HotSaleCatalogProduct } from "./pricing";

export type CariSupabaseClient = NonNullable<ReturnType<typeof createAdminClient>>;

export interface CariAuditEntry {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

export type CariAuditLogger = (entry: CariAuditEntry) => Promise<void>;

export interface CariAccountBalanceSummary {
  id: string;
  name: string;
  balance: number;
}

export interface CariAccountTokenState {
  id: string;
  name: string;
  shareTokenVersion: number;
}

export interface HotSaleAccountRecord {
  id: string;
  name: string;
  company_title: string | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  tax_id: string | null;
  tax_office: string | null;
  credit_limit: number | string | null;
  share_token_version: number | null;
  custom_prices: unknown;
  balance: number | string | null;
  archived_at: string | null;
}

export interface LastOrderOrderItemRow {
  product_id: string | null;
  product_name: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
}

export interface LastOrderOrderRow {
  id: string;
  delivery_date: string | null;
  created_at: string | null;
  order_items?: LastOrderOrderItemRow[] | null;
}

export interface LastOrderLedgerSaleRow {
  id: string;
  date: string | null;
  items: unknown;
}

export interface RecordCariTransactionRpcParams {
  p_account_id: string;
  p_type: "satis" | "tahsilat" | "devir" | "storno";
  p_amount: number;
  p_description: string | null;
  p_payment_method: string | null;
  p_date: string | null;
  p_items: unknown;
  p_order_id: string | null;
  p_reverses_id: string | null;
  p_created_by: string | null;
  p_target_balance: number | null;
}

export interface RecordCariTransactionRpcResult {
  transaction_id?: string;
  slip_number?: string;
  balance_after: number;
  delta: number;
  unchanged?: boolean;
}

export interface RecordHotSaleRpcParams {
  p_account_id: string;
  p_items: unknown;
  p_amount: number;
  p_collected_amount: number;
  p_payment_method: string | null;
  p_description: string;
  p_date: string;
  p_created_by: string | null;
  p_allow_over_limit: boolean;
}

export interface CariRepository {
  listAccounts(): Promise<CariAccount[]>;
  getAccountById(id: string): Promise<CariAccount | null>;
  getAccountBalanceSummary(id: string): Promise<CariAccountBalanceSummary | null>;
  getAccountTokenState(id: string): Promise<CariAccountTokenState | null>;
  getTransactionAccountTokenVersion(transactionId: string): Promise<number | null>;
  listAccountTransactions(accountId: string): Promise<CariTransaction[]>;
  insertAccount(row: Record<string, unknown>): Promise<void>;
  deleteAccountRowById(id: string): Promise<void>;
  updateAccount(
    id: string,
    patch: Record<string, unknown>,
    opts?: { requireZeroBalance?: boolean }
  ): Promise<boolean>;
  compareAndSwapTokenVersion(
    id: string,
    expectedVersionOrNull: number | null,
    nextVersion: number,
    updatedAt: string
  ): Promise<number | null>;
  recordTransactionAtomic(
    params: RecordCariTransactionRpcParams
  ): Promise<RecordCariTransactionRpcResult>;
  deleteCariAccountAtomic(id: string): Promise<void>;
  getHotSaleAccount(id: string): Promise<HotSaleAccountRecord | null>;
  getHotSaleProducts(productIds: readonly string[]): Promise<HotSaleCatalogProduct[]>;
  recordHotSaleAtomic(params: RecordHotSaleRpcParams): Promise<unknown>;
  getLastNonCancelledOrders(accountId: string, limit: number): Promise<LastOrderOrderRow[]>;
  getRecentSalesAndStornos(
    accountId: string,
    limit: number
  ): Promise<{ sales: LastOrderLedgerSaleRow[]; reversedIds: Set<string> }>;
}

const ACCOUNT_LIST_SELECT =
  "id, name, contact_person, phone, address, district, neighborhood, company_title, tax_id, tax_office, credit_limit, share_token_version, custom_prices, default_courier_id, standing_order, balance, account_type, notes, archived_at, created_at, updated_at";

const HOT_SALE_ACCOUNT_SELECT =
  "id, name, company_title, contact_person, phone, address, district, neighborhood, tax_id, tax_office, credit_limit, share_token_version, custom_prices, balance, archived_at";

const HOT_SALE_PRODUCT_SELECT = "id, name, price, weight, weight_unit, is_active";

function mapExtendedAccountRow(row: Record<string, unknown>): CariAccount {
  return {
    id: String(row.id ?? ""),
    businessName: String(row.name ?? ""),
    contactPerson: String(row.contact_person ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    district:
      typeof row.district === "string" && row.district.trim()
        ? row.district.trim()
        : "Beylikdüzü",
    neighborhood: String(row.neighborhood ?? "Cumhuriyet"),
    companyTitle:
      typeof row.company_title === "string" && row.company_title.trim()
        ? row.company_title.trim()
        : undefined,
    taxNumber:
      typeof row.tax_id === "string" && row.tax_id.trim() ? row.tax_id.trim() : undefined,
    taxOffice:
      typeof row.tax_office === "string" && row.tax_office.trim()
        ? row.tax_office.trim()
        : undefined,
    creditLimit: roundCariMoney(Number(row.credit_limit) || 0),
    shareTokenVersion: Math.max(1, Math.trunc(Number(row.share_token_version) || 1)),
    defaultCourierId:
      typeof row.default_courier_id === "string" && row.default_courier_id.trim()
        ? row.default_courier_id.trim()
        : null,
    standingOrder: parseStandingOrder(row.standing_order),
    customPrices: parseCustomPrices(row.custom_prices),
    balance: roundCariMoney(Number(row.balance) || 0),
    accountType: row.account_type === "gider" ? "gider" : "musteri",
    notes: typeof row.notes === "string" && row.notes.trim() ? row.notes : undefined,
    archivedAt: typeof row.archived_at === "string" ? row.archived_at : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

export function createSupabaseCariAuditLogger(supabase: CariSupabaseClient): CariAuditLogger {
  return async (entry) => {
    await writeAuditLog(supabase, {
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? undefined,
      summary: entry.summary,
      metadata: entry.metadata,
    });
  };
}

export function createSupabaseCariRepository(supabase: CariSupabaseClient): CariRepository {
  return {
    async listAccounts() {
      const { data, error } = await supabase
        .from("current_accounts")
        .select(ACCOUNT_LIST_SELECT)
        .order("name", { ascending: true });
      if (error) throw error;
      const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
      return rows.map(mapExtendedAccountRow);
    },

    async getAccountById(id) {
      const { data, error } = await supabase
        .from("current_accounts")
        .select(ACCOUNT_LIST_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapExtendedAccountRow(data as Record<string, unknown>);
    },

    async getAccountBalanceSummary(id) {
      const { data, error } = await supabase
        .from("current_accounts")
        .select("id, name, balance")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as { id: string; name: string | null; balance: number | string | null };
      return {
        id: row.id,
        name: String(row.name ?? row.id),
        balance: Number(row.balance) || 0,
      };
    },

    async getAccountTokenState(id) {
      const { data, error } = await supabase
        .from("current_accounts")
        .select("id, name, share_token_version")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as { id: string; name: string | null; share_token_version: number | null };
      return {
        id: row.id,
        name: String(row.name ?? row.id),
        shareTokenVersion:
          typeof row.share_token_version === "number" && Number.isFinite(row.share_token_version)
            ? Math.max(1, Math.trunc(row.share_token_version))
            : 1,
      };
    },

    async getTransactionAccountTokenVersion(transactionId) {
      const { data: txRow, error: txErr } = await supabase
        .from("account_transactions")
        .select("account_id")
        .eq("id", transactionId)
        .maybeSingle();
      if (txErr) throw txErr;
      if (!txRow) return null;

      const accountId = (txRow as { account_id: string | null }).account_id;
      if (!accountId) return 1;

      const { data: accRow, error: accErr } = await supabase
        .from("current_accounts")
        .select("share_token_version")
        .eq("id", accountId)
        .maybeSingle();
      if (accErr) throw accErr;
      if (!accRow) return 1;

      const version = Number((accRow as { share_token_version: number | null }).share_token_version);
      return Number.isFinite(version) && version >= 1 ? Math.trunc(version) : 1;
    },

    async listAccountTransactions(accountId) {
      const { data, error } = await supabase
        .from("account_transactions")
        .select(LEDGER_SELECT)
        .eq("account_id", accountId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return mapLedger((data ?? []) as LedgerRow[]);
    },

    async insertAccount(row) {
      const { error } = await supabase.from("current_accounts").insert(row);
      if (error) throw error;
    },

    async deleteAccountRowById(id) {
      await supabase.from("current_accounts").delete().eq("id", id);
    },

    async updateAccount(id, patch, opts) {
      let query = supabase.from("current_accounts").update(patch).eq("id", id);
      if (opts?.requireZeroBalance) {
        query = query.eq("balance", 0);
      }
      const { data, error } = await query.select("id");
      if (error) throw error;
      return Boolean(data && data.length > 0);
    },

    async compareAndSwapTokenVersion(id, expectedVersionOrNull, nextVersion, updatedAt) {
      let query = supabase
        .from("current_accounts")
        .update({
          share_token_version: nextVersion,
          updated_at: updatedAt,
        })
        .eq("id", id);

      if (expectedVersionOrNull === null) {
        query = query.is("share_token_version", null);
      } else {
        query = query.eq("share_token_version", expectedVersionOrNull);
      }

      const { data, error } = await query.select("id, share_token_version").maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const raw = (data as { share_token_version: number | null }).share_token_version;
      return Math.max(2, Math.trunc(Number(raw) || nextVersion));
    },

    async recordTransactionAtomic(params) {
      const { data, error } = await supabase.rpc("record_cari_transaction_atomic", params);
      if (error) throw error;
      return data as RecordCariTransactionRpcResult;
    },

    async deleteCariAccountAtomic(id) {
      const { error } = await supabase.rpc("delete_cari_account", { p_account_id: id });
      if (error) throw error;
    },

    async getHotSaleAccount(id) {
      const { data, error } = await supabase
        .from("current_accounts")
        .select(HOT_SALE_ACCOUNT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as HotSaleAccountRecord | null) ?? null;
    },

    async getHotSaleProducts(productIds) {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select(HOT_SALE_PRODUCT_SELECT)
        .in("id", [...productIds]);
      if (error) throw error;
      return Array.isArray(data) ? (data as HotSaleCatalogProduct[]) : [];
    },

    async recordHotSaleAtomic(params) {
      const { data, error } = await supabase.rpc("record_b2b_hot_sale_atomic", params);
      if (error) throw error;
      return data;
    },

    async getLastNonCancelledOrders(accountId, limit) {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, delivery_date, created_at, order_items(product_id, product_name, quantity, unit_price)"
        )
        .eq("cari_id", accountId)
        .neq("status", "iptal")
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LastOrderOrderRow[];
    },

    async getRecentSalesAndStornos(accountId, limit) {
      const [salesRes, stornoRes] = await Promise.all([
        supabase
          .from("account_transactions")
          .select("id, date, items, created_at")
          .eq("account_id", accountId)
          .eq("type", "satis")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("account_transactions")
          .select("reverses_id")
          .eq("account_id", accountId)
          .eq("type", "storno")
          .not("reverses_id", "is", null),
      ]);
      if (salesRes.error) throw salesRes.error;
      if (stornoRes.error) throw stornoRes.error;

      const reversedIds = new Set<string>();
      for (const row of (stornoRes.data ?? []) as Array<{ reverses_id: string | null }>) {
        if (typeof row.reverses_id === "string" && row.reverses_id) {
          reversedIds.add(row.reverses_id);
        }
      }

      return {
        sales: (salesRes.data ?? []) as LastOrderLedgerSaleRow[],
        reversedIds,
      };
    },
  };
}
