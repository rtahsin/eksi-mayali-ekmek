"use client";

import { useState, useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { AdminRole, AdminUser } from "@/types/admin";

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

          const { data: profile } = await (supabase as any)
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

        const { data: profile } = await (supabase as any)
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
        if (error.message.includes("Invalid login credentials")) {
          msg = "E-posta adresi veya şifre hatalı.";
        }
        setAuthError(msg);
        return { success: false, error: msg };
      }

      const user = data.user;
      const isSuper = SUPER_ADMIN_EMAILS.includes(cleanEmail);

      const { data: profile } = await (supabase as any)
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
    } catch (err: any) {
      const msg = err.message || "Giriş sırasında beklenmedik bir hata oluştu.";
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
    } catch (err: any) {
      const msg = "Google ile giriş başarısız oldu: " + err.message;
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
    } catch (err: any) {
      return { success: false, error: err.message || "Şifre sıfırlama e-postası gönderilemedi." };
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
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
    isSuperAdmin: adminUser?.role === "superadmin",
    loading,
    authError,
    login,
    loginWithGoogle,
    resetPassword,
    logout,
  };
}
