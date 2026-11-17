import { NextResponse } from "next/server";
import {
  buildCariShareUrl,
  CariServiceError,
  createSupabaseCariRepository,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * Müşteriye gönderilecek imzalı link: `?accountId=` → ekstre, `?transactionId=` → tek fiş/makbuz,
 * `?orderId=` → sipariş teslimat fişi (sipariş takip token'ı ile).
 * accountId ve transactionId için güncel share_token_version okunarak imzalanır.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const transactionId = url.searchParams.get("transactionId");
  const orderId = url.searchParams.get("orderId");

  try {
    const repo = createSupabaseCariRepository(supabase);
    const result = await buildCariShareUrl({ repo, accountId, transactionId, orderId });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("GET /api/admin/cari/share:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Paylaşım linki oluşturulamadı" },
      { status: 500 }
    );
  }
}
