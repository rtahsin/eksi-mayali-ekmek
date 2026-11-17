import { NextResponse } from "next/server";
import { CreateCariAccountSchema } from "@/lib/cari";
import {
  CariServiceError,
  createCariAccount,
  createSupabaseCariAuditLogger,
  createSupabaseCariRepository,
  listCariAccounts,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

/** Tüm cari hesapları Faz 4/5 alanlarıyla döner. */
export async function GET(request: Request) {
  const guard = await requireCapability(request, "cari.read");
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const repo = createSupabaseCariRepository(supabase);
    const accounts = await listCariAccounts(repo);
    return NextResponse.json({ accounts });
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("GET /api/admin/cari/accounts:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Cari listesi okunamadı" },
      { status: 500 }
    );
  }
}

/** Yeni cari hesap. Açılış bakiyesi varsa defterde tek "devir" satırı olarak yazılır (bakiye ona göre). */
export async function POST(request: Request) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;

  const raw: unknown = await request.json().catch(() => null);
  const parsed = CreateCariAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const repo = createSupabaseCariRepository(supabase);
    const audit = createSupabaseCariAuditLogger(supabase);
    const result = await createCariAccount({
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
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("POST /api/admin/cari/accounts:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Cari oluşturulamadı" },
      { status: 500 }
    );
  }
}
