import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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
        console.error("Konum tablosu temizleme hatası:", deleteError);
      } else {
        deletedLocationsCount = count ?? 0;
      }
    } else {
      deletedLocationsCount = rpcResult ?? 0;
    }

    // 3. Teslim edilmiş veya iptal edilmiş 72 saatten eski siparişlerin konum koordinatlarını NULL'a çek
    const { error: ordersCleanErr, count: ordersCleanedCount } = await supabase
      .from("orders")
      .update(
        {
          customer_lat: null,
          customer_lng: null,
          location_shared: false,
        },
        { count: "exact" }
      )
      .in("status", ["teslim_edildi", "iptal"])
      .lt("delivered_at", thresholdDate);

    if (ordersCleanErr) {
      console.warn("Orders table location cleanup warning:", ordersCleanErr);
    }

    return NextResponse.json({
      success: true,
      deletedLocationsCount,
      ordersCleanedCount: ordersCleanedCount ?? 0,
      thresholdDate,
      message: "72 saatten eski KVKK müşteri konum verileri başarıyla temizlendi.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen sunucu hatası";
    console.error("Cleanup cron exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
