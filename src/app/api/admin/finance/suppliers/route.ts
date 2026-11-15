import crypto from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { logError } from "@/lib/kernel/log";
import { isIsoDate, istanbulToday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import {
  computeSupplierSymmetricBalance,
  EXPENSE_CATEGORIES,
  mapSupplierRow,
  normalizeSupplierTransactions,
  type RawSupplierRow,
  type RawSupplierTransactionRow,
} from "@/lib/cari/finance";

const cents = (v: number) => Math.round(v * 100) / 100;
const IsoDateSchema = z.string().trim().refine(isIsoDate, "Tarih YYYY-AA-GG formatında olmalı");

const UpsertSupplierSchema = z.object({
  action: z.literal("upsert_supplier"),
  id: z.string().trim().min(1).max(80).optional(),
  name: z.string().trim().min(2, "Tedarikçi adı en az 2 karakter olmalı").max(120),
  category: z.string().trim().max(80).optional().default("Un & Tahıl"),
  contactPerson: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
});

const RecordSupplierTxSchema = z.object({
  action: z.literal("record_transaction"),
  supplierId: z.string().trim().min(1).max(80),
  type: z.enum(["alis", "odeme"]),
  amount: z.coerce
    .number()
    .finite("Geçerli bir tutar giriniz")
    .positive("Tutar sıfırdan büyük olmalı")
    .max(10_000_000, "Tutar sınırı aşıyor")
    .transform(cents),
  invoiceNo: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(240).optional().default(""),
  date: IsoDateSchema.optional(),
  alsoRecordExpense: z.boolean().optional().default(false),
  expenseCategory: z.enum(EXPENSE_CATEGORIES).optional().default("diger"),
  paymentMethod: z.enum(["nakit", "kredi_karti", "havale", "pos"]).optional().default("havale"),
});

const StornoSupplierTxSchema = z.object({
  action: z.literal("storno_transaction"),
  supplierId: z.string().trim().min(1).max(80),
  transactionId: z.string().uuid("Geçersiz hareket kimliği"),
  reason: z.string().trim().min(2, "Storno nedeni yazınız").max(200),
});

const SuppliersPostSchema = z.discriminatedUnion("action", [
  UpsertSupplierSchema,
  RecordSupplierTxSchema,
  StornoSupplierTxSchema,
]);

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = SuppliersPostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", "), code: "INVALID_PAYLOAD" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    const body = parsed.data;

    if (body.action === "upsert_supplier") {
      const nowIso = new Date().toISOString();
      if (body.id) {
        const { data: existing, error: lookupErr } = await supabase
          .from("suppliers")
          .select("id")
          .eq("id", body.id)
          .maybeSingle();

        if (lookupErr) {
          logError("suppliers lookup error:", lookupErr);
          return NextResponse.json({ error: "Tedarikçi sorgulanamadı" }, { status: 500 });
        }
        if (!existing) {
          return NextResponse.json(
            { error: "Tedarikçi bulunamadı", code: "SUPPLIER_NOT_FOUND" },
            { status: 404 }
          );
        }

        // Bakiye yalnızca tedarikçi hareketlerinden hesaplanır; meta güncellemesinde değiştirilmez.
        const { data: updated, error: updateErr } = await supabase
          .from("suppliers")
          .update({
            name: body.name,
            category: body.category,
            contact_person: body.contactPerson || null,
            phone: body.phone || null,
            email: body.email || null,
            address: body.address || null,
            updated_at: nowIso,
          })
          .eq("id", body.id)
          .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
          .single();

        if (updateErr || !updated) {
          logError("suppliers update failed:", updateErr);
          return NextResponse.json(
            { error: updateErr?.message || "Tedarikçi güncellenemedi", code: "SUPPLIER_UPDATE_FAILED" },
            { status: 500 }
          );
        }

        const supplier = mapSupplierRow(updated as RawSupplierRow);
        await writeAuditLog(supabase, {
          actorId: guard.auth.userId,
          actorRole: guard.auth.role ?? "admin",
          action: "finance.supplier_update",
          entityType: "supplier",
          entityId: supplier.id,
          summary: `Tedarikçi güncellendi: ${supplier.name}`,
          metadata: { category: supplier.category },
        });

        return NextResponse.json({ success: true, supplier });
      }

      const newId = crypto.randomUUID();
      const { data: created, error: createErr } = await supabase
        .from("suppliers")
        .insert({
          id: newId,
          name: body.name,
          category: body.category,
          contact_person: body.contactPerson || null,
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
          balance: 0,
        })
        .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
        .single();

      if (createErr || !created) {
        logError("suppliers insert failed:", createErr);
        return NextResponse.json(
          { error: createErr?.message || "Tedarikçi oluşturulamadı", code: "SUPPLIER_CREATE_FAILED" },
          { status: 500 }
        );
      }

      const supplier = mapSupplierRow(created as RawSupplierRow);
      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
        action: "finance.supplier_create",
        entityType: "supplier",
        entityId: supplier.id,
        summary: `Yeni tedarikçi eklendi: ${supplier.name}`,
        metadata: { category: supplier.category },
      });

      return NextResponse.json({ success: true, supplier }, { status: 201 });
    }

    // Tedarikçi varlık doğrulaması
    const { data: supplierRow, error: supplierErr } = await supabase
      .from("suppliers")
      .select("id, name, category, contact_person, phone, email, address, balance, created_at, updated_at")
      .eq("id", body.supplierId)
      .maybeSingle();

    if (supplierErr) {
      logError("supplier fetch failed:", supplierErr);
      return NextResponse.json({ error: "Tedarikçi sorgulanamadı" }, { status: 500 });
    }
    if (!supplierRow) {
      return NextResponse.json(
        { error: "Tedarikçi bulunamadı", code: "SUPPLIER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (body.action === "record_transaction") {
      const txDate = body.date ?? istanbulToday();
      const { data: insertedTx, error: txErr } = await supabase
        .from("supplier_transactions")
        .insert({
          supplier_id: body.supplierId,
          type: body.type,
          amount: body.amount,
          invoice_no: body.invoiceNo || null,
          description: body.description || (body.type === "alis" ? "Mal alım faturası" : "Tedarikçi ödemesi"),
          date: `${txDate}T12:00:00+03:00`,
        })
        .select("id, supplier_id, type, amount, invoice_no, description, date, created_at")
        .single();

      if (txErr || !insertedTx) {
        logError("supplier_transactions insert failed:", txErr);
        return NextResponse.json(
          { error: txErr?.message || "Tedarikçi hareketi kaydedilemedi", code: "SUPPLIER_TX_FAILED" },
          { status: 500 }
        );
      }

      const { data: allTxRows, error: sumErr } = await supabase
        .from("supplier_transactions")
        .select("type, amount")
        .eq("supplier_id", body.supplierId);

      if (sumErr || !allTxRows) {
        logError("supplier_transactions balance query failed:", sumErr);
        return NextResponse.json(
          { error: "Tedarikçi bakiyesi yeniden hesaplanamadı", code: "SUPPLIER_BALANCE_FAILED" },
          { status: 500 }
        );
      }

      const newBalance = computeSupplierSymmetricBalance(
        allTxRows as ReadonlyArray<{ type: string; amount: number | string }>
      );

      const { error: balUpdateErr } = await supabase
        .from("suppliers")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", body.supplierId);

      if (balUpdateErr) {
        logError("suppliers balance update failed:", balUpdateErr);
        return NextResponse.json(
          { error: "Tedarikçi bakiyesi güncellenemedi", code: "SUPPLIER_BALANCE_UPDATE_FAILED" },
          { status: 500 }
        );
      }

      let recordedExpenseId: string | null = null;
      if (body.type === "odeme" && body.alsoRecordExpense) {
        const expDesc = `[Tedarikçi Ödemesi: ${supplierRow.name}] ${
          body.description || body.invoiceNo || "Ödeme çıkışı"
        }`.trim();
        const { data: expRow, error: expErr } = await supabase
          .from("financial_records")
          .insert({
            type: "gider",
            category: body.expenseCategory,
            amount: body.amount,
            payment_method: body.paymentMethod,
            date: `${txDate}T12:00:00+03:00`,
            description: expDesc,
          })
          .select("id")
          .single();

        if (expErr) {
          logError("linked supplier expense insert warning:", expErr);
        } else if (expRow && typeof expRow.id === "string") {
          recordedExpenseId = expRow.id;
        }
      }

      const [transaction] = normalizeSupplierTransactions([insertedTx as RawSupplierTransactionRow]);

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
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

      return NextResponse.json(
        {
          success: true,
          transaction,
          newBalance,
          recordedExpenseId,
        },
        { status: 201 }
      );
    }

    // storno_transaction: tedarikçi hareketine ters kayıt
    const { data: targetTx, error: targetTxErr } = await supabase
      .from("supplier_transactions")
      .select("id, supplier_id, type, amount, invoice_no, description")
      .eq("id", body.transactionId)
      .eq("supplier_id", body.supplierId)
      .maybeSingle();

    if (targetTxErr) {
      logError("supplier_transactions storno lookup failed:", targetTxErr);
      return NextResponse.json({ error: "Hareket sorgulanamadı" }, { status: 500 });
    }
    if (!targetTx) {
      return NextResponse.json(
        { error: "İptal edilecek tedarikçi hareketi bulunamadı", code: "TX_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (targetTx.type === "storno_alis" || targetTx.type === "storno_odeme") {
      return NextResponse.json(
        { error: "Storno kaydı tekrar storno edilemez", code: "CANNOT_STORNO_A_STORNO" },
        { status: 400 }
      );
    }

    const stornoTag = `STORNO:${body.transactionId}`;
    const { data: dupCheck, error: dupErr } = await supabase
      .from("supplier_transactions")
      .select("id")
      .eq("supplier_id", body.supplierId)
      .eq("invoice_no", stornoTag)
      .limit(1);

    if (dupErr) {
      logError("supplier storno dup check error:", dupErr);
      return NextResponse.json({ error: "Storno kontrolü yapılamadı" }, { status: 500 });
    }
    if (Array.isArray(dupCheck) && dupCheck.length > 0) {
      return NextResponse.json(
        { error: "Bu tedarikçi hareketi zaten iptal edilmiş", code: "ALREADY_REVERSED" },
        { status: 409 }
      );
    }

    const stornoType = targetTx.type === "alis" ? "storno_alis" : "storno_odeme";
    const stornoAmount = cents(Math.abs(Number(targetTx.amount) || 0));
    const today = istanbulToday();

    const { data: insertedStorno, error: insErr } = await supabase
      .from("supplier_transactions")
      .insert({
        supplier_id: body.supplierId,
        type: stornoType,
        amount: stornoAmount,
        invoice_no: stornoTag,
        description: `[STORNO] ${body.reason}`,
        date: `${today}T12:00:00+03:00`,
      })
      .select("id, supplier_id, type, amount, invoice_no, description, date, created_at")
      .single();

    if (insErr || !insertedStorno) {
      logError("supplier_transactions storno insert failed:", insErr);
      return NextResponse.json(
        { error: insErr?.message || "Tedarikçi storno kaydı oluşturulamadı", code: "STORNO_INSERT_FAILED" },
        { status: 500 }
      );
    }

    const { data: allTxRows, error: sumErr } = await supabase
      .from("supplier_transactions")
      .select("type, amount")
      .eq("supplier_id", body.supplierId);

    if (sumErr || !allTxRows) {
      logError("supplier_transactions balance recalc failed:", sumErr);
      return NextResponse.json({ error: "Tedarikçi bakiyesi güncellenemedi" }, { status: 500 });
    }

    const newBalance = computeSupplierSymmetricBalance(
      allTxRows as ReadonlyArray<{ type: string; amount: number | string }>
    );

    const { error: updErr } = await supabase
      .from("suppliers")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", body.supplierId);

    if (updErr) {
      logError("suppliers balance update failed after storno:", updErr);
      return NextResponse.json({ error: "Tedarikçi bakiyesi güncellenemedi" }, { status: 500 });
    }

    const [transaction] = normalizeSupplierTransactions([insertedStorno as RawSupplierTransactionRow]);

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
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

    return NextResponse.json({ success: true, transaction, newBalance }, { status: 200 });
  } catch (err: unknown) {
    logError("POST /api/admin/finance/suppliers exception:", err);
    Sentry.captureException(err, { tags: { route: "api/admin/finance/suppliers" } });
    return NextResponse.json(
      { error: getErrorMessage(err) || "Tedarikçi işlemi sırasında sunucu hatası", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
