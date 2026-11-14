"use client";

import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sanitizeAuthRedirectPath, useCustomerAuth, UserProfile, SavedAddress } from "@/hooks/useCustomerAuth";
import { AuthModal } from "./AuthModal";
import { User } from "@supabase/supabase-js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { readDeviceOrders } from "@/lib/orders/deviceOrders";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  addresses: SavedAddress[];
  loading: boolean;
  isLoggedIn: boolean;
  isConfigured: boolean;
  claimVersion: number;
  triggerOrderClaim: () => Promise<void>;
  openAuthModal: (redirectPath?: string) => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  signInWithApple: (redirectTo?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  updateProfile: (input: { fullName: string; phone: string }) => Promise<{ success: boolean; error?: string }>;
  sendEmailCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  saveAddress: (addr: Omit<SavedAddress, "id" | "userId">) => Promise<{ data?: unknown; error?: unknown }>;
  setDefaultAddress: (addressId: string) => Promise<{ success: boolean; error?: string }>;
  deleteAddress: (addressId: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Admin ve teslimat ekranları müşteri hesabını kullanmaz; orada profil/adres sorgusu atılmaz
  const pathname = usePathname() ?? "";
  const staffArea = pathname.startsWith("/admin") || pathname.startsWith("/kurye");
  const auth = useCustomerAuth({ enabled: !staffArea });
  const userId = auth.user?.id ?? null;
  const [claimVersion, setClaimVersion] = useState<number>(0);

  const triggerOrderClaim = useCallback(async () => {
    if (!userId) return;
    const orders = readDeviceOrders().map((o) => ({ id: o.id, token: o.token }));
    if (orders.length > 0) {
      try {
        const res = await fetch("/api/orders/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders }),
        });
        if (res.ok) {
          try {
            sessionStorage.setItem(`ekmeklab_claimed_${userId}`, "1");
          } catch {
            // yok say
          }
        }
      } catch {
        // bir sonraki tetiklemede tekrar denenir
      }
    }
    setClaimVersion((v) => v + 1);
  }, [userId]);

  // Giriş yapıldığında bu cihazdan misafir olarak verilen siparişleri hesaba bağla (oturum başına bir kez)
  useEffect(() => {
    if (!userId) return;
    const flag = `ekmeklab_claimed_${userId}`;
    try {
      if (sessionStorage.getItem(flag)) return;
    } catch {
      // sessionStorage yoksa yine de dene
    }
    const orders = readDeviceOrders().map((o) => ({ id: o.id, token: o.token }));
    if (orders.length === 0) return;
    fetch("/api/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    })
      .then((res) => {
        if (res.ok) {
          try {
            sessionStorage.setItem(flag, "1");
          } catch {
            // yok say
          }
          setClaimVersion((v) => v + 1);
        }
      })
      .catch(() => {
        // bir sonraki girişte tekrar denenir
      });
  }, [userId]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      ...auth,
      claimVersion,
      triggerOrderClaim,
    }),
    [auth, claimVersion, triggerOrderClaim]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {!staffArea && (
        <Suspense fallback={null}>
          <AuthQueryTrigger
            loading={auth.loading}
            isLoggedIn={auth.isLoggedIn}
            openAuthModal={auth.openAuthModal}
          />
        </Suspense>
      )}
      <AuthModal isOpen={auth.isAuthModalOpen} onClose={auth.closeAuthModal} />
    </AuthContext.Provider>
  );
}

function AuthQueryTrigger({
  loading,
  isLoggedIn,
  openAuthModal,
}: {
  loading: boolean;
  isLoggedIn: boolean;
  openAuthModal: (redirectPath?: string) => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (searchParams.get("auth") !== "login") return;

    const target = sanitizeAuthRedirectPath(searchParams.get("redirect"));

    if (typeof window !== "undefined") {
      const cleanParams = new URLSearchParams(window.location.search);
      cleanParams.delete("auth");
      cleanParams.delete("redirect");
      const qs = cleanParams.toString();
      window.history.replaceState(window.history.state, "", `${pathname}${qs ? `?${qs}` : ""}`);
    }

    if (isLoggedIn) {
      if (target && target !== "/") {
        router.replace(target);
      }
    } else {
      openAuthModal(target ?? undefined);
    }
  }, [loading, isLoggedIn, searchParams, pathname, router, openAuthModal]);

  return null;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
