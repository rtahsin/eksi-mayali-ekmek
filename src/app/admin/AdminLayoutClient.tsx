"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import { PwaInstallPrompt } from "@/components/admin/PwaInstallPrompt";
import { useBakeryAudio } from "@/hooks/useBakeryAudio";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();

  const { soundEnabled, toggleSound, playOrderChime } = useBakeryAudio();
  const prevCountRef = useRef<number | null>(null);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) return;

    const supabase = createClient();
    if (!supabase || !isSupabaseConfigured()) return;

    const fetchPending = async () => {
      try {
        const { count, error } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["bekliyor", "hazirlaniyor"]);

        if (!error && count !== null) {
          if (prevCountRef.current !== null && count > prevCountRef.current) {
            playOrderChime();
          }
          prevCountRef.current = count;
          setPendingCount(count);
        }
      } catch (err) {
        console.warn("Notice: Supabase pending orders count:", err);
      }
    };

    void fetchPending();

    const channelId = `admin-pending-count-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void fetchPending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoginPage, playOrderChime]);

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
