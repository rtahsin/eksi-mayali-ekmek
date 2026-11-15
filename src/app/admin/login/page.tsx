"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { safeRedirectPath, useAdminAuth } from "@/hooks/useAdminAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ShieldCheck, Loader2 } from "lucide-react";

function LoginForm() {
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const { isAuthenticated, loading, loginWithGoogle, authError } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirectPath(searchParams.get("redirect"));

  // Zaten yetkili bir oturum varsa doğrudan hedefe geç
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [loading, isAuthenticated, redirectTarget, router]);

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    const res = await loginWithGoogle(redirectTarget);
    if (!res.success) {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 max-w-md w-full bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-full bg-[#FBF6EC] p-1 mx-auto flex items-center justify-center shadow-xs border border-[#E2D3BD]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
        </div>
        <div className="pt-1">
          <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#3B1E1A]">
            Ekmek<span className="text-[#B4532A] italic">Lab</span> Komuta Merkezi
          </h1>
          <p className="text-xs text-[#6E5148] font-sans">
            Fırın, Dağıtım &amp; Yönetim Masası
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {authError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-[#7D2114] shrink-0" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

      <div className="space-y-4 py-2">
        <p className="text-xs text-[#6E5148] text-center leading-relaxed">
          Yönetici yetkisi tanımlı Google hesabınızla giriş yapın.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleSubmitting}
          className="w-full min-h-12 py-3.5 px-4 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-bold transition-colors flex items-center justify-center gap-3 shadow-xs active:scale-95 disabled:opacity-50"
        >
          {isGoogleSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Google ile Giriş Yap</span>
        </button>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#E2D3BD] flex items-center justify-between text-xs text-[#6E5148]">
        <div className="flex items-center gap-1.5 text-[#1D5130] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Yetki sunucuda doğrulanır</span>
        </div>
        <Link href="/" className="text-[#8E3D1B] hover:text-[#3B1E1A] font-medium transition-colors">
          Vitrini Aç →
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F6EEDF] text-[#3B1E1A] font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Subtle Ambience */}
      <div
        className="fixed inset-0 pointer-events-none opacity-15 bg-cover bg-center"
        style={{ backgroundImage: "url('/atelier/atelier_threshold.webp')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-[#F6EEDF] via-[#F6EEDF]/92 to-[#F6EEDF]/85" />

      <Suspense
        fallback={
          <div className="relative z-10 max-w-md w-full bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-9 text-center shadow-lg">
            <Loader2 className="w-8 h-8 text-[#B4532A] animate-spin mx-auto mb-3" aria-hidden="true" />
            <p className="text-xs text-[#6E5148]">Yükleniyor...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
