import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/security/audit";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

interface AccountTokenRow {
  id: string;
  name: string;
  share_token_version: number | null;
}

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
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: currentRow, error: readErr } = await supabase
        .from("current_accounts")
        .select("id, name, share_token_version")
        .eq("id", id)
        .maybeSingle();

      if (readErr) throw readErr;
      if (!currentRow) {
        return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });
      }

      const acc = currentRow as AccountTokenRow;
      const previousVersion = typeof acc.share_token_version === "number" && Number.isFinite(acc.share_token_version)
        ? Math.max(1, Math.trunc(acc.share_token_version))
        : 1;
      const nextVersion = previousVersion + 1;

      let updateQuery = supabase
        .from("current_accounts")
        .update({
          share_token_version: nextVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (acc.share_token_version === null) {
        updateQuery = updateQuery.is("share_token_version", null);
      } else {
        updateQuery = updateQuery.eq("share_token_version", previousVersion);
      }

      const { data: updatedRow, error: updateErr } = await updateQuery
        .select("id, name, share_token_version")
        .maybeSingle();

      if (updateErr) throw updateErr;

      if (updatedRow) {
        const finalVersion = Math.max(2, Math.trunc(Number((updatedRow as AccountTokenRow).share_token_version) || nextVersion));
        await writeAuditLog(supabase, {
          actorId: guard.auth.userId ?? "",
          actorRole: guard.auth.role ?? "unknown",
          action: "cari.share_link.revoke",
          entityType: "current_account",
          entityId: id,
          summary: `Eski cari paylaşım linkleri iptal edildi: ${acc.name} (v${previousVersion} -> v${finalVersion})`,
          metadata: {
            previousVersion,
            newVersion: finalVersion,
          },
        });

        return NextResponse.json({
          success: true,
          accountId: id,
          shareTokenVersion: finalVersion,
        });
      }
    }

    return NextResponse.json(
      { error: "Eşzamanlı güncelleme algılandı, lütfen tekrar deneyin." },
      { status: 409 },
    );
  } catch (err: unknown) {
    logError("POST /api/admin/cari/accounts/[id]/revoke-link:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Paylaşım linkleri iptal edilemedi." }, { status: 500 });
  }
}
