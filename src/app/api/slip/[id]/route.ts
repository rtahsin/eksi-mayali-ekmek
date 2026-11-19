import { NextResponse } from "next/server";
import {
  CariServiceError,
  createSupabaseCariRepository,
  getSlipDetail,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit, ipRateLimitKey } from "@/lib/security/rateLimiter";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

const notFound = () => NextResponse.json({ success: false, error: "Fiş bulunamadı" }, { status: 404 });

/**
 * Fiş / makbuz verisi. Erişim: admin oturumu ya da imzalı link (`?t=`):
 *  - sipariş fişi → sipariş takip token'ı, cari hareketi → fiş token'ı (+ share_token_version).
 * Token yoksa/yanlışsa 404 (varlık bilgisi sızdırılmaz).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id.length > 64) return notFound();
    const token = new URL(req.url).searchParams.get("t");

    const ipLimit = await checkRateLimit(ipRateLimitKey("slip_get", req), 30, 60000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Çok fazla istek. Lütfen ${ipLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`,
        },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: "Supabase unconfigured" }, { status: 500 });
    }

    const repo = createSupabaseCariRepository(supabase);
    const data = await getSlipDetail({
      repo,
      id,
      token,
      checkIsAdmin: async () => (await verifyApiAuth(req)).isAdmin,
    });

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof CariServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    logError("Fetch slip error:", error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
