"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User, Phone, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register" | "forgot">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, isConfigured } =
    useCustomerAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (tab === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error.message || "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
        } else {
          setSuccessMsg("Giriş başarılı! Hoş geldiniz.");
          setTimeout(() => {
            onClose();
          }, 800);
        }
      } else if (tab === "register") {
        if (!fullName.trim() || !phone.trim()) {
          setErrorMsg("Lütfen adınızı ve telefon numaranızı girin.");
          setSubmitting(false);
          return;
        }
        const { error } = await signUpWithEmail(email, password, fullName, phone);
        if (error) {
          setErrorMsg(error.message || "Kayıt işlemi tamamlanamadı.");
        } else {
          setSuccessMsg("Kayıt başarılı! Hesabınız oluşturuldu.");
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      } else if (tab === "forgot") {
        const { error } = await resetPassword(email);
        if (error) {
          setErrorMsg(error.message || "Şifre sıfırlama e-postası gönderilemedi.");
        } else {
          setSuccessMsg("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-surface-panel border border-surface-border rounded-3xl shadow-2xl overflow-hidden z-10 animate-scaleUp">
        {/* Header Ribbon */}
        <div className="relative px-6 pt-6 pb-4 border-b border-surface-border bg-gradient-to-b from-surface-elevated/80 to-surface-panel flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-artisan-gold/10 border border-artisan-gold/30 text-[11px] font-sans font-medium text-artisan-gold">
              <Sparkles className="w-3 h-3" />
              <span>EkmekLab Müdavim Kulübü</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-foreground">
              {tab === "login" && "Fırınımıza Hoş Geldiniz"}
              {tab === "register" && "Müdavim Ailemize Katılın"}
              {tab === "forgot" && "Şifre Sıfırlama"}
            </h3>
            <p className="text-xs text-foreground/70 font-sans">
              {tab === "login" && "Kayıtlı adreslerinizle tek tıkla sipariş verin."}
              {tab === "register" && "Siparişlerinizi takip edin, taze fırın duyurularını kaçırmayın."}
              {tab === "forgot" && "E-posta adresinize sıfırlama bağlantısı göndereceğiz."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-foreground/50 hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {tab !== "forgot" && (
          <div className="px-6 pt-4 flex border-b border-surface-border bg-surface/50">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-3 text-xs font-sans font-semibold border-b-2 transition-all ${
                tab === "login"
                  ? "border-artisan-gold text-artisan-gold"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("register");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-3 text-xs font-sans font-semibold border-b-2 transition-all ${
                tab === "register"
                  ? "border-artisan-gold text-artisan-gold"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              Yeni Üyelik Oluştur
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {!isConfigured && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-sans space-y-1">
              <strong>Supabase Kurulumu Bekleniyor:</strong>
              <p>
                Supabase URL ve Anon Key girildiğinde giriş ve kayıt sistemi tam fonksiyonel olarak
                etkinleşecektir.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-sans">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-sans flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}



          <form onSubmit={handleSubmit} className="space-y-3">
            {tab === "register" && (
              <>
                <div>
                  <label className="block text-[11px] font-sans text-foreground/70 mb-1">
                    Adınız ve Soyadınız
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Örn: Ahmet Yılmaz"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-foreground focus:border-artisan-gold outline-none font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-sans text-foreground/70 mb-1">
                    Telefon Numaranız
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-foreground focus:border-artisan-gold outline-none font-sans"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-sans text-foreground/70 mb-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@ekmeklab.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-foreground focus:border-artisan-gold outline-none font-sans"
                />
              </div>
            </div>

            {tab !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-sans text-foreground/70">Şifre</label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("forgot");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] font-sans text-artisan-gold hover:underline"
                    >
                      Şifremi unuttum?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-foreground focus:border-artisan-gold outline-none font-sans"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground font-sans text-xs font-bold transition-all shadow-md shadow-artisan-terracotta/20 flex items-center justify-center gap-2"
            >
              <span>
                {submitting
                  ? "İşlem Yapılıyor..."
                  : tab === "login"
                  ? "Giriş Yap"
                  : tab === "register"
                  ? "Üyeliğimi Tamamla"
                  : "Sıfırlama Bağlantısı Gönder"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {tab === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full text-center text-xs font-sans text-foreground/60 hover:text-foreground pt-1"
              >
                Giriş ekranına dön
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
