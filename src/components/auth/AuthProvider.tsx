"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useCustomerAuth, UserProfile, SavedAddress } from "@/hooks/useCustomerAuth";
import { AuthModal } from "./AuthModal";
import { User } from "@supabase/supabase-js";
import { readDeviceOrders } from "@/lib/orders/deviceOrders";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  addresses: SavedAddress[];
  loading: boolean;
  isLoggedIn: boolean;
  isConfigured: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<any>;
  sendEmailCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  saveAddress: (addr: Omit<SavedAddress, "id" | "userId">) => Promise<any>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useCustomerAuth();
  const userId = auth.user?.id ?? null;

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
        }
      })
      .catch(() => {
        // bir sonraki girişte tekrar denenir
      });
  }, [userId]);

  return (
    <AuthContext.Provider value={auth}>
      {children}
      <AuthModal isOpen={auth.isAuthModalOpen} onClose={auth.closeAuthModal} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
