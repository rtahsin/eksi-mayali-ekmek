import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/apiAuth";
import { logError } from "@/lib/kernel/log";
import { getErrorMessage } from "@/lib/utils/error";
import {
  FinanceRepoError,
  createSupabaseFinanceRepository,
  getFinanceOverview,
  handleFinancePost,
} from "@/lib/finance/server";

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(req.url);
    const repo = createSupabaseFinanceRepository(supabase);
    const result = await getFinanceOverview(repo, {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    if (err instanceof FinanceRepoError) {
      Sentry.captureException(err.dbCause ?? err, { tags: { route: "api/admin/finance" } });
      return NextResponse.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status }
      );
    }
    logError("GET /api/admin/finance exception:", err);
    Sentry.captureException(err, { tags: { route: "api/admin/finance" } });
    return NextResponse.json(
      { error: getErrorMessage(err) || "Finans özeti alınamadı", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Veritabanı bağlantısı kurulamadı", code: "DB_CONNECTION_ERROR" },
      { status: 500 }
    );
  }

  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const repo = createSupabaseFinanceRepository(supabase);
    const result = await handleFinancePost(
      repo,
      { userId: guard.auth.userId, role: guard.auth.role },
      rawBody
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    if (err instanceof FinanceRepoError) {
      Sentry.captureException(err.dbCause ?? err, {
        tags: { route: "api/admin/finance", code: err.code ?? "REPO_ERROR" },
      });
      return NextResponse.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status }
      );
    }
    logError("POST /api/admin/finance exception:", err);
    Sentry.captureException(err, { tags: { route: "api/admin/finance" } });
    return NextResponse.json(
      { error: getErrorMessage(err) || "Finans işlemi sırasında sunucu hatası", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
