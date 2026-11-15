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
      <div className="min-h-screen bg-[#F6EEDF] flex flex-col items-center justify-center text-[#3B1E1A] font-sans p-4">
        <div className="flex flex-col items-center gap-4 bg-[#FFFFFF] p-8 rounded-3xl border border-[#E2D3BD] shadow-sm">
          <div className="w-12 h-12 rounded-full border-2 border-[#E2D3BD] border-t-[#B4532A] animate-spin" />
          <div className="text-center space-y-1">
            <div className="font-serif text-lg font-bold text-[#3B1E1A]">
              Ekmek<span className="text-[#B4532A] italic">Lab</span> Operasyon
            </div>
            <p className="text-xs text-[#6E5148]">Yetki doğrulaması yapılıyor...</p>
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
