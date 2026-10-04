"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRight, BookOpen, Wheat, Building2, MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import Link from "next/link";
import { CONTACT, whatsappLink } from "@/lib/site";

interface AtelierMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AtelierMenuDrawer({ isOpen, onClose }: AtelierMenuDrawerProps) {
  const [activeModal, setActiveModal] = useState<"manifesto" | "corporate" | null>(null);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Left-side slide in) */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-full max-w-md bg-[#14100D] border-r border-[#261E17] text-foreground flex flex-col justify-between shadow-2xl animate-slideRight overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Atölye Menüsü"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-[#261E17] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F7EBD3] p-1 flex items-center justify-center shrink-0">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold tracking-wide text-foreground">
                Ekmek<span className="text-artisan-gold font-normal italic">Lab</span>
              </div>
              <div className="text-[10px] font-sans text-artisan-gold/80 tracking-wider uppercase">
                Zanaat & Fermantasyon Atölyesi
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-target-44 p-2 rounded-xl bg-surface-panel hover:bg-surface-elevated text-stone-400 hover:text-white border border-surface-border transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-5 sm:p-7 space-y-6 flex-1">
          <div className="text-[11px] font-sans text-stone-500 uppercase tracking-widest font-semibold">
            Atölye Dizini
          </div>

          <ul className="space-y-4 font-serif text-lg sm:text-xl">
            {/* 01. Tezgah */}
            <li>
              <a
                href="/#ekmekler"
                onClick={() => onClose()}
                className="group flex items-center justify-between py-2 text-stone-200 hover:text-artisan-gold transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-artisan-gold/70">01</span>
                  <span className="font-semibold">Tezgah & Taze Ekmekler</span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-artisan-gold group-hover:translate-x-1 transition-all" />
              </a>
              <p className="text-xs font-sans text-stone-500 pl-7 -mt-1">
                Günlük çıkan taş fırın ekmekleri, ön sipariş ve mandıra.
              </p>
            </li>

            {/* 02. Manifesto */}
            <li>
              <button
                type="button"
                onClick={() => setActiveModal("manifesto")}
                className="w-full text-left group flex items-center justify-between py-2 text-stone-200 hover:text-artisan-gold transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-artisan-gold/70">02</span>
                  <span className="font-semibold">Biz Kimiz & Manifesto</span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-artisan-gold group-hover:translate-x-1 transition-all" />
              </button>
              <p className="text-xs font-sans text-stone-500 pl-7 -mt-1">
                Ata tohumu buğday mirası ve endüstriyel mayaya karşı bağımsızlık.
              </p>
            </li>

            {/* 03. Bilim & Kütüphane */}
            <li>
              <Link
                href="/kutuphane"
                onClick={() => onClose()}
                className="group flex items-center justify-between py-2 text-stone-200 hover:text-artisan-gold transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-artisan-gold/70">03</span>
                  <span className="font-semibold">Bilim & Zanaat Kütüphanesi</span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-artisan-gold group-hover:translate-x-1 transition-all" />
              </Link>
              <p className="text-xs font-sans text-stone-500 pl-7 -mt-1">
                Laktik asit fermantasyonu, fitik asit ve sindirim biyolojisi araştırmaları.
              </p>
            </li>

            {/* 04. Kurumsal & Şef Tedariği */}
            <li>
              <button
                type="button"
                onClick={() => setActiveModal("corporate")}
                className="w-full text-left group flex items-center justify-between py-2 text-stone-200 hover:text-artisan-gold transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-artisan-gold/70">04</span>
                  <span className="font-semibold">Kurumsal & Şef Çözümleri</span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-artisan-gold group-hover:translate-x-1 transition-all" />
              </button>
              <p className="text-xs font-sans text-stone-500 pl-7 -mt-1">
                Restoranlar, oteller ve gurme işletmeler için özel reçete & düzenli tedarik.
              </p>
            </li>

            {/* 05. Atölye & İletişim */}
            <li>
              <a
                href="#iletisim"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  const footer = document.querySelector("footer");
                  footer?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group flex items-center justify-between py-2 text-stone-200 hover:text-artisan-gold transition-colors"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-artisan-gold/70">05</span>
                  <span className="font-semibold">Atölye & İletişim</span>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-artisan-gold group-hover:translate-x-1 transition-all" />
              </a>
              <p className="text-xs font-sans text-stone-500 pl-7 -mt-1">
                Beylikdüzü fırın konumu, ziyaret saatleri ve doğrudan iletişim.
              </p>
            </li>
          </ul>
        </nav>

        {/* Bottom Institutional Info */}
        <div className="p-5 sm:p-6 border-t border-[#261E17] bg-[#110D0B] text-xs font-sans space-y-3">
          <div className="flex items-start gap-2.5 text-stone-400">
            <MapPin className="w-4 h-4 text-artisan-gold shrink-0 mt-0.5" />
            <span>Beylikdüzü Taş Fırın Atölyesi · İstanbul</span>
          </div>
          <div className="flex items-center gap-2.5 text-stone-400">
            <Mail className="w-4 h-4 text-artisan-gold shrink-0" />
            <a href={`mailto:${CONTACT.email}`} className="hover:text-artisan-gold transition-colors">
              {CONTACT.email}
            </a>
          </div>
          <div className="pt-2 text-[10px] text-stone-600 font-mono">
            © {new Date().getFullYear()} EKMEKLAB GASTRO TEKNOLOJİ A.Ş.
          </div>
        </div>
      </aside>

      {/* Embedded Modal 1: Manifesto */}
      {activeModal === "manifesto" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#18130F] border border-[#33261C] rounded-3xl p-6 sm:p-8 text-foreground max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="touch-target-44 absolute top-4 right-4 p-2 rounded-xl bg-surface-panel hover:bg-surface-elevated text-stone-400 hover:text-white border border-surface-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-[11px] font-sans text-artisan-gold uppercase tracking-wider font-semibold">
                EkmekLab Manifestosu
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Gerçek ekmeğin geleceğini taş fırında kuruyoruz.
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-stone-300 font-sans leading-relaxed">
              <p>
                Modern endüstriyel fırıncılık, ekmeği 45 dakikada kabartan ticari enzimler ve yapay katkılarla hızlandırdı. Bu hız, insan bedeninin bin yıldır alışık olduğu biyolojik sindirim sürecini kırdı.
              </p>
              <p>
                EkmekLab’da biz zamanı geri çağırıyoruz. Atölyemizde sadece üç girdi vardır: <strong>Anadolu’nun kadim ata tohumu unları</strong> (Karakılçık, Siyez, Kavılca), <strong>canlı ekşi maya kültürü</strong> ve <strong>kaya tuzu</strong>.
              </p>
              <p>
                Her hamur en az 36 saat boyunca soğuk fermantasyonda demlenir. Bu sürede laktik asit bakterileri fitik asidi ve gluteni doğal olarak parçalar; ortaya midede ağırlık yapmayan, mineralleri serbest kalmış gerçek bir gıda çıkar.
              </p>
              <blockquote className="p-4 rounded-2xl bg-[#221A15] border-l-2 border-artisan-gold text-artisan-cream italic font-serif">
                “Biz ekmeği satmak için üretmiyoruz; sofraya giren en temel besinin hakkını vermek için pişiriyoruz.”
              </blockquote>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 rounded-xl bg-artisan-terracotta text-white font-sans text-xs font-semibold hover:bg-artisan-terracotta-dark transition-colors"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Modal 2: Kurumsal & Şef Çözümleri */}
      {activeModal === "corporate" && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#18130F] border border-[#33261C] rounded-3xl p-6 sm:p-8 text-foreground max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="touch-target-44 absolute top-4 right-4 p-2 rounded-xl bg-surface-panel hover:bg-surface-elevated text-stone-400 hover:text-white border border-surface-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <div className="text-[11px] font-sans text-artisan-gold uppercase tracking-wider font-semibold">
                Kurumsal & Şef Ortaklıkları
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                Menünüze Değer Katan Artisan Ekmek Çözümleri
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-stone-300 font-sans leading-relaxed">
              <p>
                Şehrin seçkin restoranları, üçüncü nesil kahvecileri, butik otelleri ve gurme burger noktaları için özel gramaj, özel hidrasyon ve reçeteli ekşi mayalı ekmekler üretiyoruz.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#1E1814] border border-[#2D221A]">
                  <div className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-artisan-gold" />
                    <span>Özel Reçete & Gramaj</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Konseptinize özel baget, brioche burger ekmeği, focaccia ve ekşi maya somunlar.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#1E1814] border border-[#2D221A]">
                  <div className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-artisan-gold" />
                    <span>Düzenli Fırın Sevkiyatı</span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Belirlenen gün ve saatte taze fırın çıkışlı doğrudan adresinize kurye sevkiyatı.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#221A15] border border-artisan-gold/20 space-y-2 text-xs">
                <div className="font-bold text-foreground font-serif">Tadım Numunesi veya İş Birliği Talebi İçin:</div>
                <div className="text-stone-300">
                  Kurumsal ekibimizle doğrudan iletişime geçebilir veya menünüz için numune talep edebilirsiniz:
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`mailto:${CONTACT.email}?subject=Kurumsal%20Tedarik%20Talebi`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-artisan-terracotta text-white font-semibold hover:bg-artisan-terracotta-dark transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{CONTACT.email}</span>
                  </a>
                  <a
                    href={whatsappLink("Merhaba, kurumsal ekmek tedariği hakkında bilgi almak istiyorum.")}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C221B] hover:bg-[#382B22] text-foreground border border-surface-border transition-colors font-semibold"
                  >
                    <span>WhatsApp Kurumsal Hat</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
