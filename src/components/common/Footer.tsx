"use client";

import React from "react";
import { Phone, Mail, MapPin, MessageSquare, BookOpen } from "lucide-react";

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
    <footer className="border-t border-surface-border bg-surface-panel/80 py-12 text-artisan-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/logo/logo_mark.png"
                alt="EkmekLab"
                className="w-10 h-10 object-contain rounded-full bg-artisan-cream/10 p-0.5 border border-artisan-gold/30"
              />
              <div className="font-serif text-xl font-bold text-artisan-cream">
                Ekmek<span className="text-artisan-gold italic font-normal">Lab</span>
              </div>
            </div>
            <p className="text-xs text-artisan-cream/70 font-sans leading-relaxed">
              Beylikdüzü'nde ata tohumu unlar ve 8 yıllık canlı ekşi mayayla 36 saatte
              olgunlaştırılan katkısız artisan ekmekler ve doğal gurme lezzetler.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2">
            <div className="font-serif text-xs font-bold text-artisan-gold uppercase tracking-wider">
              Menü
            </div>
            <ul className="space-y-1.5 text-xs text-artisan-cream/75 font-sans">
              <li>
                <a href="/#ekmekler" className="hover:text-artisan-gold transition-colors">
                  Taze Ekmeklerimiz
                </a>
              </li>
              <li>
                <a href="/#gurme-lezzetler" className="hover:text-artisan-gold transition-colors">
                  Gurme Lezzetler
                </a>
              </li>
              <li>
                <a href="/kutuphane" className="hover:text-artisan-gold transition-colors flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-artisan-gold" />
                  <span>Bilim & Zanaat Bülteni</span>
                </a>
              </li>
              <li>
                <a href="/#nasil-uretiyoruz" className="hover:text-artisan-gold transition-colors">
                  Nasıl Üretiyoruz?
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div className="space-y-2">
            <div className="font-serif text-xs font-bold text-artisan-gold uppercase tracking-wider">
              İletişim & Dağıtım
            </div>
            <ul className="space-y-2 text-xs text-artisan-cream/75 font-sans">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-artisan-gold shrink-0" />
                <span>Beylikdüzü, İstanbul</span>
              </li>
              <li className="flex items-center gap-2 font-sans">
                <Phone className="w-4 h-4 text-artisan-gold shrink-0" />
                <a href="tel:+905010126653" className="hover:text-artisan-gold">
                  0501 012 66 53
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href="https://wa.me/905010126653?text=Merhaba%2C%20EkmekLab%20ta%C5%9F%20f%C4%B1r%C4%B1n%C4%B1ndan%20taze%20ek%C5%9Fi%20mayal%C4%B1%20ekmek%20ve%20gurme%20lezzetler%20sipari%C5%9Fi%20vermek%20istiyorum."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400"
                >
                  WhatsApp Sipariş Hattı
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-artisan-gold shrink-0" />
                <a href="mailto:ekmeklab@gmail.com" className="hover:text-artisan-gold">
                  ekmeklab@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Artisan Guarantee & Social */}
          <div className="space-y-2">
            <div className="font-serif text-xs font-bold text-artisan-gold uppercase tracking-wider">
              Artisan Güvence
            </div>
            <p className="text-xs text-artisan-cream/70 leading-relaxed font-sans">
              Hiçbir endüstriyel maya, koruyucu, renklendirici veya kimyasal katkı maddesi içermez.
            </p>
            <div className="pt-2">
              <a
                href="https://instagram.com/ekmeklabtr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-surface-border text-xs text-artisan-cream/80 hover:text-artisan-gold hover:border-artisan-gold/40 transition-colors font-sans shadow-sm"
                title="Instagram @ekmeklabtr"
              >
                <InstagramIcon className="w-4 h-4 text-pink-400 shrink-0" />
                <span className="font-medium">@ekmeklabtr</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Legal Documents */}
        <div className="pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-artisan-cream/50">
          <div>© {new Date().getFullYear()} EkmekLab. Tüm hakları saklıdır.</div>
          <div className="flex flex-wrap items-center gap-4">
            <a href="/kvkk" className="hover:text-artisan-cream/80 transition-colors">
              KVKK Aydınlatma Metni
            </a>
            <span className="text-artisan-cream/20">·</span>
            <a href="/gizlilik" className="hover:text-artisan-cream/80 transition-colors">
              Gizlilik & Çerez Politikası
            </a>
            <span className="text-artisan-cream/20">·</span>
            <a href="/mesafeli-satis" className="hover:text-artisan-cream/80 transition-colors">
              Mesafeli Satış Sözleşmesi
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
