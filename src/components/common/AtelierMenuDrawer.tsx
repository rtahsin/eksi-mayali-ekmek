"use client";

import { formatMoney } from "@/lib/format/currency";
import { storefrontAction } from "@/lib/design/storefront";
import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import {
  X,
  ArrowRight,
  Calculator,
  MapPin,
  Mail,
  ExternalLink,
  ShoppingBag,
  Flame,
  Truck,
  Building2,
  MessageCircle,
  Sun,
  Moon,
  Laptop,
  User,
  LogOut,
  Package,
  Wheat,
} from "lucide-react";
import Link from "next/link";
import { CONTACT, SOCIAL_LIST, whatsappLink, type SOCIAL } from "@/lib/site";
import { DRAWER_ORDER_LINKS, DRAWER_DISCOVERY_LINKS, STOREFRONT_LINKS, isStorefrontNavVisible } from "@content/nav/links";
import { handleStorefrontAnchor } from "@/lib/design/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/lib/theme/useTheme";
import { useStoreSettings } from "@/hooks/useStoreSettings";

interface AtelierMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type SocialId = (typeof SOCIAL)[keyof typeof SOCIAL]["id"];

function DrawerSocialIcon({ id }: { id: SocialId }) {
  if (id === "instagram") {
    return (
      <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  if (id === "youtube") {
    return (
      <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3v6Z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

type ModalType = "manifesto" | "corporate" | "delivery" | "whereToFind" | null;

export function AtelierMenuDrawer({ isOpen, onClose }: AtelierMenuDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const { user, profile, isLoggedIn, openAuthModal, signOut } = useAuth();
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { settings } = useStoreSettings();
  const fee = settings.shippingFee;
  const freeFrom = settings.freeShippingThreshold;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Müdavim";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    handleStorefrontAnchor(event);
    onClose();
  };

  const handleOpenAuth = () => {
    onClose();
    openAuthModal();
  };

  return (
    <>
      <Modal open={isOpen} onClose={onClose} label="Atölye Menüsü"
        className="fixed inset-y-0 left-0 right-auto m-0 w-full max-w-md max-h-none h-dvh bg-cream-surface overflow-y-auto animate-slideRight">
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
            className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center justify-center" })}
            aria-label="Menüyü Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ana İçerik Alanı (Dört Bölüm) */}
        <div className="p-5 sm:p-6 space-y-7 flex-1">
          {/* 1. BÖLÜM: HESAP ALANI */}
          <section className="sf-panel bg-bg border border-line rounded-2xl p-4">
            {isLoggedIn ? (
              <div className="flex flex-col items-stretch gap-3">
                <Link
                  href="/hesabim"
                  onClick={handleLinkClick}
                  className="sf-brand-link flex items-center gap-3 min-w-0 group"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 text-ink font-bold flex items-center justify-center text-sm shrink-0">
                    {initials || "E"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-ink-muted group-hover:text-ink uppercase tracking-wider font-semibold transition-colors">
                      Müdavim Hesabım →
                    </div>
                    <div className="text-sm font-serif font-bold text-ink truncate">
                      Merhaba, {displayName}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/hesabim/siparisler"
                    onClick={handleLinkClick}
                    className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center gap-1.5" })}
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
                    className={storefrontAction({ variant: "danger", size: "default", className: "flex items-center justify-center" })}
                    aria-label="Çıkış Yap"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-stretch gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cream-surface border border-line text-ink flex items-center justify-center shrink-0">
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
                  className={storefrontAction({ variant: "primary", size: "default", className: "shrink-0 flex items-center gap-1.5" })}
                >
                  <span>Giriş yap</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>

          <Link href={STOREFRONT_LINKS.tracking.href} onClick={handleLinkClick}
            className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center gap-3" })}>
            <Package aria-hidden="true" className="w-4 h-4" /> {STOREFRONT_LINKS.tracking.label}
          </Link>

          {[{ title: "Sipariş & Fırın", links: DRAWER_ORDER_LINKS }, { title: "Zanaat & Keşif", links: DRAWER_DISCOVERY_LINKS }].map((group) => (
            <section key={group.title} className="space-y-3">
              <div className="text-xs font-mono text-ink-muted uppercase tracking-wider font-semibold">{group.title}</div>
              <ul className="space-y-2">
                {group.links.filter(isStorefrontNavVisible).map((link) => {
                  const Icon = link.key === "bread" ? Wheat : link.key === "accompaniments" ? Package : link.key === "delivery" ? Truck : link.key === "whereToFind" ? MapPin : link.key === "tools" ? Calculator : Flame;
                  const content = <><span className="flex items-start gap-3 min-w-0 text-left"><Icon aria-hidden="true" className="w-5 h-5 shrink-0 mt-0.5" /><span className="min-w-0"><span className="block font-semibold">{link.label}</span><span className="block text-sm font-normal text-ink-muted">{link.description}</span></span></span><ArrowRight aria-hidden="true" className="w-4 h-4 shrink-0" /></>;
                  const className = storefrontAction({ variant: "secondary", className: "w-full sf-action--between" });
                  return <li key={link.key}>{link.dialog
                    ? <button type="button" onClick={() => setActiveModal(link.dialog ?? null)} className={className}>{content}</button>
                    : <Link href={link.href} onClick={handleLinkClick} className={className}>{content}</Link>}
                  </li>;
                })}
              </ul>
            </section>
          ))}

          {/* 4. BÖLÜM: ALT (Kurumsal, WhatsApp, Tema) */}
          <section className="space-y-4 pt-2 border-t border-line">
            <div className="text-xs font-mono text-ink uppercase tracking-wider font-semibold">
              İletişim & Tercihler
            </div>

            <div className="space-y-2">
              {/* Kurumsal ve Şef Çözümleri */}
              <button
                type="button"
                onClick={() => setActiveModal("corporate")}
                className={storefrontAction({ variant: "secondary", size: "default", className: "w-full text-left flex items-center justify-between group sf-action--between" })}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center text-ink shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-serif text-base font-bold text-ink">Kurumsal ve Şef Çözümleri</div>
                    <div className="text-xs text-ink-muted">Restoranlar ve kafeler için özel ekmek tedariği</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
              </button>

              {/* WhatsApp’tan yaz */}
              <a
                href={whatsappLink("Merhaba, ekmekleriniz ve atölyeniz hakkında bilgi almak istiyorum.")}
                target="_blank"
                rel="noopener noreferrer"
                className={storefrontAction({ variant: "secondary", size: "default", className: "flex items-center justify-between group sf-action--between" })}
              >
                <div className="flex items-center gap-3">
                  <div className="sf-success w-8 h-8 rounded-lg bg-cream-surface border border-line flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-serif text-base font-bold text-ink">WhatsApp’tan yaz</div>
                    <div className="text-xs text-ink-muted">{CONTACT.phoneDisplay} · Fırıncımızla doğrudan iletişim</div>
                  </div>
                </div>
                <ExternalLink className="sf-success w-4 h-4 text-ink-muted group-hover:sf-success transition-all shrink-0" />
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
                  className={"sf-action sf-action--default " + (` flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    preference === "system"
                      ? "sf-action--primary "
                      : "sf-action--secondary "
                  }  `)}
                  aria-pressed={preference === "system"}
                >
                  <Laptop className="w-4 h-4" />
                  <span>Otomatik</span>
                </button>

                {/* Gündüz */}
                <button
                  type="button"
                  onClick={() => setPreference("light")}
                  className={"sf-action sf-action--default " + (` flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    preference === "light"
                      ? "sf-action--primary "
                      : "sf-action--secondary "
                  }  `)}
                  aria-pressed={preference === "light"}
                >
                  <Sun className="w-4 h-4" />
                  <span>Gündüz</span>
                </button>

                {/* Gece */}
                <button
                  type="button"
                  onClick={() => setPreference("dark")}
                  className={"sf-action sf-action--default " + (` flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    preference === "dark"
                      ? "sf-action--primary "
                      : "sf-action--secondary "
                  }  `)}
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
            <a href={`mailto:${CONTACT.email}`} className="sf-nav-link hover:text-ink transition-colors">
              {CONTACT.email}
            </a>
          </div>
          <div className="pt-1 flex flex-wrap gap-2">
            {SOCIAL_LIST.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={storefrontAction({ variant: "secondary", size: "default", className: "inline-flex items-center gap-1.5" })}
                title={`${item.label} ${item.handle}`}
                aria-label={`${item.label} ${item.handle}`}
              >
                <DrawerSocialIcon id={item.id} />
                <span className="font-medium">{item.handle}</span>
              </a>
            ))}
          </div>
          <div className="pt-1 text-xs text-ink-muted font-mono">
            © {new Date().getFullYear()} EkmekLab Atölye
          </div>
        </div>
      </Modal>

      {/* Modal 1: Manifesto (Biz Kimiz?) */}
      {activeModal === "manifesto" && (
        <Modal open onClose={() => setActiveModal(null)} label="Biz Kimiz" className="sf-dialog w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-cream-surface animate-fadeIn">
          <div className="sf-dialog-body relative w-full text-ink space-y-6">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className={storefrontAction({ variant: "secondary", size: "default", className: "absolute top-4 right-4 z-10 flex items-center justify-center" })}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-ink uppercase tracking-wider font-semibold">
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
        </Modal>
      )}

      {/* Modal 2: Kurumsal & Şef Tedariği */}
      {activeModal === "corporate" && (
        <Modal open onClose={() => setActiveModal(null)} label="Kurumsal ve Şef Çözümleri" className="sf-dialog w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-cream-surface animate-fadeIn">
          <div className="sf-panel relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink space-y-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className={storefrontAction({ variant: "secondary", size: "default", className: "absolute top-4 right-4 z-10 flex items-center justify-center" })}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-ink uppercase tracking-wider font-semibold">
                Kurumsal & Şef Tedariği
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                İşletmeniz İçin Zanaatkar Ekmekler
              </h3>
            </div>

            <p className="sf-copy text-sm text-ink-muted leading-relaxed font-sans">
              Restoranınız, gurme şarküteriniz veya kafeniz için özel reçeteli artisan ekmekler,
              tost ve sandviç somunları üretiyoruz. Düzenli teslimat ve toptan tedarik imkanları için
              bizimle doğrudan iletişime geçebilirsiniz.
            </p>

            <div className="pt-2">
              <a
                href={whatsappLink("Merhaba, kurumsal ekmek tedariği hakkında bilgi almak istiyorum.")}
                target="_blank"
                rel="noopener noreferrer"
                className={storefrontAction({ variant: "primary", size: "default", className: "w-full inline-flex items-center justify-center gap-2" })}
              >
                <span>WhatsApp ile İletişime Geç</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 3: Teslimat Bölgesi ve Ücret */}
      {activeModal === "delivery" && (
        <Modal open onClose={() => setActiveModal(null)} label="Teslimat Bölgesi ve Ücret" className="sf-dialog w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-cream-surface animate-fadeIn">
          <div className="sf-panel relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink space-y-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className={storefrontAction({ variant: "secondary", size: "default", className: "absolute top-4 right-4 z-10 flex items-center justify-center" })}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-ink uppercase tracking-wider font-semibold">
                Teslimat Bilgisi
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Beylikdüzü İçi Taze Teslimat
              </h3>
            </div>

            <div className="space-y-4 text-sm text-ink-muted leading-relaxed font-sans">
              <div className="sf-panel p-4 rounded-2xl bg-bg border border-line space-y-2">
                <div className="font-serif font-bold text-ink text-base">
                  {fee === 0 ? "Ücretsiz Kapıya Teslimat" : "Ücretsiz Teslimat Eşiği"}
                </div>
                {fee === 0 ? (
                  <p>
                    Beylikdüzü geneline tüm siparişlerde kapıya teslimat ücretsizdir; minimum sepet alt sınırı yoktur.
                  </p>
                ) : (
                  <p>
                    <strong className="text-ink">{formatMoney(freeFrom)} ve üzeri</strong> siparişlerde Beylikdüzü geneline teslimat ücretsizdir. Altındaki siparişlerde {formatMoney(fee)} teslimat ücreti uygulanır.
                  </p>
                )}
              </div>

              <div className="sf-panel p-4 rounded-2xl bg-bg border border-line space-y-2">
                <div className="font-serif font-bold text-ink text-base">Teslimat &amp; Ödeme</div>
                <p>
                  Siparişlerin seçtiğin teslimat gününde fırından yeni çıkmış tazelikte{settings.deliveryWindow ? <> (<strong className="text-ink">{settings.deliveryWindow}</strong>)</> : null} doğrudan atölyemizden kapına ulaştırılır. Ödeme yalnızca teslimatta <strong className="text-ink">kapıda nakit veya kredi/banka kartı</strong> ile yapılır.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono text-xs text-ink font-semibold uppercase">Hizmet Verilen Mahalleler:</div>
                <p className="sf-copy text-xs text-ink-muted">
                  Adnan Kahveci, Barış, Büyükşehir, Cumhuriyet, Dereağzı, Gürpınar, Kavaklı, Marmara, Sahil, Yakuplu.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 4: Nerede Bulunur? */}
      {activeModal === "whereToFind" && (
        <Modal open onClose={() => setActiveModal(null)} label="Atölye ve Satış Noktaları" className="sf-dialog w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-cream-surface animate-fadeIn">
          <div className="sf-panel relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink space-y-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className={storefrontAction({ variant: "secondary", size: "default", className: "absolute top-4 right-4 z-10 flex items-center justify-center" })}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-xs font-mono text-ink uppercase tracking-wider font-semibold">
                Atölye & Satış Noktaları
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Ekmeklerimize Nasıl Ulaşırsınız?
              </h3>
            </div>

            <div className="space-y-4 text-sm text-ink-muted leading-relaxed font-sans">
              <div className="sf-panel p-4 rounded-2xl bg-bg border border-line space-y-1.5">
                <div className="font-serif font-bold text-ink text-base">1. Doğrudan Kapınıza Teslim</div>
                <p>
                  Web sitemiz üzerinden seçtiğiniz ekmek ve eşlikçileri sepetinize ekleyerek sipariş verebilir; ödemenizi teslimatta kapıda nakit veya kredi/banka kartı ile yapabilirsiniz.
                </p>
              </div>

              <div className="sf-panel p-4 rounded-2xl bg-bg border border-line space-y-1.5">
                <div className="font-serif font-bold text-ink text-base">2. Beylikdüzü Bahçe Atölyemiz</div>
                <p>
                  22 m² taş fırın bahçe atölyemiz üretim ve fermantasyon merkezimizdir. Önceden kararlaştırarak atölyemizden teslim alabilirsiniz.
                </p>
              </div>

              <div className="sf-panel p-4 rounded-2xl bg-bg border border-line space-y-1.5">
                <div className="font-serif font-bold text-ink text-base">3. Anlaşmalı Gurme Şarküteriler</div>
                <p>
                  Beylikdüzü'nde seçkin 2 gurme şarküteri tezgahında taze günlük ekmeklerimiz sınırlı sayıda yer almaktadır.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
