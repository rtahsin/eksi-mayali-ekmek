"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { StoreSettings } from "@/types/settings";
import { getErrorMessage } from "@/lib/utils/error";
import {
  Menu,
  Plus,
  LogOut,
  Clock,
  Power,
  Loader2,
  AlertCircle,
  X,
  Bell,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  pendingOrderCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function AdminHeader({
  onToggleSidebar,
  pendingOrderCount = 0,
  soundEnabled = true,
  onToggleSound,
}: AdminHeaderProps) {
  const { adminUser, logout } = useAdminAuth();
  const [timeStr, setTimeStr] = useState("");
  const [operational, setOperational] = useState<StoreSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

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

  const fetchOperationalSettings = useCallback(async (): Promise<StoreSettings> => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    const data: { operational?: StoreSettings; error?: string } = await res.json().catch(() => ({}));
    if (!res.ok || !data.operational) {
      throw new Error(data.error || `Ayarlar okunamadı (HTTP ${res.status})`);
    }
    return data.operational;
  }, []);

  useEffect(() => {
    let alive = true;
    setLoadingSettings(true);
    fetchOperationalSettings()
      .then((s) => {
        if (alive) {
          setOperational(s);
          setToggleError(null);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setToggleError("Fırın durumu okunamadı: " + getErrorMessage(err));
        }
      })
      .finally(() => {
        if (alive) setLoadingSettings(false);
      });
    return () => {
      alive = false;
    };
  }, [fetchOperationalSettings]);

  const handleToggleOrderAcceptance = async () => {
    if (savingToggle) return;
    setSavingToggle(true);
    setToggleError(null);
    try {
      const current = await fetchOperationalSettings();
      const nextValue: StoreSettings = {
        ...current,
        orderAcceptanceOpen: !current.orderAcceptanceOpen,
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_operational", value: nextValue }),
      });
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Durum kaydedilemedi (HTTP ${res.status})`);
      }
      setOperational(nextValue);
    } catch (err: unknown) {
      setToggleError("Sipariş alımı güncellenemedi: " + getErrorMessage(err));
    } finally {
      setSavingToggle(false);
    }
  };

  const isBakeryOpen = operational?.orderAcceptanceOpen ?? true;

  return (
    <header className="sticky top-0 z-30 bg-[#16120E] border-b border-[#261E17]">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-2">
        {/* Left: Mobile Toggle & Page Indicator */}
        <div className="flex items-center gap-3">
          {/* We hide the hamburger on mobile because we use MobileBottomNav now */}
          <button
            aria-label="Menüyü aç"
            type="button"
            onClick={onToggleSidebar}
            className="hidden p-2 rounded-xl bg-[#1E1712] border border-[#2E231B] text-foreground/80 hover:text-foreground"
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
          {/* Bakery Order Acceptance Status Pill */}
          <button
            type="button"
            onClick={() => void handleToggleOrderAcceptance()}
            disabled={loadingSettings || savingToggle}
            aria-pressed={isBakeryOpen}
            title={
              isBakeryOpen
                ? "Sipariş alımı açık — kapatmak için dokunun"
                : "Sipariş alımı kapalı — açmak için dokunun"
            }
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[38px] rounded-xl text-xs font-sans font-bold border transition-all disabled:opacity-60 ${
              loadingSettings && !operational
                ? "bg-stone-900 border-stone-700 text-stone-400"
                : isBakeryOpen
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60"
                : "bg-red-950/60 border-red-500/60 text-red-200 hover:bg-red-950/80 shadow-sm shadow-red-950/40"
            }`}
          >
            {loadingSettings || savingToggle ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : isBakeryOpen ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            ) : (
              <Power className="w-3.5 h-3.5 text-red-400 shrink-0" />
            )}
            <span>
              {loadingSettings && !operational
                ? "Kontrol…"
                : savingToggle
                ? "Kaydediliyor…"
                : isBakeryOpen
                ? "Fırın Açık"
                : "Sipariş Alımı Kapalı"}
            </span>
          </button>

          {/* Quick Order Button (Hidden on Mobile) */}
          <Link
            href="/admin/siparisler/yeni"
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-foreground text-xs font-serif font-bold transition-all shadow-md shadow-artisan-terracotta/20 border border-artisan-gold/30"
          >
            <Plus className="w-4 h-4" />
            <span>Hızlı Sipariş</span>
          </Link>

          {/* Audio Chime Toggle */}
          {onToggleSound && (
            <button
              aria-label={soundEnabled ? "Sipariş sesini kapat" : "Sipariş sesini aç"}
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

          {/* Notification Bell */}
          <Link
            href="/admin/siparisler"
            className="relative p-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-foreground/70 hover:text-artisan-gold transition-colors"
            title="Bekleyen Siparişler"
          >
            <Bell className="w-4 h-4" />
            {pendingOrderCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-xs font-bold flex items-center justify-center animate-bounce">
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
              <div className="text-xs font-mono text-artisan-gold/80">
                {adminUser?.role === "superadmin" ? "Süper Admin" : "Yönetici"}
              </div>
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
      </div>

      {toggleError && (
        <div
          role="alert"
          className="px-4 sm:px-6 py-2 bg-red-950/80 border-t border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            {toggleError}
          </span>
          <button
            type="button"
            onClick={() => setToggleError(null)}
            aria-label="Uyarıyı kapat"
            className="p-1 rounded-lg hover:bg-red-900/60 text-red-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
