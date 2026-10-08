import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { verifyApiAuth } from "@/lib/security/apiAuth";
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
    const auth = await verifyApiAuth(req);
    if (!auth.isAuthenticated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isStaff = auth.isAdmin || auth.role === "staff";
    if (!isStaff && !auth.isCourier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) return NextResponse.json({ error: "Geçersiz sipariş numarası" }, { status: 400 });

    const raw: unknown = await req.json().catch(() => null);
    const rawStatus = (raw as { status?: unknown } | null)?.status;
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
      .select("id, status, courier_id")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!order) return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    const o = order as { id: string; status: string; courier_id: string | null };

    if (o.status === "teslim_edildi" || o.status === "iptal") {
      return NextResponse.json({ error: `'${o.status}' durumundaki sipariş değiştirilemez.` }, { status: 409 });
    }

    const from = FLOW.indexOf(o.status as FlowStatus);
    const to = FLOW.indexOf(next);
    if (isStaff) {
      // Admin/personel ileriye istediği adıma geçebilir (ör. bekliyor → kuryede); geri dönüş yok
      if (to <= from) {
        return NextResponse.json({ error: `'${o.status}' → '${next}' geçişi yapılamaz.` }, { status: 400 });
      }
    } else {
      // Kurye yalnız kendisine atanmış siparişi yola çıkarır
      if (next !== "kuryede" || (o.courier_id && o.courier_id !== auth.courierDbId)) {
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

    const { error: histErr } = await supabase.from("order_status_history").insert({
      order_id: o.id,
      from_status: o.status,
      to_status: next,
      changed_by_role: isStaff ? "admin" : "courier",
      changed_by_id: auth.userId,
      note: parsed.data.note || null,
    });
    if (histErr) logError("order_status_history insert:", histErr);

    return NextResponse.json({ success: true, status: next });
  } catch (err: unknown) {
    logError("PATCH /api/orders/[id]/status:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Durum güncellenemedi" }, { status: 500 });
  }
}
