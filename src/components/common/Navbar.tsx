"use client";

import React, { useState, useRef, useEffect } from "react";
import { ShoppingBag, MessageSquare, BookOpen, User, LogOut, Package, Shield, ChevronDown, Menu, Search } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useAuth } from "@/components/auth/AuthProvider";
import { AtelierMenuDrawer } from "./AtelierMenuDrawer";

export function Navbar() {
  const storedItemCount = useCartStore((state) => state.getItemCount());
  const openCart = useCartStore((state) => state.openCart);
  // Sepet localStorage'dan gelir; sunucu çıktısıyla uyuşması için ilk render'da 0 göster
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const itemCount = mounted ? storedItemCount : 0;
  const { user, profile, isLoggedIn, openAuthModal, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAtelierMenuOpen, setIsAtelierMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = profile?.fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Müdavim";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream-surface/90 backdrop-blur-md border-b border-line shadow-xs">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 h-14 sm:h-[72px] flex items-center justify-between">
        {/* Brand Logo & Name + Atelier Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3.5 min-w-0 shrink">
          <button
            type="button"
            onClick={() => setIsAtelierMenuOpen(true)}
            aria-label="Atölye Menüsü"
            className="touch-target-44 inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 h-9 sm:h-10 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line text-xs font-sans font-medium transition-all shrink-0"
          >
            <Menu className="w-4 h-4 text-accent" />
            <span className="hidden sm:inline font-serif font-medium text-xs tracking-wide">Menü</span>
          </button>

          <a href="/" className="flex items-center gap-2 sm:gap-3 group py-2 min-w-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-bg p-1 flex items-center justify-center shrink-0 border border-line shadow-xs">
              <img
                src="/logo/logo_mark.png"
                alt="EkmekLab"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-base sm:text-xl font-bold tracking-wide text-ink flex items-center gap-1 truncate">
                Ekmek<span className="text-accent font-normal italic">Lab</span>
              </div>
              <div className="hidden sm:block text-xs font-sans text-ink-muted tracking-wider uppercase font-semibold">
                Artisan Fırın · Beylikdüzü
              </div>
            </div>
          </a>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-sans">
          <a
            href="/#ekmekler"
            onClick={(e) => {
              if (typeof window !== "undefined" && window.location.pathname === "/") {
                e.preventDefault();
                window.location.hash = "ekmekler";
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }
            }}
            className="text-ink-muted hover:text-ink transition-colors font-medium tracking-wide"
          >
            Ekmeklerimiz
          </a>
          <a
            href="/#nasil-uretiyoruz"
            className="text-ink-muted hover:text-ink transition-colors font-medium tracking-wide"
          >
            Nasıl Üretiyoruz?
          </a>
          <a
            href="/kutuphane"
            className="text-ink-muted hover:text-ink transition-colors font-medium tracking-wide"
          >
            Kütüphane
          </a>
          <a
            href="/laboratuvar"
            className="text-ink-muted hover:text-ink transition-colors font-medium tracking-wide"
          >
            Laboratuvar
          </a>
          <a
            href="/arac"
            className="text-accent hover:text-ink flex items-center gap-1.5 font-semibold transition-colors tracking-wide bg-bg px-3 py-1.5 rounded-xl border border-line"
          >
            <span>Fırıncı Araçları</span>
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <a
            href="/arama"
            aria-label="Kütüphanede Ara"
            className="touch-target-44 p-1.5 sm:p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-bg border border-transparent hover:border-line transition-colors flex items-center justify-center"
          >
            <Search className="w-4 h-4 text-accent" />
          </a>
          {/* Customer Auth Button / Menu */}
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line font-sans text-xs transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-xs font-bold text-accent border border-accent/30">
                  {initials || "E"}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate font-medium">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-cream-surface border border-line rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-line">
                    <div className="text-xs font-bold text-ink truncate">{displayName}</div>
                    <div className="text-xs text-ink-muted truncate">{user?.email}</div>
                  </div>

                  {isAdmin && (
                    <a
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-xs text-accent hover:bg-bg transition-colors font-medium"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Fırın Yönetim Paneli</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-bad hover:bg-bg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              aria-label="Giriş Yap"
              className="inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl bg-bg hover:bg-cream-surface text-ink border border-line font-sans text-xs transition-all"
            >
              <User className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-accent" />
              <span className="hidden sm:inline">Giriş Yap</span>
            </button>
          )}

          {/* Cart Button */}
          <button
            type="button"
            onClick={openCart}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 h-9 sm:h-auto sm:py-2 rounded-xl font-sans text-xs transition-all ${
              itemCount > 0
                ? "bg-accent text-white font-bold shadow-md hover:bg-accent/90"
                : "bg-bg hover:bg-cream-surface text-ink border border-line"
            }`}
          >
            <ShoppingBag className={`w-4 h-4 ${itemCount > 0 ? "text-white" : "text-accent"}`} />
            <span className="hidden sm:inline">Sepetim</span>
            <span
              className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-xs ${
                itemCount > 0
                  ? "bg-white text-accent"
                  : "bg-line text-ink"
              }`}
            >
              {itemCount}
            </span>
          </button>
        </div>
      </div>
    </header>

    {/* Atelier Slide-over Menu Drawer */}
    <AtelierMenuDrawer
      isOpen={isAtelierMenuOpen}
      onClose={() => setIsAtelierMenuOpen(false)}
    />
  </>
  );
}
