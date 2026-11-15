import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveCourierOrAdmin } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { parseOrderLookup } from "@/lib/orders/orderId";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const CLAIMABLE_STATUSES = ["hazirlaniyor", "firinda", "kuryede"] as const;

const ClaimBodySchema = z
  .object({
    courierId: z.string().uuid("Geçersiz kurye kimliği.").optional(),
    orderIds: z
      .array(z.string().trim().min(1).max(80))
      .min(1, "En az 1 sipariş seçilmelidir.")
      .max(50, "Tek seferde en fazla 50 paket zimmetlenebilir.")
      .optional(),
    startRoute: z.boolean().optional().default(false),
  })
  .optional();

const UnclaimBodySchema = z
  .object({
    courierId: z.string().uuid("Geçersiz kurye kimliği.").optional(),
  })
  .optional();

interface ClaimOrderRow {
  id: string;
  order_number: string | null;
  status: string;
  courier_id: string | null;
  delivery_method: string | null;
}

/**
 * Hibrit zimmet: Hazır tezgahtaki (`courier_id IS NULL` ve hazırlanıyor/fırında/kuryede)
 * tekil veya toplu (`id === "bulk"` / `orderIds`) paketleri aktif kuryeye iyimser kilitle zimmetler (`409 Conflict` koruması).
 * `startRoute` varsayılan `false`: paket planlı zimmete alınır; `true` verilirse `kuryede`ye geçer.
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
  if (!guard.ok) return guard.response;

  try {
    const { id } = await props.params;
    const rawBody: unknown = await req.json().catch(() => ({}));
    const parsedBody = ClaimBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const bodyData = parsedBody.data;
    const startRoute = bodyData?.startRoute ?? false;
    const requestedOrderIds = bodyData?.orderIds ? Array.from(new Set(bodyData.orderIds)) : null;
    const isBulk = id === "bulk" || (requestedOrderIds !== null && requestedOrderIds.length > 0);

    let singleLookup: ReturnType<typeof parseOrderLookup> = null;
    if (!isBulk) {
      singleLookup = parseOrderLookup(id);
      if (!singleLookup) {
        return NextResponse.json({ error: "Geçersiz sipariş numarası." }, { status: 400 });
      }
    } else if (!requestedOrderIds || requestedOrderIds.length === 0) {
      return NextResponse.json(
        { error: "Toplu zimmetleme için en az 1 sipariş kimliği gereklidir." },
        { status: 400 }
      );
    }

    const isCourierRole = guard.auth.role === "courier";
    if (isCourierRole && (!guard.isActive || !guard.courierDbId)) {
      return NextResponse.json(
        { error: "Kurye hesabınız aktif değil; paket zimmetleyemezsiniz." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
    }

    const targetCourierId = isCourierRole
      ? guard.courierDbId!
      : bodyData?.courierId ?? guard.courierDbId;

    if (!targetCourierId) {
      return NextResponse.json(
        { error: "Zimmetlenecek aktif bir kurye seçmelisiniz." },
        { status: 400 }
      );
    }

    const { data: courierRow, error: courErr } = await supabase
      .from("couriers")
      .select("id, display_name, is_active, is_on_shift")
      .eq("id", targetCourierId)
      .maybeSingle();
    if (courErr) throw courErr;

    if (!courierRow) {
      return NextResponse.json({ error: "Kurye bulunamadı." }, { status: 404 });
    }
    const courier = courierRow as {
      id: string;
      display_name: string;
      is_active: boolean | null;
      is_on_shift: boolean | null;
    };
    if (courier.is_active !== true) {
      return NextResponse.json({ error: "Pasif kuryeye paket zimmetlenemez." }, { status: 409 });
    }

    if (!isBulk && singleLookup) {
      const { data: orderRow, error: orderErr } = await supabase
        .from("orders")
        .select("id, order_number, status, courier_id, delivery_method")
        .eq(singleLookup.column, singleLookup.value)
        .maybeSingle();
      if (orderErr) throw orderErr;

      if (!orderRow) {
        return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
      }
      const existing = orderRow as ClaimOrderRow;

      if (existing.delivery_method === "pickup") {
        return NextResponse.json(
          { error: "Fırından gel-al siparişi kuryeye zimmetlenemez." },
          { status: 400 }
        );
      }
      if (existing.courier_id) {
        return NextResponse.json(
          { error: "Bu paket başka bir kurye tarafından zimmetlenmiş." },
          { status: 409 }
        );
      }
      if (!CLAIMABLE_STATUSES.includes(existing.status as (typeof CLAIMABLE_STATUSES)[number])) {
        const msg =
          existing.status === "bekliyor"
            ? "Sipariş henüz onaylanmadığı için tezgaha alınamaz."
            : `'${existing.status}' durumundaki sipariş zimmetlenemez.`;
        return NextResponse.json({ error: msg }, { status: 409 });
      }

      const nowIso = new Date().toISOString();
      const targetStatus = startRoute ? "kuryede" : existing.status;

      if (startRoute && courier.is_on_shift !== true) {
        await supabase
          .from("couriers")
          .update({ is_on_shift: true, updated_at: nowIso })
          .eq("id", targetCourierId);
      }

      const { data: updatedRows, error: updErr } = await supabase
        .from("orders")
        .update({
          courier_id: targetCourierId,
          assigned_at: nowIso,
          stop_sequence: null,
          status: targetStatus,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .is("courier_id", null)
        .in("status", [...CLAIMABLE_STATUSES])
        .select("id, order_number, status, courier_id");

      if (updErr) throw updErr;
      if (!updatedRows || updatedRows.length === 0) {
        return NextResponse.json(
          { error: "Paket az önce başka bir kurye veya yönetici tarafından alındı." },
          { status: 409 }
        );
      }

      const actorRole = isCourierRole
        ? "courier"
        : guard.auth.role === "staff"
          ? "staff"
          : "admin";

      const { error: histErr } = await supabase.from("order_status_history").insert({
        order_id: existing.id,
        from_status: existing.status,
        to_status: targetStatus,
        changed_by_role: actorRole,
        changed_by_id: guard.auth.userId,
        note: startRoute
          ? `Kurye zimmet alıp yola çıktı: ${courier.display_name}`
          : `Kurye tezgahtan planlı zimmet aldı: ${courier.display_name}`,
      });
      if (histErr) logError("order_status_history claim insert:", histErr);

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "unknown",
        action: "order.courier_claim",
        entityType: "order",
        entityId: existing.id,
        summary: `Paket zimmetlendi (${existing.order_number ?? existing.id} → ${courier.display_name})`,
        metadata: {
          orderNumber: existing.order_number ?? null,
          courierId: targetCourierId,
          courierName: courier.display_name,
          fromStatus: existing.status,
          toStatus: targetStatus,
          startRoute,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: existing.id,
        orderNumber: existing.order_number ?? existing.id,
        courierId: targetCourierId,
        courierName: courier.display_name,
        status: targetStatus,
      });
    }

    // Toplu zimmetleme modu
    const { data: orderRows, error: fetchErr } = await supabase
      .from("orders")
      .select("id, order_number, status, courier_id, delivery_method")
      .in("id", requestedOrderIds!);
    if (fetchErr) throw fetchErr;

    const orderMap = new Map<string, ClaimOrderRow>();
    for (const r of (orderRows ?? []) as ClaimOrderRow[]) {
      orderMap.set(r.id, r);
    }

    const nowIso = new Date().toISOString();
    const actorRole = isCourierRole
      ? "courier"
      : guard.auth.role === "staff"
        ? "staff"
        : "admin";
    const claimedIds: string[] = [];
    const skipped: Array<{ orderId: string; reason: string }> = [];
    const historyRows: Array<{
      order_id: string;
      from_status: string;
      to_status: string;
      changed_by_role: string;
      changed_by_id: string | null;
      note: string;
    }> = [];

    for (const orderId of requestedOrderIds!) {
      const existing = orderMap.get(orderId);
      if (!existing) {
        skipped.push({ orderId, reason: "Sipariş bulunamadı." });
        continue;
      }
      if (existing.delivery_method === "pickup") {
        skipped.push({ orderId: existing.id, reason: "Gel-al siparişi zimmetlenemez." });
        continue;
      }
      if (existing.courier_id) {
        skipped.push({ orderId: existing.id, reason: "Paket başka bir kurye tarafından alınmış." });
        continue;
      }
      if (!CLAIMABLE_STATUSES.includes(existing.status as (typeof CLAIMABLE_STATUSES)[number])) {
        skipped.push({ orderId: existing.id, reason: "Sipariş henüz tezgaha hazır değil." });
        continue;
      }

      const targetStatus = startRoute ? "kuryede" : existing.status;
      const { data: updatedRows, error: updErr } = await supabase
        .from("orders")
        .update({
          courier_id: targetCourierId,
          assigned_at: nowIso,
          stop_sequence: null,
          status: targetStatus,
          updated_at: nowIso,
        })
        .eq("id", existing.id)
        .is("courier_id", null)
        .in("status", [...CLAIMABLE_STATUSES])
        .select("id");

      if (updErr) {
        skipped.push({ orderId: existing.id, reason: getErrorMessage(updErr) });
        continue;
      }
      if (!updatedRows || updatedRows.length === 0) {
        skipped.push({ orderId: existing.id, reason: "Paket başka biri tarafından alındı (409)." });
        continue;
      }

      claimedIds.push(existing.id);
      historyRows.push({
        order_id: existing.id,
        from_status: existing.status,
        to_status: targetStatus,
        changed_by_role: actorRole,
        changed_by_id: guard.auth.userId,
        note: startRoute
          ? `Toplu zimmet + sefer: ${courier.display_name}`
          : `Toplu planlı zimmet: ${courier.display_name}`,
      });
    }

    if (claimedIds.length > 0 && startRoute && courier.is_on_shift !== true) {
      await supabase
        .from("couriers")
        .update({ is_on_shift: true, updated_at: nowIso })
        .eq("id", targetCourierId);
    }

    if (historyRows.length > 0) {
      await supabase.from("order_status_history").insert(historyRows);
    }

    if (claimedIds.length > 0) {
      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "unknown",
        action: "order.courier_claim_bulk",
        entityType: "courier",
        entityId: targetCourierId,
        summary: `${claimedIds.length} paket ${courier.display_name} üzerine zimmetlendi`,
        metadata: {
          courierId: targetCourierId,
          courierName: courier.display_name,
          claimedIds,
          skippedCount: skipped.length,
          startRoute,
        },
      });
    }

    if (claimedIds.length === 0) {
      return NextResponse.json(
        {
          error: skipped[0]?.reason || "Seçili paketler zimmetlenemedi.",
          claimedCount: 0,
          claimedIds: [],
          skippedCount: skipped.length,
          skipped,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      claimedCount: claimedIds.length,
      claimedIds,
      skippedCount: skipped.length,
      skipped,
      courierId: targetCourierId,
      courierName: courier.display_name,
      startRoute,
    });
  } catch (err: unknown) {
    logError("POST /api/orders/[id]/claim:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Paket zimmetlenemedi." },
      { status: 500 }
    );
  }
}

/**
 * Tezgaha Bırak (Unclaim): Kurye üzerindeki (veya admin/personelin seçtiği)
 * henüz tamamlanmamış paketi boşa düşürür; `kuryede` ise `firinda` durumuna çeker.
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireActiveCourierOrAdmin(req, { allowStaff: true });
  if (!guard.ok) return guard.response;

  try {
    const { id } = await props.params;
    const lookup = parseOrderLookup(id);
    if (!lookup) {
      return NextResponse.json({ error: "Geçersiz sipariş numarası." }, { status: 400 });
    }

    const rawBody: unknown = await req.json().catch(() => ({}));
    const parsedBody = UnclaimBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
    }

    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, status, courier_id, delivery_method")
      .eq(lookup.column, lookup.value)
      .maybeSingle();
    if (orderErr) throw orderErr;

    if (!orderRow) {
      return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }
    const existing = orderRow as ClaimOrderRow;

    if (existing.delivery_method === "pickup") {
      return NextResponse.json(
        { error: "Gel-al siparişi tezgah zimmetinde değildir." },
        { status: 400 }
      );
    }

    if (existing.status === "teslim_edildi" || existing.status === "iptal") {
      return NextResponse.json(
        { error: "Teslim edilmiş veya iptal edilmiş sipariş tezgaha bırakılamaz." },
        { status: 409 }
      );
    }

    if (!existing.courier_id) {
      return NextResponse.json({ error: "Sipariş zaten tezgahta." }, { status: 409 });
    }

    const isCourierRole = guard.auth.role === "courier";
    if (isCourierRole && existing.courier_id !== guard.courierDbId) {
      return NextResponse.json(
        { error: "Yalnızca kendi üzerinizdeki paketi tezgaha bırakabilirsiniz." },
        { status: 403 }
      );
    }

    if (parsedBody.data?.courierId && existing.courier_id !== parsedBody.data.courierId) {
      return NextResponse.json(
        { error: "Sipariş belirtilen kuryenin üzerinde görünmüyor." },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    const targetStatus = existing.status === "kuryede" ? "firinda" : existing.status;

    const { data: updatedRows, error: updErr } = await supabase
      .from("orders")
      .update({
        courier_id: null,
        assigned_at: null,
        stop_sequence: null,
        status: targetStatus,
        updated_at: nowIso,
      })
      .eq("id", existing.id)
      .eq("courier_id", existing.courier_id)
      .eq("status", existing.status)
      .select("id");

    if (updErr) throw updErr;
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: "Sipariş durumu eşzamanlı olarak değişti." },
        { status: 409 }
      );
    }

    const actorRole = isCourierRole
      ? "courier"
      : guard.auth.role === "staff"
        ? "staff"
        : "admin";

    const { error: histErr } = await supabase.from("order_status_history").insert({
      order_id: existing.id,
      from_status: existing.status,
      to_status: targetStatus,
      changed_by_role: actorRole,
      changed_by_id: guard.auth.userId,
      note: "Paket tezgaha bırakıldı (Zimmet iadesi)",
    });
    if (histErr) logError("order_status_history unclaim insert:", histErr);

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "unknown",
      action: "order.unclaim",
      entityType: "order",
      entityId: existing.id,
      summary: `Paket tezgaha bırakıldı (${existing.order_number ?? existing.id})`,
      metadata: {
        orderNumber: existing.order_number ?? null,
        previousCourierId: existing.courier_id,
        fromStatus: existing.status,
        toStatus: targetStatus,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: existing.id,
      orderNumber: existing.order_number ?? existing.id,
      courierId: null,
      status: targetStatus,
    });
  } catch (err: unknown) {
    logError("DELETE /api/orders/[id]/claim:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Paket tezgaha bırakılamadı." },
      { status: 500 }
    );
  }
}
