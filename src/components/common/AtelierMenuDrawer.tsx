"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, BookOpen, Microscope, Calculator, MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CONTACT, whatsappLink } from "@/lib/site";

interface AtelierMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AtelierMenuDrawer({ isOpen, onClose }: AtelierMenuDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<"manifesto" | "corporate" | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
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

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Left-side slide in) */}
      <aside
        className="fixed inset-y-0 left-0 z-[101] w-full max-w-md h-full bg-cream-surface border-r border-line text-ink flex flex-col justify-between shadow-2xl animate-slideRight overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Atölye Menüsü"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bg border border-line p-1 flex items-center justify-center shrink-0">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-wide text-ink">
                Ekmek<span className="text-accent font-normal italic">Lab</span>
              </div>
              <div className="text-[10px] font-mono text-ink-muted tracking-wider uppercase font-semibold">
                Zanaat & Fermantasyon Atölyesi
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-target-44 p-2 rounded-xl bg-bg hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-5 sm:p-7 space-y-6 flex-1">
          <div className="text-[11px] font-mono text-accent uppercase tracking-widest font-semibold">
            Atölye Dizini
          </div>

          <ul className="space-y-4 font-serif text-lg sm:text-xl">
            {/* 01. Tezgah */}
            <li>
              <a
                href="/#ekmekler"
                onClick={() => onClose()}
                className="group flex items-center justify-between py-1.5 text-ink hover:text-accent transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">01</span>
                  <span className="font-semibold">Tezgah & Taze Ekmekler</span>
                </div>
                <ArrowRight className="w-4 h-4 text-line group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </a>
              <p className="text-xs font-sans text-ink-muted pl-7 -mt-0.5">
                Günlük çıkan taş fırın ekmekleri, ön sipariş ve mandıra seçkisi.
              </p>
            </li>

            {/* 02. Manifesto */}
            <li>
              <button
                type="button"
                onClick={() => setActiveModal("manifesto")}
                className="w-full text-left group flex items-center justify-between py-1.5 text-ink hover:text-accent transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">02</span>
                  <span className="font-semibold">Biz Kimiz & Manifesto</span>
                </div>
                <ArrowRight className="w-4 h-4 text-line group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </button>
              <p className="text-xs font-sans text-ink-muted pl-7 -mt-0.5">
                Ata tohumu buğday mirası ve endüstriyel mayaya karşı bağımsızlık.
              </p>
            </li>

            {/* 03. Bilim & Kütüphane */}
            <li>
              <Link
                href="/kutuphane"
                onClick={() => onClose()}
                className="group flex items-center justify-between py-1.5 text-ink hover:text-accent transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">03</span>
                  <span className="font-semibold">Bilim & Zanaat Kütüphanesi</span>
                </div>
                <ArrowRight className="w-4 h-4 text-line group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Link>
              <p className="text-xs font-sans text-ink-muted pl-7 -mt-0.5">
                Laktik asit fermantasyonu, nişasta hasarı ve gluten biyolojisi araştırmaları.
              </p>
            </li>

            {/* 04. Laboratuvar */}
            <li>
              <Link
                href="/laboratuvar"
                onClick={() => onClose()}
                className="group flex items-center justify-between py-1.5 text-ink hover:text-accent transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">04</span>
                  <span className="font-semibold">Laboratuvar Simülasyonu</span>
                </div>
                <ArrowRight className="w-4 h-4 text-line group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Link>
              <p className="text-xs font-sans text-ink-muted pl-7 -mt-0.5">
                Hamurun mikroskobik dünyasında interaktif fermantasyon motoru.
              </p>
            </li>

            {/* 05. Fırıncı Araçları */}
            <li>
              <Link
                href="/arac"
                onClick={() => onClose()}
                className="group flex items-center justify-between py-1.5 text-ink hover:text-accent transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">05</span>
                  <span className="font-semibold">Profesyonel Fırıncı Araçları</span>
                </div>
                <ArrowRight className="w-4 h-4 text-line group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Link>
              <p className="text-xs font-sans text-ink-muted pl-7 -mt-0.5">
                Fırıncı yüzdesi, DDT hamur sıcaklığı ve ekşi maya besleme zamanlayıcı.
              </p>
            </li>

            {/* 06. Kurumsal Çözümler */}
            <li>
              <button
                type="button"
                onClick={() => setActiveModal("corporate")}
                className="w-full text-left group flex items-center justify-between py-1.5 text-ink hover:text-accent transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-accent">06</span>
                  <span className="font-semibold">Kurumsal & Şef Çözümleri</span>
                </div>
                <ArrowRight className="w-4 h-4 text-line group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </button>
              <p className="text-xs font-sans text-ink-muted pl-7 -mt-0.5">
                Restoranlar, kafeler ve şarküteriler için özel reçete ve düzenli tedarik.
              </p>
            </li>
          </ul>
        </nav>

        {/* Bottom Institutional Info */}
        <div className="p-5 sm:p-6 border-t border-line bg-bg text-xs font-sans space-y-3">
          <div className="flex items-start gap-2.5 text-ink-muted">
            <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>Beylikdüzü Taş Fırın Atölyesi · İstanbul</span>
          </div>
          <div className="flex items-center gap-2.5 text-ink-muted">
            <Mail className="w-4 h-4 text-accent shrink-0" />
            <a href={`mailto:${CONTACT.email}`} className="hover:text-ink transition-colors">
              {CONTACT.email}
            </a>
          </div>
          <div className="pt-2 text-[10px] text-ink-muted font-mono">
            © {new Date().getFullYear()} EkmekLab Atölye
          </div>
        </div>
      </aside>

      {/* Embedded Modal 1: Manifesto */}
      {activeModal === "manifesto" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-[11px] font-mono text-accent uppercase tracking-wider font-semibold">
                EkmekLab Manifestosu
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Gerçek ekmeğin geleceğini taş fırında kuruyoruz.
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
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

      {/* Embedded Modal 2: Corporate */}
      {activeModal === "corporate" && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl bg-cream-surface border border-line rounded-3xl p-6 sm:p-8 text-ink max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Kapat"
              className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-xl bg-bg/90 hover:bg-cream-surface text-ink-muted hover:text-ink border border-line transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-[11px] font-mono text-accent uppercase tracking-wider font-semibold">
                Kurumsal & Şef Tedariği
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                İşletmeniz İçin Zanaatkar Ekmekler
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-sans">
              Restoranınız, gurme şarküteriniz veya kafeniz için özel reçeteli artisan ekmekler,
              tost ve sandviç somunları üretiyoruz. Düzenli teslimat ve toptan tedarik imkanları için
              bizimle doğrudan iletişime geçebilirsiniz.
            </p>

            <div className="pt-2">
              <a
                href={whatsappLink("Merhaba, kurumsal ekmek tedariği hakkında bilgi almak istiyorum.")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors shadow-sm"
              >
                <span>WhatsApp ile İletişime Geç</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
