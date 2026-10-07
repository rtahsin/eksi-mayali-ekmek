"use client";

import React, { useState, useEffect, Suspense } from "react";
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
    <div className="relative z-10 max-w-md w-full bg-[#1A1410] border border-[#2F241D] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-full bg-[#F7EBD3] p-1 mx-auto flex items-center justify-center shadow-lg border border-artisan-gold/40">
          <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
        </div>
        <div className="pt-1">
          <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Ekmek<span className="text-artisan-gold italic">Lab</span> Komuta Merkezi
          </h1>
          <p className="text-xs text-foreground/60 font-sans">
            Fırın, Dağıtım & Yönetim Masası
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {authError && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <div className="space-y-4 py-2">
        <p className="text-xs text-stone-300 text-center leading-relaxed">
          Yönetici yetkisi tanımlı Google hesabınızla giriş yapın.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-sm font-bold transition-all flex items-center justify-center gap-3 shadow active:scale-95 disabled:opacity-50"
        >
          {isGoogleSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
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
      <div className="pt-3 border-t border-[#2F241D] flex items-center justify-between text-xs text-foreground/50">
        <div className="flex items-center gap-1.5 text-emerald-400/90">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Yetki sunucuda doğrulanır</span>
        </div>
        <a href="/" className="hover:text-artisan-gold transition-colors">
          Vitrini Aç →
        </a>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#120E0B] text-foreground font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Subtle Ambience */}
      <div
        className="fixed inset-0 pointer-events-none opacity-25 filter brightness-90 contrast-125 bg-cover bg-center"
        style={{ backgroundImage: "url('/atelier/atelier_threshold.webp')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-t from-[#120E0B] via-[#120E0B]/90 to-[#120E0B]/80" />

      <Suspense
        fallback={
          <div className="relative z-10 max-w-md w-full bg-[#1A1410] border border-[#2F241D] rounded-3xl p-9 text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-stone-400">Yükleniyor...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
