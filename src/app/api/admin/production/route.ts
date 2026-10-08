import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { getStoreSettings } from "@/lib/settings/server";
import { expandBundles } from "@/lib/ordering/availability";
import { parseBundleItems } from "@/lib/products/map";
import { isIsoDate } from "@/lib/time/istanbul";
import type { ProductionDay, ProductionLine } from "@/types/production";

interface ItemRow {
  product_id: string | null;
  product_name: string | null;
  quantity: number | null;
  capacity_units: number | null;
  components: unknown;
  orders: { id: string; status: string; delivery_date: string } | { id: string; status: string; delivery_date: string }[] | null;
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isIsoDate(date)) return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });

  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const [settings, itemsRes, capRes] = await Promise.all([
      getStoreSettings(supabase, { failClosed: true }),
      supabase
        .from("order_items")
        .select("product_id, product_name, quantity, capacity_units, components, orders!inner(id, status, delivery_date)")
        .eq("orders.delivery_date", date)
        .neq("orders.status", "iptal"),
      supabase.from("capacity_days").select("bread_capacity, note").eq("day", date).maybeSingle(),
    ]);
    if (itemsRes.error) throw itemsRes.error;

    const rows = (itemsRes.data ?? []) as ItemRow[];
    const orderIds = new Set<string>();
    let used = 0;
    const names = new Map<string, string>();

    const expandable = rows
      .filter((r) => r.product_id)
      .map((r) => {
        const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
        if (order) orderIds.add(order.id);
        names.set(r.product_id as string, r.product_name || (r.product_id as string));
        used += (Number(r.quantity) || 0) * (r.capacity_units ?? 1);
        return {
          productId: r.product_id as string,
          quantity: Number(r.quantity) || 0,
          components: parseBundleItems(r.components),
        };
      });

    const totals = expandBundles(expandable);

    // Ürün adları/kategorileri ve güncel kapasite birimleri (paket içeriği ürünleri dahil)
    const ids = Array.from(totals.keys());
    const { data: products, error: metaErr } = ids.length
      ? await supabase.from("products").select("id, name, category, capacity_units").in("id", ids)
      : { data: [], error: null };
    // Ürün bilgisi okunamazsa eşlikçiler ekmek sayılır ve plan yanlış olur: sessizce devam etme
    if (metaErr) throw metaErr;
    const meta = new Map(
      ((products ?? []) as { id: string; name: string; category: string | null; capacity_units: number | null }[]).map((p) => [p.id, p])
    );

    const lines: ProductionLine[] = ids
      .map((id) => ({
        productId: id,
        name: meta.get(id)?.name ?? names.get(id) ?? id,
        category: meta.get(id)?.category ?? "",
        quantity: totals.get(id) ?? 0,
        capacityUnits: meta.get(id)?.capacity_units ?? 1,
      }))
      .sort((a, b) => b.capacityUnits - a.capacityUnits || b.quantity - a.quantity || a.name.localeCompare(b.name, "tr"));

    const override = capRes.data as { bread_capacity: number; note: string | null } | null;
    const body: ProductionDay = {
      date,
      orderCount: orderIds.size,
      lines,
      wholesaleLoaves: settings.wholesaleDailyLoaves,
      capacity: {
        limit: override?.bread_capacity ?? settings.dailyBreadCapacity,
        used,
        isOverride: Boolean(override),
        note: override?.note ?? null,
      },
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    logError("GET /api/admin/production:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

const CapacitySchema = z.object({
  date: z.string().refine(isIsoDate, "Geçersiz tarih"),
  /** null → güne özel değeri kaldır (ayardaki varsayılan geçerli olur) */
  breadCapacity: z.number().int().min(0).max(10000).nullable(),
  note: z.string().trim().max(200).optional(),
});

/** Belirli bir gün için ekmek kapasitesi belirle / kaldır. */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
    const parsed = CapacitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }
    const { date, breadCapacity, note } = parsed.data;

    const { error } =
      breadCapacity === null
        ? await supabase.from("capacity_days").delete().eq("day", date)
        : await supabase
            .from("capacity_days")
            .upsert({ day: date, bread_capacity: breadCapacity, note: note || null, updated_at: new Date().toISOString() }, { onConflict: "day" });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logError("POST /api/admin/production:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
