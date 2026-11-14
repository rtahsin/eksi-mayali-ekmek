"use client";

import React from "react";
import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";
import { CONTACT, SOCIAL_LIST, type SOCIAL } from "@/lib/site";
import { FEATURES } from "@/lib/features";

type SocialId = (typeof SOCIAL)[keyof typeof SOCIAL]["id"];

function SocialIcon({ id, className = "w-4 h-4" }: { id: SocialId; className?: string }) {
  if (id === "instagram") {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  if (id === "youtube") {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3v6Z" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-cream-surface py-12 text-ink-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo/logo_mark.png"
                alt="EkmekLab"
                className="w-10 h-10 object-contain rounded-full bg-bg p-0.5 border border-line"
              />
              <div className="font-serif text-xl font-bold text-ink">
                Ekmek<span className="text-accent italic font-normal">Lab</span>
              </div>
            </div>
            <p className="text-xs text-ink-muted font-sans leading-relaxed">
              Beylikdüzü'nde ata tohumu unlar ve canlı ekşi mayayla, uzun fermantasyonla
              olgunlaştırılan katkısız artisan ekmekler ve doğal gurme lezzetler.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2">
            <div className="font-serif text-xs font-bold text-accent uppercase tracking-wider">
              Keşfet
            </div>
            <ul className="space-y-1.5 text-xs text-ink-muted font-sans">
              <li>
                <a href="/#ekmekler" className="hover:text-ink transition-colors">
                  Taze Ekmeklerimiz
                </a>
              </li>
              <li>
                <a href="/#nasil-uretiyoruz" className="hover:text-ink transition-colors">
                  Nasıl Üretiyoruz?
                </a>
              </li>
              {FEATURES.bilimOdasi && (
                <>
                  <li>
                    <a href="/bilim" className="hover:text-ink transition-colors">
                      Ekmeğin Bilimi
                    </a>
                  </li>
                  <li>
                    <a href="/bilim/efsaneler" className="hover:text-ink transition-colors">
                      Efsane Dosyası
                    </a>
                  </li>
                </>
              )}
              <li>
                <a href="/arac" className="hover:text-ink transition-colors">
                  Fırıncı Araçları
                </a>
              </li>
              <li>
                <a href="/siparislerim" className="hover:text-ink transition-colors">
                  Sipariş Sorgula
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div className="space-y-2">
            <div className="font-serif text-xs font-bold text-accent uppercase tracking-wider">
              İletişim & Dağıtım
            </div>
            <ul className="space-y-2 text-xs text-ink-muted font-sans">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <span>Beylikdüzü, İstanbul</span>
              </li>
              <li className="flex items-center gap-2 font-sans">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <a href={`tel:+${CONTACT.phoneE164}`} className="hover:text-ink">
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent shrink-0" />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-ink">
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Artisan Guarantee & Social */}
          <div className="space-y-2">
            <div className="font-serif text-xs font-bold text-accent uppercase tracking-wider">
              Artisan Güvence
            </div>
            <p className="text-xs text-ink-muted leading-relaxed font-sans">
              Hiçbir endüstriyel maya, koruyucu, renklendirici veya kimyasal katkı maddesi içermez.
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              {SOCIAL_LIST.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 min-h-[44px] px-3 py-2 rounded-xl bg-bg border border-line text-xs text-ink hover:text-accent hover:border-accent/40 transition-colors font-sans shadow-xs"
                  title={`${item.label} ${item.handle}`}
                  aria-label={`${item.label} ${item.handle}`}
                >
                  <SocialIcon id={item.id} className="w-4 h-4 text-accent shrink-0" />
                  <span className="font-medium">{item.handle}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Legal Documents */}
        <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-ink-muted">
          <div>© {new Date().getFullYear()} EkmekLab. Tüm hakları saklıdır.</div>
          <nav aria-label="Hukuki metinler" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link
              href="/mesafeli-satis"
              className="py-1.5 text-ink hover:text-accent underline underline-offset-4 decoration-line hover:decoration-accent transition-colors font-medium"
            >
              Ön Bilgilendirme & Mesafeli Satış
            </Link>
            <span aria-hidden="true" className="text-line">
              ·
            </span>
            <Link
              href="/kvkk"
              className="py-1.5 text-ink hover:text-accent underline underline-offset-4 decoration-line hover:decoration-accent transition-colors font-medium"
            >
              KVKK Aydınlatma
            </Link>
            <span aria-hidden="true" className="text-line">
              ·
            </span>
            <Link
              href="/gizlilik"
              className="py-1.5 text-ink hover:text-accent underline underline-offset-4 decoration-line hover:decoration-accent transition-colors font-medium"
            >
              Gizlilik & Çerez
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
