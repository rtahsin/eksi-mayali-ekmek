import { NextResponse } from "next/server";
import {
  CariServiceError,
  createSupabaseCariRepository,
  getCustomerStatement,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit, ipRateLimitKey } from "@/lib/security/rateLimiter";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

const notFound = () => NextResponse.json({ error: "Ekstre bulunamadı" }, { status: 404 });

/** Müşteri ekstresi: imzalı link (`?t=`) ya da admin oturumu. Hareketler yeniden eskiye. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || id.length > 80) return notFound();

    const limit = await checkRateLimit(ipRateLimitKey("ekstre_get", req), 30, 60000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Çok fazla istek. ${limit.retryAfterSeconds} sn sonra deneyin.` },
        { status: 429 }
      );
    }

    const token = new URL(req.url).searchParams.get("t");
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

    const repo = createSupabaseCariRepository(supabase);
    const statement = await getCustomerStatement({
      repo,
      id,
      token,
      checkIsAdmin: async () => (await verifyApiAuth(req)).isAdmin,
    });

    return NextResponse.json(statement, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("GET /api/ekstre/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
