"use client";

import React from "react";
import { Phone, Mail, MapPin, MessageSquare, BookOpen } from "lucide-react";
import { CONTACT } from "@/lib/site";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
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
              <li>
                <a href="/kutuphane" className="hover:text-ink transition-colors flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-accent" />
                  <span>Kütüphane</span>
                </a>
              </li>
              <li>
                <a href="/laboratuvar" className="hover:text-ink transition-colors">
                  Laboratuvar Simülasyonu
                </a>
              </li>
              <li>
                <a href="/arac" className="hover:text-ink transition-colors">
                  Profesyonel Fırıncı Araçları
                </a>
              </li>
              <li>
                <a href="/kavram" className="hover:text-ink transition-colors">
                  Kavramlar Sözlüğü
                </a>
              </li>
              <li>
                <a href="/arama" className="hover:text-ink transition-colors">
                  Arama
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
            <div className="pt-2">
              <a
                href="https://instagram.com/ekmeklabtr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-bg border border-line text-xs text-ink hover:text-accent hover:border-accent/40 transition-colors font-sans shadow-xs"
                title="Instagram @ekmeklabtr"
              >
                <InstagramIcon className="w-4 h-4 text-accent shrink-0" />
                <span className="font-medium">@ekmeklabtr</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Legal Documents */}
        <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-ink-muted/80">
          <div>© {new Date().getFullYear()} EkmekLab. Tüm hakları saklıdır.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/kvkk" className="hover:text-ink transition-colors">
              KVKK Aydınlatma Metni
            </a>
            <span className="text-line">·</span>
            <a href="/gizlilik" className="hover:text-ink transition-colors">
              Gizlilik & Çerez Politikası
            </a>
            <span className="text-line">·</span>
            <a href="/mesafeli-satis" className="hover:text-ink transition-colors">
              Mesafeli Satış Sözleşmesi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
