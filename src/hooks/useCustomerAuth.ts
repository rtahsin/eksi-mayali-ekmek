"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizePhone } from "@/lib/order/validate";
import { getErrorMessage } from "@/lib/utils/error";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: "customer" | "staff" | "admin" | "superadmin" | "courier";
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

/** Yalnızca uygulama içi güvenli göreli yolları kabul eder; ?auth ve ?redirect parametrelerini temizler. */
export function sanitizeAuthRedirectPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }
  try {
    const u = new URL(trimmed, "http://localhost");
    u.searchParams.delete("auth");
    u.searchParams.delete("redirect");
    const qs = u.searchParams.toString();
    return `${u.pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return null;
  }
}

/** `enabled: false` (admin ve teslimat ekranları): müşteri profili ve adresleri hiç çekilmez. */
export function useCustomerAuth({ enabled = true }: { enabled?: boolean } = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const pendingRedirectRef = useRef<string | null>(null);

  const supabase = createClient();

  const fetchProfileAndAddresses = useCallback(
    async (userId: string, email: string) => {
      if (!supabase) return;

      try {
        // 1. Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileData) {
          setProfile({
            id: profileData.id,
            email: profileData.email || email,
            fullName: profileData.full_name || email.split("@")[0],
            phone: profileData.phone || "",
            role: profileData.role || "customer",
            avatarUrl: profileData.avatar_url ?? undefined,
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
        const { data: addressData } = await supabase
          .from("saved_addresses")
          .select("*")
          .eq("user_id", userId)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false });

        if (addressData) {
          setAddresses(
            addressData.map((addr) => ({
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

  // Profil ve adresler kullanıcı başına bir kez çekilir (ilk oturum + token yenileme tekrar sorgulamaz)
  const fetchedFor = useRef<string | null>(null);
  const loadUser = useCallback(
    (currentUser: User) => {
      setUser(currentUser);
      if (fetchedFor.current === currentUser.id || !currentUser.email) return Promise.resolve();
      fetchedFor.current = currentUser.id;
      return fetchProfileAndAddresses(currentUser.id, currentUser.email);
    },
    [fetchProfileAndAddresses]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    // 1. Check local session cache for instant UI rendering
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ekmeklab_auth_session");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "user" in parsed &&
            "profile" in parsed
          ) {
            const sessionCache = parsed as { user: User | null; profile: UserProfile | null };
            if (sessionCache.user && sessionCache.profile) {
              setUser(sessionCache.user);
              setProfile(sessionCache.profile);
            }
          }
        }
      } catch {
        // yok say
      }
    }

    // 2. Supabase Auth Session Listener
    if (supabase && isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        if (currentUser && currentUser.email) void loadUser(currentUser);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
        const currentUser = session?.user ?? null;
        if (currentUser && currentUser.email) {
          await loadUser(currentUser);
        } else {
          fetchedFor.current = null;
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
  }, [enabled, supabase, loadUser]);

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

  const resolveOAuthCallbackUrl = (explicitRedirect?: string): string | undefined => {
    if (typeof window === "undefined") return undefined;
    const explicitPath = explicitRedirect ? sanitizeAuthRedirectPath(explicitRedirect) : null;
    const currentPath = sanitizeAuthRedirectPath(`${window.location.pathname}${window.location.search}`);
    const targetNext = explicitPath ?? pendingRedirectRef.current ?? currentPath;
    return `${window.location.origin}/auth/callback${
      targetNext && targetNext !== "/" ? `?next=${encodeURIComponent(targetNext)}` : ""
    }`;
  };

  // Actions
  const signInWithGoogle = async () => {
    if (!supabase) {
      return { success: false, error: "Supabase bağlantısı kurulamadı." };
    }

    try {
      const redirectTo = resolveOAuthCallbackUrl();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
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
              "Google ile giriş şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin veya misafir olarak sipariş verin.",
          };
        }
        return { success: false, error: getErrorMessage(error) };
      }

      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Google ile giriş başlatılamadı." };
    }
  };

  const signInWithApple = async (redirectToPath?: string) => {
    if (!supabase) {
      return { success: false, error: "Supabase bağlantısı kurulamadı." };
    }

    try {
      const redirectTo = resolveOAuthCallbackUrl(redirectToPath);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo,
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
              "Apple ile giriş şu an kullanılamıyor. Lütfen Google ile giriş yapın veya misafir olarak sipariş verin.",
          };
        }
        return { success: false, error: getErrorMessage(error) };
      }

      return { success: true, data };
    } catch (err: unknown) {
      return { success: false, error: getErrorMessage(err) || "Apple ile giriş başlatılamadı." };
    }
  };

  /**
   * Giriş yapmış kullanıcının `profiles` satırında `full_name`, `phone` ve `updated_at` alanlarını günceller.
   * (`013_security_hardening.sql` satır 86 `GRANT UPDATE (full_name, phone, avatar_url, updated_at)` ile izinli.)
   */
  const updateProfile = async (input: {
    fullName: string;
    phone: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user) {
      return { success: false, error: "Profil güncellemek için giriş yapmalısınız." };
    }

    const cleanName = input.fullName.trim();
    if (cleanName.length < 2) {
      return { success: false, error: "Lütfen ad ve soyadınızı en az 2 karakter olarak yazın." };
    }

    const rawPhone = input.phone.trim();
    let normalizedPhone: string | null = null;
    if (rawPhone.length > 0) {
      normalizedPhone = normalizePhone(rawPhone);
      if (!normalizedPhone) {
        return { success: false, error: "Geçerli bir cep telefonu yazın (05XX XXX XX XX)." };
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName,
        phone: normalizedPhone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return {
        success: false,
        error: getErrorMessage(error) || "Profil bilgileriniz güncellenemedi.",
      };
    }

    setProfile((prev) => ({
      id: prev?.id ?? user.id,
      email: prev?.email ?? user.email ?? "",
      fullName: cleanName,
      phone: normalizedPhone ?? "",
      role: prev?.role ?? "customer",
      avatarUrl: prev?.avatarUrl,
    }));

    return { success: true };
  };

  /**
   * Şifresiz giriş 1. adım: e-postaya 6 haneli kod gönderir. Hesap yoksa ilk girişte açılır.
   * (Supabase Auth'ta özel SMTP ve kod içeren "Magic Link" e-posta şablonu gerekir.)
   */
  const sendEmailCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: "Giriş sistemi şu an yapılandırılmamış." };
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: "Geçerli bir e-posta adresi girin." };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: true },
    });
    if (error) {
      const msg = getErrorMessage(error);
      if (/rate limit|too many|seconds/i.test(msg)) {
        return { success: false, error: "Çok sık kod istendi. Lütfen bir dakika sonra tekrar deneyin." };
      }
      return { success: false, error: "Kod gönderilemedi. Lütfen adresi kontrol edip tekrar deneyin." };
    }
    return { success: true };
  };

  /** Şifresiz giriş 2. adım: e-postadaki kodu doğrular ve oturumu açar. */
  const verifyEmailCode = async (
    email: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: "Giriş sistemi şu an yapılandırılmamış." };
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return { success: false, error: "E-postadaki kodun tamamını girin." };
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    if (error || !data.user) {
      return { success: false, error: "Kod hatalı veya süresi dolmuş. Yeni kod isteyebilirsiniz." };
    }
    const targetNext = pendingRedirectRef.current;
    pendingRedirectRef.current = null;
    if (typeof window !== "undefined" && targetNext && targetNext !== "/") {
      window.location.assign(targetNext);
    }
    return { success: true };
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // yok say
      }
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

    // Yeni adres varsayılan seçildiyse önce diğer adreslerin varsayılan bayrağını temizle
    if (addr.isDefault) {
      await supabase
        .from("saved_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    const { data, error } = await supabase
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

  const setDefaultAddress = async (
    addressId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user) {
      return { success: false, error: "Giriş yapmalısınız." };
    }

    const { error: resetErr } = await supabase
      .from("saved_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .neq("id", addressId);

    if (resetErr) {
      return { success: false, error: getErrorMessage(resetErr) || "Adres güncellenemedi." };
    }

    const { error: setErr } = await supabase
      .from("saved_addresses")
      .update({ is_default: true })
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (setErr) {
      return { success: false, error: getErrorMessage(setErr) || "Varsayılan adres seçilemedi." };
    }

    if (user.email) {
      await fetchProfileAndAddresses(user.id, user.email);
    }
    return { success: true };
  };

  const deleteAddress = async (
    addressId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!supabase || !user) {
      return { success: false, error: "Giriş yapmalısınız." };
    }

    const { error } = await supabase
      .from("saved_addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: getErrorMessage(error) || "Adres silinemedi." };
    }

    if (user.email) {
      await fetchProfileAndAddresses(user.id, user.email);
    }
    return { success: true };
  };

  const openAuthModal = useCallback((redirectPath?: string) => {
    pendingRedirectRef.current = sanitizeAuthRedirectPath(redirectPath);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    pendingRedirectRef.current = null;
    setIsAuthModalOpen(false);
  }, []);

  return {
    user,
    profile,
    addresses,
    loading,
    isLoggedIn: Boolean(user),
    isConfigured: isSupabaseConfigured(),
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithApple,
    updateProfile,
    sendEmailCode,
    verifyEmailCode,
    signOut,
    saveAddress,
    setDefaultAddress,
    deleteAddress,
    refreshUser: () => {
      if (user && user.email) {
        void fetchProfileAndAddresses(user.id, user.email);
      }
    },
  };
}
