import { NextResponse } from "next/server";
import { HotSaleRequestSchema } from "@/lib/cari";
import {
  CariServiceError,
  createSupabaseCariAuditLogger,
  createSupabaseCariRepository,
  executeB2BHotSale,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * Araçtan B2B sıcak satış + bayat/fire iadesi + kapıda tahsilatı tek atomik RPC'de kaydeder.
 * Katalog fiyatlarında kurye override gönderse dahi sunucudaki custom_prices / catalog fiyatı zorlanır;
 * yalnızca admin/superadmin birim fiyat override'ı yapabilir.
 */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "cari.hot_sale");
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await request.json().catch(() => null);
  const parsed = HotSaleRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  if (parsed.data.allowOverLimit && !guard.auth.isAdmin) {
    return NextResponse.json(
      { error: "Kredi limitini aşan sıcak satış onayı yalnızca yönetici (admin) tarafından verilebilir." },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const repo = createSupabaseCariRepository(supabase);
    const audit = createSupabaseCariAuditLogger(supabase);
    const result = await executeB2BHotSale({
      repo,
      audit,
      actor: {
        userId: guard.auth.userId ?? "",
        role: guard.auth.role ?? "unknown",
        isAdmin: guard.auth.isAdmin,
      },
      input: parsed.data,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json(
        {
          error: err.message,
          ...(err.code ? { code: err.code } : {}),
        },
        { status: err.status }
      );
    }
    logError("POST /api/admin/cari/hot-sale:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Sıcak satış işlenemedi." },
      { status: 500 }
    );
  }
}
