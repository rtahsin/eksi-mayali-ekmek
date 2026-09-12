"use client";

import React, { useState, Suspense } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Loader2, CheckCircle2, KeyRound } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("tahsinreyhan@gmail.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const { login, loginWithGoogle, resetPassword, authError } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError("Lütfen e-posta adresinizi ve şifrenizi girin.");
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);
    setResetSuccess(null);

    const res = await login(email, password);
    if (res.success) {
      router.push(redirectTarget);
    } else {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleSubmitting(true);
    setLocalError(null);
    setResetSuccess(null);

    const res = await loginWithGoogle();
    if (res.success) {
      router.push(redirectTarget);
    } else {
      setIsGoogleSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setLocalError("Lütfen şifre sıfırlama bağlantısı göndermek için e-posta adresinizi yazın.");
      return;
    }
    setLocalError(null);
    const res = await resetPassword(email);
    if (res.success) {
      setResetSuccess(`${email} adresinize şifre sıfırlama bağlantısı gönderildi. Mail kutunuzu kontrol edip yeni şifrenizi belirleyebilirsiniz.`);
    } else {
      setLocalError(res.error || "Şifre sıfırlama maili gönderilemedi.");
    }
  };

  return (
    <div className="relative z-10 max-w-md w-full bg-[#1A1410] border border-[#2F241D] rounded-3xl p-7 sm:p-9 space-y-6 shadow-2xl">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-[#F7EBD3] p-1.5 mx-auto flex items-center justify-center shadow-lg border border-artisan-gold/40">
          <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
        </div>
        <div className="pt-2">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Ekmek<span className="text-artisan-gold italic">Lab</span> Komuta Merkezi
          </h1>
          <p className="text-xs text-foreground/60 font-sans mt-0.5">
            Fırın, Dağıtım & Kurumsal Yönetim Masası
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {(localError || authError) && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{localError || authError}</span>
        </div>
      )}

      {/* Success Notice */}
      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{resetSuccess}</span>
        </div>
      )}

      {/* Google One-Click Login Button */}
      <div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleSubmitting || isSubmitting}
          className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold transition-all flex items-center justify-center gap-3 shadow active:scale-95 disabled:opacity-50"
        >
          {isGoogleSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>Google Hesabıyla Tek Tıkla Giriş Yap</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-stone-800" />
          <span className="text-[11px] text-stone-500 font-medium">veya şifre ile</span>
          <div className="flex-1 h-px bg-stone-800" />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-serif font-bold text-artisan-gold uppercase tracking-wider block">
            Yönetici E-Posta
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tahsinreyhan@gmail.com"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#14100D] border border-[#2F241D] text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-artisan-gold transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-serif font-bold text-artisan-gold uppercase tracking-wider block">
              Şifre
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[11px] text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1 font-medium"
            >
              <KeyRound className="w-3 h-3" />
              <span>Şifremi Sıfırla</span>
            </button>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-foreground/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#14100D] border border-[#2F241D] text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-artisan-gold transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isGoogleSubmitting}
          className="w-full mt-2 py-3.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-serif font-bold transition-all shadow-lg shadow-artisan-terracotta/25 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Giriş Yapılıyor...</span>
            </>
          ) : (
            <>
              <span>Panele Giriş Yap</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Security Badge */}
      <div className="pt-4 border-t border-[#2F241D] flex items-center justify-between text-[11px] text-foreground/50">
        <div className="flex items-center gap-1.5 text-emerald-400/90">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tanınan Cihaz Koruması Aktif</span>
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
        style={{ backgroundImage: "url('/atelier/atelier_threshold.png')" }}
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
