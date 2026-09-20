"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  PlusCircle,
  Croissant,
  Building2,
  Wheat,
  Wallet,
  BookOpen,
  Settings,
  ExternalLink,
  ShieldCheck,
  Flame,
  Users,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingOrderCount?: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles: string[];
  exact?: boolean;
  highlight?: boolean;
}

export function AdminSidebar({ isOpen, onClose, pendingOrderCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const { adminUser } = useAdminAuth();
  
  const userRole = adminUser?.role || "support";

  const navItems: NavItem[] = [
    {
      label: "Siparişler",
      href: "/admin/siparisler",
      icon: ShoppingBag,
      badge: pendingOrderCount > 0 ? pendingOrderCount : undefined,
      roles: ["superadmin", "admin", "support"],
    },
    {
      label: "Finans (Ön Muhasebe)",
      href: "/admin/finans",
      icon: Wallet,
      roles: ["superadmin", "admin"],
    },
    {
      label: "Ürünler & Fiyatlar",
      href: "/admin/urunler",
      icon: Croissant,
      roles: ["superadmin", "admin"],
    },
    {
      label: "Kütüphane",
      href: "/admin/kutuphane",
      icon: BookOpen,
      roles: ["superadmin", "admin", "editor"],
    },
    {
      label: "Ayarlar",
      href: "/admin/ayarlar",
      icon: Settings,
      roles: ["superadmin", "admin"],
    },
  ];

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#16120E] border-r border-[#261E17] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Brand Header */}
        <div className="p-5 border-b border-[#261E17] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-[#F7EBD3] p-1 flex items-center justify-center shrink-0 shadow-md">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-serif text-lg font-bold text-foreground flex items-center gap-1">
                Ekmek<span className="text-artisan-gold italic">Lab</span>
              </div>
              <div className="text-[9px] font-sans text-artisan-gold/80 tracking-widest uppercase font-mono">
                Atölye ERP · v2.0
              </div>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-[#201812]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs font-sans">
          {filteredNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-artisan-terracotta text-foreground font-bold shadow-md shadow-artisan-terracotta/20 border border-artisan-gold/30"
                    : item.highlight
                    ? "bg-[#231A13] text-artisan-gold font-medium border border-artisan-gold/30 hover:bg-[#2B2018]"
                    : "text-foreground/70 hover:text-foreground hover:bg-[#1E1712]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-foreground" : item.highlight ? "text-artisan-gold" : "text-artisan-gold/80"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Security Status & Storefront Link */}
        <div className="p-3.5 border-t border-[#261E17] space-y-2 bg-[#120E0B]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1A1410] border border-[#2A201A] text-[10px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cihaz Yetkilendirildi (PC/Mobil)</span>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-foreground/60 hover:text-artisan-gold hover:bg-[#1A1410] transition-colors"
          >
            <span>Vitrini Görüntüle</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </aside>
    </>
  );
}
