import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseCustomPrices } from "@/lib/cari/account";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { isIsoDate } from "@/lib/time/istanbul";

const cents = (v: number) => Math.round(v * 100) / 100;

const ItemSchema = z.object({
  productId: z.string().trim().max(80).nullable().optional(),
  productName: z.string().trim().min(1, "Ürün adı zorunlu").max(160),
  quantity: z.number().int().positive().max(10000),
  unitPrice: z.number().min(0).max(1_000_000).finite().optional(),
  imageUrl: z.string().max(500).optional(),
  weight: z.number().min(0).max(100000).optional(),
});

const BodySchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerName: z.string().trim().min(1, "Müşteri adı zorunlu").max(120),
  phone: z.string().trim().max(30).default(""),
  deliveryAddress: z.string().trim().max(500).default(""),
  district: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().max(80).default(""),
  deliveryMethod: z.enum(["courier", "pickup"]).default("courier"),
  deliveryDate: z.string().refine(isIsoDate, "Teslim tarihi YYYY-AA-GG olmalı"),
  deliveryTimeWindow: z.string().trim().max(40).optional(),
  items: z.array(ItemSchema).min(1, "En az bir ürün ekleyin").max(60),
  // Teslimat ücreti admin/operasyon kararı (cari/toptan siparişte 0 olabilir)
  shippingFee: z.number().min(0).max(100000).transform(cents),
  paymentMethod: z.enum(["cash_on_delivery", "pos_at_door", "transfer", "cari"]),
  source: z.enum(["whatsapp", "phone", "in_store", "web", "admin", "standing_order"]).default("phone"),
  status: z.enum(["bekliyor", "hazirlaniyor"]).default("hazirlaniyor"),
  cariId: z.string().min(1).max(80).optional(),
  courierId: z.string().uuid().nullable().optional(),
  courierNotes: z.string().trim().max(300).optional(),
  orderNotes: z.string().trim().max(1000).default(""),
});

/**
 * Manuel (telefon/WhatsApp/dükkân/admin) sipariş: tek atomik RPC (create_order_atomic).
 * Katalog ürünlerinde admin için geçerli unitPrice override kabul edilir; personel için
 * sunucu `products` (+ cari `custom_prices`) fiyatını korur. Serbest kalemlerde
 * (`productId` boş/null) `productName` ve `unitPrice >= 0` ile `capacity_units: 0` yazılır.
 * Cari borcu sipariş anında değil teslimde yazılır (018/032).
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
    let cariDistrict: string | null = null;

    if (b.cariId) {
      const { data: acc, error } = await supabase
        .from("current_accounts")
        .select("id, archived_at, custom_prices, district")
        .eq("id", b.cariId)
        .maybeSingle();
      if (error) throw error;
      if (!acc) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
      const accRow = acc as {
        archived_at: string | null;
        custom_prices: unknown;
        district?: string | null;
      };
      if (accRow.archived_at) {
        return NextResponse.json({ error: "Cari arşivlenmiş; önce arşivden çıkarın." }, { status: 409 });
      }
      customPrices = parseCustomPrices(accRow.custom_prices);
      cariDistrict = typeof accRow.district === "string" && accRow.district.trim() ? accRow.district.trim() : null;
    }

    const productIds = [
      ...new Set(
        b.items
          .map((it) => (typeof it.productId === "string" && it.productId.trim() ? it.productId.trim() : null))
          .filter((id): id is string => id !== null),
      ),
    ];

    interface ProductPriceRow {
      id: string;
      name: string | null;
      price: number | string | null;
      image_url: string | null;
      weight: number | null;
    }

    const productMap = new Map<string, ProductPriceRow>();
    if (productIds.length > 0) {
      const { data: productRows, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price, image_url, weight")
        .in("id", productIds);
      if (prodErr) throw prodErr;

      for (const row of (productRows ?? []) as ProductPriceRow[]) {
        productMap.set(row.id, row);
      }
    }

    for (const it of b.items) {
      const pid = typeof it.productId === "string" && it.productId.trim() ? it.productId.trim() : null;
      if (pid) {
        if (!productMap.has(pid)) {
          return NextResponse.json(
            { error: `Ürün katalogda bulunamadı: ${it.productName}` },
            { status: 400 },
          );
        }
      } else if (typeof it.unitPrice !== "number" || !Number.isFinite(it.unitPrice) || it.unitPrice < 0) {
        return NextResponse.json(
          { error: `Serbest kalem için geçerli birim fiyat girin: ${it.productName}` },
          { status: 400 },
        );
      }
    }

    const canOverridePrice = guard.auth.isAdmin;

    const lines = b.items.map((it) => {
      const pid = typeof it.productId === "string" && it.productId.trim() ? it.productId.trim() : null;
      if (!pid) {
        const freePrice = cents(it.unitPrice ?? 0);
        return {
          product_id: null,
          product_name: it.productName,
          quantity: it.quantity,
          unit_price: freePrice,
          total_price: cents(it.quantity * freePrice),
          image_url: it.imageUrl ?? null,
          weight: it.weight ?? null,
          capacity_units: 0,
        };
      }

      const prod = productMap.get(pid)!;
      const catalogPrice = cents(Number(prod.price) || 0);
      const customPrice = customPrices[pid];
      const basePrice = customPrice !== undefined ? customPrice : catalogPrice;
      const hasClientOverride =
        canOverridePrice && typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice) && it.unitPrice >= 0;
      const serverUnitPrice = hasClientOverride ? cents(it.unitPrice!) : basePrice;

      return {
        product_id: pid,
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
    const effectiveDistrict = (b.district && b.district.trim()) || cariDistrict || "Beylikdüzü";

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_order: {
        id: crypto.randomUUID(),
        idempotency_key: b.idempotencyKey,
        customer_name: b.customerName,
        phone: b.phone,
        delivery_address: b.deliveryAddress,
        district: effectiveDistrict,
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
        courier_id: b.courierId ?? null,
        courier_notes: b.courierNotes?.trim() || null,
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
          courierId: b.courierId ?? null,
          district: effectiveDistrict,
          source: b.source,
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
