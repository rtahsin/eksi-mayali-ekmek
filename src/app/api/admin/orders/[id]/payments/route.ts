import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const PaymentBodySchema = z.object({
  amount: z.coerce
    .number()
    .finite("Geçerli bir ödeme tutarı giriniz")
    .positive("Geçerli bir ödeme tutarı giriniz")
    .max(10_000_000, "Geçerli bir ödeme tutarı giriniz"),
  method: z.enum(["cash", "pos", "online_card", "transfer", "cari"]).default("cash"),
  status: z.enum(["pending", "completed", "failed", "refunded", "partial"]).default("completed"),
  courierId: z.string().trim().min(1).max(80).nullable().optional(),
  transactionRef: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
  paidAt: z.string().trim().max(64).nullable().optional(),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const params = await props.params;
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş ID parametresi zorunludur", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = PaymentBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      const amountIssue = parsed.error.issues.some((issue) => issue.path[0] === "amount");
      if (amountIssue) {
        return NextResponse.json(
          { error: "Geçerli bir ödeme tutarı giriniz", code: "INVALID_AMOUNT" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", "), code: "INVALID_PAYLOAD" },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const amount = Math.round(body.amount * 100) / 100;
    // İstemciden gelen collectedBy alanına asla güvenilmez; sunucu rolünden türetilir.
    const collectedBy = guard.auth.isCourier ? "courier" : "admin";

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.rpc("record_order_payment", {
      p_order_id: orderId,
      p_amount: amount,
      p_method: body.method,
      p_status: body.status,
      p_collected_by: collectedBy,
      p_courier_id: body.courierId ?? null,
      p_transaction_ref: body.transactionRef || null,
      p_note: body.note || null,
      p_paid_at: body.paidAt || null,
    });

    if (error) {
      logError("record_order_payment error:", error);
      return NextResponse.json(
        { error: error.message || "Ödeme kaydedilemedi", code: "PAYMENT_RECORD_FAILED" },
        { status: 400 }
      );
    }

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "order.payment_record",
      entityType: "order",
      entityId: orderId,
      summary: `Sipariş ödemesi kaydedildi (${orderId}: ${amount} ₺, ${body.method})`,
      metadata: {
        amount,
        method: body.method,
        status: body.status,
        collectedBy,
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    logError("POST /api/admin/orders/[id]/payments exception:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Ödeme işlemi sırasında sunucu hatası", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const params = await props.params;
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Sipariş ID parametresi zorunludur", code: "MISSING_ID" },
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

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, payments: data || [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
