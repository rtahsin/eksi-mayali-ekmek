"use client";

import React, { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Menu,
  Plus,
  LogOut,
  Clock,
  Flame,
  Bell,
  Volume2,
  VolumeX,
  Lock,
} from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  pendingOrderCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onLockScreen?: () => void;
}

export function AdminHeader({
  onToggleSidebar,
  pendingOrderCount = 0,
  soundEnabled = true,
  onToggleSound,
  onLockScreen,
}: AdminHeaderProps) {
  const { adminUser, logout } = useAdminAuth();
  const [timeStr, setTimeStr] = useState("");
  const [isBakeryOpen, setIsBakeryOpen] = useState(true);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#16120E] border-b border-[#261E17] px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Indicator */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl bg-[#1E1712] border border-[#2E231B] text-foreground/80 hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-foreground/70 bg-[#1A1410] px-3 py-1.5 rounded-xl border border-[#2A201A]">
          <Clock className="w-3.5 h-3.5 text-artisan-gold" />
          <span className="font-mono text-foreground/90 font-bold">{timeStr}</span>
          <span className="text-foreground/30">|</span>
          <span>Beylikdüzü Taş Fırını</span>
        </div>
      </div>

      {/* Center/Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Bakery Status Pill */}
        <button
          type="button"
          onClick={() => setIsBakeryOpen(!isBakeryOpen)}
          title="Fırın sipariş alma durumunu değiştir"
          className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans border transition-all ${
            isBakeryOpen
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isBakeryOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span>{isBakeryOpen ? "Fırın Açık" : "Fırın Kapalı"}</span>
        </button>

        {/* Quick Order Button */}
        <Link
          href="/admin/siparisler/yeni"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-serif font-bold transition-all shadow-md shadow-artisan-terracotta/20 border border-artisan-gold/30"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Hızlı Sipariş</span>
          <span className="sm:hidden">Sipariş</span>
        </Link>

        {/* Audio Chime Toggle */}
        {onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? "Fırın Zili Açık (Yeni siparişte çalar)" : "Fırın Zili Sessizde"}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              soundEnabled
                ? "bg-stone-900 border-stone-700 text-amber-400 hover:text-amber-300"
                : "bg-stone-950 border-stone-850 text-stone-600 hover:text-stone-400"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}

        {/* Quick PIN Lock */}
        {onLockScreen && (
          <button
            type="button"
            onClick={onLockScreen}
            title="Ekranı Hızlı Kilitle (4 Haneli PIN)"
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-400 transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {/* Notification Bell */}
        <Link
          href="/admin/siparisler"
          className="relative p-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-foreground/70 hover:text-artisan-gold transition-colors"
          title="Bekleyen Siparişler"
        >
          <Bell className="w-4 h-4" />
          {pendingOrderCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold flex items-center justify-center animate-bounce">
              {pendingOrderCount}
            </span>
          )}
        </Link>

        {/* User & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#261E17]">
          <div className="hidden lg:block text-right">
            <div className="text-xs font-serif font-bold text-foreground truncate max-w-[120px]">
              {adminUser?.displayName || "Yönetici"}
            </div>
            <div className="text-[10px] font-mono text-artisan-gold/80">Süper Admin</div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Güvenli Çıkış Yap"
            className="p-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-foreground/60 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
