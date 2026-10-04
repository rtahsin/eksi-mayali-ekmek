import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { verifyOrderToken } from "@/lib/security/linkToken";

const CUSTOMER_CANCELLABLE_STATUSES = new Set(["bekliyor"]);

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded ? forwarded.split(",")[0].trim() : realIp || "127.0.0.1";
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const lookup = parseOrderLookup(params.id);
    if (!lookup) {
      return NextResponse.json({ error: "Geçersiz sipariş numarası" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const bodyRecord = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const rawReason = typeof bodyRecord.reason === "string" ? bodyRecord.reason.trim().slice(0, 300) : "";
    const reason = rawReason || "Müşteri iptal etti";

    // Yetki: rol ve kimlik SADECE doğrulanmış oturumdan (çerez/Bearer). body.userId vb. yok sayılır.
    const auth = await verifyApiAuth(req);
    const requestedBy = auth.isAdmin ? "admin" : "customer";
    const actorId = auth.isAuthenticated ? auth.userId : null;

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Veritabanı bağlantısı kurulamadı" },
        { status: 500 }
      );
    }

    // 1. Siparişin mevcut durumunu sorgula
    const { data: orderData, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status, user_id, phone, cari_id")
      .eq(lookup.column, lookup.value)
      .maybeSingle();

    if (fetchErr || !orderData) {
      return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    }

    const currentStatus: string = orderData.status;

    if (currentStatus === "iptal") {
      return NextResponse.json({ error: "Sipariş zaten iptal edilmiş." }, { status: 409 });
    }

    if (requestedBy === "customer") {
      // Cari (toptan) siparişleri herkese açık yoldan iptal edilemez
      if (orderData.cari_id) {
        return NextResponse.json(
          { error: "Bu sipariş yalnızca fırın tarafından iptal edilebilir." },
          { status: 403 }
        );
      }

      // Yalnızca 'bekliyor' durumunda iptal edilebilir
      if (!CUSTOMER_CANCELLABLE_STATUSES.has(currentStatus)) {
        return NextResponse.json(
          {
            error:
              "Siparişiniz fırında hazırlanma veya teslimat aşamasına geçtiğinden doğrudan iptal edilemez. Lütfen fırınımızla 0501 012 6653 numaralı telefondan iletişime geçiniz.",
          },
          { status: 400 }
        );
      }

      // Yetki: sipariş sahibi oturumu, imzalı takip linki veya (misafir) telefonun son 4 hanesi
      const isOwner = Boolean(actorId && orderData.user_id && actorId === orderData.user_id);
      const hasValidToken = verifyOrderToken(
        orderData.id,
        typeof bodyRecord.token === "string" ? bodyRecord.token : null
      );

      if (!isOwner && !hasValidToken && orderData.user_id) {
        // Üye siparişi, sahibi değil (IDOR önleme)
        return NextResponse.json(
          { error: "Bu siparişi iptal etme yetkiniz bulunmamaktadır." },
          { status: 403 }
        );
      }

      if (!isOwner && !hasValidToken) {
        // Misafir siparişi: telefonun TAM OLARAK son 4 hanesi + kaba kuvvet sınırı
        const verifyLimit = await checkRateLimit(
          `cancel_verify_${getClientIp(req)}_${orderData.id}`,
          5,
          600000
        );
        if (!verifyLimit.allowed) {
          return NextResponse.json(
            { error: `Çok fazla deneme yapıldı. Lütfen ${verifyLimit.retryAfterSeconds} saniye sonra tekrar deneyin.` },
            { status: 429 }
          );
        }

        const last4 = typeof bodyRecord.phone === "string" ? bodyRecord.phone.replace(/\D/g, "") : "";
        const orderPhone = (orderData.phone || "").replace(/\D/g, "");
        if (last4.length !== 4 || orderPhone.length < 4 || !orderPhone.endsWith(last4)) {
          return NextResponse.json(
            { error: "Misafir siparişini iptal etmek için telefon numaranızın son 4 hanesini doğru girmelisiniz." },
            { status: 403 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();

    // 2. Siparişi iptal olarak güncelle (iyimser kilit: durum bu arada değiştiyse 0 satır → 409)
    const { data: updatedRows, error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "iptal",
        cancelled_at: nowIso,
        cancel_reason: reason,
        cancelled_by: requestedBy,
        updated_at: nowIso,
      })
      .eq("id", orderData.id)
      .eq("status", currentStatus)
      .select("id");

    if (updateErr) {
      throw updateErr;
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "Sipariş durumu bu sırada değişti. Lütfen sayfayı yenileyip tekrar deneyin." },
        { status: 409 }
      );
    }

    // 3. Durum geçmişine (audit log) kaydet
    await supabase.from("order_status_history").insert({
      order_id: orderData.id,
      from_status: currentStatus,
      to_status: "iptal",
      changed_by_role: requestedBy,
      changed_by_id: actorId,
      note: reason,
    });

    // 4. Varsa ilişkili ödeme kaydını iptal / iade olarak işaretle
    await supabase
      .from("payments")
      .update({
        status: "failed",
        note: `Sipariş iptali nedeniyle ödeme kapatıldı: ${reason}`,
        updated_at: nowIso,
      })
      .eq("order_id", orderData.id)
      .eq("status", "pending");

    return NextResponse.json({
      success: true,
      message: "Sipariş başarıyla iptal edildi.",
      orderId: orderData.id,
    });
  } catch (err: unknown) {
    console.error("Cancel order error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Sipariş iptali sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
