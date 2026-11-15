import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError, logWarn } from "@/lib/kernel/log";

export async function GET(req: Request) {
  try {
    // 1. Cron Secret Doğrulaması (Fail-closed & Timing-attack safe)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      logError("CRON_SECRET ortam değişkeni sunucuda yapılandırılmamış!");
      return NextResponse.json(
        { error: "Sunucu yapılandırma hatası: CRON_SECRET eksik" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const expectedHeader = `Bearer ${cronSecret}`;

    // Constant-time comparison to prevent timing attacks
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

    const thresholdDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    // 2. RPC Fonksiyonunu veya doğrudan DELETE sorgusunu çalıştır (customer_locations 72 saat TTL)
    let deletedLocationsCount = 0;
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "cleanup_expired_customer_locations"
    );

    if (rpcError) {
      // RPC mevcut değilse doğrudan DELETE
      const { error: deleteError, count } = await supabase
        .from("customer_locations")
        .delete({ count: "exact" })
        .lt("created_at", thresholdDate);

      if (deleteError) {
        logError("Konum tablosu temizleme hatası:", deleteError);
        Sentry.captureException(deleteError, { tags: { cron: "cleanup-locations" } });
      } else {
        deletedLocationsCount = count ?? 0;
      }
    } else {
      deletedLocationsCount = rpcResult ?? 0;
    }

    // 3. Teslim edilmiş (delivered_at < 72s) ve iptal edilmiş (updated_at < 72s) siparişlerin GPS verilerini NULL'a çek
    const emptyLocationPayload = {
      customer_lat: null,
      customer_lng: null,
      location_shared: false,
    };

    const { error: deliveredCleanErr, count: deliveredCleanedCount } = await supabase
      .from("orders")
      .update(emptyLocationPayload, { count: "exact" })
      .eq("status", "teslim_edildi")
      .lt("delivered_at", thresholdDate)
      .or("customer_lat.not.is.null,customer_lng.not.is.null,location_shared.eq.true");

    if (deliveredCleanErr) {
      logWarn("Orders table delivered location cleanup warning:", { error: deliveredCleanErr });
    }

    const { error: cancelledCleanErr, count: cancelledCleanedCount } = await supabase
      .from("orders")
      .update(emptyLocationPayload, { count: "exact" })
      .eq("status", "iptal")
      .lt("updated_at", thresholdDate)
      .or("customer_lat.not.is.null,customer_lng.not.is.null,location_shared.eq.true");

    if (cancelledCleanErr) {
      logWarn("Orders table cancelled location cleanup warning:", { error: cancelledCleanErr });
    }

    const ordersCleanedCount = (deliveredCleanedCount ?? 0) + (cancelledCleanedCount ?? 0);

    // 4. rate_limit_buckets temizliği (24 saatten eski)
    const rateLimitThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let deletedRateLimitsCount = 0;
    const { error: rateLimitErr, count: rateLimitCount } = await supabase
      .from("rate_limit_buckets")
      .delete({ count: "exact" })
      .lt("updated_at", rateLimitThreshold);

    if (rateLimitErr) {
      logWarn("Rate limit buckets cleanup warning:", { error: rateLimitErr });
    } else {
      deletedRateLimitsCount = rateLimitCount ?? 0;
    }

    // 5. funnel_events temizliği (13 ay / 395 günden eski huni ve öğrenme ölçümleri, P1-10)
    const funnelThreshold = new Date(Date.now() - 395 * 24 * 60 * 60 * 1000).toISOString();
    let deletedFunnelEventsCount = 0;
    const { error: funnelErr, count: funnelCount } = await supabase
      .from("funnel_events")
      .delete({ count: "exact" })
      .lt("created_at", funnelThreshold);

    if (funnelErr) {
      logWarn("Funnel events cleanup warning:", { error: funnelErr });
    } else {
      deletedFunnelEventsCount = funnelCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      deletedLocationsCount,
      ordersCleanedCount,
      deletedRateLimitsCount,
      deletedFunnelEventsCount,
      thresholdDate,
      message: "72 saatten eski KVKK müşteri konum verileri, 24 saatten eski rate limitler ve 13 aydan eski huni olayları başarıyla temizlendi.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatası";
    logError("Cleanup cron exception:", err);
    Sentry.captureException(err, { tags: { cron: "cleanup-locations" } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
