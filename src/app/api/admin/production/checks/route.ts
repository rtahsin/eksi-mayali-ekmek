import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { isIsoDate, istanbulToday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateProductionCheckSchema = z.object({
  date: z.string().refine(isIsoDate, "Geçersiz tarih formatı (YYYY-AA-GG)."),
  checkKey: z.string().trim().min(1, "Kontrol anahtarı zorunludur.").max(120),
  checked: z.boolean(),
});

interface ProductionCheckRow {
  check_key: string;
  checked: boolean;
}

function asPostgrestError(err: unknown): { code?: string; message?: string } {
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    return {
      code: typeof rec.code === "string" ? rec.code : undefined,
      message: typeof rec.message === "string" ? rec.message : undefined,
    };
  }
  return {};
}

function isMissingProductionChecksTable(err: unknown): boolean {
  const { code, message } = asPostgrestError(err);
  if (code === "42P01" || code === "PGRST205") return true;
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("production_checks") &&
    (lower.includes("does not exist") ||
      lower.includes("could not find") ||
      lower.includes("schema cache"))
  );
}

export async function GET(req: Request) {
  const guard = await requireCapability(req, "production.ops");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date") ?? istanbulToday();
  if (!isIsoDate(dateParam)) {
    return NextResponse.json({ error: "Geçersiz tarih formatı (YYYY-AA-GG)." }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from("production_checks")
      .select("check_key, checked")
      .eq("delivery_date", dateParam);

    if (error) {
      if (isMissingProductionChecksTable(error)) {
        return NextResponse.json(
          {
            error:
              "Çoklu çalışan üretim onay tablosu (production_checks) veritabanında henüz hazır değil. Lütfen 031 numaralı migration'ı uygulayın.",
          },
          { status: 503 }
        );
      }
      throw error;
    }

    const checks: Record<string, boolean> = {};
    for (const row of (data ?? []) as ProductionCheckRow[]) {
      if (typeof row.check_key === "string" && row.check_key) {
        checks[row.check_key] = row.checked === true;
      }
    }

    return NextResponse.json(
      { date: dateParam, checks },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    logError("GET /api/admin/production/checks:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Üretim onayları okunamadı." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const guard = await requireCapability(req, "production.ops");
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = UpdateProductionCheckSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") || "Geçersiz kontrol isteği." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  const { date, checkKey, checked } = parsed.data;
  const actorUuid = guard.auth.userId && UUID_RE.test(guard.auth.userId) ? guard.auth.userId : null;

  try {
    const { error } = await supabase.from("production_checks").upsert(
      {
        delivery_date: date,
        check_key: checkKey,
        checked,
        checked_by: actorUuid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "delivery_date,check_key" }
    );

    if (error) {
      if (isMissingProductionChecksTable(error)) {
        return NextResponse.json(
          {
            error:
              "Çoklu çalışan üretim onay tablosu (production_checks) veritabanında henüz hazır değil. Lütfen 031 numaralı migration'ı uygulayın.",
          },
          { status: 503 }
        );
      }
      throw error;
    }

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "staff",
      action: "production.check_update",
      entityType: "production_check",
      entityId: `${date}:${checkKey}`,
      summary: `${date} üretim kontrolü (${checkKey}): ${checked ? "tamamlandı" : "geri alındı"}.`,
      metadata: {
        date,
        checkKey,
        checked,
      },
    });

    return NextResponse.json({ ok: true, date, checkKey, checked });
  } catch (err: unknown) {
    logError("POST /api/admin/production/checks:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Üretim kontrolü kaydedilemedi." },
      { status: 500 }
    );
  }
}
