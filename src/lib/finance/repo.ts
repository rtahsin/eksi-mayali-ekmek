import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, type AuditLogInput } from "@/lib/security/audit";
import { logError } from "@/lib/kernel/log";
import { addDays } from "@/lib/time/istanbul";
import { round2 } from "./domain";
import type {
  RawCariAccountSummaryRow,
  RawCariTransactionSummaryRow,
  RawFinancialRecordRow,
  RawOrderSummaryRow,
  RawPaymentSummaryRow,
  RawSupplierRow,
  RawSupplierTransactionRow,
} from "./types";

export type FinanceAdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

const OVERVIEW_PAGE_SIZE = 1000;
const OVERVIEW_MAX_PAGES = 20;

export interface FinanceOverviewDatasets {
  orders: RawOrderSummaryRow[];
  payments: RawPaymentSummaryRow[];
  cariTransactions: RawCariTransactionSummaryRow[];
  cariAccounts: RawCariAccountSummaryRow[];
  financialRecords: RawFinancialRecordRow[];
  suppliers: RawSupplierRow[];
  supplierTransactions: RawSupplierTransactionRow[];
}

export interface RecordFinancialRecordAtomicInput {
  type: "gider" | "gelir";
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  date: string;
  createdBy: string | null;
}

export interface StornoFinancialRecordAtomicInput {
  recordId: string;
  reason: string;
  date: string;
  createdBy: string | null;
}

export interface RecordSupplierTransactionAtomicInput {
  supplierId: string;
  type: "alis" | "odeme";
  amount: number;
  invoiceNo: string | null;
  description: string | null;
  date: string;
  paymentMethod: string | null;
  expenseCategory: string | null;
  alsoRecordExpense: boolean;
  createdBy: string | null;
}

export interface RecordSupplierTransactionAtomicResult {
  transaction: RawSupplierTransactionRow;
  newBalance: number;
  recordedExpenseId: string | null;
}

export interface StornoSupplierTransactionAtomicInput {
  supplierId: string;
  transactionId: string;
  reason: string;
  date: string;
  createdBy: string | null;
}

export interface StornoSupplierTransactionAtomicResult {
  transaction: RawSupplierTransactionRow;
  newBalance: number;
  reversedExpenseId: string | null;
}

export class FinanceRepoError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly dbCause?: unknown;

  constructor(status: number, message: string, code?: string, dbCause?: unknown) {
    super(message);
    this.name = "FinanceRepoError";
    this.status = status;
    this.code = code;
    this.dbCause = dbCause;
  }
}

export interface FinanceRepository {
  loadOverviewDatasets(range: { from: string; to: string }): Promise<FinanceOverviewDatasets>;

  recordFinancialRecordAtomic(input: RecordFinancialRecordAtomicInput): Promise<RawFinancialRecordRow>;

  stornoFinancialRecordAtomic(input: StornoFinancialRecordAtomicInput): Promise<RawFinancialRecordRow>;

  supplierExists(supplierId: string): Promise<boolean>;

  updateSupplierMeta(
    supplierId: string,
    payload: {
      name: string;
      category: string;
      contact_person: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      updated_at: string;
    }
  ): Promise<RawSupplierRow>;

  insertSupplier(payload: {
    id: string;
    name: string;
    category: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    balance: number;
  }): Promise<RawSupplierRow>;

  recordSupplierTransactionAtomic(
    input: RecordSupplierTransactionAtomicInput
  ): Promise<RecordSupplierTransactionAtomicResult>;

  stornoSupplierTransactionAtomic(
    input: StornoSupplierTransactionAtomicInput
  ): Promise<StornoSupplierTransactionAtomicResult>;

  writeAudit(input: AuditLogInput): Promise<void>;
}

interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

async function fetchAllPages<T extends { id: string }>(
  fetchPage: (fromIndex: number, toIndex: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  const seenIds = new Set<string>();
  for (let page = 0; page < OVERVIEW_MAX_PAGES; page += 1) {
    const start = page * OVERVIEW_PAGE_SIZE;
    const end = start + OVERVIEW_PAGE_SIZE - 1;
    const { data, error } = await fetchPage(start, end);
    if (error) {
      throw error;
    }
    const batch = Array.isArray(data) ? data : [];
    for (const item of batch) {
      if (seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      rows.push(item);
    }
    if (batch.length < OVERVIEW_PAGE_SIZE) {
      break;
    }
  }
  return rows;
}

interface RpcErrorLike {
  message?: string;
  code?: string;
  details?: string;
}

function asRpcError(err: unknown): RpcErrorLike {
  if (err && typeof err === "object") {
    return err as RpcErrorLike;
  }
  return { message: typeof err === "string" ? err : undefined };
}

export function mapFinanceRpcError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode: string
): FinanceRepoError {
  const rpcErr = asRpcError(error);
  const msg = rpcErr.message ?? "";
  const pgCode = rpcErr.code ?? "";
  const details = rpcErr.details ?? "";

  if (msg.includes("CANNOT_STORNO_A_STORNO")) {
    return new FinanceRepoError(
      400,
      "Bir iptal (storno) kaydı tekrar iptal edilemez",
      "CANNOT_STORNO_A_STORNO",
      error
    );
  }
  if (
    msg.includes("ALREADY_REVERSED") ||
    (pgCode === "23505" && (msg.includes("reverses") || details.includes("reverses")))
  ) {
    return new FinanceRepoError(
      409,
      "Bu kayıt için daha önce storno kesilmiş",
      "ALREADY_REVERSED",
      error
    );
  }
  if (msg.includes("RECORD_NOT_FOUND")) {
    return new FinanceRepoError(404, "İptal edilecek finans kaydı bulunamadı", "RECORD_NOT_FOUND", error);
  }
  if (msg.includes("SUPPLIER_NOT_FOUND")) {
    return new FinanceRepoError(404, "Tedarikçi bulunamadı", "SUPPLIER_NOT_FOUND", error);
  }
  if (msg.includes("TX_NOT_FOUND")) {
    return new FinanceRepoError(
      404,
      "İptal edilecek tedarikçi hareketi bulunamadı",
      "TX_NOT_FOUND",
      error
    );
  }
  if (msg.includes("INVALID_TYPE")) {
    return new FinanceRepoError(400, "Geçersiz işlem türü", "INVALID_TYPE", error);
  }
  if (msg.includes("INVALID_AMOUNT")) {
    return new FinanceRepoError(400, "Tutar sıfırdan büyük olmalı", "INVALID_AMOUNT", error);
  }

  logError(`Finance RPC hard failure (${fallbackCode}):`, error);
  return new FinanceRepoError(500, msg || fallbackMessage, fallbackCode, error);
}

function isRawFinancialRecordRow(data: unknown): data is RawFinancialRecordRow {
  return Boolean(data && typeof data === "object" && typeof (data as { id?: unknown }).id === "string");
}

function isRawSupplierTransactionRow(data: unknown): data is RawSupplierTransactionRow {
  return Boolean(data && typeof data === "object" && typeof (data as { id?: unknown }).id === "string");
}

function parseOptionalId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function createSupabaseFinanceRepository(supabase: FinanceAdminClient): FinanceRepository {
  return {
    async loadOverviewDatasets({ from, to }) {
      // İstanbul (UTC+3) sınır günlerini kaçırmamak için UTC tarafında ±1 gün tampon uygula;
      // kesin gün filtresi domain katmanındaki `computeCfoSummary` tarafından İstanbul takvimine göre yapılır.
      const bufferedFromUtc = `${addDays(from, -1)}T00:00:00.000Z`;
      const bufferedToUtc = `${addDays(to, 1)}T23:59:59.999Z`;
      const paymentDateOrFilter = [
        `and(paid_at.gte.${bufferedFromUtc},paid_at.lte.${bufferedToUtc})`,
        `and(paid_at.is.null,created_at.gte.${bufferedFromUtc},created_at.lte.${bufferedToUtc})`,
      ].join(",");

      try {
        const [
          orders,
          payments,
          cariTransactions,
          cariAccounts,
          financialRecords,
          suppliers,
          supplierTransactions,
        ] = await Promise.all([
          fetchAllPages<RawOrderSummaryRow>((start, end) =>
            supabase
              .from("orders")
              .select("id, total_amount, status, cari_id, delivery_date")
              .eq("status", "teslim_edildi")
              .is("cari_id", null)
              .gte("delivery_date", from)
              .lte("delivery_date", to)
              .order("delivery_date", { ascending: false })
              .order("id", { ascending: true })
              .range(start, end)
          ),
          fetchAllPages<RawPaymentSummaryRow>((start, end) =>
            supabase
              .from("payments")
              .select("id, amount, method, status, paid_at, created_at, cari_transaction_id")
              .eq("status", "completed")
              .is("cari_transaction_id", null)
              .or(paymentDateOrFilter)
              .order("id", { ascending: true })
              .range(start, end)
          ),
          fetchAllPages<RawCariTransactionSummaryRow>((start, end) =>
            supabase
              .from("account_transactions")
              .select("id, account_id, type, amount, delta, payment_method, reverses_id, date")
              .order("date", { ascending: false })
              .order("id", { ascending: true })
              .range(start, end)
          ),
          fetchAllPages<RawCariAccountSummaryRow>((start, end) =>
            supabase
              .from("current_accounts")
              .select("id, name, balance, account_type, archived_at")
              .order("id", { ascending: true })
              .range(start, end)
          ),
          fetchAllPages<RawFinancialRecordRow>((start, end) =>
            supabase
              .from("financial_records")
              .select("id, type, category, amount, description, payment_method, date, created_at, reverses_id")
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .range(start, end)
          ),
          fetchAllPages<RawSupplierRow>((start, end) =>
            supabase
              .from("suppliers")
              .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
              .order("name", { ascending: true })
              .order("id", { ascending: true })
              .range(start, end)
          ),
          fetchAllPages<RawSupplierTransactionRow>((start, end) =>
            supabase
              .from("supplier_transactions")
              .select(
                "id, supplier_id, type, amount, invoice_no, description, date, created_at, reverses_id, balance_after, payment_method, expense_category, linked_financial_record_id"
              )
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .range(start, end)
          ),
        ]);

        return {
          orders,
          payments,
          cariTransactions,
          cariAccounts,
          financialRecords,
          suppliers,
          supplierTransactions,
        };
      } catch (err: unknown) {
        logError("GET /api/admin/finance query error:", err);
        throw new FinanceRepoError(500, "Finans verileri yüklenemedi", "FINANCE_QUERY_FAILED", err);
      }
    },

    async recordFinancialRecordAtomic(input) {
      const { data, error } = await supabase.rpc("record_financial_record_atomic", {
        p_type: input.type,
        p_category: input.category,
        p_amount: input.amount,
        p_description: input.description,
        p_payment_method: input.paymentMethod,
        p_date: input.date,
        p_created_by: input.createdBy,
      });

      if (error) {
        throw mapFinanceRpcError(error, "Finans kaydı oluşturulamadı", "FINANCE_INSERT_FAILED");
      }

      if (!isRawFinancialRecordRow(data)) {
        logError("record_financial_record_atomic invalid response:", data);
        throw new FinanceRepoError(
          500,
          "Finans kaydı oluşturulamadı",
          "FINANCE_RPC_INVALID_RESPONSE",
          data
        );
      }

      return data;
    },

    async stornoFinancialRecordAtomic(input) {
      const { data, error } = await supabase.rpc("storno_financial_record_atomic", {
        p_record_id: input.recordId,
        p_reason: input.reason,
        p_date: input.date,
        p_created_by: input.createdBy,
      });

      if (error) {
        throw mapFinanceRpcError(error, "Storno kaydı oluşturulamadı", "STORNO_INSERT_FAILED");
      }

      if (!isRawFinancialRecordRow(data)) {
        logError("storno_financial_record_atomic invalid response:", data);
        throw new FinanceRepoError(
          500,
          "Storno kaydı oluşturulamadı",
          "STORNO_RPC_INVALID_RESPONSE",
          data
        );
      }

      return data;
    },

    async supplierExists(supplierId) {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .maybeSingle();

      if (error) {
        logError("suppliers lookup error:", error);
        throw new FinanceRepoError(500, "Tedarikçi sorgulanamadı", "SUPPLIER_LOOKUP_FAILED", error);
      }

      return Boolean(data);
    },

    async updateSupplierMeta(supplierId, payload) {
      const { data, error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", supplierId)
        .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
        .single();

      if (error || !data) {
        logError("suppliers update failed:", error);
        throw new FinanceRepoError(
          500,
          error?.message || "Tedarikçi güncellenemedi",
          "SUPPLIER_UPDATE_FAILED",
          error
        );
      }

      return data as RawSupplierRow;
    },

    async insertSupplier(payload) {
      const { data, error } = await supabase
        .from("suppliers")
        .insert(payload)
        .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
        .single();

      if (error || !data) {
        logError("suppliers insert failed:", error);
        throw new FinanceRepoError(
          500,
          error?.message || "Tedarikçi oluşturulamadı",
          "SUPPLIER_CREATE_FAILED",
          error
        );
      }

      return data as RawSupplierRow;
    },

    async recordSupplierTransactionAtomic(input) {
      const { data, error } = await supabase.rpc("record_supplier_transaction_atomic", {
        p_supplier_id: input.supplierId,
        p_type: input.type,
        p_amount: input.amount,
        p_invoice_no: input.invoiceNo,
        p_description: input.description,
        p_date: input.date,
        p_payment_method: input.paymentMethod,
        p_expense_category: input.expenseCategory,
        p_also_record_expense: input.alsoRecordExpense,
        p_created_by: input.createdBy,
      });

      if (error) {
        throw mapFinanceRpcError(error, "Tedarikçi hareketi kaydedilemedi", "SUPPLIER_TX_FAILED");
      }

      const rpcPayload =
        data && typeof data === "object"
          ? (data as {
              transaction?: unknown;
              new_balance?: number | string | null;
              recorded_expense_id?: unknown;
            })
          : null;

      if (!rpcPayload || !isRawSupplierTransactionRow(rpcPayload.transaction)) {
        logError("record_supplier_transaction_atomic invalid response:", data);
        throw new FinanceRepoError(
          500,
          "Tedarikçi hareketi kaydedilemedi",
          "SUPPLIER_TX_INVALID_RESPONSE",
          data
        );
      }

      return {
        transaction: rpcPayload.transaction,
        newBalance: round2(Number(rpcPayload.new_balance) || 0),
        recordedExpenseId: parseOptionalId(rpcPayload.recorded_expense_id),
      };
    },

    async stornoSupplierTransactionAtomic(input) {
      const { data, error } = await supabase.rpc("storno_supplier_transaction_atomic", {
        p_supplier_id: input.supplierId,
        p_transaction_id: input.transactionId,
        p_reason: input.reason,
        p_date: input.date,
        p_created_by: input.createdBy,
      });

      if (error) {
        throw mapFinanceRpcError(
          error,
          "Tedarikçi storno kaydı oluşturulamadı",
          "SUPPLIER_STORNO_FAILED"
        );
      }

      const rpcPayload =
        data && typeof data === "object"
          ? (data as {
              transaction?: unknown;
              new_balance?: number | string | null;
              reversed_expense_id?: unknown;
            })
          : null;

      if (!rpcPayload || !isRawSupplierTransactionRow(rpcPayload.transaction)) {
        logError("storno_supplier_transaction_atomic invalid response:", data);
        throw new FinanceRepoError(
          500,
          "Tedarikçi storno kaydı oluşturulamadı",
          "SUPPLIER_STORNO_INVALID_RESPONSE",
          data
        );
      }

      return {
        transaction: rpcPayload.transaction,
        newBalance: round2(Number(rpcPayload.new_balance) || 0),
        reversedExpenseId: parseOptionalId(rpcPayload.reversed_expense_id),
      };
    },

    async writeAudit(input) {
      await writeAuditLog(supabase, input);
    },
  };
}
