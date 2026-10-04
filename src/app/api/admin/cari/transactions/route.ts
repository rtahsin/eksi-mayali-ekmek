import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { isIsoDate } from "@/lib/time/istanbul";
import { signSlipToken } from "@/lib/security/linkToken";
import { SITE_URL } from "@/lib/site";

const accountId = z.string().min(1).max(80);
const description = z.string().trim().max(500).optional();
const date = z.string().refine(isIsoDate, "Tarih YYYY-AA-GG olmalı").optional();
const cents = (v: number) => Math.round(v * 100) / 100;
// Kuruşa yuvarlanır (bakiye NUMERIC(12,2)); RPC de yuvarlar
const money = z.number().finite().positive().max(10_000_000).transform(cents);

const ItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(100000),
  unitPrice: z.number().min(0).max(1_000_000),
  productId: z.string().max(80).optional(),
});

const RequestSchema = z.discriminatedUnion("kind", [
  // Teslimat fişi: kalemlerden ya da doğrudan tutardan
  z.object({
    kind: z.literal("satis"),
    accountId,
    items: z.array(ItemSchema).max(60).default([]),
    amount: money.optional(),
    description,
    date,
    orderId: z.string().max(80).optional(),
  }),
  z.object({
    kind: z.literal("tahsilat"),
    accountId,
    amount: money,
    paymentMethod: z.enum(["nakit", "pos", "banka_havale", "diger"]),
    description,
    date,
    orderId: z.string().max(80).optional(),
  }),
  // Açılış / düzeltme: işaretli tutar (+ borç ekler, − düşer)
  z.object({
    kind: z.literal("devir"),
    accountId,
    amount: z.number().finite().transform(cents).refine((v) => v !== 0, "Tutar 0 olamaz").refine((v) => Math.abs(v) <= 10_000_000),
    description: z.string().trim().min(3, "Açıklama yazın").max(500),
    date,
  }),
  // Bakiyeyi belirli bir değere getir → aradaki fark kadar devir
  z.object({
    kind: z.literal("set_balance"),
    accountId,
    targetBalance: z.number().finite().min(-10_000_000).max(10_000_000).transform(cents),
    description: z.string().trim().min(3, "Neden yazın").max(500),
  }),
  // Hareketi iptal et (ters kayıt); hareket silinmez
  z.object({
    kind: z.literal("storno"),
    accountId,
    reversesId: z.string().uuid(),
    description,
  }),
]);

const RPC_ERRORS: Record<string, string> = {
  CARI_NOT_FOUND: "Cari hesap bulunamadı.",
  CARI_ARCHIVED: "Bu cari hesap arşivlenmiş; yeni hareket eklenemez.",
  INVALID_AMOUNT: "Tutar geçersiz.",
  STORNO_TARGET_NOT_FOUND: "İptal edilecek hareket bulunamadı.",
  CANNOT_STORNO_A_STORNO: "Bir iptal kaydı tekrar iptal edilemez.",
  ALREADY_REVERSED: "Bu hareket zaten iptal edilmiş.",
};

function rpcError(message: string): string | null {
  for (const [code, text] of Object.entries(RPC_ERRORS)) if (message.includes(code)) return text;
  return null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const body = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    let type: "satis" | "tahsilat" | "devir" | "storno";
    let amount: number;
    let items: z.infer<typeof ItemSchema>[] | null = null;
    let paymentMethod: string | null = null;
    let orderId: string | null = null;
    let reversesId: string | null = null;
    let txDate: string | null = null;
    let text = body.description ?? null;
    let targetBalance: number | null = null;

    switch (body.kind) {
      case "satis": {
        type = "satis";
        items = body.items.length ? body.items : null;
        const fromItems = body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        amount = body.items.length ? Math.round(fromItems * 100) / 100 : body.amount ?? 0;
        if (!(amount > 0)) return NextResponse.json({ error: "Fiş tutarı 0 olamaz" }, { status: 400 });
        orderId = body.orderId ?? null;
        txDate = body.date ?? null;
        break;
      }
      case "tahsilat":
        type = "tahsilat";
        amount = body.amount;
        paymentMethod = body.paymentMethod;
        orderId = body.orderId ?? null;
        txDate = body.date ?? null;
        break;
      case "devir":
        type = "devir";
        amount = body.amount;
        txDate = body.date ?? null;
        break;
      case "set_balance": {
        // Fark RPC içinde hesap kilidi altında hesaplanır (eşzamanlı tahsilatla yarış yok)
        type = "devir";
        amount = 0;
        targetBalance = body.targetBalance;
        text = `Bakiye düzeltme: ${body.description} (hedef ${body.targetBalance.toLocaleString("tr-TR")} ₺)`;
        break;
      }
      case "storno":
        type = "storno";
        amount = 0;
        reversesId = body.reversesId;
        text = body.description ? `İptal: ${body.description}` : "İptal (ters kayıt)";
        break;
    }

    const { data, error } = await supabase.rpc("record_cari_transaction_atomic", {
      p_account_id: body.accountId,
      p_type: type,
      p_amount: amount,
      p_description: text,
      p_payment_method: paymentMethod,
      p_date: txDate,
      p_items: items,
      p_order_id: orderId,
      p_reverses_id: reversesId,
      p_created_by: guard.auth.userId,
      p_target_balance: targetBalance,
    });

    if (error) {
      const friendly = rpcError(error.message);
      if (friendly) return NextResponse.json({ error: friendly }, { status: 409 });
      throw error;
    }

    const res = data as { transaction_id?: string; slip_number?: string; balance_after: number; delta: number; unchanged?: boolean };
    if (res.unchanged || !res.transaction_id) {
      return NextResponse.json({ success: true, unchanged: true, balanceAfter: Number(res.balance_after) });
    }
    const token = signSlipToken(res.transaction_id);
    return NextResponse.json({
      success: true,
      transactionId: res.transaction_id,
      slipNumber: res.slip_number,
      delta: Number(res.delta),
      balanceAfter: Number(res.balance_after),
      shareUrl: token ? `${SITE_URL}/fis/${res.transaction_id}?t=${token}` : null,
    });
  } catch (err: unknown) {
    // Kesin kural: atomik RPC başarısızsa parçalı yedek yol YOK (AGENTS.md §6)
    console.error("POST /api/admin/cari/transactions:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Hareket kaydedilemedi" }, { status: 500 });
  }
}
