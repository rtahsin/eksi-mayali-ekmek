"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import { PwaInstallPrompt } from "@/components/admin/PwaInstallPrompt";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useBakeryAudio } from "@/hooks/useBakeryAudio";
import { hasCapability } from "@/lib/security/capabilities";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CariAccount } from "@/types/admin";
import { usePathname } from "next/navigation";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unassignedCourierCount, setUnassignedCourierCount] = useState(0);
  const [overLimitCariCount, setOverLimitCariCount] = useState(0);
  const pathname = usePathname();
  const { adminUser } = useAdminAuth();
  const canReadCari = hasCapability(adminUser?.role, "cari.read");

  const { soundEnabled, toggleSound, playOrderChime } = useBakeryAudio();
  const prevCountRef = useRef<number | null>(null);
  const refreshCountsRef = useRef<(() => Promise<void>) | null>(null);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;

    const supabase = createClient();
    if (!supabase || !isSupabaseConfigured()) return;

    const fetchCounts = async () => {
      try {
        const [pendingRes, unassignedRes] = await Promise.all([
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("status", "bekliyor"),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .in("status", ["bekliyor", "hazirlaniyor", "firinda"])
            .eq("delivery_method", "courier")
            .is("courier_id", null),
        ]);

        if (!pendingRes.error && pendingRes.count !== null) {
          if (prevCountRef.current !== null && pendingRes.count > prevCountRef.current) {
            playOrderChime();
          }
          prevCountRef.current = pendingRes.count;
          setPendingCount(pendingRes.count);
        }
        if (!unassignedRes.error && unassignedRes.count !== null) {
          setUnassignedCourierCount(unassignedRes.count);
        }

        if (canReadCari) {
          const res = await fetch("/api/admin/cari/accounts", { cache: "no-store" });
          if (res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { accounts?: CariAccount[] };
            const rows = Array.isArray(payload.accounts) ? payload.accounts : [];
            const overCount = rows.filter(
              (r) =>
                !r.archivedAt &&
                r.accountType !== "gider" &&
                typeof r.creditLimit === "number" &&
                r.creditLimit > 0 &&
                r.balance > r.creditLimit
            ).length;
            setOverLimitCariCount(overCount);
          }
        } else {
          setOverLimitCariCount(0);
        }
      } catch (err) {
        console.warn("Notice: Supabase admin live counts:", err);
      }
    };

    refreshCountsRef.current = fetchCounts;
    void fetchCounts();

    const channelId = `admin-live-counts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void fetchCounts();
        }
      );

    if (canReadCari) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "current_accounts" },
        () => {
          void fetchCounts();
        }
      );
    }

    channel.subscribe();

    return () => {
      refreshCountsRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [isLoginPage, canReadCari, playOrderChime]);

  if (isLoginPage) {
    return <AdminAuthGate>{children}</AdminAuthGate>;
  }

  return (
    <AdminAuthGate>
      <div className="min-h-screen bg-[#F6EEDF] text-[#3B1E1A] font-sans flex flex-col selection:bg-[#B4532A]/20 selection:text-[#3B1E1A] print:min-h-0 print:bg-white print:text-black print:p-0">
        <a
          href="#admin-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#B4532A] focus:text-white focus:font-bold print:hidden"
        >
          Ana içeriğe geç
        </a>

        {/* Yan Menü & Mobil Çekmece */}
        <div className="print:hidden">
          <AdminSidebar
            mobileOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            pendingOrderCount={pendingCount}
            unassignedCourierCount={unassignedCourierCount}
            overLimitCariCount={overLimitCariCount}
          />
        </div>

        {/* Ana İçerik Alanı */}
        <div className="md:pl-64 flex-1 flex flex-col min-w-0 pb-24 md:pb-0 print:pl-0 print:pb-0">
          <div className="print:hidden">
            <AdminHeader
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
              pendingOrderCount={pendingCount}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            />
          </div>

          <main
            id="admin-main-content"
            tabIndex={-1}
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none print:p-0 print:max-w-none print:m-0"
          >
            {children}
          </main>
        </div>

        {/* Evrensel Cmd+K Hızlı İşlem Paleti */}
        <div className="print:hidden">
          <AdminCommandPalette
            open={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onActionCompleted={() => {
              void refreshCountsRef.current?.();
            }}
          />
        </div>

        {/* Mobil PWA Kurulum İpucu */}
        <div className="print:hidden">
          <PwaInstallPrompt />
        </div>

        {/* Mobil Alt Navigasyon */}
        <div className="print:hidden">
          <MobileBottomNav
            sidebarOpen={sidebarOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
            pendingOrderCount={pendingCount}
          />
        </div>
      </div>
    </AdminAuthGate>
  );
}
