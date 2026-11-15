import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCapability } from "@/lib/security/apiAuth";
import { writeAuditLog } from "@/lib/security/audit";
import { getErrorMessage } from "@/lib/utils/error";
import { logError } from "@/lib/kernel/log";

const IdSchema = z.string().uuid("Geçersiz ekip kimliği.");

const UpdateTeamSchema = z.object({
  role: z.enum(["courier", "staff", "admin", "customer"]).optional(),
  displayName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  vehicleType: z.enum(["motorcycle", "car", "bicycle", "on_foot"]).optional(),
  isActive: z.boolean().optional(),
  isOnShift: z.boolean().optional(),
});

interface TargetProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
}

interface TargetCourier {
  id: string;
  profile_id: string | null;
  display_name: string;
  phone: string;
  vehicle_type: string | null;
  is_active: boolean | null;
  is_on_shift: boolean | null;
}

interface TargetInvitation {
  id: string;
  email: string;
  role: string;
  display_name: string;
  phone: string | null;
  vehicle_type: string;
  is_active: boolean;
}

interface ResolvedTarget {
  kind: "profile" | "courier_only" | "invitation";
  profile: TargetProfile | null;
  courier: TargetCourier | null;
  invitation: TargetInvitation | null;
}

async function resolveTarget(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  id: string
): Promise<ResolvedTarget | null> {
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role")
    .eq("id", id)
    .maybeSingle();

  if (profileData) {
    const profile = profileData as TargetProfile;
    const { data: courierData } = await supabase
      .from("couriers")
      .select("id, profile_id, display_name, phone, vehicle_type, is_active, is_on_shift")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      kind: "profile",
      profile,
      courier: (courierData as TargetCourier | null) ?? null,
      invitation: null,
    };
  }

  const { data: courierData } = await supabase
    .from("couriers")
    .select("id, profile_id, display_name, phone, vehicle_type, is_active, is_on_shift")
    .eq("id", id)
    .maybeSingle();

  if (courierData) {
    const courier = courierData as TargetCourier;
    let profile: TargetProfile | null = null;
    if (courier.profile_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, role")
        .eq("id", courier.profile_id)
        .maybeSingle();
      profile = (prof as TargetProfile | null) ?? null;
    }
    return {
      kind: profile ? "profile" : "courier_only",
      profile,
      courier,
      invitation: null,
    };
  }

  const { data: invData } = await supabase
    .from("team_invitations")
    .select("id, email, role, display_name, phone, vehicle_type, is_active")
    .eq("id", id)
    .maybeSingle();

  if (invData) {
    return {
      kind: "invitation",
      profile: null,
      courier: null,
      invitation: invData as TargetInvitation,
    };
  }

  return null;
}

/**
 * Ekip üyesi / kurye / davet güncelleme: vardiya, aktiflik, rol, ad, telefon, araç tipi.
 * Superadmin veya kendi hesabını kazara düşürmeye izin vermez.
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireCapability(req, "team.manage");
  if (!guard.ok) return guard.response;

  const { id } = await props.params;
  const idParsed = IdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: idParsed.error.issues[0]?.message || "Geçersiz ID" }, { status: 400 });
  }

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = UpdateTeamSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  try {
    const target = await resolveTarget(supabase, idParsed.data);
    if (!target) {
      return NextResponse.json({ error: "Ekip üyesi veya davet bulunamadı." }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    if (target.kind === "invitation" && target.invitation) {
      if (body.role === "customer") {
        return NextResponse.json(
          { error: "Bekleyen daveti kaldırmak için silme işlemini kullanın." },
          { status: 400 }
        );
      }
      const invUpdate: Record<string, unknown> = { updated_at: nowIso };
      if (body.role !== undefined) invUpdate.role = body.role;
      if (body.displayName !== undefined) invUpdate.display_name = body.displayName;
      if (body.phone !== undefined) invUpdate.phone = body.phone || null;
      if (body.vehicleType !== undefined) invUpdate.vehicle_type = body.vehicleType;
      if (body.isActive !== undefined) invUpdate.is_active = body.isActive;

      const { error: updErr } = await supabase
        .from("team_invitations")
        .update(invUpdate)
        .eq("id", target.invitation.id);
      if (updErr) throw updErr;

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
        action: "team.invitation_update",
        entityType: "team_invitation",
        entityId: target.invitation.id,
        summary: `Ekip daveti güncellendi: ${body.displayName ?? target.invitation.display_name} (${target.invitation.email})`,
        metadata: { updates: body },
      });

      return NextResponse.json({ success: true, id: target.invitation.id });
    }

    const profile = target.profile;
    const courier = target.courier;

    // Superadmin ve kendini düşürme koruması
    if (profile) {
      if (profile.role === "superadmin" && body.role) {
        return NextResponse.json(
          { error: "Superadmin rolü bu ekrandan düşürülemez." },
          { status: 403 }
        );
      }
      if (profile.role === "superadmin" && body.isActive === false) {
        return NextResponse.json(
          { error: "Superadmin hesabı pasifleştirilemez." },
          { status: 403 }
        );
      }
      if (profile.id === guard.auth.userId && body.role && body.role !== profile.role) {
        return NextResponse.json(
          { error: "Kendi yetkinizi kendiniz düşüremezsiniz." },
          { status: 409 }
        );
      }
      if (profile.id === guard.auth.userId && body.isActive === false) {
        return NextResponse.json(
          { error: "Kendi hesabınızı pasifleştiremezsiniz." },
          { status: 409 }
        );
      }

      const profileUpdate: Record<string, unknown> = {};
      if (body.role !== undefined && profile.role !== "superadmin") profileUpdate.role = body.role;
      if (body.displayName !== undefined) profileUpdate.full_name = body.displayName;
      if (body.phone !== undefined) profileUpdate.phone = body.phone;

      if (Object.keys(profileUpdate).length > 0) {
        profileUpdate.updated_at = nowIso;
        const { error: profErr } = await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", profile.id);
        if (profErr) throw profErr;
      }
    }

    const effectiveRole = body.role ?? profile?.role ?? "courier";

    if (courier) {
      const nextIsActive =
        effectiveRole === "customer"
          ? false
          : body.role && body.role !== "courier" && profile?.role === "courier"
          ? false
          : body.isActive ?? courier.is_active ?? true;
      const nextIsOnShift = nextIsActive ? body.isOnShift ?? courier.is_on_shift ?? false : false;

      const courierUpdate: Record<string, unknown> = {
        updated_at: nowIso,
        is_active: nextIsActive,
        is_on_shift: nextIsOnShift,
      };
      if (body.displayName !== undefined) courierUpdate.display_name = body.displayName;
      if (body.phone !== undefined) courierUpdate.phone = body.phone;
      if (body.vehicleType !== undefined) courierUpdate.vehicle_type = body.vehicleType;

      const { error: courErr } = await supabase
        .from("couriers")
        .update(courierUpdate)
        .eq("id", courier.id);
      if (courErr) throw courErr;
    } else if (profile && effectiveRole === "courier") {
      const nextIsActive = body.isActive ?? true;
      const nextIsOnShift = nextIsActive ? body.isOnShift ?? true : false;
      const { error: insErr } = await supabase.from("couriers").insert({
        profile_id: profile.id,
        display_name: body.displayName ?? profile.full_name ?? profile.email ?? "Kurye",
        phone: body.phone ?? profile.phone ?? "",
        vehicle_type: body.vehicleType ?? "motorcycle",
        is_active: nextIsActive,
        is_on_shift: nextIsOnShift,
      });
      if (insErr) throw insErr;
    }

    const targetLabel =
      body.displayName ?? profile?.full_name ?? courier?.display_name ?? profile?.email ?? idParsed.data;
    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "team.member_update",
      entityType: profile ? "profile" : "courier",
      entityId: profile?.id ?? courier?.id ?? idParsed.data,
      summary: `Ekip kaydı güncellendi: ${targetLabel}`,
      metadata: {
        updates: body,
        previousRole: profile?.role ?? null,
        effectiveRole,
      },
    });

    return NextResponse.json({ success: true, id: idParsed.data });
  } catch (err: unknown) {
    logError("PATCH /api/admin/team/[id]:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Ekip üyesi güncellenemedi." },
      { status: 500 }
    );
  }
}

/**
 * Yetkiyi kaldır: rolü `customer` yapar, varsa kuryeyi ve bekleyen daveti pasifleştirir.
 * Superadmin veya kişinin kendi hesabı kaldırılamaz.
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const guard = await requireCapability(req, "team.manage");
  if (!guard.ok) return guard.response;

  const { id } = await props.params;
  const idParsed = IdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: idParsed.error.issues[0]?.message || "Geçersiz ID" }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Veritabanı bağlantısı kurulamadı." }, { status: 500 });
  }

  try {
    const target = await resolveTarget(supabase, idParsed.data);
    if (!target) {
      return NextResponse.json({ error: "Ekip üyesi veya davet bulunamadı." }, { status: 404 });
    }

    const nowIso = new Date().toISOString();

    if (target.kind === "invitation" && target.invitation) {
      const { error: updErr } = await supabase
        .from("team_invitations")
        .update({ is_active: false, updated_at: nowIso })
        .eq("id", target.invitation.id);
      if (updErr) throw updErr;

      await writeAuditLog(supabase, {
        actorId: guard.auth.userId,
        actorRole: guard.auth.role ?? "admin",
        action: "team.invitation_revoke",
        entityType: "team_invitation",
        entityId: target.invitation.id,
        summary: `Ekip daveti pasifleştirildi: ${target.invitation.display_name} (${target.invitation.email})`,
      });

      return NextResponse.json({ success: true });
    }

    if (target.profile) {
      if (target.profile.role === "superadmin") {
        return NextResponse.json(
          { error: "Superadmin hesabı ekipten çıkarılamaz." },
          { status: 403 }
        );
      }
      if (target.profile.id === guard.auth.userId) {
        return NextResponse.json(
          { error: "Kendi yetkinizi kendiniz kaldıramazsınız." },
          { status: 409 }
        );
      }

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ role: "customer", updated_at: nowIso })
        .eq("id", target.profile.id);
      if (profErr) throw profErr;

      if (target.profile.email) {
        const lowerEmail = target.profile.email.toLowerCase();
        const escaped = lowerEmail.replace(/[\\%_]/g, "\\$&");
        const { data: invMatches } = await supabase
          .from("team_invitations")
          .select("id, email")
          .ilike("email", escaped)
          .limit(5);
        for (const inv of (invMatches ?? []) as { id: string; email: string }[]) {
          if (inv.email.toLowerCase() === lowerEmail) {
            await supabase
              .from("team_invitations")
              .update({ is_active: false, updated_at: nowIso })
              .eq("id", inv.id);
          }
        }
      }
    }

    if (target.courier) {
      const { error: courErr } = await supabase
        .from("couriers")
        .update({ is_active: false, is_on_shift: false, updated_at: nowIso })
        .eq("id", target.courier.id);
      if (courErr) throw courErr;
    }

    const label =
      target.profile?.full_name ??
      target.courier?.display_name ??
      target.profile?.email ??
      idParsed.data;

    await writeAuditLog(supabase, {
      actorId: guard.auth.userId,
      actorRole: guard.auth.role ?? "admin",
      action: "team.member_remove",
      entityType: target.profile ? "profile" : "courier",
      entityId: target.profile?.id ?? target.courier?.id ?? idParsed.data,
      summary: `Ekip yetkisi kaldırıldı: ${label}`,
      metadata: {
        previousRole: target.profile?.role ?? null,
        courierId: target.courier?.id ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    logError("DELETE /api/admin/team/[id]:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) || "Ekip yetkisi kaldırılamadı." },
      { status: 500 }
    );
  }
}
