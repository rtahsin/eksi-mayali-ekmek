import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";
import { appEnv } from "@/lib/kernel/env";

const Schema = z.object({
  event: z.enum(["scan", "cart_open", "checkout_start", "order_ok", "order_error"]),
  ref: z.string().regex(/^[a-z0-9_-]{1,40}$/).nullish(),
  code: z.string().max(40).optional(),
  orderId: z.string().max(40).optional(),
  env: z.enum(["production", "preview", "development"]).optional(),
});

/** Huni olayı kaydı. Kişisel veri yok; her durumda 204 döner (ölçüm akışı bozmaz). */
export async function POST(req: Request) {
  try {
    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return new NextResponse(null, { status: 204 });
    const limit = await checkRateLimit(`track_${getClientIp(req)}`, 60, 600000);
    if (!limit.allowed) return new NextResponse(null, { status: 204 });
    const supabase = createAdminClient();
    if (supabase) {
      const { event, ref, code, orderId, env: reqEnv } = parsed.data;
      const currentEnv = reqEnv || appEnv();
      const codeWithEnv = code || (currentEnv !== "production" ? currentEnv : null);
      await supabase.from("funnel_events").insert({ event, ref: ref ?? null, code: codeWithEnv ?? null, order_id: orderId ?? null });
    }
  } catch {
    // tablo henüz yoksa (021 uygulanmadı) ya da DB hatası: sessizce geç
  }
  return new NextResponse(null, { status: 204 });
}
