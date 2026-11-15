import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { parseCustomPrices, parseStandingOrder } from "@/lib/cari/account";
import { addDays, isIsoDate, istanbulToday, istanbulWeekday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const BodySchema = z
  .object({
    deliveryDate: z.string().trim().refine(isIsoDate, "Teslim tarihi YYYY-AA-GG formatında olmalıdır.").optional(),
  })
  .optional();

interface AccountDbRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  default_courier_id: string | null;
  custom_prices: unknown;
  standing_order: unknown;
}

interface ProductDbRow {
  id: string;
  name: string;
  price: number | string | null;
  image_url: string | null;
  weight: number | null;
  is_active: boolean | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Seçilen gün için (varsayılan: yarın) haftalık sabit rutini aktif tüm müşteri
 * carilerinden idempotent B2B siparişleri (`standing:<cariId>:<YYYY-MM-DD>`) üretir.
 */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(rawBody === null ? {} : rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  const deliveryDate = parsed.data?.deliveryDate ?? addDays(istanbulToday(), 1);
  const weekdayNum = istanbulWeekday(deliveryDate); // 0=Paz..6=Cmt
  const isoWeekday = String(weekdayNum === 0 ? 7 : weekdayNum); // "1"=Pzt .. "7"=Paz

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
  }

  try {
    const [{ data: accRows, error: accErr }, { data: prodRows, error: prodErr }] = await Promise.all([
      supabase
        .from("current_accounts")
        .select(
          "id, name, phone, address, district, neighborhood, default_courier_id, custom_prices, standing_order",
        )
        .is("archived_at", null)
        .eq("account_type", "musteri"),
      supabase
        .from("products")
        .select("id, name, price, image_url, weight, is_active")
        .eq("is_active", true),
    ]);

    if (accErr) throw accErr;
    if (prodErr) throw prodErr;

    const productMap = new Map<string, ProductDbRow>();
    for (const p of (prodRows ?? []) as ProductDbRow[]) {
      productMap.set(p.id, p);
    }

    let createdCount = 0;
    let skippedExisting = 0;
    const orders: Array<{ accountId: string; businessName: string; orderId: string; orderNumber: string }> = [];
    const errors: Array<{ accountId: string; businessName: string; error: string }> = [];

    for (const acc of (accRows ?? []) as AccountDbRow[]) {
      const standing = parseStandingOrder(acc.standing_order);
      if (!standing || !standing.enabled) continue;

      const daySchedule = standing.schedule[isoWeekday];
      if (!daySchedule) continue;

      const positiveEntries = Object.entries(daySchedule).filter(
        ([, qty]) => Number.isFinite(qty) && Math.trunc(qty) > 0,
      );
      if (positiveEntries.length === 0) continue;

      const customPrices = parseCustomPrices(acc.custom_prices);
      const missingProducts: string[] = [];
      const lines: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        image_url: string | null;
        weight: number | null;
      }> = [];

      for (const [productId, rawQty] of positiveEntries) {
        const prod = productMap.get(productId);
        if (!prod) {
          missingProducts.push(productId);
          continue;
        }
        const qty = Math.trunc(rawQty);
        const unitPrice =
          customPrices[productId] !== undefined ? customPrices[productId] : round2(Number(prod.price) || 0);
        lines.push({
          product_id: productId,
          product_name: prod.name,
          quantity: qty,
          unit_price: unitPrice,
          total_price: round2(qty * unitPrice),
          image_url: prod.image_url ?? null,
          weight: prod.weight ?? null,
        });
      }

      if (missingProducts.length > 0 && lines.length === 0) {
        errors.push({
          accountId: acc.id,
          businessName: acc.name,
          error: `Rutin ürünleri aktif değil: ${missingProducts.join(", ")}`,
        });
        continue;
      }

      if (lines.length === 0) continue;

      const subtotal = round2(lines.reduce((sum, l) => sum + l.total_price, 0));
      const neighborhood = acc.neighborhood?.trim() || "Cumhuriyet";
      const district = acc.district?.trim() || "Beylikdüzü";
      const deliveryAddress = acc.address?.trim() || `${neighborhood} — ${acc.name}`;
      const idempotencyKey = `standing:${acc.id}:${deliveryDate}`;

      const { data: rpcData, error: rpcErr } = await supabase.rpc("create_order_atomic", {
        p_order: {
          id: crypto.randomUUID(),
          idempotency_key: idempotencyKey,
          customer_name: acc.name,
          phone: acc.phone ?? "",
          delivery_method: "courier",
          delivery_address: deliveryAddress,
          district,
          neighborhood,
          delivery_date: deliveryDate,
          status: "hazirlaniyor",
          payment_method: "cari",
          payment_status: "pending",
          source: "standing_order",
          subtotal,
          shipping_fee: 0,
          total_amount: subtotal,
          order_notes: standing.notes?.trim() || "",
          cari_id: acc.id,
          courier_id: acc.default_courier_id || null,
          bypass_limits: true,
          changed_by_role: guard.auth.role === "staff" ? "staff" : "admin",
          history_note: `Haftalık sabit rutin siparişi (${deliveryDate})`,
        },
        p_items: lines,
        p_user_id: guard.auth.userId,
      });

      if (rpcErr) {
        errors.push({
          accountId: acc.id,
          businessName: acc.name,
          error: rpcErr.message || "Sipariş oluşturulamadı.",
        });
        continue;
      }

      const resObj = (rpcData ?? {}) as { order_id?: string; order_number?: string; is_existing?: boolean };
      if (resObj.is_existing) {
        skippedExisting += 1;
      } else {
        createdCount += 1;
        if (resObj.order_id && resObj.order_number) {
          orders.push({
            accountId: acc.id,
            businessName: acc.name,
            orderId: resObj.order_id,
            orderNumber: resObj.order_number,
          });
        }
      }
    }

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "cari.standing_orders_generate",
      entityType: "current_account",
      entityId: deliveryDate,
      summary: `Rutin B2B sipariş üretimi (${deliveryDate}): ${createdCount} yeni, ${skippedExisting} mevcut`,
      metadata: {
        deliveryDate,
        isoWeekday,
        createdCount,
        skippedExisting,
        errorCount: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      deliveryDate,
      weekday: isoWeekday,
      createdCount,
      skippedExisting,
      orders,
      errors,
    });
  } catch (err: unknown) {
    logError("POST /api/admin/cari/standing-orders/generate:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Rutin siparişler oluşturulamadı." },
      { status: 500 },
    );
  }
}
