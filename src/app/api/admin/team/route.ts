import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { istanbulToday, isIsoDate } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const cents = (v: number) => Math.round(v * 100) / 100;

const CreateTeamMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Geçerli bir e-posta adresi girin")
    .max(160)
    .transform((v) => v.toLowerCase()),
  role: z.enum(["courier", "staff", "admin"]),
  displayName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  vehicleType: z
    .enum(["motorcycle", "car", "bicycle", "on_foot"])
    .optional()
    .default("motorcycle"),
});

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string | null;
}

interface CourierRow {
  id: string;
  profile_id: string | null;
  display_name: string;
  phone: string;
  vehicle_type: string | null;
  is_active: boolean | null;
  is_on_shift: boolean | null;
  created_at: string;
  updated_at: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  display_name: string;
  phone: string | null;
  vehicle_type: string;
  is_active: boolean;
  invited_by: string | null;
  accepted_profile_id: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SettlementRow {
  id: string;
  courier_id: string;
  settlement_date: string;
  cash_expected: number | string;
  card_expected: number | string;
  cari_delivered_total: number | string;
  delivered_count: number;
  cash_handed_over: number | string;
  card_slip_total: number | string;
  note: string | null;
  settled_by: string | null;
  settled_at: string;
}

interface OrderSummaryRow {
  id: string;
  courier_id: string | null;
  status: string;
  total_amount: number | string | null;
  payment_method: string | null;
  payment_status: string | null;
  cari_id: string | null;
}

interface PaymentSummaryRow {
  order_id: string;
  amount: number | string | null;
  method: string;
  collected_by: string | null;
  courier_id: string | null;
}

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CourierDaySummary {
  courierId: string;
  activeStopCount: number;
  deliveredCount: number;
  cashExpected: number;
  cardExpected: number;
  cariDeliveredTotal: number;
  settlement: {
    id: string;
    cashHandedOver: number;
    cardSlipTotal: number;
    cashExpected: number;
    cardExpected: number;
    cariDeliveredTotal: number;
    deliveredCount: number;
    note: string | null;
    settledAt: string;
  } | null;
}

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Ekip & Kurye Yönetimi okuma: yetkili profiller, kuryeler, bekleyen davetler,
 * bugünkü mutabakatlar, kurye bazlı teslimat özetleri ve son 50 denetim izi.
 */
export async function GET(req: Request) {
  const guard = await requireCapability(req, "team.manage");
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    if (dateParam && !isIsoDate(dateParam)) {
      return NextResponse.json({ error: "Geçersiz tarih formatı (YYYY-AA-GG)." }, { status: 400 });
    }
    const targetDate = dateParam ?? istanbulToday();

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
    }

    const [profilesRes, couriersRes, invitationsRes, settlementsRes, ordersRes, auditRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, phone, role, created_at, updated_at")
          .in("role", ["courier", "staff", "admin", "superadmin"])
          .order("created_at", { ascending: true }),
        supabase
          .from("couriers")
          .select("id, profile_id, display_name, phone, vehicle_type, is_active, is_on_shift, created_at, updated_at")
          .order("display_name", { ascending: true }),
        supabase
          .from("team_invitations")
          .select("id, email, role, display_name, phone, vehicle_type, is_active, invited_by, accepted_profile_id, accepted_at, created_at, updated_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("courier_settlements")
          .select("id, courier_id, settlement_date, cash_expected, card_expected, cari_delivered_total, delivered_count, cash_handed_over, card_slip_total, note, settled_by, settled_at")
          .eq("settlement_date", targetDate),
        supabase
          .from("orders")
          .select("id, courier_id, status, total_amount, payment_method, payment_status, cari_id")
          .eq("delivery_date", targetDate)
          .not("courier_id", "is", null)
          .neq("status", "iptal"),
        supabase
          .from("audit_logs")
          .select("id, actor_id, actor_role, action, entity_type, entity_id, summary, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    if (profilesRes.error) throw profilesRes.error;
    if (couriersRes.error) throw couriersRes.error;
    if (invitationsRes.error) throw invitationsRes.error;
    if (settlementsRes.error) throw settlementsRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (auditRes.error) throw auditRes.error;

    const profiles = (profilesRes.data ?? []) as ProfileRow[];
    const couriers = (couriersRes.data ?? []) as CourierRow[];
    const invitations = (invitationsRes.data ?? []) as InvitationRow[];
    const settlements = (settlementsRes.data ?? []) as SettlementRow[];
    const orders = (ordersRes.data ?? []) as OrderSummaryRow[];
    const auditRows = (auditRes.data ?? []) as AuditLogRow[];

    const deliveredOrderIds = orders
      .filter((o) => o.status === "teslim_edildi")
      .map((o) => o.id);

    const paymentsByOrder = new Map<string, PaymentSummaryRow[]>();
    if (deliveredOrderIds.length > 0) {
      const { data: paymentRows, error: payErr } = await supabase
        .from("payments")
        .select("order_id, amount, method, collected_by, courier_id")
        .in("order_id", deliveredOrderIds)
        .eq("status", "completed");

      if (payErr) throw payErr;
      for (const p of (paymentRows ?? []) as PaymentSummaryRow[]) {
        const list = paymentsByOrder.get(p.order_id) ?? [];
        list.push(p);
        paymentsByOrder.set(p.order_id, list);
      }
    }

    const settlementByCourier = new Map<string, SettlementRow>();
    for (const s of settlements) {
      settlementByCourier.set(s.courier_id, s);
    }

    const summaryMap = new Map<string, CourierDaySummary>();
    const ensureSummary = (courierId: string): CourierDaySummary => {
      const existing = summaryMap.get(courierId);
      if (existing) return existing;
      const sRow = settlementByCourier.get(courierId);
      const created: CourierDaySummary = {
        courierId,
        activeStopCount: 0,
        deliveredCount: 0,
        cashExpected: 0,
        cardExpected: 0,
        cariDeliveredTotal: 0,
        settlement: sRow
          ? {
              id: sRow.id,
              cashHandedOver: cents(Number(sRow.cash_handed_over) || 0),
              cardSlipTotal: cents(Number(sRow.card_slip_total) || 0),
              cashExpected: cents(Number(sRow.cash_expected) || 0),
              cardExpected: cents(Number(sRow.card_expected) || 0),
              cariDeliveredTotal: cents(Number(sRow.cari_delivered_total) || 0),
              deliveredCount: Number(sRow.delivered_count) || 0,
              note: sRow.note,
              settledAt: sRow.settled_at,
            }
          : null,
      };
      summaryMap.set(courierId, created);
      return created;
    };

    for (const c of couriers) {
      ensureSummary(c.id);
    }

    for (const o of orders) {
      if (!o.courier_id) continue;
      const summary = ensureSummary(o.courier_id);
      if (o.status !== "teslim_edildi") {
        summary.activeStopCount += 1;
        continue;
      }

      summary.deliveredCount += 1;
      const orderTotal = cents(Number(o.total_amount) || 0);
      const orderPayments = paymentsByOrder.get(o.id) ?? [];

      let doorCash = 0;
      let doorCard = 0;
      for (const p of orderPayments) {
        const amt = cents(Number(p.amount) || 0);
        if (amt <= 0) continue;
        const collectedAtDoor =
          p.courier_id === o.courier_id ||
          p.collected_by === "courier" ||
          (p.courier_id === null &&
            (o.payment_method === "cash_on_delivery" || o.payment_method === "pos_at_door"));
        if (!collectedAtDoor) continue;
        if (p.method === "cash") doorCash = cents(doorCash + amt);
        else if (p.method === "pos" || p.method === "pos_at_door") doorCard = cents(doorCard + amt);
      }

      if (orderPayments.length === 0 && o.payment_status === "paid" && !o.cari_id) {
        if (o.payment_method === "cash_on_delivery") doorCash = orderTotal;
        else if (o.payment_method === "pos_at_door") doorCard = orderTotal;
      }

      summary.cashExpected = cents(summary.cashExpected + doorCash);
      summary.cardExpected = cents(summary.cardExpected + doorCard);

      if (o.cari_id || o.payment_method === "cari") {
        const cariRemainder = Math.max(cents(orderTotal - doorCash - doorCard), 0);
        summary.cariDeliveredTotal = cents(summary.cariDeliveredTotal + cariRemainder);
      }
    }

    const courierByProfile = new Map<string, CourierRow>();
    for (const c of couriers) {
      if (c.profile_id && !courierByProfile.has(c.profile_id)) {
        courierByProfile.set(c.profile_id, c);
      }
    }

    const profileMap = new Map<string, { fullName: string | null; email: string | null }>();
    for (const p of profiles) {
      profileMap.set(p.id, { fullName: p.full_name, email: p.email });
    }

    const missingActorIds = Array.from(
      new Set(
        auditRows
          .map((a) => a.actor_id)
          .filter((id): id is string => Boolean(id) && !profileMap.has(id!))
      )
    );
    if (missingActorIds.length > 0) {
      const { data: extraActors } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", missingActorIds);
      for (const a of (extraActors ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
        profileMap.set(a.id, { fullName: a.full_name, email: a.email });
      }
    }

    const members = profiles.map((p) => {
      const c = courierByProfile.get(p.id) ?? null;
      return {
        profileId: p.id,
        email: p.email ?? "",
        displayName: p.full_name || c?.display_name || p.email || "İsimsiz Üye",
        phone: p.phone || c?.phone || "",
        role: p.role,
        createdAt: p.created_at,
        courier: c
          ? {
              id: c.id,
              displayName: c.display_name,
              phone: c.phone,
              vehicleType: c.vehicle_type || "motorcycle",
              isActive: c.is_active === true,
              isOnShift: c.is_on_shift === true,
            }
          : null,
        summary: c ? summaryMap.get(c.id) ?? null : null,
      };
    });

    return NextResponse.json({
      date: targetDate,
      currentUserId: guard.auth.userId,
      members,
      couriers: couriers.map((c) => ({
        id: c.id,
        profileId: c.profile_id,
        displayName: c.display_name,
        phone: c.phone,
        vehicleType: c.vehicle_type || "motorcycle",
        isActive: c.is_active === true,
        isOnShift: c.is_on_shift === true,
        summary: summaryMap.get(c.id) ?? ensureSummary(c.id),
      })),
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        displayName: inv.display_name,
        phone: inv.phone || "",
        vehicleType: inv.vehicle_type,
        isActive: inv.is_active,
        acceptedProfileId: inv.accepted_profile_id,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
      })),
      settlements: Array.from(settlementByCourier.values()).map((s) => ({
        id: s.id,
        courierId: s.courier_id,
        settlementDate: s.settlement_date,
        cashExpected: cents(Number(s.cash_expected) || 0),
        cardExpected: cents(Number(s.card_expected) || 0),
        cariDeliveredTotal: cents(Number(s.cari_delivered_total) || 0),
        deliveredCount: Number(s.delivered_count) || 0,
        cashHandedOver: cents(Number(s.cash_handed_over) || 0),
        cardSlipTotal: cents(Number(s.card_slip_total) || 0),
        note: s.note,
        settledAt: s.settled_at,
      })),
      auditLogs: auditRows.map((a) => {
        const actor = a.actor_id ? profileMap.get(a.actor_id) : undefined;
        return {
          id: a.id,
          actorId: a.actor_id,
          actorName: actor?.fullName || actor?.email || null,
          actorRole: a.actor_role,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          summary: a.summary,
          metadata: a.metadata ?? {},
          createdAt: a.created_at,
        };
      }),
    });
  } catch (err: unknown) {
    logError("GET /api/admin/team:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Ekip verileri alınamadı." },
      { status: 500 }
    );
  }
}

/**
 * Ekibe üye ekle / yetki ata: e-posta `profiles`'da varsa rolünü doğrudan günceller
 * (rol `courier` ise `couriers` kaydı aktif + vardiyada olarak açılır/güncellenir).
 * Henüz giriş yapmadıysa `team_invitations` tablosuna ekler.
 */
export async function POST(req: Request) {
  const guard = await requireCapability(req, "team.manage");
  if (!guard.ok) return guard.response;

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = CreateTeamMemberSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }
  const { email, role, displayName, phone, vehicleType } = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  try {
    const escaped = escapeIlike(email);
    const { data: profileMatches, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, role")
      .ilike("email", escaped)
      .limit(10);

    if (profErr) throw profErr;

    const existingProfile =
      ((profileMatches ?? []) as ProfileRow[]).find(
        (p) => typeof p.email === "string" && p.email.toLowerCase() === email
      ) ?? null;

    const nowIso = new Date().toISOString();

    if (existingProfile) {
      if (existingProfile.role === "superadmin") {
        return NextResponse.json(
          { error: "Superadmin yetkisi bu ekrandan değiştirilemez." },
          { status: 409 }
        );
      }
      if (existingProfile.id === guard.auth.userId && role !== existingProfile.role) {
        return NextResponse.json(
          { error: "Kendi rolünüzü bu ekrandan düşüremezsiniz." },
          { status: 409 }
        );
      }

      const { error: updProfErr } = await supabase
        .from("profiles")
        .update({
          role,
          full_name: displayName || existingProfile.full_name,
          ...(phone ? { phone } : {}),
          updated_at: nowIso,
        })
        .eq("id", existingProfile.id);
      if (updProfErr) throw updProfErr;

      let courierId: string | null = null;
      const { data: existingCouriers, error: courReadErr } = await supabase
        .from("couriers")
        .select("id, phone")
        .eq("profile_id", existingProfile.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (courReadErr) throw courReadErr;
      const existingCourier = (existingCouriers?.[0] as { id: string; phone: string } | undefined) ?? null;

      if (role === "courier") {
        if (existingCourier) {
          const { error: courUpdErr } = await supabase
            .from("couriers")
            .update({
              display_name: displayName,
              phone: phone || existingCourier.phone || "",
              vehicle_type: vehicleType,
              is_active: true,
              is_on_shift: true,
              updated_at: nowIso,
            })
            .eq("id", existingCourier.id);
          if (courUpdErr) throw courUpdErr;
          courierId = existingCourier.id;
        } else {
          const { data: insertedCourier, error: courInsErr } = await supabase
            .from("couriers")
            .insert({
              profile_id: existingProfile.id,
              display_name: displayName,
              phone: phone || existingProfile.phone || "",
              vehicle_type: vehicleType,
              is_active: true,
              is_on_shift: true,
            })
            .select("id")
            .single();
          if (courInsErr) throw courInsErr;
          courierId = (insertedCourier as { id: string }).id;
        }
      } else if (existingCourier) {
        await supabase
          .from("couriers")
          .update({ is_active: false, is_on_shift: false, updated_at: nowIso })
          .eq("profile_id", existingProfile.id);
      }

      // Varsa bekleyen davet kaydını da kabul edilmiş olarak işaretle
      const { data: invMatches } = await supabase
        .from("team_invitations")
        .select("id, email")
        .ilike("email", escaped)
        .limit(5);
      const matchingInv = ((invMatches ?? []) as { id: string; email: string }[]).find(
        (i) => i.email.toLowerCase() === email
      );
      if (matchingInv) {
        await supabase
          .from("team_invitations")
          .update({
            role,
            display_name: displayName,
            phone: phone || null,
            vehicle_type: vehicleType,
            is_active: true,
            accepted_profile_id: existingProfile.id,
            accepted_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", matchingInv.id);
      }

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
        action: "team.member_assign",
        entityType: "profile",
        entityId: existingProfile.id,
        summary: `Ekip yetkisi atandı: ${displayName} (${email}) → ${role}`,
        metadata: {
          email,
          previousRole: existingProfile.role,
          newRole: role,
          courierId,
        },
      });

      return NextResponse.json({
        success: true,
        mode: "assigned",
        profileId: existingProfile.id,
        courierId,
        role,
      });
    }

    // E-posta henüz kayıtlı değil: team_invitations upsert (lower(email) tekilliği)
    const { data: invRows, error: invReadErr } = await supabase
      .from("team_invitations")
      .select("id, email")
      .ilike("email", escaped)
      .limit(5);
    if (invReadErr) throw invReadErr;

    const existingInv =
      ((invRows ?? []) as { id: string; email: string }[]).find(
        (inv) => inv.email.toLowerCase() === email
      ) ?? null;

    let invitationId: string;
    if (existingInv) {
      const { error: updInvErr } = await supabase
        .from("team_invitations")
        .update({
          email,
          role,
          display_name: displayName,
          phone: phone || null,
          vehicle_type: vehicleType,
          is_active: true,
          invited_by: guard.auth.userId,
          accepted_profile_id: null,
          accepted_at: null,
          updated_at: nowIso,
        })
        .eq("id", existingInv.id);
      if (updInvErr) throw updInvErr;
      invitationId = existingInv.id;
    } else {
      const { data: insInv, error: insInvErr } = await supabase
        .from("team_invitations")
        .insert({
          email,
          role,
          display_name: displayName,
          phone: phone || null,
          vehicle_type: vehicleType,
          is_active: true,
          invited_by: guard.auth.userId,
        })
        .select("id")
        .single();
      if (insInvErr) throw insInvErr;
      invitationId = (insInv as { id: string }).id;
    }

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "team.invitation_create",
      entityType: "team_invitation",
      entityId: invitationId,
      summary: `Ekip daveti oluşturuldu: ${displayName} (${email}) → ${role}`,
      metadata: {
        email,
        role,
        vehicleType,
      },
    });

    return NextResponse.json({
      success: true,
      mode: "invited",
      invitationId,
      role,
    });
  } catch (err: unknown) {
    logError("POST /api/admin/team:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Ekip üyesi eklenemedi." },
      { status: 500 }
    );
  }
}
