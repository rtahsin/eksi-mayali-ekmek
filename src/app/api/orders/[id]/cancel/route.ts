import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { verifyOrderToken } from "@/lib/security/linkToken";
import { CONTACT } from "@/lib/site";

const CUSTOMER_CANCELLABLE_STATUSES = new Set(["bekliyor"]);


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
              `Siparişiniz hazırlanmaya başladığı için buradan iptal edilemiyor. Lütfen fırını arayın: ${CONTACT.phoneDisplay}`,
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

    // 2. Tek işlemde: iptal + geçmiş + bekleyen ödemeler + cari storno (018 cancel_order_atomic).
    //    Müşteri yolu: sipariş hâlâ okunan durumda olmalı (arada değiştiyse 409).
    const { error: rpcErr } = await supabase.rpc("cancel_order_atomic", {
      p_order_id: orderData.id,
      p_reason: reason,
      p_actor_role: requestedBy,
      p_actor_id: actorId,
      p_expected_status: requestedBy === "customer" ? currentStatus : null,
    });

    if (rpcErr) {
      if (rpcErr.message.includes("STATUS_CHANGED")) {
        return NextResponse.json(
          { error: "Sipariş durumu bu sırada değişti. Lütfen sayfayı yenileyip tekrar deneyin." },
          { status: 409 }
        );
      }
      if (rpcErr.message.includes("ORDER_DELIVERED")) {
        return NextResponse.json(
          { error: "Teslim edilmiş sipariş iptal edilemez. Cari siparişse cari ekranından fişi iptal edin." },
          { status: 409 }
        );
      }
      throw rpcErr;
    }

    return NextResponse.json({
      success: true,
      message: "Sipariş başarıyla iptal edildi.",
      orderId: orderData.id,
    });
  } catch (err: unknown) {
    console.error("Cancel order error:", err);
    return NextResponse.json(
      { error: "Sipariş şu an iptal edilemedi. Lütfen fırını arayın." },
      { status: 500 }
    );
  }
}
