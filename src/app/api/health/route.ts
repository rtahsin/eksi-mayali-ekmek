import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/apiAuth";
import { checkMigrationDiff } from "@/lib/kernel/migrations";
import { getErrorMessage } from "@/lib/utils/error";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const detail = url.searchParams.get("detail");

  // Genel sağlık kontrolü (herkese açık)
  if (detail !== "1") {
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Ayrıntılı migration sağlık kontrolü (yalnızca admin)
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Veritabanı bağlantısı kurulamadı" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("app_migrations")
      .select("id, applied_at");

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const appliedIds = (data || []).map((row: { id: string }) => row.id);
    const diff = checkMigrationDiff(appliedIds);

    return NextResponse.json({
      ok: diff.allApplied,
      database: {
        migrations: diff,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
