import "server-only";

import crypto from "node:crypto";
import { istanbulToday } from "@/lib/time/istanbul";
import {
  computeCfoSummary,
  computeSupplierSymmetricBalance,
  mapSupplierRow,
  normalizeFinancialRecords,
  normalizeSupplierTransactions,
  round2,
} from "./domain";
import {
  FinancePostSchema,
  SuppliersPostSchema,
  parseFinanceDateRange,
} from "./schema";
import type { FinanceRepository } from "./repo";
import type {
  FinanceOverviewPayload,
  FinanceRecordActionPayload,
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

export async function getFinanceOverview(
  repo: FinanceRepository,
  params: { from?: string | null; to?: string | null; today?: string }
): Promise<FinanceActionResult<FinanceOverviewPayload>> {
  const range = parseFinanceDateRange(params.from, params.to, params.today ?? istanbulToday());
  if (!range.ok) {
    return { ok: false, status: 400, body: { error: range.error, code: range.code } };
  }

  const datasets = await repo.loadOverviewDatasets({ from: range.from, to: range.to });
  const summary = computeCfoSummary({
    periodFrom: range.from,
    periodTo: range.to,
    orders: datasets.orders,
    payments: datasets.payments,
    cariTransactions: datasets.cariTransactions,
    cariAccounts: datasets.cariAccounts,
    financialRecords: datasets.financialRecords,
    suppliers: datasets.suppliers,
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
  if (body.action === "create_record") {
    const recordDate = body.date ?? istanbulToday();
    const inserted = await repo.insertFinancialRecord({
      type: body.type,
      category: body.category,
      amount: body.amount,
      description: body.description,
      payment_method: body.paymentMethod,
      date: `${recordDate}T12:00:00+03:00`,
    });

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

  // Storno (ters kayıt): asıl kayıt silinmez / değiştirilmez
  const targetRow = await repo.findFinancialRecordById(body.recordId);
  if (!targetRow) {
    return {
      ok: false,
      status: 404,
      body: { error: "İptal edilecek finans kaydı bulunamadı", code: "RECORD_NOT_FOUND" },
    };
  }

  if (targetRow.type === "storno_gider" || targetRow.type === "storno_gelir") {
    return {
      ok: false,
      status: 400,
      body: { error: "Bir iptal (storno) kaydı tekrar iptal edilemez", code: "CANNOT_STORNO_A_STORNO" },
    };
  }

  const alreadyReversed = await repo.hasFinancialRecordStorno(body.recordId);
  if (alreadyReversed) {
    return {
      ok: false,
      status: 409,
      body: { error: "Bu kayıt için daha önce storno kesilmiş", code: "ALREADY_REVERSED" },
    };
  }

  const stornoType = targetRow.type === "gider" ? "storno_gider" : "storno_gelir";
  const stornoAmount = round2(Math.abs(Number(targetRow.amount) || 0));
  const today = istanbulToday();

  const insertedStorno = await repo.insertFinancialRecord({
    type: stornoType,
    category: targetRow.category || "diger",
    amount: stornoAmount,
    payment_method: targetRow.payment_method || "nakit",
    date: `${today}T12:00:00+03:00`,
    description: `[STORNO:${body.recordId}] ${body.reason}`,
  });

  const [normalizedStorno] = normalizeFinancialRecords([insertedStorno]);

  await repo.writeAudit({
    actorId: actor.userId,
    actorRole: actor.role ?? "admin",
    action: "finance.record_storno",
    entityType: "financial_record",
    entityId: normalizedStorno.id,
    summary: `Finans kaydı storno edildi (${body.recordId}: ${stornoAmount} ₺)`,
    metadata: {
      reversesRecordId: body.recordId,
      stornoType,
      amount: stornoAmount,
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

  if (body.action === "upsert_supplier") {
    const nowIso = new Date().toISOString();
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
  }

  const supplierRow = await repo.findSupplierById(body.supplierId);
  if (!supplierRow) {
    return {
      ok: false,
      status: 404,
      body: { error: "Tedarikçi bulunamadı", code: "SUPPLIER_NOT_FOUND" },
    };
  }

  if (body.action === "record_transaction") {
    const txDate = body.date ?? istanbulToday();
    const insertedTx = await repo.insertSupplierTransaction({
      supplier_id: body.supplierId,
      type: body.type,
      amount: body.amount,
      invoice_no: body.invoiceNo || null,
      description: body.description || (body.type === "alis" ? "Mal alım faturası" : "Tedarikçi ödemesi"),
      date: `${txDate}T12:00:00+03:00`,
    });

    const allTxRows = await repo.listSupplierTransactionAmounts(body.supplierId);
    const newBalance = computeSupplierSymmetricBalance(allTxRows);
    await repo.updateSupplierBalance(body.supplierId, newBalance, new Date().toISOString());

    let recordedExpenseId: string | null = null;
    if (body.type === "odeme" && body.alsoRecordExpense) {
      const expDesc = `[Tedarikçi Ödemesi: ${supplierRow.name}] ${
        body.description || body.invoiceNo || "Ödeme çıkışı"
      }`.trim();
      recordedExpenseId = await repo.tryInsertLinkedSupplierExpense({
        type: "gider",
        category: body.expenseCategory,
        amount: body.amount,
        payment_method: body.paymentMethod,
        date: `${txDate}T12:00:00+03:00`,
        description: expDesc,
      });
    }

    const [transaction] = normalizeSupplierTransactions([insertedTx]);

    await repo.writeAudit({
      actorId: actor.userId,
      actorRole: actor.role ?? "admin",
      action: "finance.supplier_tx",
      entityType: "supplier_transaction",
      entityId: transaction.id,
      summary: `Tedarikçi hareketi (${supplierRow.name} · ${body.type}): ${body.amount} ₺ (Bakiye: ${newBalance} ₺)`,
      metadata: {
        supplierId: body.supplierId,
        type: body.type,
        amount: body.amount,
        newBalance,
        recordedExpenseId,
      },
    });

    return {
      ok: true,
      status: 201,
      body: {
        success: true,
        transaction,
        newBalance,
        recordedExpenseId,
      },
    };
  }

  // storno_transaction: tedarikçi hareketine ters kayıt
  const targetTx = await repo.findSupplierTransaction(body.supplierId, body.transactionId);
  if (!targetTx) {
    return {
      ok: false,
      status: 404,
      body: { error: "İptal edilecek tedarikçi hareketi bulunamadı", code: "TX_NOT_FOUND" },
    };
  }

  if (targetTx.type === "storno_alis" || targetTx.type === "storno_odeme") {
    return {
      ok: false,
      status: 400,
      body: { error: "Storno kaydı tekrar storno edilemez", code: "CANNOT_STORNO_A_STORNO" },
    };
  }

  const stornoTag = `STORNO:${body.transactionId}`;
  const duplicateStorno = await repo.hasSupplierTransactionStorno(body.supplierId, stornoTag);
  if (duplicateStorno) {
    return {
      ok: false,
      status: 409,
      body: { error: "Bu tedarikçi hareketi zaten iptal edilmiş", code: "ALREADY_REVERSED" },
    };
  }

  const stornoType = targetTx.type === "alis" ? "storno_alis" : "storno_odeme";
  const stornoAmount = round2(Math.abs(Number(targetTx.amount) || 0));
  const today = istanbulToday();

  const insertedStorno = await repo.insertSupplierTransaction({
    supplier_id: body.supplierId,
    type: stornoType,
    amount: stornoAmount,
    invoice_no: stornoTag,
    description: `[STORNO] ${body.reason}`,
    date: `${today}T12:00:00+03:00`,
  });

  const allTxRows = await repo.listSupplierTransactionAmounts(body.supplierId);
  const newBalance = computeSupplierSymmetricBalance(allTxRows);
  await repo.updateSupplierBalance(body.supplierId, newBalance, new Date().toISOString());

  const [transaction] = normalizeSupplierTransactions([insertedStorno]);

  await repo.writeAudit({
    actorId: actor.userId,
    actorRole: actor.role ?? "admin",
    action: "finance.supplier_storno",
    entityType: "supplier_transaction",
    entityId: transaction.id,
    summary: `Tedarikçi hareketi storno edildi (${supplierRow.name}: ${stornoAmount} ₺, Bakiye: ${newBalance} ₺)`,
    metadata: {
      supplierId: body.supplierId,
      reversesTransactionId: body.transactionId,
      stornoType,
      amount: stornoAmount,
      newBalance,
      reason: body.reason,
    },
  });

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      transaction,
      newBalance,
    },
  };
}
