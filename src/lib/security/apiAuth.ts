import { createAdminClient } from "@/lib/supabase/admin";

export type AuthRole = "admin" | "superadmin" | "courier" | "customer" | null;

export interface AuthResult {
  isAuthenticated: boolean;
  userId: string | null;
  role: AuthRole;
  isAdmin: boolean;
  isCourier: boolean;
  courierDbId: string | null; // couriers tablosundaki UUID
}

/**
 * API route'larında auth header'dan kullanıcıyı doğrular.
 * Service role client ile çalışır — RLS bypass edilmez,
 * sadece token verify + rol sorgusu yapılır.
 */
export async function verifyApiAuth(req: Request): Promise<AuthResult> {
  const noAuth: AuthResult = {
    isAuthenticated: false,
    userId: null,
    role: null,
    isAdmin: false,
    isCourier: false,
    courierDbId: null,
  };

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return noAuth;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return noAuth;

  const supabase = createAdminClient();
  if (!supabase) return noAuth;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return noAuth;

    // Rol sorgula
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as AuthRole) || "customer";
    const isAdmin = role === "admin" || role === "superadmin";
    const isCourier = role === "courier";

    let courierDbId: string | null = null;
    if (isCourier) {
      const { data: courierRow } = await supabase
        .from("couriers")
        .select("id")
        .eq("profile_id", user.id)
        .single();
      courierDbId = courierRow?.id || null;
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
    return noAuth;
  }
}
