import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/utils/error";
import { verifyApiAuth } from "@/lib/security/apiAuth";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ error: "Sipariş ID gereklidir" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "Müşteri iptal etti";

    // Yetki doğrulama: admin/superadmin rolü token ile kanıtlanmalı
    const auth = await verifyApiAuth(req);
    const requestedBy = auth.isAdmin ? "admin" : "customer";
    const userId = auth.isAuthenticated ? auth.userId : (typeof body.userId === "string" ? body.userId : null);

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
      .select("id, status, user_id, phone")
      .eq("id", orderId)
      .single();

    if (fetchErr || !orderData) {
      return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    }

    // Müşteri ise yetki kontrolü: Yalnızca 'bekliyor' (veya onay_bekliyor) durumunda iptal edebilir
    if (requestedBy === "customer") {
      const allowedToCancel =
        orderData.status === "bekliyor" || orderData.status === "onay_bekliyor";

      if (!allowedToCancel) {
        return NextResponse.json(
          {
            error:
              "Siparişiniz fırında hazırlanma veya teslimat aşamasına geçtiğinden doğrudan iptal edilemez. Lütfen fırınımızla 0501 012 6653 numaralı telefondan iletişime geçiniz.",
          },
          { status: 400 }
        );
      }

      // Sahiplik doğrulaması (IDOR Önleme)
      if (orderData.user_id) {
        let isOwner = false;
        const authHeader = req.headers.get("authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.replace("Bearer ", "").trim();
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user && user.id === orderData.user_id) {
            isOwner = true;
          }
        }
        if (!isOwner && userId && userId === orderData.user_id) {
          isOwner = true;
        }

        if (!isOwner) {
          return NextResponse.json(
            { error: "Bu siparişi iptal etme yetkiniz bulunmamaktadır." },
            { status: 403 }
          );
        }
      } else {
        // Misafir siparişi: Telefon numarası doğrulaması
        const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
        const orderPhone = (orderData.phone || "").replace(/\D/g, "");
        if (orderPhone && (!phone || !orderPhone.endsWith(phone))) {
          return NextResponse.json(
            { error: "Misafir siparişini iptal etmek için siparişe ait telefon numarası doğrulanmalıdır." },
            { status: 403 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();

    // 2. Siparişi iptal olarak güncelle
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "iptal",
        cancelled_at: nowIso,
        cancel_reason: reason,
        cancelled_by: requestedBy,
        updated_at: nowIso,
      })
      .eq("id", orderId);

    if (updateErr) {
      throw updateErr;
    }

    // 3. Durum geçmişine (audit log) kaydet
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      from_status: orderData.status,
      to_status: "iptal",
      changed_by_role: requestedBy,
      changed_by_id: userId || null,
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
      .eq("order_id", orderId)
      .eq("status", "pending");

    return NextResponse.json({
      success: true,
      message: "Sipariş başarıyla iptal edildi.",
      orderId,
    });
  } catch (err: unknown) {
    console.error("Cancel order error:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Sipariş iptali sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
