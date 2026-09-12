"use client";

import React, { createContext, useContext } from "react";
import { useCustomerAuth, UserProfile, SavedAddress } from "@/hooks/useCustomerAuth";
import { AuthModal } from "./AuthModal";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  addresses: SavedAddress[];
  loading: boolean;
  isLoggedIn: boolean;
  isConfigured: boolean;
  openAuthModal: (view?: "login" | "register" | "forgot") => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<any>;
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string, fullName: string, phone: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  signOut: () => Promise<void>;
  saveAddress: (addr: Omit<SavedAddress, "id" | "userId">) => Promise<any>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useCustomerAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
      <AuthModal
        isOpen={auth.isAuthModalOpen}
        onClose={auth.closeAuthModal}
        defaultTab={auth.authView === "register" ? "register" : "login"}
      />
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
