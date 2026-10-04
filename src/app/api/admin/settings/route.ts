import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/apiAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";

const DEFAULT_OPERATIONAL = {
  freeShippingThreshold: 1000,
  shippingFee: 150,
  deliveryWindow: "14:00 - 18:00",
  whatsappPhone: "0501 012 66 53",
  orderAcceptanceOpen: true,
  announcementText: "",
  orderCutoffTime: "12:00",
};

const OperationalSettingsSchema = z.object({
  freeShippingThreshold: z.number().min(0).max(100000),
  shippingFee: z.number().min(0).max(10000),
  deliveryWindow: z.string().trim().min(1).max(50),
  orderCutoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat SS:DD formatında olmalıdır"),
  whatsappPhone: z.string().trim().min(10).max(30),
  orderAcceptanceOpen: z.boolean(),
  announcementText: z.string().max(300).default(""),
});

const SaveSettingsRequestSchema = z.object({
  action: z.literal("save_operational"),
  value: OperationalSettingsSchema,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client unconfigured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("bakery_settings")
      .select("key, value")
      .in("key", ["operational_settings", "order_cutoff_time"]);

    if (error) {
      console.error("Fetch settings error:", error);
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }

    const settingsMap = new Map<string, unknown>(
      (data || []).map((row: { key: string; value: unknown }) => [row.key, row.value])
    );

    const storedOperational = settingsMap.get("operational_settings");
    const operational: Record<string, unknown> = {
      ...DEFAULT_OPERATIONAL,
      ...(isRecord(storedOperational) ? storedOperational : {}),
    };

    const rawCutoff = settingsMap.get("order_cutoff_time") ?? operational.orderCutoffTime ?? "12:00";
    operational.orderCutoffTime = isRecord(rawCutoff)
      ? String(rawCutoff.cutoff_time ?? rawCutoff.time ?? "12:00")
      : String(rawCutoff);

    return NextResponse.json({ operational });
  } catch (err: unknown) {
    console.error("Settings GET handler error:", err);
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
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json({ error: `Geçersiz ayar: ${message}` }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const value = {
      ...parsed.data.value,
      updatedAt: nowIso,
      updatedBy: guard.auth.userId,
    };

    const { error } = await supabase
      .from("bakery_settings")
      .upsert({ key: "operational_settings", value, updated_at: nowIso }, { onConflict: "key" });
    if (error) throw error;

    const { error: cutoffError } = await supabase
      .from("bakery_settings")
      .upsert({ key: "order_cutoff_time", value: value.orderCutoffTime, updated_at: nowIso }, { onConflict: "key" });
    if (cutoffError) throw cutoffError;

    return NextResponse.json({ success: true, message: "Ayarlar güncellendi" });
  } catch (err: unknown) {
    console.error("Settings POST handler error:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
