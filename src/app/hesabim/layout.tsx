"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, User, LogOut, ArrowLeft } from "lucide-react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

export default function HesabimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, profile, signOut } = useCustomerAuth();

  return (
    <div className="min-h-screen bg-[#120E0B] text-stone-100 selection:bg-[#F59E0B] selection:text-black">
      {/* Header */}
      <header className="border-b border-[#261E17] bg-[#16110D]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B] font-serif font-bold text-base shadow-inner hover:scale-105 transition-transform"
            >
              E
            </Link>
            <div>
              <div className="font-serif font-bold text-stone-100 text-sm tracking-wide">
                EkmekLab
              </div>
              <div className="text-[11px] text-stone-400 font-sans">
                Müşteri Hesabı
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-[#261E17] hover:bg-[#342920] text-stone-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Mağazaya Dön</span>
            </Link>
            {user && (
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
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
        <div className="flex items-center gap-2 border-b border-[#261E17] pb-4 mb-6 overflow-x-auto">
          <Link
            href="/hesabim/siparisler"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              pathname.includes("/siparisler")
                ? "bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold shadow-md"
                : "text-stone-400 hover:text-stone-200 hover:bg-[#18130F]"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Siparişlerim</span>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
