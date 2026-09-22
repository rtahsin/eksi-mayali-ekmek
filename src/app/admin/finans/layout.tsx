"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Wallet, Receipt, Truck, LayoutDashboard } from "lucide-react";

export default function FinansLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/admin/finans", label: "Özet", icon: LayoutDashboard, exact: true },
    { href: "/admin/finans/kasa", label: "Kasa & Banka", icon: Wallet, exact: false },
    { href: "/admin/finans/giderler", label: "Giderler", icon: Receipt, exact: false },
    { href: "/admin/finans/cariler", label: "Cari Hesaplar", icon: Users, exact: false },
    { href: "/admin/finans/kurye", label: "Z Raporu (Kurye)", icon: Truck, exact: false },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20">
      <div className="mb-2">
        <h1 className="text-2xl font-black font-serif text-stone-100">Finans Yönetimi</h1>
        <p className="text-xs text-stone-400 mt-1">Ön muhasebe, kasa, giderler ve müşteri hesapları</p>
      </div>

      {/* Finans Sub-Navigation */}
      <div className="flex bg-stone-900 border border-stone-800 rounded-xl p-1 overflow-x-auto hide-scrollbar sticky top-0 z-10 shadow-lg">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 min-w-[120px] py-3 px-4 text-[11px] sm:text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1.5 ${
                isActive
                  ? "bg-stone-800 text-amber-400 shadow-md border-b-2 border-amber-500"
                  : "text-stone-400 hover:text-stone-300 hover:bg-stone-800/50"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${isActive ? "text-amber-500" : "text-stone-500"}`} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Finans Sub-Page Content */}
      <div className="pt-2 animate-fadeIn">
        {children}
      </div>
    </div>
  );
}
