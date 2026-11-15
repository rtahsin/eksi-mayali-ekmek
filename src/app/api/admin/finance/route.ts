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
  computeCfoSummary,
  EXPENSE_CATEGORIES,
  mapSupplierRow,
  normalizeFinancialRecords,
  normalizeSupplierTransactions,
  type RawCariAccountSummaryRow,
  type RawCariTransactionSummaryRow,
  type RawFinancialRecordRow,
  type RawOrderSummaryRow,
  type RawPaymentSummaryRow,
  type RawSupplierRow,
  type RawSupplierTransactionRow,
} from "@/lib/cari/finance";

const cents = (v: number) => Math.round(v * 100) / 100;

const ExpenseCategoryEnum = z.enum(EXPENSE_CATEGORIES);
const PaymentMethodEnum = z.enum(["nakit", "kredi_karti", "havale", "pos"]);
const IsoDateSchema = z.string().trim().refine(isIsoDate, "Tarih YYYY-AA-GG formatında olmalı");

const CreateRecordSchema = z.object({
  action: z.literal("create_record"),
  type: z.enum(["gider", "gelir"]),
  category: ExpenseCategoryEnum.default("diger"),
  amount: z.coerce
    .number()
    .finite("Geçerli bir tutar giriniz")
    .positive("Tutar sıfırdan büyük olmalı")
    .max(10_000_000, "Tutar sınırı aşıyor")
    .transform(cents),
  paymentMethod: PaymentMethodEnum.default("nakit"),
  date: IsoDateSchema.optional(),
  description: z.string().trim().min(2, "Kısa bir açıklama yazınız").max(280),
});

const StornoRecordSchema = z.object({
  action: z.literal("storno_record"),
  recordId: z.string().uuid("Geçersiz kayıt kimliği"),
  reason: z.string().trim().min(2, "İptal (storno) nedenini yazınız").max(200),
});

const FinancePostSchema = z.discriminatedUnion("action", [CreateRecordSchema, StornoRecordSchema]);

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const today = istanbulToday();
    const defaultFrom = `${today.slice(0, 7)}-01`;
    const url = new URL(req.url);
    const from = url.searchParams.get("from")?.trim() || defaultFrom;
    const to = url.searchParams.get("to")?.trim() || today;

    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      return NextResponse.json(
        { error: "Geçersiz tarih aralığı", code: "INVALID_DATE_RANGE" },
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
      Sentry.captureException(firstError, { tags: { route: "api/admin/finance" } });
      return NextResponse.json(
        { error: "Finans verileri yüklenemedi", code: "FINANCE_QUERY_FAILED" },
        { status: 500 }
      );
    }

    const rawRecords = (recordsRes.data ?? []) as RawFinancialRecordRow[];
    const rawSuppliers = (suppliersRes.data ?? []) as RawSupplierRow[];
    const rawSupplierTx = (supplierTxRes.data ?? []) as RawSupplierTransactionRow[];

    const summary = computeCfoSummary({
      periodFrom: from,
      periodTo: to,
      orders: (ordersRes.data ?? []) as RawOrderSummaryRow[],
      payments: (paymentsRes.data ?? []) as RawPaymentSummaryRow[],
      cariTransactions: (cariTxRes.data ?? []) as RawCariTransactionSummaryRow[],
      cariAccounts: (cariAccRes.data ?? []) as RawCariAccountSummaryRow[],
      financialRecords: rawRecords,
      suppliers: rawSuppliers,
    });

    const records = normalizeFinancialRecords(rawRecords);
    const suppliers = rawSuppliers.map(mapSupplierRow);
    const supplierTransactions = normalizeSupplierTransactions(rawSupplierTx);

    return NextResponse.json({
      success: true,
      summary,
      records,
      suppliers,
      supplierTransactions,
    });
  } catch (err: unknown) {
    logError("GET /api/admin/finance exception:", err);
    Sentry.captureException(err, { tags: { route: "api/admin/finance" } });
    return NextResponse.json(
      { error: getErrorMessage(err) || "Finans özeti alınamadı", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = FinancePostSchema.safeParse(rawBody);
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
    if (body.action === "create_record") {
      const recordDate = body.date ?? istanbulToday();
      const { data, error } = await supabase
        .from("financial_records")
        .insert({
          type: body.type,
          category: body.category,
          amount: body.amount,
          description: body.description,
          payment_method: body.paymentMethod,
          date: `${recordDate}T12:00:00+03:00`,
        })
        .select("id, type, category, amount, description, payment_method, date, created_at")
        .single();

      if (error || !data) {
        logError("financial_records insert failed:", error);
        Sentry.captureException(error ?? new Error("financial_records insert returned null"), {
          tags: { route: "api/admin/finance", action: "create_record" },
        });
        return NextResponse.json(
          { error: error?.message || "Finans kaydı oluşturulamadı", code: "FINANCE_INSERT_FAILED" },
          { status: 500 }
        );
      }

      const [normalized] = normalizeFinancialRecords([data as RawFinancialRecordRow]);

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
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

      return NextResponse.json({ success: true, record: normalized }, { status: 201 });
    }

    // Storno (ters kayıt): asıl kayıt silinmez / değiştirilmez
    const { data: targetRow, error: targetError } = await supabase
      .from("financial_records")
      .select("id, type, category, amount, payment_method, description")
      .eq("id", body.recordId)
      .maybeSingle();

    if (targetError) {
      logError("financial_records storno lookup error:", targetError);
      return NextResponse.json(
        { error: "Kayıt sorgulanamadı", code: "LOOKUP_FAILED" },
        { status: 500 }
      );
    }

    if (!targetRow) {
      return NextResponse.json(
        { error: "İptal edilecek finans kaydı bulunamadı", code: "RECORD_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (targetRow.type === "storno_gider" || targetRow.type === "storno_gelir") {
      return NextResponse.json(
        { error: "Bir iptal (storno) kaydı tekrar iptal edilemez", code: "CANNOT_STORNO_A_STORNO" },
        { status: 400 }
      );
    }

    const { data: existingStorno, error: checkErr } = await supabase
      .from("financial_records")
      .select("id")
      .like("description", `[STORNO:${body.recordId}]%`)
      .limit(1);

    if (checkErr) {
      logError("financial_records duplicate storno check error:", checkErr);
      return NextResponse.json(
        { error: "Storno kontrolü yapılamadı", code: "STORNO_CHECK_FAILED" },
        { status: 500 }
      );
    }

    if (Array.isArray(existingStorno) && existingStorno.length > 0) {
      return NextResponse.json(
        { error: "Bu kayıt için daha önce storno kesilmiş", code: "ALREADY_REVERSED" },
        { status: 409 }
      );
    }

    const stornoType = targetRow.type === "gider" ? "storno_gider" : "storno_gelir";
    const stornoAmount = cents(Math.abs(Number(targetRow.amount) || 0));
    const today = istanbulToday();

    const { data: insertedStorno, error: insertStornoErr } = await supabase
      .from("financial_records")
      .insert({
        type: stornoType,
        category: targetRow.category || "diger",
        amount: stornoAmount,
        payment_method: targetRow.payment_method || "nakit",
        date: `${today}T12:00:00+03:00`,
        description: `[STORNO:${body.recordId}] ${body.reason}`,
      })
      .select("id, type, category, amount, description, payment_method, date, created_at")
      .single();

    if (insertStornoErr || !insertedStorno) {
      logError("financial_records storno insert failed:", insertStornoErr);
      Sentry.captureException(insertStornoErr ?? new Error("storno insert null"), {
        tags: { route: "api/admin/finance", action: "storno_record" },
      });
      return NextResponse.json(
        { error: insertStornoErr?.message || "Storno kaydı oluşturulamadı", code: "STORNO_INSERT_FAILED" },
        { status: 500 }
      );
    }

    const [normalizedStorno] = normalizeFinancialRecords([insertedStorno as RawFinancialRecordRow]);

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
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

    return NextResponse.json({ success: true, record: normalizedStorno }, { status: 200 });
  } catch (err: unknown) {
    logError("POST /api/admin/finance exception:", err);
    Sentry.captureException(err, { tags: { route: "api/admin/finance" } });
    return NextResponse.json(
      { error: getErrorMessage(err) || "Finans işlemi sırasında sunucu hatası", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
