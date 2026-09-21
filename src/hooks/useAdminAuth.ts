"use client";

import { useState, useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminRole, AdminUser } from "@/types/admin";
import { getErrorMessage } from "@/lib/utils/error";

const SUPER_ADMIN_EMAILS = [
  "tahsinreyhan@gmail.com",
  "ekmeklab@gmail.com",
];

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (user && user.email) {
          const emailLower = user.email.toLowerCase().trim();
          const isSuper = SUPER_ADMIN_EMAILS.includes(emailLower);

          const { data: profile } = await supabase!
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          const role = (profile?.role as AdminRole) || (isSuper ? "superadmin" : "customer");

          if (isSuper || role === "superadmin" || role === "admin") {
            setAdminUser({
              uid: user.id,
              email: user.email,
              displayName: isSuper ? "Tahsin Usta" : (profile?.full_name || user.email.split("@")[0]),
              role: isSuper ? "superadmin" : role,
              isActive: true,
            });
          } else {
            setAdminUser(null);
          }
        } else if (typeof window !== "undefined") {
          // Check for quick PIN session
          const savedPinSession = localStorage.getItem("ekmeklab_pin_session");
          if (savedPinSession) {
            try {
              const parsed = JSON.parse(savedPinSession);
              if (parsed && parsed.role === "superadmin") {
                setAdminUser(parsed);
              }
            } catch {
              localStorage.removeItem("ekmeklab_pin_session");
            }
          } else {
            setAdminUser(null);
          }
        } else {
          setAdminUser(null);
        }
      } catch (err) {
        console.warn("Admin session check warning:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const user = session?.user;
      if (user && user.email) {
        const emailLower = user.email.toLowerCase().trim();
        const isSuper = SUPER_ADMIN_EMAILS.includes(emailLower);

        const { data: profile } = await supabase!
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        const role = (profile?.role as AdminRole) || (isSuper ? "superadmin" : "customer");

        if (isSuper || role === "superadmin" || role === "admin") {
          setAdminUser({
            uid: user.id,
            email: user.email,
            displayName: profile?.full_name || user.email.split("@")[0],
            role: isSuper ? "superadmin" : role,
            isActive: true,
          });
        } else {
          setAdminUser(null);
        }
      } else {
        setAdminUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      if (!supabase) throw new Error("Supabase bağlantısı kurulamadı.");

      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        let msg = "Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.";
        if (getErrorMessage(error).includes("Invalid login credentials")) {
          msg = "E-posta adresi veya şifre hatalı.";
        }
        setAuthError(msg);
        return { success: false, error: msg };
      }

      const user = data.user;
      const isSuper = SUPER_ADMIN_EMAILS.includes(cleanEmail);

      const { data: profile } = await supabase!
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const role = (profile?.role as AdminRole) || (isSuper ? "superadmin" : "customer");

      if (!isSuper && role !== "superadmin" && role !== "admin") {
        await supabase.auth.signOut();
        setAdminUser(null);
        const deniedMsg = "Bu alana yalnızca yetkili fırın yöneticileri erişebilir.";
        setAuthError(deniedMsg);
        return { success: false, error: deniedMsg };
      }

      const adminObj: AdminUser = {
        uid: user.id,
        email: user.email || cleanEmail,
        displayName: profile?.full_name || cleanEmail.split("@")[0],
        role: isSuper ? "superadmin" : role,
        isActive: true,
      };

      setAdminUser(adminObj);
      return { success: true, user };
    } catch (err: unknown) {
      const msg = getErrorMessage(err) || "Giriş sırasında beklenmedik bir hata oluştu.";
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      if (!supabase) throw new Error("Supabase bağlantısı kurulamadı.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=/admin`
              : undefined,
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      const msg = "Google ile giriş başarısız oldu: " + getErrorMessage(err);
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!supabase) throw new Error("Supabase bağlantısı kurulamadı.");
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined,
      });
      if (error) throw error;
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Şifre sıfırlama e-postası gönderilemedi." };
    }
  };

  const loginWithPin = async (enteredPin: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      // New Secure Flow
      const res = await fetch("/api/admin/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: enteredPin.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const msg = data.error || "Hatalı PIN kodu! Lütfen tekrar deneyin.";
        setAuthError(msg);
        return { success: false, error: msg };
      }

      // If successful, the API has set the HTTP-Only cookie.
      // We still update local state for the UI immediately.
      const pinUser: AdminUser = {
        uid: "tahsin_master_admin",
        email: "tahsinreyhan@gmail.com",
        displayName: "Tahsin Usta",
        role: "superadmin",
        isActive: true,
      };

      setAdminUser(pinUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("ekmeklab_pin_session", JSON.stringify(pinUser));
        const localId = localStorage.getItem("ekmeklab_trusted_device_id");
        if (localId) {
          localStorage.setItem(`ekmeklab_device_approved_${localId}`, "true");
        }
      }

      return { success: true, user: pinUser };
    } catch (err: unknown) {
      const msg = getErrorMessage(err) || "PIN ile giriş sırasında bir hata oluştu.";
      setAuthError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      
      await fetch("/api/admin/auth/pin", { method: "DELETE" }).catch(() => {});
      
      if (typeof window !== "undefined") {
        localStorage.removeItem("ekmeklab_pin_session");
      }
      setAdminUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return {
    firebaseUser: adminUser ? ({ uid: adminUser.uid, email: adminUser.email } as any) : null,
    adminUser,
    isAuthenticated: Boolean(adminUser && adminUser.isActive),
    isSuperAdmin: Boolean(
      adminUser &&
        (adminUser.role === "superadmin" ||
          SUPER_ADMIN_EMAILS.includes(adminUser.email?.toLowerCase() || ""))
    ),
    loading,
    authError,
    login,
    loginWithPin,
    loginWithGoogle,
    resetPassword,
    logout,
  };
}
