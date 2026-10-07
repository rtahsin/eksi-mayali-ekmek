import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendThresholdSummary, ThresholdDecisionItem } from "@/lib/notify/telegram";

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

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı" },
        { status: 500 }
      );
    }

    // 2. decide_threshold_bakes RPC çağrısı
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase.rpc("decide_threshold_bakes", {
      p_now: nowIso,
    });

    if (error) {
      console.error("decide_threshold_bakes RPC hatası:", error);
      return NextResponse.json(
        { error: "Eşik kararları hesaplanırken veritabanı hatası oluştu: " + error.message },
        { status: 500 }
      );
    }

    const result = data as { processed: number; decisions: ThresholdDecisionItem[] } | null;
    const decisions = result?.decisions || [];

    // 3. Telegram Özeti (KVKK uyumlu, ad/telefon yok)
    if (decisions.length > 0) {
      await sendThresholdSummary(decisions);
    }

    return NextResponse.json({
      success: true,
      processed: result?.processed ?? 0,
      decisions,
      timestamp: nowIso,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatası";
    console.error("Threshold cron exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
