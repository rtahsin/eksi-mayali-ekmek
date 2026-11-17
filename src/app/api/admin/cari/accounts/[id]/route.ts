import { NextResponse } from "next/server";
import { PatchCariAccountSchema } from "@/lib/cari";
import {
  CariServiceError,
  createSupabaseCariAuditLogger,
  createSupabaseCariRepository,
  deleteTrialCariAccount,
  getCariAccountDetail,
  updateCariAccount,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

/** Tek cari hesabını Faz 4/5 alanlarıyla (`?include=transactions` ile defteri de) okur. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.read");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const includeTransactions = new URL(request.url).searchParams.get("include") === "transactions";
    const repo = createSupabaseCariRepository(supabase);
    const detail = await getCariAccountDetail({ repo, id, includeTransactions });
    return NextResponse.json(detail);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("GET /api/admin/cari/accounts/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari okunamadı" }, { status: 500 });
  }
}

/** Cari kartı güncelle / arşivle. Silme yok: geçmiş defter kayıtları korunur. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const parsed = PatchCariAccountSchema.safeParse(await request.json().catch(() => null));
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
    const result = await updateCariAccount({
      repo,
      audit,
      actor: {
        userId: guard.auth.userId ?? "",
        role: guard.auth.role ?? "unknown",
        isAdmin: guard.auth.isAdmin,
      },
      id,
      input: parsed.data,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("PATCH /api/admin/cari/accounts/[id]:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Cari güncellenemedi" },
      { status: 500 }
    );
  }
}

/** Deneme carisini kalıcı sil: yalnız her hareketi iptal edilmişse (gerçek geçmiş yoksa). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const repo = createSupabaseCariRepository(supabase);
    const audit = createSupabaseCariAuditLogger(supabase);
    const result = await deleteTrialCariAccount({
      repo,
      audit,
      actor: {
        userId: guard.auth.userId ?? "",
        role: guard.auth.role ?? "unknown",
        isAdmin: guard.auth.isAdmin,
      },
      id,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof CariServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logError("DELETE /api/admin/cari/accounts/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari silinemedi" }, { status: 500 });
  }
}
