import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/apiAuth";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

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

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      return NextResponse.json(
        { error: "Geçerli bir ödeme tutarı giriniz", code: "INVALID_AMOUNT" },
        { status: 400 }
      );
    }

    const method = typeof body.method === "string" ? body.method : "cash";
    const status = typeof body.status === "string" ? body.status : "completed";
    const collectedBy = typeof body.collectedBy === "string" ? body.collectedBy : "admin";
    const courierId = typeof body.courierId === "string" && body.courierId ? body.courierId : null;
    const transactionRef = typeof body.transactionRef === "string" && body.transactionRef ? body.transactionRef.trim() : null;
    const note = typeof body.note === "string" && body.note ? body.note.trim() : null;
    const paidAt = typeof body.paidAt === "string" && body.paidAt ? body.paidAt : null;

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
      p_method: method,
      p_status: status,
      p_collected_by: collectedBy,
      p_courier_id: courierId,
      p_transaction_ref: transactionRef,
      p_note: note,
      p_paid_at: paidAt,
    });

    if (error) {
      logError("record_order_payment error:", error);
      return NextResponse.json(
        { error: error.message || "Ödeme kaydedilemedi", code: "PAYMENT_RECORD_FAILED" },
        { status: 400 }
      );
    }

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
