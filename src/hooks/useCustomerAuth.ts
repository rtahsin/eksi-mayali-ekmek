"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

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
    // 1. Check saved session in localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ekmeklab_auth_session");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.user && parsed?.profile) {
            setUser(parsed.user);
            setProfile(parsed.profile);
            if (parsed.user.id && parsed.user.email) {
              fetchProfileAndAddresses(parsed.user.id, parsed.user.email);
            }
          }
        }
      } catch (e) {}
    }

    // 2. Firebase Auth state listener (handles Google popup auth seamlessly)
    const unsubFirebase = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const userId = fbUser.uid;
        const newProfile: UserProfile = {
          id: userId,
          email: fbUser.email,
          fullName: fbUser.displayName || fbUser.email.split("@")[0],
          phone: fbUser.phoneNumber || "",
          role:
            fbUser.email === "tahsinreyhan@gmail.com" || fbUser.email === "ekmeklab@gmail.com"
              ? "superadmin"
              : "customer",
          avatarUrl: fbUser.photoURL || undefined,
        };
        setUser({ id: userId, email: fbUser.email } as any);
        setProfile(newProfile);
        fetchProfileAndAddresses(userId, fbUser.email);
      }
    });

    // 3. Supabase Auth state listener
    if (supabase && isSupabaseConfigured()) {
      supabase.auth.getSession().then((res: any) => {
        const session = res?.data?.session;
        const currentUser = session?.user ?? null;
        if (currentUser && currentUser.email) {
          setUser(currentUser);
          fetchProfileAndAddresses(currentUser.id, currentUser.email);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
        const currentUser = session?.user ?? null;
        if (currentUser && currentUser.email) {
          setUser(currentUser);
          await fetchProfileAndAddresses(currentUser.id, currentUser.email);
        }
      });

      return () => {
        unsubFirebase();
        subscription.unsubscribe();
      };
    }

    setLoading(false);
    return () => {
      unsubFirebase();
    };
  }, [supabase, fetchProfileAndAddresses]);

  // Actions
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(firebaseAuth, provider);

      if (cred?.user && cred.user.email) {
        let supaUserId = cred.user.uid;

        // Sync with Supabase backend
        try {
          const syncRes = await fetch("/api/auth/google-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: cred.user.email,
              fullName: cred.user.displayName || cred.user.email.split("@")[0],
              avatarUrl: cred.user.photoURL || null,
              phone: cred.user.phoneNumber || "",
            }),
          });
          const syncData = await syncRes.json();
          if (syncData?.supabaseUserId) {
            supaUserId = syncData.supabaseUserId;
          }
        } catch (syncErr) {
          console.warn("Google sync endpoint notice:", syncErr);
        }

        const newProfile: UserProfile = {
          id: supaUserId,
          email: cred.user.email,
          fullName: cred.user.displayName || cred.user.email.split("@")[0],
          phone: cred.user.phoneNumber || "",
          role:
            cred.user.email === "tahsinreyhan@gmail.com" || cred.user.email === "ekmeklab@gmail.com"
              ? "superadmin"
              : "customer",
          avatarUrl: cred.user.photoURL || undefined,
        };

        setProfile(newProfile);
        setUser({ id: supaUserId, email: cred.user.email } as any);

        if (typeof window !== "undefined") {
          localStorage.setItem(
            "ekmeklab_auth_session",
            JSON.stringify({
              user: { id: supaUserId, email: cred.user.email },
              profile: newProfile,
            })
          );
        }

        return { success: true };
      }
      return { success: false, error: "Google ile giriş tamamlanamadı." };
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        return { success: false, error: "Giriş penceresi kapatıldı." };
      }
      return { success: false, error: err.message || "Google ile giriş yapılamadı." };
    }
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
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (e) {}
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
