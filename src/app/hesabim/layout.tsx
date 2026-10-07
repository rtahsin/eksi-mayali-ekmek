"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, MapPin, MessageSquare, LogOut, ArrowLeft } from "lucide-react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

export default function HesabimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, profile, signOut } = useCustomerAuth();

  const navItems = [
    { href: "/hesabim/siparisler", label: "Siparişlerim", icon: Package },
    { href: "/hesabim/adresler", label: "Adreslerim", icon: MapPin },
    { href: "/hesabim/tercihler", label: "İletişim Tercihi", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-accent selection:text-white">
      {/* Header */}
      <header className="border-b border-line bg-cream-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent font-serif font-bold text-base hover:scale-105 transition-transform"
            >
              E
            </Link>
            <div>
              <div className="font-serif font-bold text-ink text-sm tracking-wide">
                EkmekLab
              </div>
              <div className="text-xs text-ink-muted font-sans">
                {profile?.fullName ? `Merhaba, ${profile.fullName}` : "Müşteri Hesabı"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="touch-target-44 px-3 py-1.5 rounded-xl bg-bg border border-line hover:border-accent text-ink-muted hover:text-ink text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Mağazaya Dön</span>
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="touch-target-44 px-3 py-1.5 rounded-xl bg-bad/10 hover:bg-bad/20 text-bad text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                title="Çıkış Yap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Çıkış</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-line pb-4 mb-6 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/hesabim/siparisler" && pathname === "/hesabim");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`touch-target-44 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-accent text-white font-bold shadow-xs"
                    : "bg-cream-surface text-ink-muted hover:text-ink border border-line hover:border-accent/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
