import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthRole = "admin" | "superadmin" | "staff" | "courier" | "customer" | null;

export interface AuthResult {
  isAuthenticated: boolean;
  userId: string | null;
  role: AuthRole;
  isAdmin: boolean;
  isCourier: boolean;
  courierDbId: string | null; // couriers tablosundaki UUID
}

const NO_AUTH: AuthResult = {
  isAuthenticated: false,
  userId: null,
  role: null,
  isAdmin: false,
  isCourier: false,
  courierDbId: null,
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
    if (isCourier) {
      const { data: courierRow } = await admin
        .from("couriers")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      courierDbId = typeof courierRow?.id === "string" ? courierRow.id : null;
    }

    return {
      isAuthenticated: true,
      userId: user.id,
      role,
      isAdmin,
      isCourier,
      courierDbId,
    };
  } catch {
    return NO_AUTH;
  }
}

export type AdminGuard =
  | { ok: true; auth: AuthResult }
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
