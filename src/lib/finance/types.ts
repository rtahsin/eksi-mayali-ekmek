import type {
  CfoPeriodSummary,
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  FinancialRecordType,
  Supplier,
  SupplierTransaction,
  SupplierTransactionType,
} from "@/types/admin";

export type {
  CfoPeriodSummary,
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  FinancialRecordType,
  Supplier,
  SupplierTransaction,
  SupplierTransactionType,
};

export interface RawFinancialRecordRow {
  id: string;
  type: string;
  category: string;
  amount: number | string;
  description: string | null;
  payment_method: string | null;
  date: string | null;
  created_at: string | null;
}

export interface RawSupplierRow {
  id: string;
  name: string;
  category: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number | string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RawSupplierTransactionRow {
  id: string;
  supplier_id: string;
  type: string;
  amount: number | string;
  invoice_no: string | null;
  description: string | null;
  date: string | null;
  created_at: string | null;
}

export interface RawOrderSummaryRow {
  id: string;
  total_amount: number | string | null;
  status: string;
  cari_id: string | null;
  delivery_date: string | null;
}

export interface RawPaymentSummaryRow {
  id: string;
  amount: number | string | null;
  method?: string | null;
  status: string;
  paid_at?: string | null;
  created_at?: string | null;
  cari_transaction_id?: string | null;
}

export interface RawCariTransactionSummaryRow {
  id: string;
  account_id: string;
  type: string;
  amount: number | string | null;
  delta?: number | string | null;
  reverses_id?: string | null;
  date: string | null;
}

export interface RawCariAccountSummaryRow {
  id: string;
  name?: string | null;
  balance: number | string | null;
  account_type?: string | null;
  archived_at?: string | null;
}

export interface ComputeCfoSummaryInput {
  periodFrom: string;
  periodTo: string;
  orders: readonly RawOrderSummaryRow[];
  payments: readonly RawPaymentSummaryRow[];
  cariTransactions: readonly RawCariTransactionSummaryRow[];
  cariAccounts: readonly RawCariAccountSummaryRow[];
  financialRecords: readonly RawFinancialRecordRow[];
  suppliers: readonly RawSupplierRow[];
}

export interface FinanceOverviewPayload {
  success: true;
  summary: CfoPeriodSummary;
  records: FinancialRecord[];
  suppliers: Supplier[];
  supplierTransactions: SupplierTransaction[];
}

export interface FinanceRecordActionPayload {
  success: true;
  record: FinancialRecord;
}

export interface SupplierUpsertPayload {
  success: true;
  supplier: Supplier;
}

export interface SupplierTxRecordPayload {
  success: true;
  transaction: SupplierTransaction;
  newBalance: number;
  recordedExpenseId: string | null;
}

export interface SupplierTxStornoPayload {
  success: true;
  transaction: SupplierTransaction;
  newBalance: number;
}
