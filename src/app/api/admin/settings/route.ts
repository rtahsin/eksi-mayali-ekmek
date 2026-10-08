import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";
import { getStoreSettings } from "@/lib/settings/server";
import { StoreSettingsSchema } from "@/lib/settings/schema";

const SaveSettingsRequestSchema = z.object({
  action: z.literal("save_operational"),
  value: StoreSettingsSchema,
});

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client unconfigured" }, { status: 500 });
    }
    return NextResponse.json({ operational: await getStoreSettings(supabase, { failClosed: true }) });
  } catch (err: unknown) {
    logError("Settings GET handler error:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client unconfigured" }, { status: 500 });
    }

    const parsed = SaveSettingsRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => `${issue.path.slice(1).join(".") || "ayar"}: ${issue.message}`).join(", ");
      return NextResponse.json({ error: `Geçersiz ayar — ${message}` }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const value = {
      ...parsed.data.value,
      openWeekdays: Array.from(new Set(parsed.data.value.openWeekdays)).sort((a, b) => a - b),
      closedDates: Array.from(new Set(parsed.data.value.closedDates)).sort(),
      updatedAt: nowIso,
      updatedBy: guard.auth.userId,
    };

    const { error } = await supabase
      .from("bakery_settings")
      .upsert({ key: "operational_settings", value, updated_at: nowIso }, { onConflict: "key" });
    if (error) throw error;

    // Eski ayrı anahtar okuyucular için senkron tut (Faz 5'te kaldırılır)
    const { error: cutoffError } = await supabase
      .from("bakery_settings")
      .upsert({ key: "order_cutoff_time", value: value.orderCutoffTime, updated_at: nowIso }, { onConflict: "key" });
    if (cutoffError) throw cutoffError;

    revalidateTag("settings", "max");

    return NextResponse.json({ success: true, message: "Ayarlar güncellendi" });
  } catch (err: unknown) {
    logError("Settings POST handler error:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
