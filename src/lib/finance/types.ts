import type {
  CfoPeriodSummary as BaseCfoPeriodSummary,
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  FinancialRecordType,
  Supplier,
  SupplierTransaction as BaseSupplierTransaction,
  SupplierTransactionType,
} from "@/types/admin";

export type CashFlowChannelKey = "nakit" | "kart" | "havale" | "diger";

export interface CashFlowChannelSummary {
  channel: CashFlowChannelKey;
  label: string;
  cashIn: number;
  cashOut: number;
  net: number;
}

export interface B2BReceivablesAgingSummary {
  current0to7: number;
  days8to15: number;
  days16to30: number;
  over30: number;
  total: number;
}

export interface SupplierDateBalanceSummary {
  supplierId: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  periodPurchases: number;
  periodPayments: number;
  periodNet: number;
  closingBalance: number;
}

export interface CfoPeriodSummary extends BaseCfoPeriodSummary {
  /** Direkt gider defteri net gideri (tedarikçi bağlı kopyaları hariç) */
  directOperatingExpenses: number;
  /** Dönem içi tedarikçi tahakkuk alışları (alis − storno_alis net) */
  supplierAccrualPurchases: number;
  /** Dönem içi tedarikçi nakit ödemeleri (odeme − storno_odeme net) */
  supplierCashPayments: number;
  /** Toplam nakit çıkışı = directOperatingExpenses + supplierCashPayments */
  totalCashOut: number;
  /** Tedarikçilere verilen avans toplamı (balance < 0 olanların mutlak değeri) */
  totalSupplierAdvances: number;
  /** Ödeme kanalı bazlı nakit özeti (Σ cashIn === totalCashIn, Σ cashOut === totalCashOut) */
  cashFlowByChannel: CashFlowChannelSummary[];
  /** Arşivlenmemiş müşteri carilerinin FIFO alacak yaşlandırma özeti */
  b2bReceivablesAging: B2BReceivablesAgingSummary;
}

export interface SupplierTransaction extends BaseSupplierTransaction {
  balanceAfter: number | null;
  paymentMethod: string | null;
  expenseCategory: string | null;
  linkedFinancialRecordId: string | null;
}

export type {
  ExpenseCategory,
  FinancialPaymentMethod,
  FinancialRecord,
  FinancialRecordType,
  Supplier,
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
  reverses_id?: string | null;
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
  reverses_id?: string | null;
  balance_after?: number | string | null;
  payment_method?: string | null;
  expense_category?: string | null;
  linked_financial_record_id?: string | null;
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
  payment_method?: string | null;
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
  asOfDate?: string;
  orders: readonly RawOrderSummaryRow[];
  payments: readonly RawPaymentSummaryRow[];
  cariTransactions: readonly RawCariTransactionSummaryRow[];
  cariAccounts: readonly RawCariAccountSummaryRow[];
  financialRecords: readonly RawFinancialRecordRow[];
  suppliers: readonly RawSupplierRow[];
  supplierTransactions: readonly RawSupplierTransactionRow[];
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
  reversedExpenseId?: string | null;
}
