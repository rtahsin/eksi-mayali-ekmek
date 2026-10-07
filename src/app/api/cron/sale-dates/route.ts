import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureSaleDatesWindow } from "@/lib/ordering/saleDates";

export async function GET(req: Request) {
  try {
    // 1. Cron Secret Doğrulaması (Fail-closed & Timing-attack safe)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET ortam değişkeni sunucuda yapılandırılmamış!");
      return NextResponse.json(
        { error: "Sunucu yapılandırma hatası: CRON_SECRET eksik" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const expectedHeader = `Bearer ${cronSecret}`;

    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedHeader);

    const isMatch =
      authBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(authBuffer, expectedBuffer);

    if (!isMatch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Admin Supabase İstemcisi
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı" },
        { status: 500 }
      );
    }

    // 3. Önümüzdeki 8 haftalık satış tarihlerini garantiye al
    const result = await ensureSaleDatesWindow(supabase, 8);

    return NextResponse.json({
      success: true,
      productsCount: result.productsCount,
      datesAdded: result.datesAdded,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("GET /api/cron/sale-dates error:", err);
    return NextResponse.json(
      { error: "İç sunucu hatası", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
