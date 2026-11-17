import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, type AuditLogInput } from "@/lib/security/audit";
import { logError } from "@/lib/kernel/log";
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

export interface FinanceOverviewDatasets {
  orders: RawOrderSummaryRow[];
  payments: RawPaymentSummaryRow[];
  cariTransactions: RawCariTransactionSummaryRow[];
  cariAccounts: RawCariAccountSummaryRow[];
  financialRecords: RawFinancialRecordRow[];
  suppliers: RawSupplierRow[];
  supplierTransactions: RawSupplierTransactionRow[];
}

export interface FinancialRecordLookupRow {
  id: string;
  type: string;
  category: string | null;
  amount: number | string;
  payment_method: string | null;
  description: string | null;
}

export interface SupplierTransactionLookupRow {
  id: string;
  supplier_id: string;
  type: string;
  amount: number | string;
  invoice_no: string | null;
  description: string | null;
}

export interface SupplierTxAmountRow {
  type: string;
  amount: number | string;
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

  insertFinancialRecord(payload: {
    type: string;
    category: string;
    amount: number;
    description: string;
    payment_method: string;
    date: string;
  }): Promise<RawFinancialRecordRow>;

  findFinancialRecordById(recordId: string): Promise<FinancialRecordLookupRow | null>;

  hasFinancialRecordStorno(recordId: string): Promise<boolean>;

  supplierExists(supplierId: string): Promise<boolean>;

  findSupplierById(supplierId: string): Promise<RawSupplierRow | null>;

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

  insertSupplierTransaction(payload: {
    supplier_id: string;
    type: string;
    amount: number;
    invoice_no: string | null;
    description: string;
    date: string;
  }): Promise<RawSupplierTransactionRow>;

  listSupplierTransactionAmounts(supplierId: string): Promise<SupplierTxAmountRow[]>;

  updateSupplierBalance(supplierId: string, balance: number, updatedAt: string): Promise<void>;

  tryInsertLinkedSupplierExpense(payload: {
    type: "gider";
    category: string;
    amount: number;
    payment_method: string;
    date: string;
    description: string;
  }): Promise<string | null>;

  findSupplierTransaction(supplierId: string, transactionId: string): Promise<SupplierTransactionLookupRow | null>;

  hasSupplierTransactionStorno(supplierId: string, stornoTag: string): Promise<boolean>;

  writeAudit(input: AuditLogInput): Promise<void>;
}

export function createSupabaseFinanceRepository(supabase: FinanceAdminClient): FinanceRepository {
  return {
    async loadOverviewDatasets({ from, to }) {
      const [
        ordersRes,
        paymentsRes,
        cariTxRes,
        cariAccRes,
        recordsRes,
        suppliersRes,
        supplierTxRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total_amount, status, cari_id, delivery_date")
          .eq("status", "teslim_edildi")
          .is("cari_id", null)
          .gte("delivery_date", from)
          .lte("delivery_date", to),
        supabase
          .from("payments")
          .select("id, amount, method, status, paid_at, created_at, cari_transaction_id")
          .eq("status", "completed")
          .is("cari_transaction_id", null),
        supabase
          .from("account_transactions")
          .select("id, account_id, type, amount, delta, reverses_id, date"),
        supabase
          .from("current_accounts")
          .select("id, name, balance, account_type, archived_at"),
        supabase
          .from("financial_records")
          .select("id, type, category, amount, description, payment_method, date, created_at")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("suppliers")
          .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
          .order("name", { ascending: true }),
        supabase
          .from("supplier_transactions")
          .select("id, supplier_id, type, amount, invoice_no, description, date, created_at")
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      const firstError =
        ordersRes.error ||
        paymentsRes.error ||
        cariTxRes.error ||
        cariAccRes.error ||
        recordsRes.error ||
        suppliersRes.error ||
        supplierTxRes.error;

      if (firstError) {
        logError("GET /api/admin/finance query error:", firstError);
        throw new FinanceRepoError(500, "Finans verileri yüklenemedi", "FINANCE_QUERY_FAILED", firstError);
      }

      return {
        orders: (ordersRes.data ?? []) as RawOrderSummaryRow[],
        payments: (paymentsRes.data ?? []) as RawPaymentSummaryRow[],
        cariTransactions: (cariTxRes.data ?? []) as RawCariTransactionSummaryRow[],
        cariAccounts: (cariAccRes.data ?? []) as RawCariAccountSummaryRow[],
        financialRecords: (recordsRes.data ?? []) as RawFinancialRecordRow[],
        suppliers: (suppliersRes.data ?? []) as RawSupplierRow[],
        supplierTransactions: (supplierTxRes.data ?? []) as RawSupplierTransactionRow[],
      };
    },

    async insertFinancialRecord(payload) {
      const { data, error } = await supabase
        .from("financial_records")
        .insert(payload)
        .select("id, type, category, amount, description, payment_method, date, created_at")
        .single();

      if (error || !data) {
        logError("financial_records insert failed:", error);
        const code = payload.type.startsWith("storno_") ? "STORNO_INSERT_FAILED" : "FINANCE_INSERT_FAILED";
        const fallbackMsg = payload.type.startsWith("storno_")
          ? "Storno kaydı oluşturulamadı"
          : "Finans kaydı oluşturulamadı";
        throw new FinanceRepoError(
          500,
          error?.message || fallbackMsg,
          code,
          error ?? new Error("financial_records insert returned null")
        );
      }

      return data as RawFinancialRecordRow;
    },

    async findFinancialRecordById(recordId) {
      const { data, error } = await supabase
        .from("financial_records")
        .select("id, type, category, amount, payment_method, description")
        .eq("id", recordId)
        .maybeSingle();

      if (error) {
        logError("financial_records storno lookup error:", error);
        throw new FinanceRepoError(500, "Kayıt sorgulanamadı", "LOOKUP_FAILED", error);
      }

      return (data as FinancialRecordLookupRow | null) ?? null;
    },

    async hasFinancialRecordStorno(recordId) {
      const { data, error } = await supabase
        .from("financial_records")
        .select("id")
        .like("description", `[STORNO:${recordId}]%`)
        .limit(1);

      if (error) {
        logError("financial_records duplicate storno check error:", error);
        throw new FinanceRepoError(500, "Storno kontrolü yapılamadı", "STORNO_CHECK_FAILED", error);
      }

      return Array.isArray(data) && data.length > 0;
    },

    async supplierExists(supplierId) {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .maybeSingle();

      if (error) {
        logError("suppliers lookup error:", error);
        throw new FinanceRepoError(500, "Tedarikçi sorgulanamadı", undefined, error);
      }

      return Boolean(data);
    },

    async findSupplierById(supplierId) {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
        .eq("id", supplierId)
        .maybeSingle();

      if (error) {
        logError("supplier fetch failed:", error);
        throw new FinanceRepoError(500, "Tedarikçi sorgulanamadı", undefined, error);
      }

      return (data as RawSupplierRow | null) ?? null;
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

    async insertSupplierTransaction(payload) {
      const { data, error } = await supabase
        .from("supplier_transactions")
        .insert(payload)
        .select("id, supplier_id, type, amount, invoice_no, description, date, created_at")
        .single();

      if (error || !data) {
        logError("supplier_transactions insert failed:", error);
        const code = payload.type.startsWith("storno_") ? "STORNO_INSERT_FAILED" : "SUPPLIER_TX_FAILED";
        const fallbackMsg = payload.type.startsWith("storno_")
          ? "Tedarikçi storno kaydı oluşturulamadı"
          : "Tedarikçi hareketi kaydedilemedi";
        throw new FinanceRepoError(500, error?.message || fallbackMsg, code, error);
      }

      return data as RawSupplierTransactionRow;
    },

    async listSupplierTransactionAmounts(supplierId) {
      const { data, error } = await supabase
        .from("supplier_transactions")
        .select("type, amount")
        .eq("supplier_id", supplierId);

      if (error || !data) {
        logError("supplier_transactions balance query failed:", error);
        throw new FinanceRepoError(
          500,
          "Tedarikçi bakiyesi yeniden hesaplanamadı",
          "SUPPLIER_BALANCE_FAILED",
          error
        );
      }

      return data as SupplierTxAmountRow[];
    },

    async updateSupplierBalance(supplierId, balance, updatedAt) {
      const { error } = await supabase
        .from("suppliers")
        .update({ balance, updated_at: updatedAt })
        .eq("id", supplierId);

      if (error) {
        logError("suppliers balance update failed:", error);
        throw new FinanceRepoError(
          500,
          "Tedarikçi bakiyesi güncellenemedi",
          "SUPPLIER_BALANCE_UPDATE_FAILED",
          error
        );
      }
    },

    async tryInsertLinkedSupplierExpense(payload) {
      const { data, error } = await supabase
        .from("financial_records")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        logError("linked supplier expense insert warning:", error);
        return null;
      }

      return data && typeof (data as { id?: unknown }).id === "string" ? (data as { id: string }).id : null;
    },

    async findSupplierTransaction(supplierId, transactionId) {
      const { data, error } = await supabase
        .from("supplier_transactions")
        .select("id, supplier_id, type, amount, invoice_no, description")
        .eq("id", transactionId)
        .eq("supplier_id", supplierId)
        .maybeSingle();

      if (error) {
        logError("supplier_transactions storno lookup failed:", error);
        throw new FinanceRepoError(500, "Hareket sorgulanamadı", undefined, error);
      }

      return (data as SupplierTransactionLookupRow | null) ?? null;
    },

    async hasSupplierTransactionStorno(supplierId, stornoTag) {
      const { data, error } = await supabase
        .from("supplier_transactions")
        .select("id")
        .eq("supplier_id", supplierId)
        .eq("invoice_no", stornoTag)
        .limit(1);

      if (error) {
        logError("supplier storno dup check error:", error);
        throw new FinanceRepoError(500, "Storno kontrolü yapılamadı", undefined, error);
      }

      return Array.isArray(data) && data.length > 0;
    },

    async writeAudit(input) {
      await writeAuditLog(supabase, input);
    },
  };
}
