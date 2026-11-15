import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { signSlipToken } from "@/lib/security/linkToken";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { parseCustomPrices } from "@/lib/cari/account";
import { SITE_URL } from "@/lib/site";
import { istanbulToday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import type {
  B2BHotSaleAccountSummary,
  B2BHotSaleItem,
  B2BHotSalePaymentMethod,
  B2BHotSaleTransactionSummary,
} from "@/types/admin";

const FlexibleLineSchema = z
  .object({
    productId: z.string().trim().max(80).nullable().optional(),
    productName: z.string().trim().min(1).max(160).optional(),
    name: z.string().trim().min(1).max(160).optional(),
    quantity: z.coerce.number().int("Adet tam sayı olmalıdır.").min(1, "Adet en az 1 olmalıdır.").max(5000),
    unitPrice: z.coerce.number().min(0, "Fiyat negatif olamaz.").max(1_000_000).finite().optional(),
  })
  .refine(
    (v) =>
      Boolean(
        (v.productId && v.productId.trim()) ||
          (v.productName && v.productName.trim()) ||
          (v.name && v.name.trim()),
      ),
    { message: "Ürün kimliği veya ürün adı zorunludur." },
  );

const BodySchema = z
  .object({
    deliveredItems: z.array(FlexibleLineSchema).max(60),
    returnItems: z.array(FlexibleLineSchema).max(60).optional().default([]),
    collectedAmount: z.coerce.number().min(0, "Tahsilat tutarı negatif olamaz.").finite().optional().default(0),
    paymentMethod: z.enum(["cash", "pos", "transfer"]).nullable().optional().default(null),
    note: z.string().trim().max(300).optional(),
    allowOverLimit: z.boolean().optional().default(false),
  })
  .refine((v) => v.deliveredItems.length >= 1 || v.returnItems.length >= 1, {
    message: "En az 1 teslimat veya iade kalemi girilmelidir.",
  })
  .refine((v) => v.collectedAmount <= 0 || v.paymentMethod !== null, {
    message: "Tahsilat tutarı için ödeme şekli (nakit, POS, havale) seçilmelidir.",
  });

interface OrderDbRow {
  id: string;
  order_number: string | null;
  status: string;
  cari_id: string | null;
  courier_id: string | null;
  delivery_date: string | null;
  shipping_fee: number | string | null;
}

interface OrderItemDbRow {
  product_id: string | null;
  product_name: string | null;
  unit_price: number | string | null;
  weight: number | string | null;
  image_url: string | null;
  capacity_units: number | null;
}

interface AccountDbRow {
  id: string;
  name: string;
  company_title: string | null;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  neighborhood: string | null;
  tax_id: string | null;
  tax_office: string | null;
  credit_limit: number | string | null;
  share_token_version: number | null;
  custom_prices: unknown;
  balance: number | string | null;
  archived_at: string | null;
}

interface ProductDbRow {
  id: string;
  name: string;
  price: number | string | null;
  weight: number | string | null;
  weight_unit: string | null;
  image_url: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function resolveUnit(prod?: ProductDbRow): string {
  if (!prod) return "adet";
  const weightNum = Number(prod.weight);
  if (Number.isFinite(weightNum) && weightNum > 0 && typeof prod.weight_unit === "string" && prod.weight_unit.trim()) {
    return `${weightNum}${prod.weight_unit.trim()}`;
  }
  return "adet";
}

function parseRpcTxSummary(raw: unknown): B2BHotSaleTransactionSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : "";
  if (!transactionId) return null;
  return {
    transactionId,
    slipNumber: typeof obj.slip_number === "string" ? obj.slip_number : "",
    delta: round2(Number(obj.delta) || 0),
    balanceAfter: round2(Number(obj.balance_after) || 0),
  };
}

function mapSlipPaymentMethod(method: "cash" | "pos" | "transfer" | null): B2BHotSalePaymentMethod | undefined {
  if (method === "cash") return "nakit";
  if (method === "pos") return "kredi_karti";
  if (method === "transfer") return "havale";
  return undefined;
}

/**
 * Kapıda esnek B2B cari teslimatı (Faz 7 / 032):
 * Gerçek teslim edilen adetleri günceller, bayat/fire iadesi düşer, isteğe bağlı
 * kısmi/tam tahsilat alır, cari deftere `satis` (+ opsiyonel `tahsilat`) işler
 * ve `FİŞ-YYMM-XXX` Sevk İrsaliyesi döndürür.
 * Kurye yalnız aktif + mesai açık iken ve kendine atanmış (veya havuzda `courier_id IS NULL`)
 * cari siparişini teslim edebilir; `allowOverLimit` yalnız admin tarafından kullanılabilir.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) {
      return NextResponse.json({ error: "Geçersiz sipariş numarası." }, { status: 400 });
    }

    const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
    if (!guard.ok) return guard.response;

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    const b = parsed.data;

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
    }

    const { data: orderRow, error: readErr } = await supabase
      .from("orders")
      .select("id, order_number, status, cari_id, courier_id, delivery_date, shipping_fee")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!orderRow) {
      return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }
    const o = orderRow as OrderDbRow;

    const actsAsCourier = guard.auth.role === "courier";
    if (actsAsCourier) {
      if (!guard.isActive || !guard.isOnShift || !guard.courierDbId) {
        return NextResponse.json(
          { error: "Mesainiz açık ve kurye hesabınız aktif olmalıdır." },
          { status: 403 },
        );
      }
      if (o.courier_id && o.courier_id !== guard.courierDbId) {
        return NextResponse.json({ error: "Bu sipariş başka bir kuryeye atanmış." }, { status: 403 });
      }
    }

    if (!o.cari_id) {
      return NextResponse.json(
        { error: "Yalnızca cari siparişlerde esnek B2B teslimat uygulanabilir.", code: "NOT_CARI_ORDER" },
        { status: 400 },
      );
    }

    if (o.status === "iptal") {
      return NextResponse.json(
        { error: "İptal edilmiş sipariş teslim edilemez.", code: "ORDER_CANCELLED" },
        { status: 409 },
      );
    }

    const [{ data: accRow, error: accErr }, { data: existingOrderItems, error: oiErr }] = await Promise.all([
      supabase
        .from("current_accounts")
        .select(
          "id, name, company_title, contact_person, phone, address, district, neighborhood, tax_id, tax_office, credit_limit, share_token_version, custom_prices, balance, archived_at",
        )
        .eq("id", o.cari_id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("product_id, product_name, unit_price, weight, image_url, capacity_units")
        .eq("order_id", o.id),
    ]);

    if (accErr) throw accErr;
    if (oiErr) throw oiErr;
    if (!accRow) {
      return NextResponse.json({ error: "Siparişin cari hesabı bulunamadı." }, { status: 404 });
    }
    const acc = accRow as AccountDbRow;
    if (acc.archived_at) {
      return NextResponse.json(
        { error: "Cari hesap arşivlenmiş; önce arşivden çıkarın.", code: "ARCHIVED_ACCOUNT" },
        { status: 409 },
      );
    }

    const allProductIds = [
      ...new Set(
        [...b.deliveredItems, ...b.returnItems]
          .map((it) => (typeof it.productId === "string" && it.productId.trim() ? it.productId.trim() : null))
          .filter((pid): pid is string => pid !== null),
      ),
    ];

    const productMap = new Map<string, ProductDbRow>();
    if (allProductIds.length > 0) {
      const { data: prodRows, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price, weight, weight_unit, image_url")
        .in("id", allProductIds);
      if (prodErr) throw prodErr;
      for (const p of (prodRows ?? []) as ProductDbRow[]) {
        productMap.set(p.id, p);
      }
    }

    const orderItemByProductId = new Map<string, OrderItemDbRow>();
    const orderItemByName = new Map<string, OrderItemDbRow>();
    for (const oi of (existingOrderItems ?? []) as OrderItemDbRow[]) {
      if (oi.product_id && oi.product_id.trim()) {
        orderItemByProductId.set(oi.product_id.trim(), oi);
      }
      if (oi.product_name && oi.product_name.trim()) {
        orderItemByName.set(oi.product_name.trim().toLowerCase(), oi);
      }
    }

    const customPrices = parseCustomPrices(acc.custom_prices);
    const canAdminOverride = guard.auth.isAdmin;

    const resolveLine = (
      line: z.infer<typeof FlexibleLineSchema>,
      isReturn: boolean,
    ): {
      ok: true;
      rpcItem: Record<string, unknown>;
      slipItem: B2BHotSaleItem;
      lineTotal: number;
    } | { ok: false; status: number; error: string } => {
      const pid = typeof line.productId === "string" && line.productId.trim() ? line.productId.trim() : null;
      const prod = pid ? productMap.get(pid) : undefined;
      const existingByPid = pid ? orderItemByProductId.get(pid) : undefined;
      const rawName = (line.productName ?? line.name ?? prod?.name ?? existingByPid?.product_name ?? "").trim();
      const existingByName = rawName ? orderItemByName.get(rawName.toLowerCase()) : undefined;
      const matchedOrderItem = existingByPid ?? existingByName;

      if (!rawName) {
        return { ok: false, status: 400, error: "Kalem adı çözümlenemedi." };
      }

      if (pid && !prod && !matchedOrderItem) {
        return { ok: false, status: 400, error: `Bilinmeyen ürün: ${rawName}` };
      }

      let resolvedPrice: number;
      if (canAdminOverride && typeof line.unitPrice === "number") {
        resolvedPrice = round2(line.unitPrice);
      } else if (pid) {
        if (matchedOrderItem) {
          resolvedPrice = round2(Number(matchedOrderItem.unit_price) || 0);
        } else if (customPrices[pid] !== undefined) {
          resolvedPrice = customPrices[pid];
        } else if (prod) {
          resolvedPrice = round2(Number(prod.price) || 0);
        } else {
          return { ok: false, status: 400, error: `Ürün fiyatı belirlenemedi: ${rawName}` };
        }
      } else if (matchedOrderItem) {
        resolvedPrice = round2(Number(matchedOrderItem.unit_price) || 0);
      } else {
        return {
          ok: false,
          status: 403,
          error: "Serbest fiyatlı yeni kalem yalnız yönetici tarafından eklenebilir.",
        };
      }

      const qty = Math.trunc(line.quantity);
      const lineTotal = round2(qty * resolvedPrice);
      const unit = resolveUnit(prod);

      return {
        ok: true,
        rpcItem: {
          productId: pid,
          name: prod?.name?.trim() || rawName,
          productName: prod?.name?.trim() || rawName,
          quantity: qty,
          unitPrice: resolvedPrice,
          imageUrl: prod?.image_url ?? matchedOrderItem?.image_url ?? null,
          weight: prod?.weight ?? matchedOrderItem?.weight ?? null,
          capacityUnits: pid ? matchedOrderItem?.capacity_units ?? null : 0,
        },
        slipItem: {
          productId: pid,
          name: isReturn ? `${prod?.name?.trim() || rawName} (İade)` : prod?.name?.trim() || rawName,
          productName: prod?.name?.trim() || rawName,
          quantity: isReturn ? -qty : qty,
          unitPrice: resolvedPrice,
          lineTotal: isReturn ? -lineTotal : lineTotal,
          unit,
          isReturn,
        },
        lineTotal,
      };
    };

    const deliveredRpc: Array<Record<string, unknown>> = [];
    const returnRpc: Array<Record<string, unknown>> = [];
    const slipItems: B2BHotSaleItem[] = [];
    let grossTotal = 0;
    let returnTotal = 0;

    for (const line of b.deliveredItems) {
      const resolved = resolveLine(line, false);
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }
      deliveredRpc.push(resolved.rpcItem);
      slipItems.push(resolved.slipItem);
      grossTotal = round2(grossTotal + resolved.lineTotal);
    }

    for (const line of b.returnItems) {
      const resolved = resolveLine(line, true);
      if (!resolved.ok) {
        return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      }
      returnRpc.push(resolved.rpcItem);
      slipItems.push(resolved.slipItem);
      returnTotal = round2(returnTotal + resolved.lineTotal);
    }

    const collectedAmount = round2(b.collectedAmount);
    const effectiveAllowOverLimit = canAdminOverride ? Boolean(b.allowOverLimit) : false;
    const actorRole = actsAsCourier ? "courier" : guard.auth.role === "staff" ? "staff" : "admin";

    const { data: rpcRaw, error: rpcErr } = await supabase.rpc("deliver_b2b_order_flexible_atomic", {
      p_order_id: o.id,
      p_delivered_items: deliveredRpc,
      p_return_items: returnRpc,
      p_collected_amount: collectedAmount,
      p_payment_method: collectedAmount > 0 ? b.paymentMethod : null,
      p_actor_role: actorRole,
      p_actor_id: guard.auth.userId,
      p_courier_id: guard.courierDbId ?? o.courier_id ?? null,
      p_note: b.note?.trim() || null,
      p_allow_over_limit: effectiveAllowOverLimit,
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("CREDIT_LIMIT_EXCEEDED")) {
        return NextResponse.json(
          { error: "Cari kredi limiti aşılıyor; teslimat durduruldu.", code: "CREDIT_LIMIT_EXCEEDED" },
          { status: 409 },
        );
      }
      if (msg.includes("ARCHIVED_ACCOUNT")) {
        return NextResponse.json(
          { error: "Cari hesap arşivlenmiş; teslimat yapılamaz.", code: "ARCHIVED_ACCOUNT" },
          { status: 409 },
        );
      }
      if (msg.includes("ORDER_CANCELLED")) {
        return NextResponse.json(
          { error: "İptal edilmiş sipariş teslim edilemez.", code: "ORDER_CANCELLED" },
          { status: 409 },
        );
      }
      if (msg.includes("NOT_CARI_ORDER")) {
        return NextResponse.json(
          { error: "Yalnızca cari siparişlerde esnek B2B teslimat kullanılabilir.", code: "NOT_CARI_ORDER" },
          { status: 400 },
        );
      }
      if (
        msg.includes("INVALID_ITEMS") ||
        msg.includes("INVALID_PAYMENT_METHOD") ||
        msg.includes("INVALID_COLLECTED_AMOUNT")
      ) {
        return NextResponse.json({ error: "Teslimat kalemleri veya ödeme bilgisi geçersiz." }, { status: 400 });
      }
      if (msg.includes("ORDER_NOT_FOUND") || msg.includes("CARI_NOT_FOUND")) {
        return NextResponse.json({ error: "Sipariş veya cari bulunamadı." }, { status: 404 });
      }
      // Hard Fail: asla parçalı fallback'e düşülmez
      logError("POST /api/orders/[id]/deliver-b2b RPC failed:", rpcErr);
      return NextResponse.json(
        { error: "Atomik B2B teslimat kaydı başarısız oldu; işlem iptal edildi." },
        { status: 500 },
      );
    }

    const rpcObj =
      rpcRaw && typeof rpcRaw === "object" && !Array.isArray(rpcRaw)
        ? (rpcRaw as Record<string, unknown>)
        : {};
    const already = Boolean(rpcObj.already);
    const saleTransaction = parseRpcTxSummary(rpcObj.sale_transaction);
    const paymentTransaction = parseRpcTxSummary(rpcObj.payment_transaction);

    const shippingFee = round2(Number(o.shipping_fee) || 0);
    const computedNet = round2(Math.max(round2(grossTotal - returnTotal), 0) + shippingFee);
    const netAmount =
      typeof rpcObj.net_total === "number" || typeof rpcObj.net_total === "string"
        ? round2(Number(rpcObj.net_total) || 0)
        : computedNet;

    const balanceAfter =
      paymentTransaction?.balanceAfter ??
      saleTransaction?.balanceAfter ??
      round2((Number(acc.balance) || 0) + netAmount - collectedAmount);

    const shareTokenVersion = Math.max(1, Math.trunc(Number(acc.share_token_version) || 1));
    let signedSlipUrl = "";
    if (saleTransaction?.transactionId) {
      const slipToken = signSlipToken(saleTransaction.transactionId, shareTokenVersion);
      if (slipToken) {
        signedSlipUrl = `${SITE_URL}/fis/${saleTransaction.transactionId}?t=${encodeURIComponent(slipToken)}`;
      }
    }

    const accountSummary: B2BHotSaleAccountSummary = {
      id: acc.id,
      businessName: acc.name,
      companyTitle: acc.company_title?.trim() || undefined,
      contactPerson: acc.contact_person ?? "",
      phone: acc.phone ?? "",
      address: acc.address ?? "",
      district: acc.district?.trim() || "Beylikdüzü",
      neighborhood: acc.neighborhood ?? "",
      taxNumber: acc.tax_id?.trim() || undefined,
      taxOffice: acc.tax_office?.trim() || undefined,
      creditLimit: round2(Number(acc.credit_limit) || 0),
      shareTokenVersion,
    };

    if (!already) {
      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole,
        action: "order.deliver_b2b_flexible",
        entityType: "order",
        entityId: o.id,
        summary: `Esnek B2B teslimat (${o.order_number ?? o.id}): Net ${netAmount.toFixed(2)} ₺, Tahsilat ${collectedAmount.toFixed(2)} ₺`,
        metadata: {
          orderNumber: o.order_number ?? null,
          accountId: acc.id,
          slipNumber: saleTransaction?.slipNumber ?? null,
          paymentSlipNumber: paymentTransaction?.slipNumber ?? null,
          grossTotal,
          returnTotal,
          netAmount,
          collectedAmount,
          paymentMethod: collectedAmount > 0 ? b.paymentMethod : null,
          allowOverLimit: effectiveAllowOverLimit,
          balanceAfter,
        },
      });
    }

    return NextResponse.json({
      success: true,
      already,
      orderId: o.id,
      orderNumber: o.order_number ?? o.id,
      saleTransaction,
      paymentTransaction,
      balanceAfter,
      signedSlipUrl,
      account: accountSummary,
      items: slipItems,
      grossTotal,
      returnTotal,
      netAmount,
      collectedAmount,
      paymentMethod: mapSlipPaymentMethod(collectedAmount > 0 ? b.paymentMethod : null),
      date: o.delivery_date || istanbulToday(),
      description: b.note?.trim() || `Teslimat ${o.order_number ?? o.id}`,
    });
  } catch (err: unknown) {
    logError("POST /api/orders/[id]/deliver-b2b:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Teslimat kaydedilemedi." }, { status: 500 });
  }
}
