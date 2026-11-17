"use client";

import { storefrontAction } from "@/lib/design/storefront";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Package, MapPin, CalendarClock, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { OrderSuccessModal } from "@/components/cart/OrderSuccessModal";

export default function HesabimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/hesabim";
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { href: "/hesabim", label: "Özet", icon: Compass },
    { href: "/hesabim/siparisler", label: "Siparişlerim", icon: Package },
    { href: "/hesabim/adresler", label: "Kayıtlı Adresler", icon: MapPin },
    { href: "/hesabim/tercihler", label: "Profil & Hatırlatıcı", icon: CalendarClock },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent selection:text-white">
      {/* Header */}
      <header className="border-b border-line bg-cream-surface/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              aria-label="EkmekLab ana sayfa"
              className={storefrontAction({ variant: "primary", size: "icon", className: "shrink-0 flex items-center justify-center" })}
            >
              E
            </Link>
            <div className="min-w-0">
              <div className="font-serif font-bold text-ink text-sm sm:text-base tracking-wide truncate">
                EkmekLab Müdavim Pasaportu
              </div>
              <div className="text-xs text-ink-muted font-sans truncate">
                {profile?.fullName ? `Hoş geldin, ${profile.fullName}` : "Taş Fırın Müşteri Hesabı"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              aria-label="Alışverişe dön"
              className={storefrontAction({ variant: "secondary", size: "default", className: "sf-navbar-action inline-flex items-center gap-1.5" })}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Alışverişe dön</span>
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Oturumu kapat"
                className={storefrontAction({ variant: "danger", size: "default", className: "sf-navbar-action inline-flex items-center gap-1.5" })}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Navigation Tabs */}
        <nav
          aria-label="Müdavim Pasaportu sekmeleri"
          className="flex items-center gap-2 border-b border-line pb-4 mb-6 overflow-x-auto no-scrollbar"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/hesabim"
                ? pathname === "/hesabim"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={"sf-action sf-action--default sf-nav-action " + (` inline-flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "sf-action--primary "
                    : "sf-action--secondary "
                }  `)}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {children}
      </main>

      <CartDrawer />
      <OrderSuccessModal />
    </div>
  );
}
