"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Wallet,
  Flame,
  Printer,
  Plus,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  sidebarOpen?: boolean;
  onOpenSidebar: () => void;
  pendingOrderCount?: number;
}

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  exact?: boolean;
}

export function MobileBottomNav({
  sidebarOpen = false,
  onOpenSidebar,
  pendingOrderCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { adminUser } = useAdminAuth();
  const role = adminUser?.role ?? null;

  const leftItems: BottomNavItem[] = [];
  if (hasCapability(role, "dashboard.ops")) {
    leftItems.push({
      label: "Bugün",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    });
  }
  if (hasCapability(role, "orders.read")) {
    leftItems.push({
      label: "Sipariş",
      href: "/admin/siparisler",
      icon: ShoppingBag,
      badge: pendingOrderCount,
      exact: true,
    });
  }

  const rightItems: BottomNavItem[] = [];
  if (hasCapability(role, "courier.dispatch")) {
    rightItems.push({
      label: "Teslimat",
      href: "/kurye",
      icon: Truck,
      exact: false,
    });
  } else if (hasCapability(role, "production.ops")) {
    rightItems.push({
      label: "Üretim",
      href: "/admin/uretim",
      icon: Flame,
      exact: false,
    });
  }

  if (hasCapability(role, "cari.read")) {
    rightItems.push({
      label: "Cariler",
      href: "/admin/cariler",
      icon: Wallet,
      exact: false,
    });
  } else if (hasCapability(role, "production.ops")) {
    rightItems.push({
      label: "Baskı",
      href: "/admin/baski",
      icon: Printer,
      exact: false,
    });
  }

  const canCreateOrder = hasCapability(role, "orders.ops");

  return (
    <nav
      aria-label="Mobil hızlı geçiş"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FBF6EC]/95 backdrop-blur-md border-t border-[#E2D3BD] shadow-[0_-8px_24px_-8px_rgba(59,30,26,0.12)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-[68px] px-2 relative">
        {leftItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-12 h-full gap-1 transition-colors ${
                isActive ? "text-[#3B1E1A]" : "text-[#6E5148] hover:text-[#3B1E1A]"
              }`}
            >
              <div
                className={`relative px-2 py-0.5 rounded-lg ${
                  isActive ? "bg-[#F3E2D4] text-[#8E3D1B]" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} aria-hidden="true" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#B4532A] text-white font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#FBF6EC]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs ${isActive ? "font-bold text-[#3B1E1A]" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {canCreateOrder && (
          <div className="relative -top-5 z-50">
            <Link
              href="/admin/siparisler/yeni"
              className="flex flex-col items-center justify-center"
            >
              <div className="w-14 h-14 bg-[#B4532A] hover:bg-[#9C4421] text-white rounded-full flex items-center justify-center shadow-md border-4 border-[#F6EEDF] transition-transform active:scale-95">
                <Plus className="w-6 h-6 stroke-[2.75]" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold text-[#3B1E1A] mt-1">Sipariş Ekle</span>
            </Link>
          </div>
        )}

        {rightItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-12 h-full gap-1 transition-colors ${
                isActive ? "text-[#3B1E1A]" : "text-[#6E5148] hover:text-[#3B1E1A]"
              }`}
            >
              <div
                className={`relative px-2 py-0.5 rounded-lg ${
                  isActive ? "bg-[#F3E2D4] text-[#8E3D1B]" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} aria-hidden="true" />
              </div>
              <span className={`text-xs ${isActive ? "font-bold text-[#3B1E1A]" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenSidebar}
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar-drawer"
          aria-label="Tüm yönetim menüsünü aç"
          className="flex flex-col items-center justify-center min-w-12 h-full gap-1 text-[#6E5148] hover:text-[#3B1E1A] transition-colors"
        >
          <Menu className="w-5 h-5 stroke-2" aria-hidden="true" />
          <span className="text-xs font-medium">Menü</span>
        </button>
      </div>
    </nav>
  );
}
