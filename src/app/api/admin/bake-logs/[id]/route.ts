import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const PatchSchema = z.object({ hidden: z.boolean() });

/** Kaydı gizle / geri göster. Silme yok: yanlış kayıt gizlenir. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;
  const { id } = await params;

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase unconfigured" }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from("bake_logs")
      .update({ hidden: parsed.data.hidden })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    logError("bake-logs PATCH failed", err, { id });
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
