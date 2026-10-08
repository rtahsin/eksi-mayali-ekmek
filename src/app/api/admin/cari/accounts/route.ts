import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { CariProfileSchema, profileToRow } from "@/lib/cari/account";

/** Yeni cari hesap. Açılış bakiyesi varsa defterde tek "devir" satırı olarak yazılır (bakiye ona göre). */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const raw: unknown = await request.json().catch(() => null);
  const parsed = CariProfileSchema.required({ businessName: true }).safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const openingRaw = (raw as { openingBalance?: unknown } | null)?.openingBalance;
  const opening = typeof openingRaw === "number" && Number.isFinite(openingRaw) ? Math.round(openingRaw * 100) / 100 : 0;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  const id = `cari_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from("current_accounts").insert({
      id,
      ...profileToRow(parsed.data),
      balance: 0,
      credit_limit: 0,
      status: "active",
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;

    if (opening !== 0) {
      const { error: txErr } = await supabase.rpc("record_cari_transaction_atomic", {
        p_account_id: id,
        p_type: "devir",
        p_amount: opening,
        p_description: "Açılış bakiyesi",
        p_created_by: guard.auth.userId,
      });
      if (txErr) {
        // Açılış yazılamadıysa yarım hesap bırakma
        await supabase.from("current_accounts").delete().eq("id", id);
        throw txErr;
      }
    }
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    logError("POST /api/admin/cari/accounts:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari oluşturulamadı" }, { status: 500 });
  }
}
