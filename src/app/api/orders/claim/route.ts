import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/kernel/log";
import { normalizePhone } from "@/lib/order/validate";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { signOrderToken, verifyOrderToken } from "@/lib/security/linkToken";
import { checkRateLimit, ipRateLimitKey } from "@/lib/security/rateLimiter";
import { normalizeDeliveryDate } from "@/lib/time/istanbul";

const BatchTokenClaimSchema = z.object({
  orders: z
    .array(z.object({ id: z.string().min(4).max(64), token: z.string().length(32) }))
    .min(1)
    .max(30),
});

const PhoneOrderClaimSchema = z.object({
  orderNumber: z.string().trim().min(4).max(32),
  phone: z.string().trim().min(7).max(32),
});

const ClaimPayloadSchema = z.union([BatchTokenClaimSchema, PhoneOrderClaimSchema]);

const SIP_NUMBER_RE = /^SIP-\d{4}-\d{3,6}$/;

interface UnclaimedOrderRow {
  id: string;
  order_number: string | null;
  phone: string | null;
  delivery_date: string | null;
  total_amount: number | string | null;
  created_at: string;
}

/** Türk cep telefonu numarasının son 10 rakamını (`5XXXXXXXXX`) döndürür; geçersizse `null`. */
export function normalizeTrPhoneLast10(raw: string): string | null {
  const canonical = normalizePhone(raw);
  if (canonical) {
    return canonical.slice(-10);
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const tail = digits.slice(-10);
  return /^5\d{9}$/.test(tail) ? tail : null;
}

function safePhoneEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

const NOT_FOUND_ERROR =
  "Sipariş numarası ve telefon numarası eşleşmedi ya da bu sipariş zaten bir hesaba bağlanmış.";

/**
 * Giriş yapan müşteri misafir siparişlerini hesabına bağlar:
 * 1) `{ orders: [{ id, token }] }` — bu cihazdaki imzalı takip token'ları ile toplu bağlama.
 * 2) `{ orderNumber, phone }` — Instagram/TikTok gömülü tarayıcıdan verilen misafir siparişini
 *    `SIP-YYMM-XXX` + telefon son 10 hane doğrulamasıyla hesaba bağlama.
 * Yalnızca `user_id IS NULL` ve `cari_id IS NULL` olan sahipsiz siparişler bağlanır.
 */
export async function POST(req: Request) {
  const ipLimit = await checkRateLimit(ipRateLimitKey("order_claim_ip", req), 20, 600_000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const auth = await verifyApiAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = ClaimPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  // Akış 1: İmzalı takip token'ları ile toplu cihaz siparişi bağlama
  if ("orders" in parsed.data) {
    const batchLimit = await checkRateLimit(`order_claim_${auth.userId}`, 10, 600_000);
    if (!batchLimit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const ids = parsed.data.orders.filter((o) => verifyOrderToken(o.id, o.token)).map((o) => o.id);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, claimed: 0 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ user_id: auth.userId, updated_at: new Date().toISOString() })
      .in("id", ids)
      .is("user_id", null)
      .is("cari_id", null)
      .select("id");

    if (error) {
      logError("Order claim batch error:", error);
      return NextResponse.json({ error: "Siparişler hesaba bağlanamadı." }, { status: 500 });
    }

    return NextResponse.json({ success: true, claimed: data?.length ?? 0 });
  }

  // Akış 2: SIP-YYMM-XXX + Telefon son 10 rakam ile tekil sipariş bağlama (Brute-force korumalı: 6/dk)
  const [phoneIpLimit, phoneUserLimit] = await Promise.all([
    checkRateLimit(ipRateLimitKey("order_claim_phone_ip", req), 6, 60_000),
    checkRateLimit(`order_claim_phone_user_${auth.userId}`, 6, 60_000),
  ]);

  if (!phoneIpLimit.allowed || !phoneUserLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla sipariş bağlama denemesi yapıldı. Lütfen 1 dakika bekleyip tekrar deneyin." },
      { status: 429 }
    );
  }

  const normalizedOrderNumber = parsed.data.orderNumber.replace(/^#+/, "").trim().toUpperCase();
  if (!SIP_NUMBER_RE.test(normalizedOrderNumber)) {
    return NextResponse.json(
      { error: "Geçerli bir sipariş numarası girin (Ör: SIP-2611-001)." },
      { status: 400 }
    );
  }

  const inputLast10 = normalizeTrPhoneLast10(parsed.data.phone);
  if (!inputLast10) {
    return NextResponse.json(
      { error: "Geçerli bir cep telefonu numarası girin (05XX XXX XX XX)." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  const { data: orderData, error: findErr } = await supabase
    .from("orders")
    .select("id, order_number, phone, delivery_date, total_amount, created_at")
    .eq("order_number", normalizedOrderNumber)
    .is("user_id", null)
    .is("cari_id", null)
    .maybeSingle();

  if (findErr) {
    logError("Order claim lookup error:", findErr);
    return NextResponse.json({ error: "Sipariş sorgulanırken hata oluştu." }, { status: 500 });
  }

  if (!orderData) {
    return NextResponse.json({ error: NOT_FOUND_ERROR }, { status: 404 });
  }

  const row = orderData as unknown as UnclaimedOrderRow;
  const orderLast10 = row.phone ? normalizeTrPhoneLast10(row.phone) : null;

  if (!orderLast10 || !safePhoneEqual(inputLast10, orderLast10)) {
    return NextResponse.json({ error: NOT_FOUND_ERROR }, { status: 404 });
  }

  const { data: updatedData, error: updateErr } = await supabase
    .from("orders")
    .update({ user_id: auth.userId, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("user_id", null)
    .is("cari_id", null)
    .select("id, order_number")
    .maybeSingle();

  if (updateErr) {
    logError("Order claim phone update error:", updateErr);
    return NextResponse.json({ error: "Sipariş hesaba bağlanamadı." }, { status: 500 });
  }

  if (!updatedData) {
    return NextResponse.json({ error: NOT_FOUND_ERROR }, { status: 404 });
  }

  const updated = updatedData as unknown as { id: string; order_number: string | null };

  return NextResponse.json({
    success: true,
    linked: 1,
    orderId: updated.id,
    orderNumber: updated.order_number ?? normalizedOrderNumber,
    trackingToken: signOrderToken(updated.id),
    deliveryDate: normalizeDeliveryDate(row.delivery_date, row.created_at),
    totalAmount: Number(row.total_amount) || 0,
    createdAt: row.created_at,
  });
}
