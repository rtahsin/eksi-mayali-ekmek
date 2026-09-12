"use client";

import React, { useState, useEffect, useRef } from "react";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { QuickPinLock } from "@/components/admin/QuickPinLock";
import { useBakeryAudio } from "@/hooks/useBakeryAudio";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
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

  // Real-time listener for pending/active orders
  useEffect(() => {
    if (isLoginPage) return;

    try {
      const ordersRef = collection(db, "siparisler");
      const q = query(ordersRef, where("status", "in", ["bekliyor", "pending", "hazirlaniyor", "processing"]));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const newCount = snap.size;
          // Play oven chime if new order arrived while in admin panel
          if (prevCountRef.current !== null && newCount > prevCountRef.current) {
            playOrderChime();
          }
          prevCountRef.current = newCount;
          setPendingCount(newCount);
        },
        (err) => {
          console.warn("Notice: Live orders count listener:", err);
        }
      );
      return () => unsubscribe();
    } catch {
      // Fallback
    }
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

