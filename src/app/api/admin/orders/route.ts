import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { isIsoDate } from "@/lib/time/istanbul";

const cents = (v: number) => Math.round(v * 100) / 100;

const ItemSchema = z.object({
  productId: z.string().min(1).max(80),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().max(10000),
  unitPrice: z.number().min(0).max(1_000_000).optional(),
  imageUrl: z.string().max(500).optional(),
  weight: z.number().min(0).max(100000).optional(),
});

const BodySchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerName: z.string().trim().min(1, "Müşteri adı zorunlu").max(120),
  phone: z.string().trim().max(30).default(""),
  deliveryAddress: z.string().trim().max(500).default(""),
  neighborhood: z.string().trim().max(80).default(""),
  deliveryMethod: z.enum(["courier", "pickup"]).default("courier"),
  deliveryDate: z.string().refine(isIsoDate, "Teslim tarihi YYYY-AA-GG olmalı"),
  deliveryTimeWindow: z.string().trim().max(40).optional(),
  items: z.array(ItemSchema).min(1, "En az bir ürün ekleyin").max(60),
  // Teslimat ücreti admin/operasyon kararı (cari/toptan siparişte 0 olabilir)
  shippingFee: z.number().min(0).max(100000).transform(cents),
  paymentMethod: z.enum(["cash_on_delivery", "pos_at_door", "transfer", "cari"]),
  source: z.enum(["whatsapp", "phone", "in_store", "web"]).default("phone"),
  status: z.enum(["bekliyor", "hazirlaniyor"]).default("hazirlaniyor"),
  cariId: z.string().min(1).max(80).optional(),
  orderNotes: z.string().trim().max(1000).default(""),
});

function parseCustomPrices(raw: unknown): Record<string, number> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    const num = typeof val === "number" ? val : typeof val === "string" ? Number(val) : NaN;
    if (Number.isFinite(num) && num >= 0) {
      result[key] = cents(num);
    }
  }
  return result;
}

/**
 * Manuel (telefon/WhatsApp/dükkân) sipariş: tek atomik RPC (create_order_atomic), sunucuda numara.
 * Birim fiyatlar her zaman sunucuda `products` (+ cari varsa `custom_prices`) üzerinden hesaplanır.
 * Limit/kapasite admin için uyarı değil karardır → bypass. Cari borcu teslimde yazılır (018).
 */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "orders.ops");
  if (!guard.ok) return guard.response;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const b = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    let customPrices: Record<string, number> = {};
    if (b.cariId) {
      const { data: acc, error } = await supabase
        .from("current_accounts")
        .select("id, archived_at, custom_prices")
        .eq("id", b.cariId)
        .maybeSingle();
      if (error) throw error;
      if (!acc) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
      const accRow = acc as { archived_at: string | null; custom_prices: unknown };
      if (accRow.archived_at) {
        return NextResponse.json({ error: "Cari arşivlenmiş; önce arşivden çıkarın." }, { status: 409 });
      }
      customPrices = parseCustomPrices(accRow.custom_prices);
    }

    const productIds = [...new Set(b.items.map((it) => it.productId))];
    const { data: productRows, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, image_url, weight")
      .in("id", productIds);
    if (prodErr) throw prodErr;

    interface ProductPriceRow {
      id: string;
      name: string | null;
      price: number | string | null;
      image_url: string | null;
      weight: number | null;
    }

    const productMap = new Map<string, ProductPriceRow>();
    for (const row of (productRows ?? []) as ProductPriceRow[]) {
      productMap.set(row.id, row);
    }

    for (const it of b.items) {
      if (!productMap.has(it.productId)) {
        return NextResponse.json(
          { error: `Ürün katalogda bulunamadı: ${it.productName}` },
          { status: 400 }
        );
      }
    }

    const lines = b.items.map((it) => {
      const prod = productMap.get(it.productId)!;
      const catalogPrice = cents(Number(prod.price) || 0);
      const customPrice = customPrices[it.productId];
      const serverUnitPrice = customPrice !== undefined ? customPrice : catalogPrice;
      return {
        product_id: it.productId,
        product_name: prod.name?.trim() || it.productName,
        quantity: it.quantity,
        unit_price: serverUnitPrice,
        total_price: cents(it.quantity * serverUnitPrice),
        image_url: prod.image_url ?? it.imageUrl ?? null,
        weight: prod.weight ?? it.weight ?? null,
      };
    });

    const subtotal = cents(lines.reduce((s, l) => s + l.total_price, 0));
    const total = cents(subtotal + b.shippingFee);
    const actorRole = guard.auth.role === "staff" ? "staff" : "admin";

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_order: {
        id: crypto.randomUUID(),
        idempotency_key: b.idempotencyKey,
        customer_name: b.customerName,
        phone: b.phone,
        delivery_address: b.deliveryAddress,
        neighborhood: b.neighborhood,
        delivery_method: b.deliveryMethod,
        delivery_date: b.deliveryDate,
        delivery_time_window: b.deliveryTimeWindow ?? null,
        status: b.status,
        payment_method: b.paymentMethod,
        payment_status: "pending",
        source: b.source,
        subtotal,
        shipping_fee: b.shippingFee,
        total_amount: total,
        order_notes: b.orderNotes,
        cari_id: b.cariId ?? null,
        bypass_limits: true,
        changed_by_role: actorRole,
        history_note: "Manuel sipariş oluşturuldu",
      },
      p_items: lines,
      p_user_id: guard.auth.userId,
    });

    if (error) {
      if (error.message.includes("PRODUCT_UNAVAILABLE")) {
        return NextResponse.json({ error: "Sepette satışta olmayan bir ürün var." }, { status: 409 });
      }
      throw error; // atomik: hiçbir parça yazılmadı
    }

    const res = data as { order_id: string; order_number: string; is_existing?: boolean };
    if (!res.is_existing) {
      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole,
        action: "order.manual_create",
        entityType: "order",
        entityId: res.order_id,
        summary: `Manuel sipariş oluşturuldu (${res.order_number}, ${total} ₺)`,
        metadata: {
          orderNumber: res.order_number,
          cariId: b.cariId ?? null,
          totalAmount: total,
          itemCount: lines.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      id: res.order_id,
      orderNumber: res.order_number,
      existing: Boolean(res.is_existing),
    });
  } catch (err: unknown) {
    logError("POST /api/admin/orders:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Sipariş kaydedilemedi" }, { status: 500 });
  }
}
