"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Truck, Wallet, Plus, Menu } from "lucide-react";

interface MobileBottomNavProps {
  onOpenSidebar: () => void;
  pendingOrderCount?: number;
}

export function MobileBottomNav({ onOpenSidebar, pendingOrderCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Sipariş",
      href: "/admin/siparisler",
      icon: ShoppingBag,
      badge: pendingOrderCount,
      exact: true,
    },
    {
      label: "Kurye",
      href: "/kurye",
      icon: Truck,
      badge: 0,
    },
    {
      label: "Finans",
      href: "/admin/cariler",
      icon: Wallet,
      badge: 0,
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#16120E]/95 backdrop-blur-md border-t border-[#261E17] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.8)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-[68px] px-2 relative">
        
        {/* Left Side Navigation (Siparişler & Kurye) */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors ${
                isActive ? "text-artisan-gold" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-artisan-terracotta text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#16120E]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Center Floating Action Button (FAB) */}
        <div className="relative -top-5 z-50">
          <Link
            href="/admin/siparisler/yeni"
            className="flex flex-col items-center justify-center"
          >
            <div className="w-14 h-14 bg-artisan-terracotta text-stone-950 rounded-full flex items-center justify-center shadow-lg shadow-artisan-terracotta/30 border-4 border-[#120E0B] transition-transform active:scale-95">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-bold text-stone-300 mt-1">Yeni Fiş</span>
          </Link>
        </div>

        {/* Right Side Navigation (Finans) */}
        {navItems.slice(2).map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors ${
                isActive ? "text-artisan-gold" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
              </div>
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Hamburger / More Menu Button */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center w-14 h-full gap-1 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] font-medium">Diğer</span>
        </button>

      </div>
    </div>
  );
}
