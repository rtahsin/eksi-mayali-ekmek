import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const BodySchema = z.object({
  payment: z.enum(["cash", "pos", "transfer", "unpaid"]),
  note: z.string().trim().max(300).optional(),
});

/**
 * Teslim et: durum + ödeme + (cari siparişte) teslimat fişi ve tahsilat TEK işlemde (018/029/031 mark_order_delivered).
 * Aynı teslim tekrar gelirse (çevrimdışı kuyruk) ikinci kayıt atılmaz → { already: true }.
 * Kurye yalnız aktif + mesai açık iken ve kendisine atanmış siparişi teslim edebilir.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) return NextResponse.json({ error: "Geçersiz sipariş numarası" }, { status: 400 });

    const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
    if (!guard.ok) return guard.response;

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Ödeme şekli seçin (nakit, POS, havale, ödenmedi)" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const { data: order, error: readErr } = await supabase
      .from("orders")
      .select("id, order_number, courier_id")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!order) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    const o = order as { id: string; order_number: string | null; courier_id: string | null };

    const actsAsCourier = guard.auth.role === "courier";
    if (actsAsCourier) {
      if (!guard.isActive || !guard.isOnShift || !guard.courierDbId) {
        return NextResponse.json(
          { error: "Mesainiz açık ve kurye hesabınız aktif olmalıdır." },
          { status: 403 }
        );
      }
      if (!o.courier_id || o.courier_id !== guard.courierDbId) {
        return NextResponse.json({ error: "Bu sipariş size atanmamış." }, { status: 403 });
      }
    }

    const actorRole = actsAsCourier ? "courier" : guard.auth.role === "staff" ? "staff" : "admin";

    const { data, error } = await supabase.rpc("mark_order_delivered", {
      p_order_id: o.id,
      p_payment: parsed.data.payment,
      p_actor_role: actorRole,
      p_actor_id: guard.auth.userId,
      p_courier_id: guard.courierDbId,
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
    if (!res.already) {
      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole,
        action: "order.deliver",
        entityType: "order",
        entityId: o.id,
        summary: `Sipariş teslim edildi (${o.order_number ?? o.id}, ödeme: ${parsed.data.payment})`,
        metadata: {
          orderNumber: o.order_number ?? null,
          payment: parsed.data.payment,
          courierId: guard.courierDbId ?? o.courier_id ?? null,
        },
      });
    }

    return NextResponse.json({ success: true, already: Boolean(res.already) });
  } catch (err: unknown) {
    logError("POST /api/orders/[id]/deliver:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Teslim kaydedilemedi" }, { status: 500 });
  }
}
