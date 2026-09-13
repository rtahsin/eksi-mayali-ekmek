"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { QuickPinLock } from "@/components/admin/QuickPinLock";
import { useBakeryAudio } from "@/hooks/useBakeryAudio";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const pathname = usePathname();

  const { soundEnabled, toggleSound, playOrderChime } = useBakeryAudio();
  const prevCountRef = useRef<number | null>(null);

  // If on login page, don't show admin shell
  const isLoginPage = pathname === "/admin/login";

  // Real-time listener for pending/active orders via Supabase
  useEffect(() => {
    if (isLoginPage) return;

    const supabase = createClient();
    if (!supabase || !isSupabaseConfigured()) return;

    const fetchPending = async () => {
      try {
        const { count, error } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["bekliyor", "pending", "hazirlaniyor", "processing"]);

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

    fetchPending();

    const channel = supabase
      .channel("admin-pending-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchPending();
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
      <div className="min-h-screen bg-[#120E0B] text-foreground font-sans flex flex-col selection:bg-artisan-terracotta/30 selection:text-artisan-gold">
        {/* Quick PIN Lock Screen */}
        <QuickPinLock isLocked={isLocked} onUnlock={() => setIsLocked(false)} />

        {/* Sidebar */}
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pendingOrderCount={pendingCount}
        />

        {/* Main Content Area */}
        <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
          <AdminHeader
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            pendingOrderCount={pendingCount}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            onLockScreen={() => setIsLocked(true)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthGate>
  );
}

