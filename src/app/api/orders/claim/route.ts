import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/kernel/log";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { verifyOrderToken } from "@/lib/security/linkToken";
import { checkRateLimit } from "@/lib/security/rateLimiter";

const ClaimSchema = z.object({
  orders: z
    .array(z.object({ id: z.string().min(4).max(64), token: z.string().length(32) }))
    .min(1)
    .max(30),
});

/**
 * Giriş yapan müşteri, bu cihazdan misafir olarak verdiği siparişleri hesabına bağlar.
 * Kanıt: sipariş oluşturulurken verilen imzalı takip token'ı (telefona göre bağlama YOK).
 * Yalnızca sahibi olmayan (`user_id IS NULL`) siparişler bağlanır.
 */
export async function POST(req: Request) {
  const auth = await verifyApiAuth(req);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const limit = await checkRateLimit(`order_claim_${auth.userId}`, 10, 600000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
  }

  const parsed = ClaimSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const ids = parsed.data.orders.filter((o) => verifyOrderToken(o.id, o.token)).map((o) => o.id);
  if (ids.length === 0) {
    return NextResponse.json({ success: true, claimed: 0 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ user_id: auth.userId, updated_at: new Date().toISOString() })
    .in("id", ids)
    .is("user_id", null)
    .is("cari_id", null)
    .select("id");

  if (error) {
    logError("Order claim error:", error);
    return NextResponse.json({ error: "Siparişler hesaba bağlanamadı" }, { status: 500 });
  }

  return NextResponse.json({ success: true, claimed: data?.length ?? 0 });
}
