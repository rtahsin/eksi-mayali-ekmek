import { NextResponse } from "next/server";
import { RecordCariTransactionSchema } from "@/lib/cari";
import {
  CariServiceError,
  createSupabaseCariRepository,
  recordCariLedgerTransaction,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const parsed = RecordCariTransactionSchema.safeParse(await request.json().catch(() => null));
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
    const result = await recordCariLedgerTransaction({
      repo,
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
    // Kesin kural: atomik RPC başarısızsa parçalı yedek yol YOK (AGENTS.md §6)
    logError("POST /api/admin/cari/transactions:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Hareket kaydedilemedi" },
      { status: 500 }
    );
  }
}
