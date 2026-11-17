"use client";

import { storefrontAction } from "@/lib/design/storefront";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, User, LogOut, Package, MapPin, Shield, ChevronDown, Menu } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useAuth } from "@/components/auth/AuthProvider";
import { AtelierMenuDrawer } from "./AtelierMenuDrawer";
import { MAIN_NAV_LINKS, isStorefrontNavVisible } from "@content/nav/links";
import { handleStorefrontAnchor } from "@/lib/design/navigation";

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

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
      <div className="sf-shop-width sf-gutter mx-auto h-14 sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Name + Atelier Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3.5 min-w-0 shrink">
          <button
            type="button"
            onClick={() => setIsAtelierMenuOpen(true)}
            aria-label="Atölye Menüsü"
            aria-expanded={isAtelierMenuOpen}
            className={storefrontAction({ variant: "secondary", size: "default", className: "sf-navbar-action shrink-0" })}
          >
            <Menu className="w-4 h-4 text-accent" />
            <span className="hidden sm:inline font-serif font-medium text-xs tracking-wide">Menü</span>
          </button>

          <a href="/" className="sf-link flex items-center gap-2 sm:gap-3 group py-2 min-w-0">
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
              <div className="hidden sm:block text-xs font-sans text-ink-muted tracking-wider uppercase font-semibold whitespace-nowrap">
                Artisan Fırın · Beylikdüzü
              </div>
            </div>
          </a>
        </div>

        {/* Center Nav Links */}
        <nav aria-label="Ana gezinme" className="hidden xl:flex items-center gap-1">
          {MAIN_NAV_LINKS.filter(isStorefrontNavVisible).map((link) => (
            <a key={link.key} href={link.href} onClick={handleStorefrontAnchor} className="sf-nav-link whitespace-nowrap">{link.label}</a>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Customer Auth Button / Menu */}
          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Hesabım"
                aria-expanded={isDropdownOpen}
                aria-controls="navbar-account-menu"
                className={storefrontAction({ variant: "secondary", size: "default", className: "sf-navbar-action" })}
              >
                <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-xs font-bold text-ink border border-accent/30">
                  {initials || "E"}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate font-medium">
                  {displayName}
                </span>
                <ChevronDown aria-hidden="true" className="hidden sm:block w-3.5 h-3.5 text-ink-muted" />
              </button>

              {isDropdownOpen && (
                <div
                  id="navbar-account-menu"
                  className="absolute right-0 mt-2 w-52 bg-cream-surface border border-line rounded-2xl shadow-xl py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-line">
                    <div className="text-xs font-bold text-ink truncate">{displayName}</div>
                    <div className="text-xs text-ink-muted truncate">{user?.email}</div>
                  </div>

                  {isAdmin && (
                    <a
                      href="/admin"
                      className="sf-nav-link flex w-full items-center gap-2 px-4 py-2 text-ink hover:bg-bg transition-colors font-medium"
                    >
                      <Shield aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>Fırın Yönetim Paneli</span>
                    </a>
                  )}

                  <Link
                    href="/hesabim/siparisler"
                    onClick={() => setIsDropdownOpen(false)}
                    className="sf-nav-link flex w-full items-center gap-2 px-4 py-2 text-ink hover:bg-bg transition-colors font-medium"
                  >
                    <Package aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                    <span>Siparişlerim</span>
                  </Link>

                  <Link
                    href="/hesabim/adresler"
                    onClick={() => setIsDropdownOpen(false)}
                    className="sf-nav-link flex w-full items-center gap-2 px-4 py-2 text-ink hover:bg-bg transition-colors font-medium"
                  >
                    <MapPin aria-hidden="true" className="w-3.5 h-3.5 text-accent" />
                    <span>Adreslerim</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut();
                    }}
                    className={storefrontAction({ variant: "danger", size: "default", className: "w-full flex items-center gap-2 mt-1 text-left" })}
                  >
                    <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              aria-label="Giriş yap"
              className={storefrontAction({ variant: "secondary", size: "default", className: "sf-navbar-action" })}
            >
              <User className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-accent" />
              <span className="hidden sm:inline">Giriş yap</span>
            </button>
          )}

          {/* Cart Button */}
          <button
            type="button"
            onClick={openCart}
            aria-label={`Sepetim, ${itemCount} adet ürün`}
            className={"sf-action sf-navbar-action " + (` ${
              itemCount > 0
                ? "sf-action--primary "
                : "sf-action--secondary "
            }  `)}
          >
            <ShoppingBag aria-hidden="true" className="w-4 h-4" />
            <span className="hidden sm:inline">Sepetim</span>
            <span className="sf-count">
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
