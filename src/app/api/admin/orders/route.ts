import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { isIsoDate } from "@/lib/time/istanbul";

const cents = (v: number) => Math.round(v * 100) / 100;

const ItemSchema = z.object({
  productId: z.string().min(1).max(80),
  productName: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().max(10000),
  unitPrice: z.number().min(0).max(1_000_000).transform(cents),
  imageUrl: z.string().max(500).optional(),
  weight: z.number().min(0).max(100000).optional(),
});

const BodySchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerName: z.string().trim().min(1, "Müşteri adı zorunlu").max(120),
  phone: z.string().trim().max(30).default(""),
  deliveryAddress: z.string().trim().max(500).default(""),
  neighborhood: z.string().trim().max(80).default(""),
  deliveryDate: z.string().refine(isIsoDate, "Teslim tarihi YYYY-AA-GG olmalı"),
  deliveryTimeWindow: z.string().trim().max(40).optional(),
  items: z.array(ItemSchema).min(1, "En az bir ürün ekleyin").max(60),
  // Teslimat ücreti admin kararı (cari/toptan siparişte 0 olabilir)
  shippingFee: z.number().min(0).max(100000).transform(cents),
  paymentMethod: z.enum(["cash_on_delivery", "pos_at_door", "transfer", "cari"]),
  source: z.enum(["whatsapp", "phone", "in_store", "web"]).default("phone"),
  status: z.enum(["bekliyor", "hazirlaniyor"]).default("hazirlaniyor"),
  cariId: z.string().min(1).max(80).optional(),
  orderNotes: z.string().trim().max(1000).default(""),
});

/**
 * Manuel (telefon/WhatsApp/dükkân) sipariş: tek atomik RPC (create_order_atomic), sunucuda numara.
 * Limit/kapasite admin için uyarı değil karardır → bypass. Cari borcu teslimde yazılır (018).
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const b = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    if (b.cariId) {
      const { data: acc, error } = await supabase.from("current_accounts").select("id, archived_at").eq("id", b.cariId).maybeSingle();
      if (error) throw error;
      if (!acc) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
      if ((acc as { archived_at: string | null }).archived_at) {
        return NextResponse.json({ error: "Cari arşivlenmiş; önce arşivden çıkarın." }, { status: 409 });
      }
    }

    const lines = b.items.map((it) => ({
      product_id: it.productId,
      product_name: it.productName,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total_price: cents(it.quantity * it.unitPrice),
      image_url: it.imageUrl ?? null,
      weight: it.weight ?? null,
    }));
    const subtotal = cents(lines.reduce((s, l) => s + l.total_price, 0));
    const total = cents(subtotal + b.shippingFee);

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_order: {
        id: crypto.randomUUID(),
        idempotency_key: b.idempotencyKey,
        customer_name: b.customerName,
        phone: b.phone,
        delivery_address: b.deliveryAddress,
        neighborhood: b.neighborhood,
        delivery_method: "courier",
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
        changed_by_role: "admin",
        history_note: "Manuel sipariş oluşturuldu",
      },
      p_items: lines,
      p_user_id: null,
    });

    if (error) {
      if (error.message.includes("PRODUCT_UNAVAILABLE")) {
        return NextResponse.json({ error: "Sepette satışta olmayan bir ürün var." }, { status: 409 });
      }
      throw error; // atomik: hiçbir parça yazılmadı
    }

    const res = data as { order_id: string; order_number: string; is_existing?: boolean };
    return NextResponse.json({ success: true, id: res.order_id, orderNumber: res.order_number, existing: Boolean(res.is_existing) });
  } catch (err: unknown) {
    logError("POST /api/admin/orders:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Sipariş kaydedilemedi" }, { status: 500 });
  }
}
