import { NextResponse } from "next/server";
import { GenerateStandingOrdersSchema } from "@/lib/cari";
import {
  CariServiceError,
  createSupabaseCariAuditLogger,
  createSupabaseCariRepository,
  generateStandingOrdersForDate,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * Seçilen gün için (varsayılan: yarın) haftalık sabit rutini aktif tüm müşteri
 * carilerinden idempotent B2B siparişleri (`standing:<cariId>:<YYYY-MM-DD>`) üretir.
 */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await request.json().catch(() => ({}));
  const parsed = GenerateStandingOrdersSchema.safeParse(rawBody === null ? {} : rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });
  }

  try {
    const repo = createSupabaseCariRepository(supabase);
    const audit = createSupabaseCariAuditLogger(supabase);
    const result = await generateStandingOrdersForDate({
      repo,
      audit,
      actor: {
        userId: guard.auth.userId ?? "",
        role: guard.auth.role ?? "admin",
        isAdmin: guard.auth.isAdmin,
      },
      deliveryDate: parsed.data?.deliveryDate,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("POST /api/admin/cari/standing-orders/generate:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Rutin siparişler oluşturulamadı." },
      { status: 500 }
    );
  }
}
