import "server-only";

import crypto from "node:crypto";
import { istanbulToday } from "@/lib/time/istanbul";
import {
  computeCfoSummary,
  mapSupplierRow,
  normalizeFinancialRecords,
  normalizeSupplierTransactions,
} from "./domain";
import {
  FinancePostSchema,
  SuppliersPostSchema,
  parseFinanceDateRange,
} from "./schema";
import {
  FinanceRepoError,
  type FinanceRepository,
  type RecordSupplierTransactionAtomicResult,
  type StornoSupplierTransactionAtomicResult,
} from "./repo";
import type {
  FinanceOverviewPayload,
  FinanceRecordActionPayload,
  RawFinancialRecordRow,
  SupplierTxRecordPayload,
  SupplierTxStornoPayload,
  SupplierUpsertPayload,
} from "./types";

export interface FinanceActor {
  userId: string | null;
  role: string | null;
}

export type FinanceActionResult<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; body: { error: string; code?: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toNullableUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

function toRepoErrorResult<T>(err: unknown): FinanceActionResult<T> {
  if (err instanceof FinanceRepoError) {
    return {
      ok: false,
      status: err.status,
      body: {
        error: err.message,
        ...(err.code ? { code: err.code } : {}),
      },
    };
  }
  throw err;
}

export async function getFinanceOverview(
  repo: FinanceRepository,
  params: { from?: string | null; to?: string | null; today?: string }
): Promise<FinanceActionResult<FinanceOverviewPayload>> {
  const resolvedToday = params.today ?? istanbulToday();
  const range = parseFinanceDateRange(params.from, params.to, resolvedToday);
  if (!range.ok) {
    return { ok: false, status: 400, body: { error: range.error, code: range.code } };
  }

  const datasets = await repo.loadOverviewDatasets({ from: range.from, to: range.to });
  const summary = computeCfoSummary({
    periodFrom: range.from,
    periodTo: range.to,
    asOfDate: resolvedToday,
    orders: datasets.orders,
    payments: datasets.payments,
    cariTransactions: datasets.cariTransactions,
    cariAccounts: datasets.cariAccounts,
    financialRecords: datasets.financialRecords,
    suppliers: datasets.suppliers,
    supplierTransactions: datasets.supplierTransactions,
  });

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      summary,
      records: normalizeFinancialRecords(datasets.financialRecords),
      suppliers: datasets.suppliers.map(mapSupplierRow),
      supplierTransactions: normalizeSupplierTransactions(datasets.supplierTransactions),
    },
  };
}

export async function handleFinancePost(
  repo: FinanceRepository,
  actor: FinanceActor,
  rawBody: unknown
): Promise<FinanceActionResult<FinanceRecordActionPayload>> {
  const parsed = FinancePostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: {
        error: parsed.error.issues.map((i) => i.message).join(", "),
        code: "INVALID_PAYLOAD",
      },
    };
  }

  const body = parsed.data;
  const createdBy = toNullableUuid(actor.userId);

  if (body.action === "create_record") {
    const recordDate = body.date ?? istanbulToday();
    let inserted: RawFinancialRecordRow;
    try {
      inserted = await repo.recordFinancialRecordAtomic({
        type: body.type,
        category: body.category,
        amount: body.amount,
        description: body.description,
        paymentMethod: body.paymentMethod,
        date: `${recordDate}T12:00:00+03:00`,
        createdBy,
      });
    } catch (err: unknown) {
      return toRepoErrorResult(err);
    }

    const [normalized] = normalizeFinancialRecords([inserted]);

    await repo.writeAudit({
      actorId: actor.userId,
      actorRole: actor.role ?? "admin",
      action: "finance.record_create",
      entityType: "financial_record",
      entityId: normalized.id,
      summary: `Finans kaydı (${body.type}): ${body.amount} ₺ — ${body.description}`,
      metadata: {
        type: body.type,
        category: body.category,
        amount: body.amount,
        paymentMethod: body.paymentMethod,
        date: recordDate,
      },
    });

    return { ok: true, status: 201, body: { success: true, record: normalized } };
  }

  // Storno (ters kayıt): asıl kayıt silinmez / değiştirilmez; atomik RPC ile kilit altında ters kayıt kesilir
  const today = istanbulToday();
  let insertedStorno: RawFinancialRecordRow;
  try {
    insertedStorno = await repo.stornoFinancialRecordAtomic({
      recordId: body.recordId,
      reason: body.reason,
      date: `${today}T12:00:00+03:00`,
      createdBy,
    });
  } catch (err: unknown) {
    return toRepoErrorResult(err);
  }

  const [normalizedStorno] = normalizeFinancialRecords([insertedStorno]);

  await repo.writeAudit({
    actorId: actor.userId,
    actorRole: actor.role ?? "admin",
    action: "finance.record_storno",
    entityType: "financial_record",
    entityId: normalizedStorno.id,
    summary: `Finans kaydı storno edildi (${body.recordId}: ${normalizedStorno.amount} ₺)`,
    metadata: {
      reversesRecordId: body.recordId,
      stornoType: normalizedStorno.type,
      amount: normalizedStorno.amount,
      reason: body.reason,
    },
  });

  return { ok: true, status: 200, body: { success: true, record: normalizedStorno } };
}

export async function handleSuppliersPost(
  repo: FinanceRepository,
  actor: FinanceActor,
  rawBody: unknown
): Promise<
  FinanceActionResult<SupplierUpsertPayload | SupplierTxRecordPayload | SupplierTxStornoPayload>
> {
  const parsed = SuppliersPostSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: {
        error: parsed.error.issues.map((i) => i.message).join(", "),
        code: "INVALID_PAYLOAD",
      },
    };
  }

  const body = parsed.data;
  const createdBy = toNullableUuid(actor.userId);

  if (body.action === "upsert_supplier") {
    const nowIso = new Date().toISOString();
    try {
      if (body.id) {
        const exists = await repo.supplierExists(body.id);
        if (!exists) {
          return {
            ok: false,
            status: 404,
            body: { error: "Tedarikçi bulunamadı", code: "SUPPLIER_NOT_FOUND" },
          };
        }

        const updated = await repo.updateSupplierMeta(body.id, {
          name: body.name,
          category: body.category,
          contact_person: body.contactPerson || null,
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
          updated_at: nowIso,
        });

        const supplier = mapSupplierRow(updated);
        await repo.writeAudit({
          actorId: actor.userId,
          actorRole: actor.role ?? "admin",
          action: "finance.supplier_update",
          entityType: "supplier",
          entityId: supplier.id,
          summary: `Tedarikçi güncellendi: ${supplier.name}`,
          metadata: { category: supplier.category },
        });

        return { ok: true, status: 200, body: { success: true, supplier } };
      }

      const newId = crypto.randomUUID();
      const created = await repo.insertSupplier({
        id: newId,
        name: body.name,
        category: body.category,
        contact_person: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        balance: 0,
      });

      const supplier = mapSupplierRow(created);
      await repo.writeAudit({
        actorId: actor.userId,
        actorRole: actor.role ?? "admin",
        action: "finance.supplier_create",
        entityType: "supplier",
        entityId: supplier.id,
        summary: `Yeni tedarikçi eklendi: ${supplier.name}`,
        metadata: { category: supplier.category },
      });

      return { ok: true, status: 201, body: { success: true, supplier } };
    } catch (err: unknown) {
      return toRepoErrorResult(err);
    }
  }

  if (body.action === "record_transaction") {
    const txDate = body.date ?? istanbulToday();
    const alsoRecordExpense = body.type === "odeme" && body.alsoRecordExpense;
    const paymentMethod = body.type === "odeme" ? (body.paymentMethod ?? "havale") : null;
    const expenseCategory = body.expenseCategory ?? (alsoRecordExpense ? "diger" : null);

    let rpcResult: RecordSupplierTransactionAtomicResult;
    try {
      rpcResult = await repo.recordSupplierTransactionAtomic({
        supplierId: body.supplierId,
        type: body.type,
        amount: body.amount,
        invoiceNo: body.invoiceNo || null,
        description: body.description || null,
        date: `${txDate}T12:00:00+03:00`,
        paymentMethod,
        expenseCategory,
        alsoRecordExpense,
        createdBy,
      });
    } catch (err: unknown) {
      return toRepoErrorResult(err);
    }

    const [transaction] = normalizeSupplierTransactions([rpcResult.transaction]);

    await repo.writeAudit({
      actorId: actor.userId,
      actorRole: actor.role ?? "admin",
      action: "finance.supplier_tx",
      entityType: "supplier_transaction",
      entityId: transaction.id,
      summary: `Tedarikçi hareketi (${body.supplierId} · ${body.type}): ${body.amount} ₺ (Bakiye: ${rpcResult.newBalance} ₺)`,
      metadata: {
        supplierId: body.supplierId,
        type: body.type,
        amount: body.amount,
        newBalance: rpcResult.newBalance,
        recordedExpenseId: rpcResult.recordedExpenseId,
        paymentMethod,
        expenseCategory,
      },
    });

    return {
      ok: true,
      status: 201,
      body: {
        success: true,
        transaction,
        newBalance: rpcResult.newBalance,
        recordedExpenseId: rpcResult.recordedExpenseId,
      },
    };
  }

  // storno_transaction: tedarikçi hareketine (ve varsa bağlı gidere) atomik ters kayıt
  const today = istanbulToday();
  let stornoResult: StornoSupplierTransactionAtomicResult;
  try {
    stornoResult = await repo.stornoSupplierTransactionAtomic({
      supplierId: body.supplierId,
      transactionId: body.transactionId,
      reason: body.reason,
      date: `${today}T12:00:00+03:00`,
      createdBy,
    });
  } catch (err: unknown) {
    return toRepoErrorResult(err);
  }

  const [transaction] = normalizeSupplierTransactions([stornoResult.transaction]);

  await repo.writeAudit({
    actorId: actor.userId,
    actorRole: actor.role ?? "admin",
    action: "finance.supplier_storno",
    entityType: "supplier_transaction",
    entityId: transaction.id,
    summary: `Tedarikçi hareketi storno edildi (${body.supplierId}: ${transaction.amount} ₺, Bakiye: ${stornoResult.newBalance} ₺)`,
    metadata: {
      supplierId: body.supplierId,
      reversesTransactionId: body.transactionId,
      stornoType: transaction.type,
      amount: transaction.amount,
      newBalance: stornoResult.newBalance,
      reversedExpenseId: stornoResult.reversedExpenseId,
      reason: body.reason,
    },
  });

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      transaction,
      newBalance: stornoResult.newBalance,
      reversedExpenseId: stornoResult.reversedExpenseId,
    },
  };
}
