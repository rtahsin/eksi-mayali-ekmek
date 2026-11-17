import { NextResponse } from "next/server";
import {
  CariServiceError,
  createSupabaseCariAuditLogger,
  createSupabaseCariRepository,
  revokeCariShareLinks,
} from "@/lib/cari/server";
import { logError } from "@/lib/kernel/log";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

/**
 * Cari hesap için paylaşılmış tüm eski ekstre/fiş linklerini iptal eder.
 * share_token_version alanını atomik CAS döngüsüyle +1 artırır.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCapability(request, "cari.write");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Cari hesap kimliği gerekli." }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const repo = createSupabaseCariRepository(supabase);
    const audit = createSupabaseCariAuditLogger(supabase);
    const result = await revokeCariShareLinks({
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
    logError("POST /api/admin/cari/accounts/[id]/revoke-link:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Paylaşım linkleri iptal edilemedi." },
      { status: 500 }
    );
  }
}
