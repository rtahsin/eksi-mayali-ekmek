"use client";

import { useEffect } from "react";
import { create } from "zustand";
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

interface AdminAuthState {
  adminUser: AdminUser | null;
  loading: boolean;
  authError: string | null;
}

/**
 * Tek paylaşılan durum: kapı, üst başlık ve yan menü aynı oturumu okur; profil sorgusu
 * kullanıcı başına bir kez atılır (eskiden her bileşen ayrı ayrı, iki kez soruyordu).
 */
const useAdminAuthStore = create<AdminAuthState>()(() => ({ adminUser: null, loading: true, authError: null }));

let started = false;
/** Rolü çözülen (ya da çözülmekte olan) kullanıcı; null = oturum yok, undefined = henüz bakılmadı. */
let resolvedFor: string | null | undefined;

async function resolveAdmin(session: Session | null) {
  const supabase = createClient();
  const user = session?.user;
  const id = user && user.email ? user.id : null;
  // Token yenileme vb. aynı kullanıcı için tekrar sorgulamaz
  if (id === resolvedFor) return;
  resolvedFor = id;

  if (!supabase || !user || !user.email || !id) {
    useAdminAuthStore.setState({ adminUser: null, loading: false });
    return;
  }

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", id).maybeSingle();
  if (resolvedFor !== id) return; // bu arada kullanıcı değişti

  const role: unknown = profile?.role;
  const fullName: unknown = profile?.full_name;
  useAdminAuthStore.setState({
    loading: false,
    adminUser: isAdminRole(role)
      ? {
          uid: id,
          email: user.email,
          displayName: typeof fullName === "string" && fullName ? fullName : user.email.split("@")[0],
          role,
          isActive: true,
        }
      : null,
  });
}

/** Oturum dinleyicisi uygulama boyunca bir kez kurulur (sayfa değişse de açık kalır). */
function startAdminAuth() {
  if (started || typeof window === "undefined") return;
  started = true;
  clearLegacyAdminStorage();

  const supabase = createClient();
  if (!supabase || !isSupabaseConfigured()) {
    useAdminAuthStore.setState({ loading: false });
    return;
  }

  // Abonelik ilk oturumu (INITIAL_SESSION) hemen bildirir; ayrıca getSession gerekmez.
  // Supabase geri çağrısının içinde sorgu beklenmez (kilit), bir sonraki tura bırakılır.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => {
      resolveAdmin(session).catch((err: unknown) => {
        console.warn("Admin session check warning:", err);
        resolvedFor = undefined;
        useAdminAuthStore.setState({ adminUser: null, loading: false });
      });
    }, 0);
  });
}

export function useAdminAuth() {
  useEffect(startAdminAuth, []);
  const { adminUser, loading, authError } = useAdminAuthStore();
  const supabase = createClient();
  const setLoading = (value: boolean) => useAdminAuthStore.setState({ loading: value });
  const setAuthError = (value: string | null) => useAdminAuthStore.setState({ authError: value });

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
      resolvedFor = null;
      useAdminAuthStore.setState({ adminUser: null });
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
