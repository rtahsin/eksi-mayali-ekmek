import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasCapability, type AdminCapability } from "@/lib/security/capabilities";

export type AuthRole = "admin" | "superadmin" | "staff" | "courier" | "customer" | null;

export interface AuthResult {
  isAuthenticated: boolean;
  userId: string | null;
  role: AuthRole;
  isAdmin: boolean;
  isCourier: boolean;
  courierDbId: string | null; // couriers tablosundaki UUID
  courierIsActive?: boolean;
  courierIsOnShift?: boolean;
}

const NO_AUTH: AuthResult = {
  isAuthenticated: false,
  userId: null,
  role: null,
  isAdmin: false,
  isCourier: false,
  courierDbId: null,
  courierIsActive: false,
  courierIsOnShift: false,
};

const KNOWN_ROLES: ReadonlySet<string> = new Set(["admin", "superadmin", "staff", "courier", "customer"]);

function toRole(value: unknown): AuthRole {
  return typeof value === "string" && KNOWN_ROLES.has(value) ? (value as AuthRole) : "customer";
}

/** Çerezdeki Supabase oturumundan kullanıcıyı okur (tarayıcıdan gelen same-origin istekler). */
async function getCookieUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/** `Authorization: Bearer <access_token>` başlığından kullanıcıyı okur. */
async function getBearerUser(req: Request, admin: SupabaseClient): Promise<User | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);
    return error ? null : user ?? null;
  } catch {
    return null;
  }
}

/**
 * API route'larında kullanıcıyı doğrular: önce çerez oturumu, sonra Bearer token.
 * Rol her zaman `profiles.role`'den (service-role ile) okunur; istemcinin gönderdiği
 * hiçbir rol/kimlik alanına güvenilmez.
 */
export async function verifyApiAuth(req: Request): Promise<AuthResult> {
  const admin = createAdminClient();
  if (!admin) return NO_AUTH;

  const user = (await getCookieUser()) ?? (await getBearerUser(req, admin));
  if (!user) return NO_AUTH;

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = toRole(profile?.role);
    const isAdmin = role === "admin" || role === "superadmin";
    const isCourier = role === "courier";

    let courierDbId: string | null = null;
    let courierIsActive = false;
    let courierIsOnShift = false;

    if (isCourier) {
      const { data: courierRow } = await admin
        .from("couriers")
        .select("id, is_active, is_on_shift")
        .eq("profile_id", user.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const row = courierRow as { id?: unknown; is_active?: unknown; is_on_shift?: unknown } | null;
      courierDbId = typeof row?.id === "string" ? row.id : null;
      courierIsActive = row?.is_active === true;
      courierIsOnShift = row?.is_on_shift === true;
    }

    return {
      isAuthenticated: true,
      userId: user.id,
      role,
      isAdmin,
      isCourier,
      courierDbId,
      courierIsActive,
      courierIsOnShift,
    };
  } catch {
    return NO_AUTH;
  }
}

export type AdminGuard =
  | { ok: true; auth: AuthResult }
  | { ok: false; response: NextResponse };

export type CourierOrAdminGuard =
  | {
      ok: true;
      auth: AuthResult;
      courierDbId: string | null;
      isOnShift: boolean;
      isActive: boolean;
    }
  | { ok: false; response: NextResponse };

/**
 * `/api/admin/**` handler'larının ilk satırında çağrılır (middleware'e ek savunma).
 * Kullanım: `const guard = await requireAdmin(req); if (!guard.ok) return guard.response;`
 */
export async function requireAdmin(req: Request): Promise<AdminGuard> {
  const auth = await verifyApiAuth(req);
  if (!auth.isAuthenticated) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!auth.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, auth };
}

/**
 * Granüler yetki kontrolü. `courier` rolü için aktif kurye kaydı da zorunludur.
 */
export async function requireCapability(
  req: Request,
  capability: AdminCapability
): Promise<AdminGuard> {
  const auth = await verifyApiAuth(req);
  if (!auth.isAuthenticated) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasCapability(auth.role, capability)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (auth.role === "courier" && (!auth.courierDbId || auth.courierIsActive !== true)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Kurye hesabınız aktif değil." }, { status: 403 }),
    };
  }
  return { ok: true, auth };
}

/**
 * Aktif kurye (`couriers.is_active === true`) veya admin/superadmin (opsiyonel `staff`) erişimi.
 */
export async function requireActiveCourierOrAdmin(
  req: Request,
  options?: { allowStaff?: boolean }
): Promise<CourierOrAdminGuard> {
  const auth = await verifyApiAuth(req);
  if (!auth.isAuthenticated) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (auth.isAdmin) {
    return {
      ok: true,
      auth,
      courierDbId: auth.courierDbId,
      isOnShift: Boolean(auth.courierIsOnShift),
      isActive: true,
    };
  }

  if (options?.allowStaff && auth.role === "staff") {
    return {
      ok: true,
      auth,
      courierDbId: null,
      isOnShift: false,
      isActive: true,
    };
  }

  if (auth.role === "courier") {
    if (!auth.courierDbId || auth.courierIsActive !== true) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Kurye hesabınız aktif değil." }, { status: 403 }),
      };
    }
    return {
      ok: true,
      auth,
      courierDbId: auth.courierDbId,
      isOnShift: Boolean(auth.courierIsOnShift),
      isActive: true,
    };
  }

  return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}
