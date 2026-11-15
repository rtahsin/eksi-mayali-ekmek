import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { getErrorMessage } from "@/lib/utils/error";

export const runtime = "nodejs";

const TERMINAL_STATUSES = new Set(["teslim_edildi", "iptal"]);

const BulkStatusSchema = z
  .object({
    orderIds: z
      .array(z.string().trim().min(1, "Sipariş kimliği boş olamaz.").max(80))
      .min(1, "En az 1 sipariş seçilmelidir.")
      .max(100, "Tek seferde en fazla 100 sipariş işlenebilir."),
    action: z.enum([
      "approve",
      "prepare",
      "assign_courier",
      "unassign_courier",
      "start_route",
      "cancel",
    ]),
    courierId: z.string().uuid("Geçerli bir kurye kimliği seçin.").optional(),
    startRoute: z.boolean().optional().default(false),
    reason: z.string().trim().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "assign_courier" && !data.courierId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["courierId"],
        message: "Kurye atama işlemi için courierId zorunludur.",
      });
    }
  });

interface OrderRow {
  id: string;
  order_number: string | null;
  status: string;
  delivery_method: string | null;
  courier_id: string | null;
  customer_name: string | null;
}

interface SkippedItem {
  orderId: string;
  orderNumber: string | null;
  reason: string;
  conflict?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getActionLabel(action: z.infer<typeof BulkStatusSchema>["action"]): string {
  switch (action) {
    case "approve":
      return "Toplu onay";
    case "prepare":
      return "Toplu fırın/hazır aşaması";
    case "assign_courier":
      return "Toplu kurye zimmeti";
    case "unassign_courier":
      return "Toplu kurye ataması kaldırma";
    case "start_route":
      return "Toplu sefer başlatma";
    case "cancel":
      return "Toplu iptal";
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireCapability(req, "orders.ops");
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı yok." }, { status: 500 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400 });
  }

  const parsed = BulkStatusSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Geçersiz toplu işlem talebi." },
      { status: 400 },
    );
  }

  const { action, courierId, startRoute, reason } = parsed.data;
  const uniqueOrderIds = Array.from(new Set(parsed.data.orderIds));

  let assignedCourierName: string | null = null;
  let assignedCourierOnShift = true;
  if ((action === "assign_courier" || action === "start_route") && courierId) {
    const { data: courier, error: courierError } = await supabase
      .from("couriers")
      .select("id, display_name, is_active, is_on_shift")
      .eq("id", courierId)
      .maybeSingle();

    if (courierError) {
      return NextResponse.json({ error: getErrorMessage(courierError) }, { status: 500 });
    }
    if (!courier) {
      return NextResponse.json({ error: "Seçilen kurye bulunamadı." }, { status: 404 });
    }
    if (!courier.is_active) {
      return NextResponse.json(
        { error: "Pasif durumdaki kuryeye toplu atama yapılamaz." },
        { status: 409 },
      );
    }
    assignedCourierName =
      typeof courier.display_name === "string" && courier.display_name.trim()
        ? courier.display_name.trim()
        : null;
    assignedCourierOnShift = Boolean(courier.is_on_shift);
  }

  const { data: orderRows, error: fetchError } = await supabase
    .from("orders")
    .select("id, order_number, status, delivery_method, courier_id, customer_name")
    .in("id", uniqueOrderIds);

  if (fetchError) {
    return NextResponse.json({ error: getErrorMessage(fetchError) }, { status: 500 });
  }

  const orderMap = new Map<string, OrderRow>();
  for (const row of (orderRows ?? []) as OrderRow[]) {
    orderMap.set(row.id, row);
  }

  const updatedIds: string[] = [];
  const skipped: SkippedItem[] = [];
  const historyRows: Array<{
    order_id: string;
    from_status: string;
    to_status: string;
    changed_by_role: string;
    changed_by_id: string | null;
    note: string;
  }> = [];

  const historyActorRole = guard.auth.role === "staff" ? "staff" : "admin";
  const nowIso = new Date().toISOString();

  for (const orderId of uniqueOrderIds) {
    const order = orderMap.get(orderId);
    if (!order) {
      skipped.push({ orderId, orderNumber: null, reason: "Sipariş bulunamadı." });
      continue;
    }

    if (TERMINAL_STATUSES.has(order.status)) {
      skipped.push({
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "Teslim edilmiş veya iptal edilmiş sipariş değiştirilemez.",
      });
      continue;
    }

    if (action === "cancel") {
      const { data: rpcData, error: rpcError } = await supabase.rpc("cancel_order_atomic", {
        p_order_id: order.id,
        p_reason: reason || "Yönetim toplu iptali",
        p_actor_role: "admin",
        p_actor_id: guard.auth.userId ?? null,
        p_expected_status: order.status,
      });

      if (rpcError) {
        const msg = getErrorMessage(rpcError);
        const isConflict =
          msg.toLowerCase().includes("conflict") ||
          msg.toLowerCase().includes("status") ||
          msg.toLowerCase().includes("değişti");
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: msg,
          conflict: isConflict,
        });
        continue;
      }

      const rpcRecord = asRecord(rpcData);
      if (rpcRecord && rpcRecord.ok === false) {
        const errMsg =
          typeof rpcRecord.error === "string"
            ? rpcRecord.error
            : "Sipariş iptali tamamlanamadı.";
        const isConflict = rpcRecord.code === "CONFLICT";
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: errMsg,
          conflict: isConflict,
        });
        continue;
      }

      updatedIds.push(order.id);
      continue;
    }

    let targetStatus: string | null = null;
    const updatePayload: Record<string, unknown> = { updated_at: nowIso };
    let historyNote = "";

    if (action === "approve") {
      if (order.status !== "bekliyor") {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Yalnızca bekliyor durumundaki siparişler onaylanabilir.",
        });
        continue;
      }
      targetStatus = "hazirlaniyor";
      updatePayload.status = targetStatus;
      historyNote = reason || "Toplu sipariş onayı";
    } else if (action === "prepare") {
      if (order.status !== "hazirlaniyor") {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Yalnızca hazırlanıyor durumundaki siparişler fırına/hazıra alınabilir.",
        });
        continue;
      }
      targetStatus = "firinda";
      updatePayload.status = targetStatus;
      historyNote = reason || "Toplu hazırlık / fırın aşaması";
    } else if (action === "assign_courier") {
      if (order.delivery_method === "pickup") {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Gel-al siparişine kurye atanamaz.",
        });
        continue;
      }
      if (!courierId) {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Kurye kimliği eksik.",
        });
        continue;
      }
      targetStatus = startRoute
        ? "kuryede"
        : order.status === "bekliyor"
          ? "hazirlaniyor"
          : order.status;
      updatePayload.status = targetStatus;
      updatePayload.courier_id = courierId;
      updatePayload.assigned_at = nowIso;
      updatePayload.stop_sequence = null;
      historyNote = startRoute
        ? assignedCourierName
          ? `Toplu atama ve yola çıkarma: ${assignedCourierName}`
          : "Toplu kurye ataması ve yola çıkarma"
        : assignedCourierName
          ? `Toplu planlı zimmet: ${assignedCourierName}`
          : "Toplu kurye planlaması";
    } else if (action === "unassign_courier") {
      if (order.delivery_method === "pickup") {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Gel-al siparişinde kurye zimmeti yoktur.",
        });
        continue;
      }
      if (!order.courier_id && order.status !== "kuryede") {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Sipariş zaten tezgahta (kurye atanmamış).",
        });
        continue;
      }
      targetStatus = order.status === "kuryede" ? "firinda" : order.status;
      updatePayload.status = targetStatus;
      updatePayload.courier_id = null;
      updatePayload.assigned_at = null;
      updatePayload.stop_sequence = null;
      historyNote = reason || "Toplu kurye ataması kaldırıldı (Tezgaha bırakıldı)";
    } else if (action === "start_route") {
      if (order.delivery_method === "pickup") {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Gel-al sipariş yola çıkarılamaz.",
        });
        continue;
      }
      const effectiveCourierId = courierId ?? order.courier_id;
      if (!effectiveCourierId) {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Kurye atanmamış sipariş yola çıkarılamaz.",
        });
        continue;
      }
      if (order.status === "kuryede" && (!courierId || order.courier_id === courierId)) {
        skipped.push({
          orderId: order.id,
          orderNumber: order.order_number,
          reason: "Sipariş zaten kuryede.",
        });
        continue;
      }
      targetStatus = "kuryede";
      updatePayload.status = targetStatus;
      if (courierId && courierId !== order.courier_id) {
        updatePayload.courier_id = courierId;
        updatePayload.assigned_at = nowIso;
        updatePayload.stop_sequence = null;
      }
      historyNote = assignedCourierName
        ? `Toplu sefer başlatıldı: ${assignedCourierName}`
        : reason || "Toplu sefer başlatıldı (Yolda)";
    }

    if (!targetStatus) {
      continue;
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      skipped.push({
        orderId: order.id,
        orderNumber: order.order_number,
        reason: getErrorMessage(updateError),
      });
      continue;
    }

    if (!updatedRow) {
      skipped.push({
        orderId: order.id,
        orderNumber: order.order_number,
        reason: "Sipariş durumu eşzamanlı olarak değişti (409 çakışma).",
        conflict: true,
      });
      continue;
    }

    updatedIds.push(order.id);
    historyRows.push({
      order_id: order.id,
      from_status: order.status,
      to_status: targetStatus,
      changed_by_role: historyActorRole,
      changed_by_id: guard.auth.userId ?? null,
      note: historyNote,
    });
  }

  if (
    updatedIds.length > 0 &&
    ((action === "assign_courier" && startRoute) || action === "start_route") &&
    courierId &&
    !assignedCourierOnShift
  ) {
    await supabase.from("couriers").update({ is_on_shift: true }).eq("id", courierId);
  }

  if (historyRows.length > 0) {
    await supabase.from("order_status_history").insert(historyRows);
  }

  if (updatedIds.length > 0) {
    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "order.bulk_status",
      entityType: "order",
      entityId: updatedIds.length === 1 ? updatedIds[0] : null,
      summary: `${getActionLabel(action)}: ${updatedIds.length} sipariş güncellendi (${skipped.length} atlandı).`,
      metadata: {
        action,
        startRoute,
        updatedCount: updatedIds.length,
        updatedIds,
        skippedCount: skipped.length,
        courierId: courierId ?? null,
        courierName: assignedCourierName,
        reason: reason ?? null,
      },
    });
  }

  const hasConflict = skipped.some((item) => item.conflict);
  if (updatedIds.length === 0 && hasConflict) {
    return NextResponse.json(
      {
        error: "Seçili siparişlerin durumu eşzamanlı olarak değişti.",
        action,
        updatedCount: 0,
        updatedIds,
        skippedCount: skipped.length,
        skipped: skipped.map(({ orderId, orderNumber, reason: skipReason }) => ({
          orderId,
          orderNumber,
          reason: skipReason,
        })),
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    action,
    updatedCount: updatedIds.length,
    updatedIds,
    skippedCount: skipped.length,
    skipped: skipped.map(({ orderId, orderNumber, reason: skipReason }) => ({
      orderId,
      orderNumber,
      reason: skipReason,
    })),
  });
}
