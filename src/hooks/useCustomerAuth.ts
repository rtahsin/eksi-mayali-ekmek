"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "customer" | "staff" | "admin" | "superadmin";
  avatarUrl?: string;
}

export interface SavedAddress {
  id: string;
  userId: string;
  title: string;
  district: string;
  neighborhood: string;
  addressDetail: string;
  directions?: string;
  isDefault: boolean;
}

export function useCustomerAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authView, setAuthView] = useState<"login" | "register" | "forgot">("login");

  const supabase = createClient();

  const fetchProfileAndAddresses = useCallback(
    async (userId: string, email: string) => {
      if (!supabase) return;

      try {
        const supa = supabase as any;

        // 1. Fetch profile
        const { data: profileData } = await supa
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileData) {
          setProfile({
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name || email.split("@")[0],
            phone: profileData.phone || "",
            role: profileData.role || "customer",
            avatarUrl: profileData.avatar_url,
          });
        } else {
          setProfile({
            id: userId,
            email: email,
            fullName: email.split("@")[0],
            phone: "",
            role: "customer",
          });
        }

        // 2. Fetch saved addresses
        const { data: addressData } = await supa
          .from("saved_addresses")
          .select("*")
          .eq("user_id", userId)
          .order("is_default", { ascending: false });

        if (addressData) {
          setAddresses(
            addressData.map((addr: any) => ({
              id: addr.id,
              userId: addr.user_id,
              title: addr.title || "Ev",
              district: addr.district || "Beylikdüzü",
              neighborhood: addr.neighborhood || "",
              addressDetail: addr.address_detail || "",
              directions: addr.directions || "",
              isDefault: Boolean(addr.is_default),
            }))
          );
        }
      } catch (err) {
        console.warn("Error fetching profile/addresses:", err);
      }
    },
    [supabase]
  );

  useEffect(() => {
    // 1. Check local session cache for instant UI rendering
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ekmeklab_auth_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.user && parsed?.profile) {
            setUser(parsed.user);
            setProfile(parsed.profile);
          }
        }
      } catch (e) {}
    }

    // 2. Supabase Auth Session Listener
    if (supabase && isSupabaseConfigured()) {
      supabase.auth.getSession().then((res: any) => {
        const session = res?.data?.session;
        const currentUser = session?.user ?? null;
        if (currentUser && currentUser.email) {
          setUser(currentUser);
          fetchProfileAndAddresses(currentUser.id, currentUser.email);
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
        const currentUser = session?.user ?? null;
        if (currentUser && currentUser.email) {
          setUser(currentUser);
          await fetchProfileAndAddresses(currentUser.id, currentUser.email);
        } else {
          setUser(null);
          setProfile(null);
          setAddresses([]);
          if (typeof window !== "undefined") {
            localStorage.removeItem("ekmeklab_auth_session");
          }
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    setLoading(false);
  }, [supabase, fetchProfileAndAddresses]);

  // Update localStorage when user/profile changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (user && profile) {
        localStorage.setItem(
          "ekmeklab_auth_session",
          JSON.stringify({ user, profile })
        );
      }
    }
  }, [user, profile]);

  // Actions
  const signInWithGoogle = async () => {
    if (!supabase) {
      return { success: false, error: "Supabase bağlantısı kurulamadı." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });

      if (error) {
        if (
          getErrorMessage(error)?.includes("not enabled") ||
          getErrorMessage(error)?.includes("Unsupported provider")
        ) {
          return {
            success: false,
            error:
              "Supabase panelinde Google ile giriş henüz aktif edilmemiş. Lütfen e-posta & şifre ile giriş yapın veya Supabase Dashboard > Authentication > Providers > Google anahtarını açın.",
          };
        }
        return { success: false, error: getErrorMessage(error) };
      }

      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Google ile giriş başlatılamadı." };
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!supabase) return { error: { message: "Supabase henüz yapılandırılmamış." } };

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (!error && data?.user) {
      setUser(data.user);
      await fetchProfileAndAddresses(data.user.id, cleanEmail);
    }

    return { data, error };
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    fullName: string,
    phone: string
  ) => {
    try {
      // Call server endpoint to create user with auto-confirmation
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: pass,
          fullName: fullName.trim(),
          phone: phone.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { error: { message: json.error || "Kayıt başarısız oldu." } };
      }

      // Automatically sign in the user
      if (supabase) {
        const loginRes = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: pass,
        });
        if (loginRes.data?.user) {
          setUser(loginRes.data.user);
          await fetchProfileAndAddresses(loginRes.data.user.id, email.trim().toLowerCase());
        }
        return loginRes;
      }

      return { data: json, error: null };
    } catch (err: unknown) {
      return { error: { message: getErrorMessage(err) || "Kayıt sırasında bağlantı hatası oluştu." } };
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: { message: "Supabase henüz yapılandırılmamış." } };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${origin}/auth/reset-password`,
    });
    return { error };
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("ekmeklab_auth_session");
    }
    setUser(null);
    setProfile(null);
    setAddresses([]);
  };

  const saveAddress = async (addr: Omit<SavedAddress, "id" | "userId">) => {
    if (!supabase || !user) return { error: "Giriş yapmalısınız" };

    const supa = supabase as any;
    const { data, error } = await supa
      .from("saved_addresses")
      .insert({
        user_id: user.id,
        title: addr.title,
        district: addr.district || "Beylikdüzü",
        neighborhood: addr.neighborhood,
        address_detail: addr.addressDetail,
        directions: addr.directions || "",
        is_default: addr.isDefault,
      })
      .select()
      .single();

    if (!error && user.email) {
      await fetchProfileAndAddresses(user.id, user.email);
    }
    return { data, error };
  };

  return {
    user,
    profile,
    addresses,
    loading,
    isLoggedIn: Boolean(user),
    isConfigured: isSupabaseConfigured(),
    isAuthModalOpen,
    authView,
    openAuthModal: (view: "login" | "register" | "forgot" = "login") => {
      setAuthView(view);
      setIsAuthModalOpen(true);
    },
    closeAuthModal: () => setIsAuthModalOpen(false),
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    saveAddress,
    refreshUser: () => {
      if (user && user.email) {
        fetchProfileAndAddresses(user.id, user.email);
      }
    },
  };
}
