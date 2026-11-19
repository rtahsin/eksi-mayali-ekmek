import crypto from "node:crypto";
import type { AuditLogInput } from "@/lib/security/audit";
import { round2 } from "../domain";
import { FinanceRepoError, type FinanceRepository } from "../repo";
import type {
  RawCariAccountSummaryRow,
  RawCariTransactionSummaryRow,
  RawFinancialRecordRow,
  RawOrderSummaryRow,
  RawPaymentSummaryRow,
  RawSupplierRow,
  RawSupplierTransactionRow,
} from "../types";

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

    async recordFinancialRecordAtomic(input) {
      if (input.type !== "gider" && input.type !== "gelir") {
        throw new FinanceRepoError(400, "Geçersiz işlem türü", "INVALID_TYPE");
      }
      const amount = round2(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new FinanceRepoError(400, "Tutar sıfırdan büyük olmalı", "INVALID_AMOUNT");
      }

      const row: RawFinancialRecordRow = {
        id: crypto.randomUUID(),
        type: input.type,
        category: input.category || "diger",
        amount,
        description: input.description,
        payment_method: input.paymentMethod || "nakit",
        date: input.date,
        created_at: "2026-11-17T10:00:00Z",
        reverses_id: null,
      };
      financialRecords.unshift(row);
      return { ...row };
    },

    async stornoFinancialRecordAtomic(input) {
      const target = financialRecords.find((r) => r.id === input.recordId);
      if (!target) {
        throw new FinanceRepoError(404, "İptal edilecek finans kaydı bulunamadı", "RECORD_NOT_FOUND");
      }
      if (target.type === "storno_gider" || target.type === "storno_gelir") {
        throw new FinanceRepoError(
          400,
          "Bir iptal (storno) kaydı tekrar iptal edilemez",
          "CANNOT_STORNO_A_STORNO"
        );
      }
      const prefix = `[STORNO:${input.recordId}]`;
      const alreadyReversed = financialRecords.some(
        (r) => r.reverses_id === input.recordId || (r.description ?? "").startsWith(prefix)
      );
      if (alreadyReversed) {
        throw new FinanceRepoError(
          409,
          "Bu kayıt için daha önce storno kesilmiş",
          "ALREADY_REVERSED"
        );
      }

      const stornoRow: RawFinancialRecordRow = {
        id: crypto.randomUUID(),
        type: target.type === "gider" ? "storno_gider" : "storno_gelir",
        category: target.category || "diger",
        amount: round2(Math.abs(Number(target.amount) || 0)),
        description: `${prefix} ${input.reason}`,
        payment_method: target.payment_method || "nakit",
        date: input.date,
        created_at: "2026-11-17T10:05:00Z",
        reverses_id: input.recordId,
      };
      financialRecords.unshift(stornoRow);
      return { ...stornoRow };
    },

    async supplierExists(supplierId) {
      return suppliers.some((s) => s.id === supplierId);
    },

    async updateSupplierMeta(supplierId, payload) {
      const target = suppliers.find((s) => s.id === supplierId);
      if (!target) {
        throw new FinanceRepoError(404, "Tedarikçi bulunamadı", "SUPPLIER_NOT_FOUND");
      }
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

    async recordSupplierTransactionAtomic(input) {
      const supplier = suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) {
        throw new FinanceRepoError(404, "Tedarikçi bulunamadı", "SUPPLIER_NOT_FOUND");
      }
      if (input.type !== "alis" && input.type !== "odeme") {
        throw new FinanceRepoError(400, "Geçersiz işlem türü", "INVALID_TYPE");
      }
      const amount = round2(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new FinanceRepoError(400, "Tutar sıfırdan büyük olmalı", "INVALID_AMOUNT");
      }

      const delta = input.type === "alis" ? amount : -amount;
      const newBalance = round2((Number(supplier.balance) || 0) + delta);
      const rawDesc = input.description?.trim() || null;
      const description =
        rawDesc ?? (input.type === "alis" ? "Mal alım faturası" : "Tedarikçi ödemesi");
      const invoiceNo = input.invoiceNo?.trim() || null;

      let paymentMethod = input.paymentMethod?.trim() || null;
      let expenseCategory = input.expenseCategory?.trim() || null;
      let recordedExpenseId: string | null = null;

      if (input.type === "odeme" && input.alsoRecordExpense) {
        paymentMethod = paymentMethod ?? "havale";
        expenseCategory = expenseCategory ?? "diger";
        const expRow: RawFinancialRecordRow = {
          id: crypto.randomUUID(),
          type: "gider",
          category: expenseCategory,
          amount,
          description: `[Tedarikçi Ödemesi: ${supplier.name}] ${rawDesc ?? invoiceNo ?? "Ödeme çıkışı"}`,
          payment_method: paymentMethod,
          date: input.date,
          created_at: "2026-11-17T10:00:00Z",
          reverses_id: null,
        };
        financialRecords.unshift(expRow);
        recordedExpenseId = expRow.id;
      }

      const txRow: RawSupplierTransactionRow = {
        id: crypto.randomUUID(),
        supplier_id: input.supplierId,
        type: input.type,
        amount,
        invoice_no: invoiceNo,
        description,
        date: input.date,
        created_at: "2026-11-17T10:00:00Z",
        reverses_id: null,
        balance_after: newBalance,
        payment_method: paymentMethod,
        expense_category: expenseCategory,
        linked_financial_record_id: recordedExpenseId,
      };
      supplierTransactions.unshift(txRow);
      supplier.balance = newBalance;
      supplier.updated_at = "2026-11-17T10:00:00Z";

      return {
        transaction: { ...txRow },
        newBalance,
        recordedExpenseId,
      };
    },

    async stornoSupplierTransactionAtomic(input) {
      const supplier = suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) {
        throw new FinanceRepoError(404, "Tedarikçi bulunamadı", "SUPPLIER_NOT_FOUND");
      }
      const target = supplierTransactions.find(
        (tx) => tx.id === input.transactionId && tx.supplier_id === input.supplierId
      );
      if (!target) {
        throw new FinanceRepoError(
          404,
          "İptal edilecek tedarikçi hareketi bulunamadı",
          "TX_NOT_FOUND"
        );
      }
      if (target.type === "storno_alis" || target.type === "storno_odeme") {
        throw new FinanceRepoError(
          400,
          "Bir iptal (storno) kaydı tekrar iptal edilemez",
          "CANNOT_STORNO_A_STORNO"
        );
      }
      const stornoTag = `STORNO:${input.transactionId}`;
      const alreadyReversed = supplierTransactions.some(
        (tx) =>
          tx.reverses_id === input.transactionId ||
          (tx.supplier_id === input.supplierId && tx.invoice_no === stornoTag)
      );
      if (alreadyReversed) {
        throw new FinanceRepoError(
          409,
          "Bu kayıt için daha önce storno kesilmiş",
          "ALREADY_REVERSED"
        );
      }

      let reversedExpenseId: string | null = null;
      if (target.linked_financial_record_id) {
        const linked = financialRecords.find((r) => r.id === target.linked_financial_record_id);
        const linkedPrefix = `[STORNO:${target.linked_financial_record_id}]`;
        const linkedAlreadyReversed = linked
          ? financialRecords.some(
              (r) => r.reverses_id === linked.id || (r.description ?? "").startsWith(linkedPrefix)
            )
          : false;
        if (linked && linked.type === "gider" && !linkedAlreadyReversed) {
          const stornoExp: RawFinancialRecordRow = {
            id: crypto.randomUUID(),
            type: "storno_gider",
            category: linked.category || target.expense_category || "diger",
            amount: round2(Math.abs(Number(linked.amount) || 0)),
            description: `${linkedPrefix} Tedarikçi ödeme iptali (${supplier.name}): ${input.reason}`,
            payment_method: linked.payment_method || target.payment_method || "havale",
            date: input.date,
            created_at: "2026-11-17T10:10:00Z",
            reverses_id: linked.id,
          };
          financialRecords.unshift(stornoExp);
          reversedExpenseId = stornoExp.id;
        }
      }

      const stornoType = target.type === "alis" ? "storno_alis" : "storno_odeme";
      const amount = round2(Math.abs(Number(target.amount) || 0));
      const delta = stornoType === "storno_alis" ? -amount : amount;
      const newBalance = round2((Number(supplier.balance) || 0) + delta);

      const stornoRow: RawSupplierTransactionRow = {
        id: crypto.randomUUID(),
        supplier_id: input.supplierId,
        type: stornoType,
        amount,
        invoice_no: stornoTag,
        description: `[STORNO] ${input.reason}`,
        date: input.date,
        created_at: "2026-11-17T10:10:00Z",
        reverses_id: input.transactionId,
        balance_after: newBalance,
        payment_method: target.payment_method ?? null,
        expense_category: target.expense_category ?? null,
        linked_financial_record_id: reversedExpenseId,
      };
      supplierTransactions.unshift(stornoRow);
      supplier.balance = newBalance;
      supplier.updated_at = "2026-11-17T10:10:00Z";

      return {
        transaction: { ...stornoRow },
        newBalance,
        reversedExpenseId,
      };
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
