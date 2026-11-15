"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability, type AdminCapability } from "@/lib/security/capabilities";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Croissant,
  Wallet,
  Settings,
  ExternalLink,
  ShieldCheck,
  Flame,
  Users,
  UserCheck,
  Printer,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  pendingOrderCount?: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  capability: AdminCapability;
  badge?: number;
  exact?: boolean;
}

export function AdminSidebar({
  mobileOpen,
  isOpen,
  onClose,
  pendingOrderCount = 0,
}: AdminSidebarProps) {
  const open = mobileOpen ?? isOpen ?? false;
  const pathname = usePathname();
  const { adminUser } = useAdminAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Mobilde çekmece açıldığında odağı kapatma düğmesine taşı ve Escape ile kapat
  useEffect(() => {
    if (!open || isDesktop) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isDesktop, onClose]);

  const role = adminUser?.role ?? null;

  const navItems: NavItem[] = [
    {
      label: "Genel Bakış",
      href: "/admin",
      icon: LayoutDashboard,
      capability: "dashboard.ops",
      exact: true,
    },
    {
      label: "Siparişler",
      href: "/admin/siparisler",
      icon: ShoppingBag,
      capability: "orders.read",
      badge: pendingOrderCount > 0 ? pendingOrderCount : undefined,
    },
    {
      label: "Teslimat",
      href: "/kurye",
      icon: Truck,
      capability: "courier.dispatch",
    },
    {
      label: "Üretim",
      href: "/admin/uretim",
      icon: Flame,
      capability: "production.ops",
    },
    {
      label: "Etiket Baskı",
      href: "/admin/baski",
      icon: Printer,
      capability: "production.ops",
    },
    {
      label: "Ürünler",
      href: "/admin/urunler",
      icon: Croissant,
      capability: "products.manage",
    },
    {
      label: "Cariler",
      href: "/admin/cariler",
      icon: Wallet,
      capability: "cari.read",
    },
    {
      label: "Müşteriler",
      href: "/admin/musteriler",
      icon: Users,
      capability: "customers.read",
    },
    {
      label: "Ekip & Kurye",
      href: "/admin/ekip",
      icon: UserCheck,
      capability: "team.manage",
    },
    {
      label: "Ayarlar",
      href: "/admin/ayarlar",
      icon: Settings,
      capability: "settings.manage",
    },
  ];

  const filteredNavItems = navItems.filter((item) => hasCapability(role, item.capability));

  return (
    <>
      {/* Mobil Arka Plan Perdesi */}
      {open && !isDesktop && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#3B1E1A]/45 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Yan Menü / Mobil Çekmece */}
      <aside
        id="admin-sidebar-drawer"
        role={!isDesktop && open ? "dialog" : undefined}
        aria-modal={!isDesktop && open ? true : undefined}
        aria-label="Yönetim menüsü"
        aria-hidden={!isDesktop && !open ? true : undefined}
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#FBF6EC] border-r border-[#E2D3BD] text-[#3B1E1A] flex flex-col justify-between shadow-lg md:shadow-none transition-transform duration-300 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Marka Üst Alanı */}
        <div className="p-4 sm:p-5 border-b border-[#E2D3BD] flex items-center justify-between gap-2 bg-[#FFFFFF]/70">
          <Link
            href="/admin"
            onClick={() => {
              if (!isDesktop) onClose();
            }}
            className="flex items-center gap-3 group min-w-0"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#E2D3BD] p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-serif text-xl font-bold text-[#3B1E1A] flex items-center gap-0.5 leading-tight">
                <span>Ekmek</span>
                <span className="text-[#B4532A] italic">Lab</span>
              </div>
              <div className="text-[11px] font-mono text-[#6E5148] tracking-wider uppercase truncate">
                Atölye Operasyon
              </div>
            </div>
          </Link>

          <button
            ref={closeButtonRef}
            aria-label="Menüyü kapat"
            type="button"
            onClick={onClose}
            className="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl text-[#6E5148] hover:text-[#3B1E1A] hover:bg-[#F1E6D2] transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Rol Bazlı Navigasyon */}
        <nav aria-label="Yönetim sayfaları" className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm font-sans">
          {filteredNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (!isDesktop) onClose();
                }}
                className={`flex items-center justify-between min-h-11 px-3.5 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-[#B4532A] text-white font-semibold shadow-xs border border-[#9C4421]"
                    : "text-[#3B1E1A] hover:bg-[#EFE3CE] border border-transparent font-medium"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-[#6E5148]"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono tabular-nums text-xs font-bold ${
                      isActive
                        ? "bg-[#FFFFFF] text-[#8E3D1B]"
                        : "bg-[#B4532A] text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Alt Güvenlik Durumu ve Vitrin Linki */}
        <div className="p-3.5 border-t border-[#E2D3BD] space-y-2 bg-[#F3E9D6]/70">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-xs font-medium text-[#1D5130]">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Google OAuth doğrulandı</span>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between min-h-11 px-3 py-2 rounded-xl text-xs font-sans font-semibold text-[#6E5148] hover:text-[#3B1E1A] hover:bg-[#FFFFFF] border border-transparent hover:border-[#E2D3BD] transition-colors"
          >
            <span>Vitrini Görüntüle</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </aside>
    </>
  );
}
