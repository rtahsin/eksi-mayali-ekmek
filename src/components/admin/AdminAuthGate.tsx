"use client";

import React, { useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useRouter, usePathname } from "next/navigation";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  // Not Authenticated -> Redirect to Login
  useEffect(() => {
    if (!isLoginPage && !authLoading && !isAuthenticated) {
      router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoginPage, authLoading, isAuthenticated, pathname, router]);

  // Allow unrestricted access to the login page itself
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#120E0B] flex flex-col items-center justify-center text-foreground font-sans p-4">
        <div className="flex flex-col items-center gap-4 bg-[#1A1410] p-8 rounded-3xl border border-[#2F241D] shadow-2xl">
          <div className="w-12 h-12 rounded-full border-2 border-artisan-gold/30 border-t-artisan-gold animate-spin" />
          <div className="text-center space-y-1">
            <div className="font-serif text-lg font-bold text-foreground">
              Ekmek<span className="text-artisan-gold italic">Lab</span> Operasyon
            </div>
            <p className="text-xs text-foreground/60">Yetki doğrulaması yapılıyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
