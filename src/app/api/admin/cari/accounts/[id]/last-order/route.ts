import { NextResponse } from "next/server";
import {
  CariServiceError,
  createSupabaseCariRepository,
  getCariLastOrder,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

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
    const repo = createSupabaseCariRepository(supabase);
    const result = await getCariLastOrder({ repo, id });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("GET /api/admin/cari/accounts/[id]/last-order:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Son sipariş okunamadı." },
      { status: 500 }
    );
  }
}
