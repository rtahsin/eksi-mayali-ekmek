import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { hasCapability } from "@/lib/security/capabilities";
import { writeAuditLog } from "@/lib/security/audit";
import { parseOrderLookup } from "@/lib/orders/orderId";

/** Ara durumlar. Teslim → /deliver, iptal → /cancel (ikisi de tek atomik RPC). */
const FLOW = ["bekliyor", "hazirlaniyor", "firinda", "kuryede"] as const;
type FlowStatus = (typeof FLOW)[number];

const BodySchema = z.object({
  status: z.enum(FLOW),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
    if (!guard.ok) return guard.response;

    const { auth } = guard;
    const isOps = hasCapability(auth.role, "orders.ops");
    const actsAsCourier = auth.role === "courier";
    if (!isOps && !actsAsCourier) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) return NextResponse.json({ error: "Geçersiz sipariş numarası" }, { status: 400 });

    const raw: unknown = await req.json().catch(() => null);
    const rawStatus =
      typeof raw === "object" && raw !== null ? (raw as { status?: unknown }).status : undefined;
    if (rawStatus === "teslim_edildi" || rawStatus === "iptal") {
      return NextResponse.json(
        { error: rawStatus === "teslim_edildi" ? "Teslim için /deliver kullanılır" : "İptal için /cancel kullanılır" },
        { status: 400 }
      );
    }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    const next: FlowStatus = parsed.data.status;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const { data: order, error: readErr } = await supabase
      .from("orders")
      .select("id, order_number, status, courier_id")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!order) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    const o = order as { id: string; order_number: string | null; status: string; courier_id: string | null };

    if (o.status === "teslim_edildi" || o.status === "iptal") {
      return NextResponse.json({ error: `'${o.status}' durumundaki sipariş değiştirilemez.` }, { status: 409 });
    }

    const from = FLOW.indexOf(o.status as FlowStatus);
    const to = FLOW.indexOf(next);
    if (isOps) {
      // Admin/personel ileriye istediği adıma geçebilir (ör. bekliyor → kuryede); geri dönüş yok
      if (to <= from) {
        return NextResponse.json({ error: `'${o.status}' → '${next}' geçişi yapılamaz.` }, { status: 400 });
      }
    } else {
      // Kurye yalnız aktif + mesai açık iken ve kendisine atanmış siparişi yola çıkarır
      if (!guard.isActive || !guard.isOnShift || !guard.courierDbId) {
        return NextResponse.json(
          { error: "Mesainiz açık ve kurye hesabınız aktif olmalıdır." },
          { status: 403 }
        );
      }
      if (next !== "kuryede" || !o.courier_id || o.courier_id !== guard.courierDbId) {
        return NextResponse.json({ error: "Bu siparişi güncelleme yetkiniz yok." }, { status: 403 });
      }
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from("orders")
      .update({ status: next, updated_at: nowIso })
      .eq("id", o.id)
      .eq("status", o.status) // iyimser kilit
      .select("id");
    if (updErr) throw updErr;
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: "Sipariş bu arada güncellendi; sayfayı yenileyin." }, { status: 409 });
    }

    const actorRole = actsAsCourier ? "courier" : auth.role === "staff" ? "staff" : "admin";

    const { error: histErr } = await supabase.from("order_status_history").insert({
      order_id: o.id,
      from_status: o.status,
      to_status: next,
      changed_by_role: actorRole,
      changed_by_id: auth.userId,
      note: parsed.data.note || null,
    });
    if (histErr) logError("order_status_history insert:", histErr);

    await writeAuditLog(supabase, {
      actorId: auth.userId,
      actorRole,
      action: "order.status_change",
      entityType: "order",
      entityId: o.id,
      summary: `Sipariş durumu güncellendi (${o.order_number ?? o.id}: ${o.status} → ${next})`,
      metadata: {
        orderNumber: o.order_number ?? null,
        fromStatus: o.status,
        toStatus: next,
      },
    });

    return NextResponse.json({ success: true, status: next });
  } catch (err: unknown) {
    logError("PATCH /api/orders/[id]/status:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Durum güncellenemedi" }, { status: 500 });
  }
}
