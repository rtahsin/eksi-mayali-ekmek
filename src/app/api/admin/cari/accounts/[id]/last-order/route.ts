import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/kernel/log";
import { getErrorMessage } from "@/lib/utils/error";

interface LastOrderLine {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface OrderItemRow {
  product_id: string | null;
  product_name: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
}

interface OrderRow {
  id: string;
  delivery_date: string | null;
  created_at: string | null;
  order_items?: OrderItemRow[] | null;
}

interface LedgerRow {
  id: string;
  date: string | null;
  items: unknown;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function parseLedgerItems(raw: unknown): LastOrderLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: LastOrderLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    if (obj.isReturn === true) continue;
    const quantity = Math.trunc(Number(obj.quantity));
    const unitPrice = round2(Number(obj.unitPrice ?? obj.unit_price ?? 0));
    const name =
      (typeof obj.productName === "string" && obj.productName.trim()) ||
      (typeof obj.name === "string" && obj.name.trim()) ||
      "";
    const productId =
      typeof obj.productId === "string" && obj.productId.trim()
        ? obj.productId.trim()
        : typeof obj.product_id === "string" && obj.product_id.trim()
          ? obj.product_id.trim()
          : null;
    if (!name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      continue;
    }
    lines.push({ productId, name, quantity, unitPrice });
  }
  return lines;
}

/**
 * Cari için "Son Siparişi Doldur" kaynağı:
 * 1) `orders` tablosundaki iptal edilmemiş en son siparişin kalemleri (`sourceKind: "order"`).
 * 2) Sipariş yoksa `account_transactions` içindeki storno edilmemiş en son `satis` fişinin
 *    pozitif (iade olmayan) kalemleri (`sourceKind: "ledger"`).
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(req, "cari.read");
  if (!guard.ok) return guard.response;

  const { id } = await props.params;
  if (!id || !id.trim()) {
    return NextResponse.json({ error: "Cari kimliği zorunludur." }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
  }

  try {
    const { data: orderRows, error: ordErr } = await supabase
      .from("orders")
      .select("id, delivery_date, created_at, order_items(product_id, product_name, quantity, unit_price)")
      .eq("cari_id", id)
      .neq("status", "iptal")
      .order("delivery_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    if (ordErr) throw ordErr;

    for (const row of (orderRows ?? []) as OrderRow[]) {
      const items: LastOrderLine[] = [];
      for (const it of row.order_items ?? []) {
        const qty = Math.trunc(Number(it.quantity));
        const price = round2(Number(it.unit_price) || 0);
        const name = (it.product_name ?? "").trim();
        if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) continue;
        items.push({
          productId: it.product_id && it.product_id.trim() ? it.product_id.trim() : null,
          name,
          quantity: qty,
          unitPrice: price,
        });
      }
      if (items.length > 0) {
        return NextResponse.json({
          items,
          sourceDate: row.delivery_date ?? null,
          sourceKind: "order" as const,
        });
      }
    }

    const [{ data: satisRows, error: txErr }, { data: stornoRows, error: stErr }] = await Promise.all([
      supabase
        .from("account_transactions")
        .select("id, date, items, created_at")
        .eq("account_id", id)
        .eq("type", "satis")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("account_transactions")
        .select("reverses_id")
        .eq("account_id", id)
        .eq("type", "storno")
        .not("reverses_id", "is", null),
    ]);
    if (txErr) throw txErr;
    if (stErr) throw stErr;

    const reversedIds = new Set<string>();
    for (const r of (stornoRows ?? []) as Array<{ reverses_id: string | null }>) {
      if (typeof r.reverses_id === "string" && r.reverses_id) {
        reversedIds.add(r.reverses_id);
      }
    }

    for (const tx of (satisRows ?? []) as LedgerRow[]) {
      if (reversedIds.has(tx.id)) continue;
      const items = parseLedgerItems(tx.items);
      if (items.length > 0) {
        return NextResponse.json({
          items,
          sourceDate: tx.date ?? null,
          sourceKind: "ledger" as const,
        });
      }
    }

    return NextResponse.json({
      items: [],
      sourceDate: null,
      sourceKind: null,
    });
  } catch (err: unknown) {
    logError("GET /api/admin/cari/accounts/[id]/last-order:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Son sipariş okunamadı." }, { status: 500 });
  }
}
