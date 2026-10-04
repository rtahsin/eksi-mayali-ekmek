import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { CariProfileSchema, profileToRow } from "@/lib/cari/account";

const PatchSchema = CariProfileSchema.extend({ archived: z.boolean().optional() });

/** Cari kartı güncelle / arşivle. Silme yok: geçmiş defter kayıtları korunur. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const { archived, ...profile } = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data: acc, error: readErr } = await supabase
      .from("current_accounts")
      .select("id, balance")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!acc) return NextResponse.json({ error: "Cari hesap bulunamadı." }, { status: 404 });

    const update: Record<string, unknown> = { ...profileToRow(profile), updated_at: new Date().toISOString() };
    if (archived === true) {
      const balance = Number((acc as { balance: number | string | null }).balance) || 0;
      if (balance !== 0) {
        return NextResponse.json(
          { error: `Bakiyesi ${balance.toLocaleString("tr-TR")} ₺ olan cari arşivlenemez. Önce bakiyeyi kapatın.` },
          { status: 409 }
        );
      }
      update.archived_at = new Date().toISOString();
    } else if (archived === false) {
      update.archived_at = null;
    }

    const { error } = await supabase.from("current_accounts").update(update).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/cari/accounts/[id]:", err);
    return NextResponse.json({ error: getErrorMessage(err) || "Cari güncellenemedi" }, { status: 500 });
  }
}
