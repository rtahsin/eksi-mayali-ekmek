"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ArrowRight,
  BookOpen,
  Microscope,
  Calculator,
  MapPin,
  Mail,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  Truck,
  Building2,
  MessageCircle,
  Sun,
  Moon,
  Laptop,
  User,
  LogOut,
  Package,
} from "lucide-react";
import Link from "next/link";
import { CONTACT, whatsappLink } from "@/lib/site";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/lib/theme/useTheme";

interface AtelierMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalType = "manifesto" | "corporate" | "delivery" | "whereToFind" | null;

export function AtelierMenuDrawer({ isOpen, onClose }: AtelierMenuDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { user, profile, isLoggedIn, openAuthModal, signOut } = useAuth();
  const { preference, resolvedTheme, setPreference } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape tuşuyla kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeModal) setActiveModal(null);
        else onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, activeModal, onClose]);

  if (!isOpen || !mounted) return null;

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Müdavim";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLinkClick = () => {
    onClose();
  };

  const handleOpenAuth = () => {
    onClose();
    openAuthModal();
  };

  return createPortal(
    <>
      {/* Karartma Arka Planı */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menü Çekmecesi (Soldan kayan panel) */}
      <aside
        className="fixed inset-y-0 left-0 z-[101] w-full max-w-md h-full bg-cream-surface border-r border-line text-ink flex flex-col justify-between shadow-2xl animate-slideRight overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Atölye Menüsü"
      >
        {/* Üst Başlık Barı */}
        <div className="p-5 sm:p-6 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bg border border-line p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-wide text-ink">
                Ekmek<span className="text-accent font-normal italic">Lab</span>
              </div>
              <div className="text-xs font-mono text-ink-muted tracking-wider uppercase font-semibold">
                Zanaat & Fermantasyon Atölyesi
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-target-44 min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-bg hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors flex items-center justify-center"
            aria-label="Menüyü Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ana İçerik Alanı (Dört Bölüm) */}
        <div className="p-5 sm:p-6 space-y-7 flex-1">
          {/* 1. BÖLÜM: HESAP ALANI */}
          <section className="bg-bg border border-line rounded-2xl p-4">
            {isLoggedIn ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold flex items-center justify-center text-sm shrink-0">
                    {initials || "E"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-ink-muted uppercase tracking-wider font-semibold">
                      Hesabım
                    </div>
                    <div className="text-sm font-serif font-bold text-ink truncate">
                      Merhaba, {displayName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/hesabim/siparisler"
                    onClick={handleLinkClick}
                    className="min-h-[48px] px-3.5 py-2 rounded-xl bg-cream-surface hover:bg-bg border border-line text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5 text-accent" />
                    <span>Siparişlerim</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      onClose();
                    }}
                    className="min-h-[48px] min-w-[44px] p-2.5 rounded-xl bg-cream-surface hover:bg-bad/10 text-ink-muted hover:text-bad border border-line transition-colors flex items-center justify-center"
                    aria-label="Çıkış Yap"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cream-surface border border-line text-accent flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-serif font-bold text-ink">
                      Müşteri Hesabı
                    </div>
                    <div className="text-xs text-ink-muted">
                      Siparişlerini takip et ve kolayca tekrarla
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAuth}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
                >
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>

          {/* 2. BÖLÜM: SİPARİŞ */}
          <section className="space-y-3">
            <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
              Sipariş & Fırın
            </div>

            <ul className="space-y-1.5">
              {/* Ekmekler */}
              <li>
                <a
                  href="/#ekmekler"
                  onClick={handleLinkClick}
                  className="min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Ekmekler</div>
                      <div className="text-xs text-ink-muted">Günlük çıkan taş fırın artisan somunlar</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </a>
              </li>

              {/* Eşlikçiler */}
              <li>
                <a
                  href="/#gurme-lezzetler"
                  onClick={handleLinkClick}
                  className="min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Eşlikçiler</div>
                      <div className="text-xs text-ink-muted">Doğal tereyağı, mandıra ve gurme şarküteri</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </a>
              </li>

              {/* Teslimat Bölgesi ve Ücret */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("delivery")}
                  className="w-full text-left min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Teslimat Bölgesi ve Ücret</div>
                      <div className="text-xs text-ink-muted">Beylikdüzü geneli saatler ve ücretsiz eşik</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              </li>

              {/* Nerede Bulunur? */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("whereToFind")}
                  className="w-full text-left min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Nerede Bulunur?</div>
                      <div className="text-xs text-ink-muted">Bahçe atölyemiz ve anlaşmalı şarküteriler</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              </li>
            </ul>
          </section>

          {/* 3. BÖLÜM: KEŞFET */}
          <section className="space-y-3">
            <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
              Zanaat & Keşif
            </div>

            <ul className="space-y-1.5">
              {/* Biz Kimiz? */}
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("manifesto")}
                  className="w-full text-left min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Biz Kimiz?</div>
                      <div className="text-xs text-ink-muted">Ata tohumu mirasımız ve zanaat manifestosu</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              </li>

              {/* Kütüphane */}
              <li>
                <Link
                  href="/kutuphane"
                  onClick={handleLinkClick}
                  className="min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Kütüphane</div>
                      <div className="text-xs text-ink-muted">Fermantasyon bilimi, un biyolojisi ve araştırmalar</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </li>

              {/* Laboratuvar */}
              <li>
                <Link
                  href="/laboratuvar"
                  onClick={handleLinkClick}
                  className="min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <Microscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Laboratuvar</div>
                      <div className="text-xs text-ink-muted">Mikroskobik hamur simülasyonu ve ekşi maya motoru</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </li>

              {/* Fırıncı Araçları */}
              <li>
                <Link
                  href="/arac"
                  onClick={handleLinkClick}
                  className="min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-serif text-base font-bold text-ink">Fırıncı Araçları</div>
                      <div className="text-xs text-ink-muted">Fırıncı yüzdesi, DDT ve maya besleme planlayıcı</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              </li>
            </ul>
          </section>

          {/* 4. BÖLÜM: ALT (Kurumsal, WhatsApp, Tema) */}
          <section className="space-y-4 pt-2 border-t border-line">
            <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
              İletişim & Tercihler
            </div>

            <div className="space-y-2">
              {/* Kurumsal ve Şef Çözümleri */}
              <button
                type="button"
                onClick={() => setActiveModal("corporate")}
                className="w-full text-left min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-accent shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-serif text-base font-bold text-ink">Kurumsal ve Şef Çözümleri</div>
                    <div className="text-xs text-ink-muted">Restoranlar ve kafeler için özel ekmek tedariği</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </button>

              {/* WhatsApp'tan Yaz */}
              <a
                href={whatsappLink("Merhaba, ekmekleriniz ve atölyeniz hakkında bilgi almak istiyorum.")}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] py-3 px-3.5 rounded-xl bg-bg/50 hover:bg-bg border border-transparent hover:border-line flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-good shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-serif text-base font-bold text-ink">WhatsApp'tan Yaz</div>
                    <div className="text-xs text-ink-muted">{CONTACT.phoneDisplay} · Fırıncımızla doğrudan iletişim</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-ink-muted group-hover:text-good transition-all shrink-0" />
              </a>
            </div>

            {/* TEMA DÜĞMESİ: Otomatik / Gündüz / Gece */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-ink-muted uppercase tracking-wider font-semibold">
                  Görünüm Teması
                </span>
                <span className="text-xs text-ink-muted font-sans">
                  {resolvedTheme === "dark" ? "Gece Modu" : "Krem Modu"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-bg border border-line rounded-xl">
                {/* Otomatik */}
                <button
                  type="button"
                  onClick={() => setPreference("system")}
                  className={`min-h-[48px] py-2 px-2.5 rounded-lg text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                    preference === "system"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink hover:bg-cream-surface"
                  }`}
                  aria-pressed={preference === "system"}
                >
                  <Laptop className="w-4 h-4" />
                  <span>Otomatik</span>
                </button>

                {/* Gündüz */}
                <button
                  type="button"
                  onClick={() => setPreference("light")}
                  className={`min-h-[48px] py-2 px-2.5 rounded-lg text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                    preference === "light"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink hover:bg-cream-surface"
                  }`}
                  aria-pressed={preference === "light"}
                >
                  <Sun className="w-4 h-4" />
                  <span>Gündüz</span>
                </button>

                {/* Gece */}
                <button
                  type="button"
                  onClick={() => setPreference("dark")}
                  className={`min-h-[48px] py-2 px-2.5 rounded-lg text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                    preference === "dark"
                      ? "bg-accent text-white shadow-xs"
                      : "text-ink-muted hover:text-ink hover:bg-cream-surface"
                  }`}
                  aria-pressed={preference === "dark"}
                >
                  <Moon className="w-4 h-4" />
                  <span>Gece</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Alt Kurumsal Bilgiler */}
        <div className="p-5 sm:p-6 border-t border-line bg-bg text-xs font-sans space-y-2.5 shrink-0">
          <div className="flex items-start gap-2.5 text-ink-muted">
            <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>Beylikdüzü Taş Fırın Bahçe Atölyesi · İstanbul</span>
          </div>
          <div className="flex items-center gap-2.5 text-ink-muted">
            <Mail className="w-4 h-4 text-accent shrink-0" />
            <a href={`mailto:${CONTACT.email}`} className="hover:text-ink transition-colors">
              {CONTACT.email}
            </a>
          </div>
          <div className="pt-1 text-xs text-ink-muted font-mono">
            © {new Date().getFullYear()} EkmekLab Atölye
          </div>
        </div>
      </aside>

      {/* Modal 1: Manifesto (Biz Kimiz?) */}
      {activeModal === "manifesto" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
                EkmekLab Manifestosu
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Gerçek ekmeğin geleceğini taş fırında kuruyoruz.
              </h3>
            </div>

            <div className="space-y-4 text-sm text-ink-muted leading-relaxed font-sans">
              <p>
                Biz, ekmeğin birkaç saatte kabartılıp raflara dizildiği endüstriyel hıza inanmıyoruz.
                Unun doğasını, fermantasyonun sabrını ve taş tabanın sıcaklığını merkezimize alıyoruz.
              </p>
              <p>
                Karakılçık, siyez ve kavılca gibi ata tohumu buğdaylarımızı taş değirmende öğütüyor;
                içine hiçbir yapay enzim, koruyucu veya hazır maya katmadan yalnızca kendi ürettiğimiz
                canlı ekşi maya kültürüyle buluşturuyoruz.
              </p>
              <p>
                Her hamurumuz 24 ila 36 saatlik soğuk fermantasyon sürecinden geçer.
                Acele etmeden pişen ekmek, derin bir aromaya ve özgün dokusuna kavuşur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Kurumsal & Şef Tedariği */}
      {activeModal === "corporate" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
                Kurumsal & Şef Tedariği
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                İşletmeniz İçin Zanaatkar Ekmekler
              </h3>
            </div>

            <p className="text-sm text-ink-muted leading-relaxed font-sans">
              Restoranınız, gurme şarküteriniz veya kafeniz için özel reçeteli artisan ekmekler,
              tost ve sandviç somunları üretiyoruz. Düzenli teslimat ve toptan tedarik imkanları için
              bizimle doğrudan iletişime geçebilirsiniz.
            </p>

            <div className="pt-2">
              <a
                href={whatsappLink("Merhaba, kurumsal ekmek tedariği hakkında bilgi almak istiyorum.")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors shadow-sm"
              >
                <span>WhatsApp ile İletişime Geç</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Teslimat Bölgesi ve Ücret */}
      {activeModal === "delivery" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
                Teslimat Bilgisi
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Beylikdüzü İçi Taze Teslimat
              </h3>
            </div>

            <div className="space-y-4 text-sm text-ink-muted leading-relaxed font-sans">
              <div className="p-4 rounded-2xl bg-bg border border-line space-y-2">
                <div className="font-serif font-bold text-ink text-base">Ücretsiz Teslimat Eşiği</div>
                <p>
                  <strong className="text-ink">1000 ₺ ve üzeri</strong> siparişlerde Beylikdüzü geneline teslimat tamamen ücretsizdir. Altındaki siparişlerde standart 150 ₺ teslimat ücreti uygulanır.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-bg border border-line space-y-2">
                <div className="font-serif font-bold text-ink text-base">Teslimat Saatleri</div>
                <p>
                  Siparişleriniz fırından yeni çıkmış tazelikte her gün <strong className="text-ink">14:00 – 18:00</strong> saatleri arasında doğrudan atölyemizden kapınıza ulaştırılır.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono text-xs text-accent font-semibold uppercase">Hizmet Verilen Mahalleler:</div>
                <p className="text-xs text-ink-muted">
                  Adnan Kahveci, Barış, Büyükşehir, Cumhuriyet, Dereağzı, Gürpınar, Kavaklı, Marmara, Sahil, Yakuplu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Nerede Bulunur? */}
      {activeModal === "whereToFind" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-accent uppercase tracking-wider font-semibold">
                Atölye & Satış Noktaları
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Ekmeklerimize Nasıl Ulaşırsınız?
              </h3>
            </div>

            <div className="space-y-4 text-sm text-ink-muted leading-relaxed font-sans">
              <div className="p-4 rounded-2xl bg-bg border border-line space-y-1.5">
                <div className="font-serif font-bold text-ink text-base">1. Doğrudan Kapınıza Teslim</div>
                <p>
                  Web sitemiz üzerinden seçtiğiniz ekmek ve eşlikçileri sepetinize ekleyerek kapıda nakit, POS veya WhatsApp onayıyla sipariş verebilirsiniz.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-bg border border-line space-y-1.5">
                <div className="font-serif font-bold text-ink text-base">2. Beylikdüzü Bahçe Atölyemiz</div>
                <p>
                  22 m² taş fırın bahçe atölyemiz üretim ve fermantasyon merkezimizdir. Önceden kararlaştırarak atölyemizden teslim alabilirsiniz.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-bg border border-line space-y-1.5">
                <div className="font-serif font-bold text-ink text-base">3. Anlaşmalı Gurme Şarküteriler</div>
                <p>
                  Beylikdüzü'nde seçkin 2 gurme şarküteri tezgahında taze günlük ekmeklerimiz sınırlı sayıda yer almaktadır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
