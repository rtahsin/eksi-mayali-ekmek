import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";
import { signAccountToken, verifyOrderToken, verifySlipToken } from "@/lib/security/linkToken";
import { LEDGER_SELECT, mapLedgerRow, type LedgerRow } from "@/lib/cari/ledger";
import { SITE_URL } from "@/lib/site";
import { getErrorMessage } from "@/lib/utils/error";

interface ParsedSlipItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
  imageUrl?: string;
}

interface ProductMetaRow {
  name: string;
  image_url: string | null;
  weight: number | null;
}

interface OrderItemRow {
  product_name: string | null;
  quantity: number | string | null;
  unit_price: number | string | null;
  total_price: number | string | null;
  image_url: string | null;
  weight: number | null;
}

function productMeta(products: ProductMetaRow[], itemName: string): { imageUrl?: string; weight?: number } {
  const target = itemName.trim().toLowerCase();
  const found = products.find((p) => {
    const n = p.name.trim().toLowerCase();
    return n === target || target.includes(n) || n.includes(target);
  });
  return { imageUrl: found?.image_url || undefined, weight: found?.weight || undefined };
}

function ekstreUrl(accountId: string | null): string | null {
  if (!accountId) return null;
  const t = signAccountToken(accountId);
  return t ? `${SITE_URL}/ekstre/${encodeURIComponent(accountId)}?t=${t}` : null;
}

const notFound = () => NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });

/**
 * Fiş / makbuz verisi. Erişim: admin oturumu ya da imzalı link (`?t=`):
 *  - sipariş fişi → sipariş takip token'ı, cari hareketi → fiş token'ı.
 * Token yoksa/yanlışsa 404 (varlık bilgisi sızdırılmaz).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id.length > 64) return notFound();
    const token = new URL(req.url).searchParams.get("t");

    const ipLimit = await checkRateLimit(`slip_get_${getClientIp(req)}`, 30, 60000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Çok fazla istek. Lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyin.` },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const tokenOk = verifySlipToken(id, token) || verifyOrderToken(id, token);
    const isAdmin = tokenOk ? false : (await verifyApiAuth(req)).isAdmin;
    if (!tokenOk && !isAdmin) return notFound();

    const { data: prods } = await supabase.from("products").select("name, image_url, weight");
    const products = (prods ?? []) as ProductMetaRow[];

    // 1) Cari hareketi (teslimat fişi / tahsilat makbuzu / devir / iptal)
    if (isUuid && (isAdmin || verifySlipToken(id, token))) {
      const { data: row } = await supabase.from("account_transactions").select(LEDGER_SELECT).eq("id", id).maybeSingle();
      if (row) {
        const tx = mapLedgerRow(row as LedgerRow);
        const { data: acc } = await supabase
          .from("current_accounts")
          .select("name, tax_id, phone, address, neighborhood")
          .eq("id", tx.cariId)
          .maybeSingle();
        const cari = (acc ?? {}) as { name?: string; tax_id?: string; phone?: string; address?: string; neighborhood?: string };

        let reversesSlip: string | null = null;
        if (tx.reversesId) {
          const { data: orig } = await supabase.from("account_transactions").select("slip_number").eq("id", tx.reversesId).maybeSingle();
          reversesSlip = (orig as { slip_number: string | null } | null)?.slip_number ?? null;
        }

        const items: ParsedSlipItem[] = (tx.items ?? []).map((it) => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: Math.round(it.quantity * it.unitPrice * 100) / 100,
          ...productMeta(products, it.name),
        }));
        const isProductSale = tx.type === "satis" && items.length > 0;
        // 016 öncesi fişlerde not açıklamanın "| Not:" kısmında; sonrasında açıklamanın kendisi not
        const hasJsonItems = Array.isArray((row as LedgerRow).items);
        const note = hasJsonItems ? tx.description : tx.description.split("| Not:")[1]?.trim() ?? "";
        const label =
          tx.type === "storno"
            ? `İptal edilen belge: ${reversesSlip ?? "—"}`
            : tx.description || (tx.type === "devir" ? "Bakiye düzeltme" : tx.type === "tahsilat" ? "Tahsilat" : "Teslimat");
        const balanceAfter = tx.balanceAfter ?? 0;

        return NextResponse.json({
          success: true,
          data: {
            id: tx.id,
            slipNumber: tx.slipNumber || `FİŞ-${tx.id.slice(0, 6).toUpperCase()}`,
            businessName: cari.name || "Kurumsal Müşteri",
            phone: cari.phone || "",
            address: cari.address || "",
            neighborhood: cari.neighborhood || "",
            taxNumber: cari.tax_id || "",
            cariId: tx.cariId,
            ekstreUrl: ekstreUrl(tx.cariId),
            isProductSale,
            type: tx.type,
            cancelled: Boolean(await isReversed(supabase, tx.id)),
            paymentMethod: tx.paymentMethod || null,
            createdAt: tx.createdAt || tx.date,
            date: tx.date,
            items: isProductSale ? items : [{ name: label, quantity: 1, unitPrice: Math.abs(tx.delta), totalPrice: Math.abs(tx.delta) }],
            subtotal: Math.abs(tx.delta),
            totalAmount: Math.abs(tx.delta),
            isPositiveDelta: tx.delta >= 0,
            previousBalance: Math.round((balanceAfter - tx.delta) * 100) / 100,
            newBalance: balanceAfter,
            notes: isProductSale ? note : "",
          },
        });
      }
    }

    // 2) Sipariş fişi
    if (isAdmin || verifyOrderToken(id, token)) {
      const { data: order } = await supabase
        .from("orders")
        .select(
          "id, order_number, cari_id, customer_name, phone, delivery_address, neighborhood, delivery_date, delivery_time_window, status, subtotal, total_amount, created_at, order_items(product_name, quantity, unit_price, total_price, image_url, weight)"
        )
        .eq("id", id)
        .maybeSingle();
      if (order) {
        const o = order as {
          id: string; order_number: string | null; cari_id: string | null; customer_name: string | null; phone: string | null;
          delivery_address: string | null; neighborhood: string | null; delivery_date: string | null; delivery_time_window: string | null;
          status: string; subtotal: number | string | null; total_amount: number | string | null; created_at: string;
          order_items: OrderItemRow[] | null;
        };
        const total = Number(o.total_amount) || 0;
        let businessName = o.customer_name || "Değerli Müşterimiz";
        let taxNumber = "";
        let previousBalance: number | undefined;
        let newBalance: number | undefined;

        if (o.cari_id) {
          const { data: acc } = await supabase.from("current_accounts").select("name, tax_id").eq("id", o.cari_id).maybeSingle();
          const a = (acc ?? {}) as { name?: string; tax_id?: string };
          businessName = a.name || businessName;
          taxNumber = a.tax_id || "";
          // Bu siparişin defterdeki satış satırı (o anki bakiye — yürüyen bakiye kuralı)
          const { data: sale } = await supabase
            .from("account_transactions")
            .select("delta, balance_after")
            .eq("order_id", o.id)
            .eq("type", "satis")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const s = sale as { delta: number | string; balance_after: number | string | null } | null;
          if (s && s.balance_after !== null) {
            newBalance = Number(s.balance_after);
            previousBalance = Math.round((newBalance - Number(s.delta)) * 100) / 100;
          }
        }

        const items: ParsedSlipItem[] = (o.order_items ?? []).map((it) => {
          const name = it.product_name || "Ürün";
          const quantity = Number(it.quantity) || 1;
          const unitPrice = Number(it.unit_price) || 0;
          const meta = productMeta(products, name);
          return {
            name,
            quantity,
            unitPrice,
            totalPrice: Number(it.total_price) || quantity * unitPrice,
            weight: it.weight || meta.weight,
            imageUrl: it.image_url || meta.imageUrl,
          };
        });

        return NextResponse.json({
          success: true,
          data: {
            id: o.id,
            orderNumber: o.order_number || o.id.slice(0, 8).toUpperCase(),
            slipNumber: o.order_number || o.id.slice(0, 8).toUpperCase(),
            businessName,
            phone: o.phone || "",
            address: o.delivery_address || "",
            neighborhood: o.neighborhood || "",
            taxNumber,
            cariId: o.cari_id,
            ekstreUrl: ekstreUrl(o.cari_id),
            isProductSale: true,
            type: "satis",
            createdAt: o.created_at,
            date: o.delivery_date || o.created_at,
            timeWindow: o.delivery_time_window || "",
            items,
            subtotal: Number(o.subtotal) || total,
            totalAmount: total,
            isPositiveDelta: true,
            previousBalance,
            newBalance,
            status: o.status,
          },
        });
      }
    }

    return notFound();
  } catch (error: unknown) {
    console.error("Fetch slip error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}

async function isReversed(supabase: NonNullable<ReturnType<typeof createAdminClient>>, txId: string): Promise<boolean> {
  const { data } = await supabase.from("account_transactions").select("id").eq("reverses_id", txId).limit(1);
  return Boolean(data && data.length > 0);
}
