"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

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

  const fetchProfileAndAddresses = useCallback(async (userId: string, email: string) => {
    if (!supabase) return;

    try {
      // Fetch profile
      const supa = supabase as any;
      const { data: profileData } = await supa
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          email: profileData.email,
          fullName: profileData.full_name || "",
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

      // Fetch saved addresses
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
      console.warn("Error fetching user profile/addresses:", err);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        fetchProfileAndAddresses(currentUser.id, currentUser.email);
      }
      setLoading(false);
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        await fetchProfileAndAddresses(currentUser.id, currentUser.email);
      } else {
        setProfile(null);
        setAddresses([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileAndAddresses]);

  // Actions
  const signInWithGoogle = async () => {
    if (!supabase) {
      alert("Supabase henüz yapılandırılmamış.");
      return { error: "Supabase not configured" };
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!supabase) return { error: { message: "Supabase henüz yapılandırılmamış." } };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    return { data, error };
  };

  const signUpWithEmail = async (email: string, pass: string, fullName: string, phone: string) => {
    if (!supabase) return { error: { message: "Supabase henüz yapılandırılmamış." } };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
        },
      },
    });
    return { data, error };
  };

  const resetPassword = async (email: string) => {
    if (!supabase) return { error: { message: "Supabase henüz yapılandırılmamış." } };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/reset-password`,
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
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
