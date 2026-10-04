import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { getErrorMessage } from "@/lib/utils/error";

const BodySchema = z.object({
  payment: z.enum(["cash", "pos", "transfer", "unpaid"]),
  note: z.string().trim().max(300).optional(),
});

const DELIVERY_ROLES = new Set(["courier", "staff", "admin", "superadmin"]);

/**
 * Teslim et: durum + ödeme + (cari siparişte) teslimat fişi ve tahsilat TEK işlemde (018 mark_order_delivered).
 * Aynı teslim tekrar gelirse (çevrimdışı kuyruk) ikinci kayıt atılmaz → { already: true }.
 * Yalnız kurye/personel/admin; kurye yalnız kendisine atanmış (ya da atanmamış) siparişi teslim eder.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) return NextResponse.json({ error: "Geçersiz sipariş numarası" }, { status: 400 });

    const auth = await verifyApiAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!auth.role || !DELIVERY_ROLES.has(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Ödeme şekli seçin (nakit, POS, havale, ödenmedi)" }, { status: 400 });

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const { data: order, error: readErr } = await supabase
      .from("orders")
      .select("id, courier_id")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!order) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    const o = order as { id: string; courier_id: string | null };

    const actsAsCourier = auth.role === "courier";
    if (actsAsCourier && o.courier_id && o.courier_id !== auth.courierDbId) {
      return NextResponse.json({ error: "Bu sipariş size atanmamış." }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("mark_order_delivered", {
      p_order_id: o.id,
      p_payment: parsed.data.payment,
      p_actor_role: actsAsCourier ? "courier" : "admin",
      p_actor_id: auth.userId,
      p_courier_id: auth.courierDbId,
      p_note: parsed.data.note ?? null,
    });

    if (error) {
      if (error.message.includes("ORDER_CANCELLED")) {
        return NextResponse.json({ error: "Sipariş iptal edilmiş; teslim edilemez." }, { status: 409 });
      }
      if (error.message.includes("CARI_ARCHIVED")) {
        return NextResponse.json({ error: "Siparişin carisi arşivlenmiş; önce cariyi arşivden çıkarın." }, { status: 409 });
      }
      // Atomik işlem başarısız: hiçbir parça yazılmadı, yedek yol yok (AGENTS.md §6)
      throw error;
    }

    const res = (data ?? {}) as { already?: boolean };
    return NextResponse.json({ success: true, already: Boolean(res.already) });
  } catch (err: unknown) {
    console.error("POST /api/orders/[id]/deliver:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Teslim kaydedilemedi" }, { status: 500 });
  }
}
