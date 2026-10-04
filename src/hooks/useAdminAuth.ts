"use client";

import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminRole, AdminUser } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";

/** PIN ve "güvenilir cihaz" döneminden kalan tarayıcı anahtarları (bir kez temizlenir). */
const LEGACY_STORAGE_KEYS = ["ekmeklab_pin_session", "ekmeklab_admin_pin", "ekmeklab_trusted_device_id"];
const LEGACY_STORAGE_PREFIX = "ekmeklab_device_approved_";

function clearLegacyAdminStorage() {
  if (typeof window === "undefined") return;
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LEGACY_STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage erişilemiyorsa (gizli pencere vb.) yapılacak bir şey yok
  }
}

function isAdminRole(role: unknown): role is Extract<AdminRole, "admin" | "superadmin"> {
  return role === "admin" || role === "superadmin";
}

/** Sadece `next/navigation` içi göreli yollar ("/..." ama "//..." değil). */
export function safeRedirectPath(target: string | null | undefined, fallback = "/admin"): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }
  return target;
}

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    clearLegacyAdminStorage();

    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const resolveAdmin = async (session: Session | null) => {
      const user = session?.user;
      if (!user || !user.email) {
        if (!cancelled) setAdminUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const role: unknown = profile?.role;
      if (isAdminRole(role)) {
        const fullName: unknown = profile?.full_name;
        setAdminUser({
          uid: user.id,
          email: user.email,
          displayName: typeof fullName === "string" && fullName ? fullName : user.email.split("@")[0],
          role,
          isActive: true,
        });
      } else {
        setAdminUser(null);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => resolveAdmin(data.session))
      .catch((err: unknown) => console.warn("Admin session check warning:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAdmin(session)
        .catch((err: unknown) => console.warn("Admin session update warning:", err))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loginWithGoogle = async (redirectPath = "/admin") => {
    setLoading(true);
    setAuthError(null);
    try {
      if (!supabase) throw new Error("Supabase bağlantısı kurulamadı.");
      const next = encodeURIComponent(safeRedirectPath(redirectPath));
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${next}`
              : undefined,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const msg = "Google ile giriş başarısız oldu: " + getErrorMessage(err);
      setAuthError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      clearLegacyAdminStorage();
      setAdminUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return {
    adminUser,
    isAuthenticated: Boolean(adminUser && adminUser.isActive),
    isSuperAdmin: adminUser?.role === "superadmin",
    loading,
    authError,
    loginWithGoogle,
    logout,
  };
}
