import crypto from "node:crypto";
import type { AuditLogInput } from "@/lib/security/audit";
import type {
  RawCariAccountSummaryRow,
  RawCariTransactionSummaryRow,
  RawFinancialRecordRow,
  RawOrderSummaryRow,
  RawPaymentSummaryRow,
  RawSupplierRow,
  RawSupplierTransactionRow,
} from "../types";
import type { FinanceRepository } from "../repo";

export interface FakeFinanceSeed {
  orders?: RawOrderSummaryRow[];
  payments?: RawPaymentSummaryRow[];
  cariTransactions?: RawCariTransactionSummaryRow[];
  cariAccounts?: RawCariAccountSummaryRow[];
  financialRecords?: RawFinancialRecordRow[];
  suppliers?: RawSupplierRow[];
  supplierTransactions?: RawSupplierTransactionRow[];
}

export interface FakeFinanceStore {
  repo: FinanceRepository;
  auditLogs: AuditLogInput[];
  financialRecords: RawFinancialRecordRow[];
  suppliers: RawSupplierRow[];
  supplierTransactions: RawSupplierTransactionRow[];
}

export function createFakeFinanceRepository(seed: FakeFinanceSeed = {}): FakeFinanceStore {
  const orders = [...(seed.orders ?? [])];
  const payments = [...(seed.payments ?? [])];
  const cariTransactions = [...(seed.cariTransactions ?? [])];
  const cariAccounts = [...(seed.cariAccounts ?? [])];
  const financialRecords = [...(seed.financialRecords ?? [])];
  const suppliers = [...(seed.suppliers ?? [])];
  const supplierTransactions = [...(seed.supplierTransactions ?? [])];
  const auditLogs: AuditLogInput[] = [];

  const repo: FinanceRepository = {
    async loadOverviewDatasets() {
      return {
        orders: [...orders],
        payments: [...payments],
        cariTransactions: [...cariTransactions],
        cariAccounts: [...cariAccounts],
        financialRecords: [...financialRecords],
        suppliers: [...suppliers],
        supplierTransactions: [...supplierTransactions],
      };
    },

    async insertFinancialRecord(payload) {
      const row: RawFinancialRecordRow = {
        id: crypto.randomUUID(),
        type: payload.type,
        category: payload.category,
        amount: payload.amount,
        description: payload.description,
        payment_method: payload.payment_method,
        date: payload.date,
        created_at: "2026-11-17T10:00:00Z",
      };
      financialRecords.unshift(row);
      return row;
    },

    async findFinancialRecordById(recordId) {
      const found = financialRecords.find((r) => r.id === recordId);
      if (!found) return null;
      return {
        id: found.id,
        type: found.type,
        category: found.category,
        amount: found.amount,
        payment_method: found.payment_method,
        description: found.description,
      };
    },

    async hasFinancialRecordStorno(recordId) {
      const prefix = `[STORNO:${recordId}]`;
      return financialRecords.some((r) => (r.description ?? "").startsWith(prefix));
    },

    async supplierExists(supplierId) {
      return suppliers.some((s) => s.id === supplierId);
    },

    async findSupplierById(supplierId) {
      return suppliers.find((s) => s.id === supplierId) ?? null;
    },

    async updateSupplierMeta(supplierId, payload) {
      const target = suppliers.find((s) => s.id === supplierId);
      if (!target) throw new Error("Supplier not found");
      target.name = payload.name;
      target.category = payload.category;
      target.contact_person = payload.contact_person;
      target.phone = payload.phone;
      target.email = payload.email;
      target.address = payload.address;
      target.updated_at = payload.updated_at;
      return { ...target };
    },

    async insertSupplier(payload) {
      const now = "2026-11-17T10:00:00Z";
      const row: RawSupplierRow = {
        id: payload.id,
        name: payload.name,
        category: payload.category,
        contact_person: payload.contact_person,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        balance: payload.balance,
        created_at: now,
        updated_at: now,
      };
      suppliers.push(row);
      return { ...row };
    },

    async insertSupplierTransaction(payload) {
      const row: RawSupplierTransactionRow = {
        id: crypto.randomUUID(),
        supplier_id: payload.supplier_id,
        type: payload.type,
        amount: payload.amount,
        invoice_no: payload.invoice_no,
        description: payload.description,
        date: payload.date,
        created_at: "2026-11-17T10:00:00Z",
      };
      supplierTransactions.unshift(row);
      return { ...row };
    },

    async listSupplierTransactionAmounts(supplierId) {
      return supplierTransactions
        .filter((tx) => tx.supplier_id === supplierId)
        .map((tx) => ({ type: tx.type, amount: tx.amount }));
    },

    async updateSupplierBalance(supplierId, balance, updatedAt) {
      const target = suppliers.find((s) => s.id === supplierId);
      if (target) {
        target.balance = balance;
        target.updated_at = updatedAt;
      }
    },

    async tryInsertLinkedSupplierExpense(payload) {
      const row: RawFinancialRecordRow = {
        id: crypto.randomUUID(),
        type: payload.type,
        category: payload.category,
        amount: payload.amount,
        description: payload.description,
        payment_method: payload.payment_method,
        date: payload.date,
        created_at: "2026-11-17T10:00:00Z",
      };
      financialRecords.unshift(row);
      return row.id;
    },

    async findSupplierTransaction(supplierId, transactionId) {
      const found = supplierTransactions.find(
        (tx) => tx.id === transactionId && tx.supplier_id === supplierId
      );
      if (!found) return null;
      return {
        id: found.id,
        supplier_id: found.supplier_id,
        type: found.type,
        amount: found.amount,
        invoice_no: found.invoice_no,
        description: found.description,
      };
    },

    async hasSupplierTransactionStorno(supplierId, stornoTag) {
      return supplierTransactions.some(
        (tx) => tx.supplier_id === supplierId && tx.invoice_no === stornoTag
      );
    },

    async writeAudit(input) {
      auditLogs.push(input);
    },
  };

  return {
    repo,
    auditLogs,
    financialRecords,
    suppliers,
    supplierTransactions,
  };
}
