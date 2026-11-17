import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { istanbulToday, isIsoDate } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import {
  cents,
  isCourierDeliverableOrder,
  summarizeCourierOrders,
} from "@/lib/delivery/settlement";

const UuidSchema = z.string().uuid("Geçersiz kurye kimliği.");

const SettleBodySchema = z.object({
  date: z.string().refine(isIsoDate, "Tarih YYYY-AA-GG olmalı").optional(),
  cashHandedOver: z.coerce
    .number()
    .finite("Geçerli bir nakit tutarı girin.")
    .min(0, "Nakit tutarı negatif olamaz.")
    .max(10_000_000)
    .transform(cents),
  cardSlipTotal: z.coerce
    .number()
    .finite("Geçerli bir POS slip tutarı girin.")
    .min(0, "POS slip tutarı negatif olamaz.")
    .max(10_000_000)
    .transform(cents),
  note: z.string().trim().max(500).optional(),
});

interface DeliveredOrderRow {
  id: string;
  status: string;
  delivery_method: string | null;
  total_amount: number | string | null;
  payment_method: string | null;
  payment_status: string | null;
  cari_id: string | null;
  courier_id: string | null;
}

interface PaymentRow {
  order_id: string;
  amount: number | string | null;
  method: string;
  collected_by: string | null;
  courier_id: string | null;
}

/**
 * Gün sonu kurye kasa mutabakatı:
 * Sunucuda seçilen gündeki teslim edilen siparişlerden beklenen nakit/kart/cari toplamlarını
 * hesaplar, `courier_settlements` tablosuna upsert eder ve `audit_logs` yazar.
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireCapability(req, "team.manage");
  if (!guard.ok) return guard.response;

  const { id } = await props.params;
  const idParsed = UuidSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: idParsed.error.issues[0]?.message || "Geçersiz ID" }, { status: 400 });
  }
  const courierId = idParsed.data;

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = SettleBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }
  const targetDate = parsed.data.date ?? istanbulToday();

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  try {
    const { data: courierRow, error: courErr } = await supabase
      .from("couriers")
      .select("id, display_name")
      .eq("id", courierId)
      .maybeSingle();
    if (courErr) throw courErr;

    if (!courierRow) {
      return NextResponse.json({ error: "Kurye bulunamadı." }, { status: 404 });
    }
    const courier = courierRow as { id: string; display_name: string };

    const { data: orderRows, error: ordErr } = await supabase
      .from("orders")
      .select("id, status, delivery_method, total_amount, payment_method, payment_status, cari_id, courier_id")
      .eq("delivery_date", targetDate)
      .eq("courier_id", courierId)
      .eq("status", "teslim_edildi");
    if (ordErr) throw ordErr;

    const deliveredOrders = ((orderRows ?? []) as DeliveredOrderRow[]).filter(
      isCourierDeliverableOrder
    );
    const deliveredIds = deliveredOrders.map((o) => o.id);

    const paymentsByOrder = new Map<string, PaymentRow[]>();
    if (deliveredIds.length > 0) {
      const { data: payRows, error: payErr } = await supabase
        .from("payments")
        .select("order_id, amount, method, collected_by, courier_id")
        .in("order_id", deliveredIds)
        .eq("status", "completed");
      if (payErr) throw payErr;

      for (const p of (payRows ?? []) as PaymentRow[]) {
        const list = paymentsByOrder.get(p.order_id) ?? [];
        list.push(p);
        paymentsByOrder.set(p.order_id, list);
      }
    }

    const { cashExpected, cardExpected, cariDeliveredTotal, deliveredCount } =
      summarizeCourierOrders(deliveredOrders, paymentsByOrder, courierId);

    const nowIso = new Date().toISOString();
    const { data: settlementRow, error: upsertErr } = await supabase
      .from("courier_settlements")
      .upsert(
        {
          courier_id: courierId,
          settlement_date: targetDate,
          cash_expected: cashExpected,
          card_expected: cardExpected,
          cari_delivered_total: cariDeliveredTotal,
          delivered_count: deliveredCount,
          cash_handed_over: parsed.data.cashHandedOver,
          card_slip_total: parsed.data.cardSlipTotal,
          note: parsed.data.note?.trim() || null,
          settled_by: guard.auth.userId,
          settled_at: nowIso,
        },
        { onConflict: "courier_id,settlement_date" }
      )
      .select(
        "id, courier_id, settlement_date, cash_expected, card_expected, cari_delivered_total, delivered_count, cash_handed_over, card_slip_total, note, settled_at"
      )
      .single();

    if (upsertErr) throw upsertErr;

    const settlement = settlementRow as {
      id: string;
      courier_id: string;
      settlement_date: string;
      cash_expected: number | string;
      card_expected: number | string;
      cari_delivered_total: number | string;
      delivered_count: number;
      cash_handed_over: number | string;
      card_slip_total: number | string;
      note: string | null;
      settled_at: string;
    };

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "courier.settle",
      entityType: "courier_settlement",
      entityId: settlement.id,
      summary: `Kasa mutabakatı kaydedildi (${courier.display_name} · ${targetDate}: nakit ${parsed.data.cashHandedOver} ₺ / beklenen ${cashExpected} ₺, kart ${parsed.data.cardSlipTotal} ₺ / beklenen ${cardExpected} ₺)`,
      metadata: {
        courierId,
        courierName: courier.display_name,
        settlementDate: targetDate,
        deliveredCount,
        cashExpected,
        cardExpected,
        cariDeliveredTotal,
        cashHandedOver: parsed.data.cashHandedOver,
        cardSlipTotal: parsed.data.cardSlipTotal,
      },
    });

    return NextResponse.json({
      success: true,
      settlement: {
        id: settlement.id,
        courierId: settlement.courier_id,
        settlementDate: settlement.settlement_date,
        cashExpected: cents(Number(settlement.cash_expected) || 0),
        cardExpected: cents(Number(settlement.card_expected) || 0),
        cariDeliveredTotal: cents(Number(settlement.cari_delivered_total) || 0),
        deliveredCount: Number(settlement.delivered_count) || 0,
        cashHandedOver: cents(Number(settlement.cash_handed_over) || 0),
        cardSlipTotal: cents(Number(settlement.card_slip_total) || 0),
        note: settlement.note,
        settledAt: settlement.settled_at,
      },
    });
  } catch (err: unknown) {
    logError("POST /api/admin/couriers/[id]/settle:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Gün sonu kasa mutabakatı kaydedilemedi." },
      { status: 500 }
    );
  }
}
