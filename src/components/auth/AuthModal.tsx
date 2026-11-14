"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Mail,
  ArrowRight,
  KeyRound,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { detectInAppBrowser, type InAppBrowserInfo } from "@/lib/auth/inAppBrowser";
import { getErrorMessage } from "@/lib/utils/error";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** E-posta kodu girişi, Supabase'de özel SMTP kurulana kadar kapalı tutulur. */
const EMAIL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLED === "true";

/** Apple ile giriş bayrağı. */
const APPLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_APPLE_LOGIN_ENABLED === "true";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [step, setStep] = useState<"start" | "code">("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [inAppInfo, setInAppInfo] = useState<InAppBrowserInfo>({
    isInApp: false,
    appName: null,
    isIOS: false,
  });

  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { signInWithGoogle, signInWithApple, sendEmailCode, verifyEmailCode, isConfigured } =
    useAuth();

  useEffect(() => {
    if (!isOpen || typeof navigator === "undefined") return;
    setInAppInfo(detectInAppBrowser(navigator.userAgent));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStep("start");
        setCode("");
        setErrorMsg(null);
        setSubmitting(false);
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep("start");
    setCode("");
    setErrorMsg(null);
    setSubmitting(false);
    setCopiedUrl(false);
    onClose();
  };

  const handleCopyCurrentUrl = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setErrorMsg("Bağlantı panoya kopyalanamadı. Adres çubuğundan kopyalayabilirsiniz.");
    }
  };

  const handleGuestOrderContinue = () => {
    resetAndClose();
    if (pathname.startsWith("/hesabim") || pathname.startsWith("/siparislerim")) {
      router.push("/#ekmekler");
    }
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
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || "Google ile giriş başlatılamadı.");
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await signInWithApple();
      if (!res?.success && res?.error) {
        setErrorMsg(res.error);
        setSubmitting(false);
      }
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e) || "Apple ile giriş başlatılamadı.");
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

  const startSubtitle = EMAIL_LOGIN_ENABLED
    ? "Şifre yok: Google hesabınızla ya da e-postanıza gelen kodla giriş yapın. Hesabınız ilk girişte açılır."
    : APPLE_LOGIN_ENABLED
    ? "Şifre yok: Google veya Apple hesabınızla tek dokunuşta giriş yapın. Hesabınız ilk girişte açılır."
    : "Şifre yok: Google hesabınızla tek dokunuşta giriş yapın. Hesabınız ilk girişte açılır.";

  const browserTargetLabel = inAppInfo.isIOS ? "Safari'de Aç" : "Tarayıcıda / Safari'de Aç";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/55 backdrop-blur-xs transition-opacity"
        onClick={resetAndClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-cream-surface border border-line rounded-3xl shadow-2xl z-10 animate-scaleUp text-ink"
      >
        {/* Header Ribbon */}
        <div className="relative px-6 pt-6 pb-4 border-b border-line bg-bg/60 flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-xs font-sans font-semibold text-accent">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>EkmekLab Müdavim Pasaportu</span>
            </div>
            <h2 id="auth-modal-title" className="font-serif text-xl font-bold text-ink">
              {step === "start" ? "Fırınımıza Hoş Geldiniz" : "E-postanızı Kontrol Edin"}
            </h2>
            <p className="text-xs text-ink-muted font-sans leading-relaxed">
              {step === "start"
                ? startSubtitle
                : `${email} adresine 6 haneli doğrulama kodu gönderdik.`}
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Giriş penceresini kapat"
            className="touch-target-44 shrink-0 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-line/40 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Uygulama İçi Tarayıcı (Instagram / TikTok / Facebook / LinkedIn) Kılavuzu */}
          {inAppInfo.isInApp && (
            <div
              role="region"
              aria-label="Uygulama içi tarayıcı giriş kılavuzu"
              className="p-4 rounded-2xl bg-bg border border-accent/35 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-sm text-ink">
                    {inAppInfo.appName ? `${inAppInfo.appName} İçi Tarayıcı Kılavuzu` : "Uygulama İçi Tarayıcı Kılavuzu"}
                  </h3>
                  <p className="text-xs text-ink-muted font-sans leading-relaxed">
                    Google güvenlik kuralları gereği uygulama içi tarayıcılarda Google girişi engellenir (
                    <span className="font-mono text-[11px] text-ink">403 disallowed_useragent</span>).
                    Giriş yapmak için sağ üstteki <strong className="text-ink">⋯</strong> menüsünden{" "}
                    <strong className="text-ink">&ldquo;{browserTargetLabel}&rdquo;</strong> seçeneğine dokunun veya üyeliksiz devam edin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => void handleCopyCurrentUrl()}
                  className="touch-target-44 min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-cream-surface hover:bg-line/35 border border-line text-ink font-sans text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4 text-good shrink-0" aria-hidden="true" />
                      <span>Bağlantı Kopyalandı — Safari&apos;ye Yapıştırın</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                      <span>Sayfa Bağlantısını Kopyala</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGuestOrderContinue}
                  className="touch-target-44 min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Üyeliksiz Doğrudan Sipariş Ver</span>
                </button>
              </div>
            </div>
          )}

          {!isConfigured && (
            <div
              role="status"
              className="p-3 rounded-xl bg-warn/15 border border-warn/35 text-ink text-xs font-sans flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-warn shrink-0 mt-0.5" aria-hidden="true" />
              <span>Giriş sistemi şu an yapılandırılmamış. Üyeliksiz sipariş verebilirsiniz.</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-bad/10 border border-bad/30 text-bad text-xs font-sans flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "start" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting || !isConfigured}
                className="touch-target-44 min-h-[48px] w-full py-3 px-4 rounded-xl bg-bg hover:bg-line/35 border border-line hover:border-accent/50 text-ink font-sans text-sm font-semibold flex items-center justify-center gap-2.5 transition-all shadow-2xs disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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

              {APPLE_LOGIN_ENABLED && (
                <button
                  type="button"
                  onClick={handleApple}
                  disabled={submitting || !isConfigured}
                  className="touch-target-44 min-h-[48px] w-full py-3 px-4 rounded-xl bg-ink hover:bg-ink/90 text-cream-surface font-sans text-sm font-semibold flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Apple ile Giriş Yap</span>
                </button>
              )}

              {EMAIL_LOGIN_ENABLED && (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-line" />
                    <span className="text-xs font-sans text-ink-muted uppercase">veya</span>
                    <div className="flex-1 h-px bg-line" />
                  </div>

                  <form onSubmit={handleSendCode} className="space-y-3">
                    <label htmlFor="auth-email" className="block text-xs font-sans font-semibold text-ink">
                      E-posta adresiniz
                    </label>
                    <div className="relative">
                      <Mail
                        className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2"
                        aria-hidden="true"
                      />
                      <input
                        id="auth-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@mail.com"
                        className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || !isConfigured}
                      className="touch-target-44 min-h-[48px] w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
                    >
                      <span>{submitting ? "Gönderiliyor..." : "Bana Giriş Kodu Gönder"}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </form>
                </>
              )}

              <p className="text-xs text-center text-ink-muted font-sans pt-1">
                Hesap açmadan da misafir olarak doğrudan sipariş verebilirsiniz.
              </p>
            </div>
          )}

          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <label htmlFor="auth-code" className="block text-xs font-sans font-semibold text-ink">
                6 haneli doğrulama kodu
              </label>
              <div className="relative">
                <KeyRound
                  className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={10}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 rounded-xl bg-bg border border-line text-base sm:text-sm tracking-[0.35em] font-mono text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="touch-target-44 min-h-[48px] w-full py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-sans text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                <span>{submitting ? "Doğrulanıyor..." : "Giriş Yap"}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="flex items-center justify-between text-xs font-sans pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("start");
                    setCode("");
                    setErrorMsg(null);
                  }}
                  className="touch-target-44 px-2 py-1.5 text-ink-muted hover:text-ink font-medium"
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
                  className="touch-target-44 px-2 py-1.5 text-accent font-semibold hover:underline disabled:opacity-50"
                >
                  Kodu tekrar gönder
                </button>
              </div>
              <p className="text-xs text-ink-muted font-sans">
                E-posta gelmediyse spam veya gereksiz klasörünü kontrol edin.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
