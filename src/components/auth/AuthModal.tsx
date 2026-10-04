"use client";

import React, { useState } from "react";
import { X, Sparkles, Mail, ArrowRight, KeyRound } from "lucide-react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { getErrorMessage } from "@/lib/utils/error";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** E-posta kodu girişi, Supabase'de özel SMTP kurulana kadar kapalı tutulur. */
const EMAIL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLED === "true";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<"start" | "code">("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { signInWithGoogle, sendEmailCode, verifyEmailCode, isConfigured } = useCustomerAuth();

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep("start");
    setCode("");
    setErrorMsg(null);
    setSubmitting(false);
    onClose();
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await signInWithGoogle();
      if (!res?.success && res?.error) {
        setErrorMsg(res.error);
        setSubmitting(false);
      }
      // Başarılıysa tarayıcı Google'a yönlenir.
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || "Google ile giriş başlatılamadı.");
      setSubmitting(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const res = await sendEmailCode(email);
    setSubmitting(false);
    if (res.success) {
      setStep("code");
    } else {
      setErrorMsg(res.error || "Kod gönderilemedi.");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const res = await verifyEmailCode(email, code);
    setSubmitting(false);
    if (res.success) {
      resetAndClose();
    } else {
      setErrorMsg(res.error || "Kod doğrulanamadı.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={resetAndClose} />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md bg-surface-panel border border-surface-border rounded-3xl shadow-2xl overflow-hidden z-10 animate-scaleUp"
      >
        {/* Header Ribbon */}
        <div className="relative px-6 pt-6 pb-4 border-b border-surface-border bg-gradient-to-b from-surface-elevated/80 to-surface-panel flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-artisan-gold/10 border border-artisan-gold/30 text-[11px] font-sans font-medium text-artisan-gold">
              <Sparkles className="w-3 h-3" />
              <span>EkmekLab Müdavim Kulübü</span>
            </div>
            <h3 id="auth-modal-title" className="font-serif text-xl font-bold text-foreground">
              {step === "start" ? "Fırınımıza Hoş Geldiniz" : "E-postanı Kontrol Et"}
            </h3>
            <p className="text-xs text-foreground/70 font-sans">
              {step === "start"
                ? "Şifre yok: Google ile ya da e-postana gelen kodla giriş yap. Hesabın ilk girişte açılır."
                : `${email} adresine 6 haneli bir kod gönderdik.`}
            </p>
          </div>

          <button
            onClick={resetAndClose}
            aria-label="Kapat"
            className="p-1.5 rounded-xl text-foreground/50 hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!isConfigured && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-sans">
              Giriş sistemi şu an yapılandırılmamış.
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-sans">
              {errorMsg}
            </div>
          )}

          {step === "start" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting || !isConfigured}
                className="w-full py-3 px-4 rounded-xl bg-surface-elevated hover:bg-surface border border-surface-border text-foreground font-sans text-sm font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm hover:border-artisan-gold/40 disabled:opacity-50"
              >
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
                <span>Google ile Devam Et</span>
              </button>

              {EMAIL_LOGIN_ENABLED && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-[11px] font-sans text-foreground/40 uppercase">veya</span>
                    <div className="flex-1 h-px bg-surface-border" />
                  </div>

                  <form onSubmit={handleSendCode} className="space-y-3">
                    <label htmlFor="auth-email" className="block text-[11px] font-sans text-foreground/70">
                      E-posta adresin
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@mail.com"
                        className="w-full pl-9 pr-3 py-3 rounded-xl bg-surface border border-surface-border text-sm text-foreground focus:border-artisan-gold outline-none font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !isConfigured}
                      className="w-full py-3 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-sans text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>{submitting ? "Gönderiliyor..." : "Bana Giriş Kodu Gönder"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}

              <p className="text-[11px] text-center text-foreground/50 font-sans">
                Hesap açmadan da misafir olarak sipariş verebilirsin.
              </p>
            </>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <label htmlFor="auth-code" className="block text-[11px] font-sans text-foreground/70">
                Giriş kodu
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={10}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-surface border border-surface-border text-lg tracking-[0.4em] font-mono text-foreground focus:border-artisan-gold outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-sans text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{submitting ? "Doğrulanıyor..." : "Giriş Yap"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-between text-xs font-sans pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("start");
                    setCode("");
                    setErrorMsg(null);
                  }}
                  className="text-foreground/60 hover:text-foreground"
                >
                  ← Adresi değiştir
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    setErrorMsg(null);
                    setSubmitting(true);
                    const res = await sendEmailCode(email);
                    setSubmitting(false);
                    if (!res.success) setErrorMsg(res.error || "Kod gönderilemedi.");
                  }}
                  className="text-artisan-gold hover:underline disabled:opacity-50"
                >
                  Kodu tekrar gönder
                </button>
              </div>
              <p className="text-[11px] text-foreground/50 font-sans">
                Gelmediyse spam/gereksiz klasörüne bak.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
