import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/security/rateLimiter";
import { appEnv } from "@/lib/kernel/env";
import { EventPayloadSchema, MAX_PROPS_BYTE_SIZE } from "@/lib/engagement/events";

// Bellek içi IP hız sınırlayıcı (Postgres kullanılmaz, P1-10)
interface RateRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateRecord>();
const WINDOW_MS = 60_000; // 1 dakika
const MAX_REQUESTS = 60; // Dakikada maks 60 istek

function checkInMemoryRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Eski kayıtları periyodik temizle (Harita boyutu 5000'i aşarsa)
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Huni & öğrenme olayı kaydı (P1-10).
 * Kişisel veri içermez, 2 KB gövde sınırı ve bellek içi sınır uygulanır.
 * Her durumda 204 döner (ölçüm akışı bozmaz).
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!checkInMemoryRateLimit(ip)) {
      return new NextResponse(null, { status: 204 });
    }

    // 2 KB gövde sınırı kontrolü
    const rawText = await req.text();
    const byteLength = typeof Buffer !== "undefined"
      ? Buffer.byteLength(rawText, "utf8")
      : new TextEncoder().encode(rawText).length;

    if (byteLength > MAX_PROPS_BYTE_SIZE) {
      return new NextResponse(null, { status: 204 });
    }

    const json = JSON.parse(rawText);
    const parsed = EventPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return new NextResponse(null, { status: 204 });
    }

    const supabase = createAdminClient();
    if (supabase) {
      const { event, ref, code, orderId, env: reqEnv, props } = parsed.data;
      const currentEnv = reqEnv || appEnv();
      const codeWithEnv = code || (currentEnv !== "production" ? currentEnv : null);

      await supabase.from("funnel_events").insert({
        event,
        ref: ref ?? null,
        code: codeWithEnv ?? null,
        order_id: orderId ?? null,
        props: props ?? null,
        env: currentEnv ?? null,
      });
    }
  } catch {
    // Tablo henüz yoksa (021/025 uygulanmadı) ya da DB hatası: sessizce geç
  }

  return new NextResponse(null, { status: 204 });
}
