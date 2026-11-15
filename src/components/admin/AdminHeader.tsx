"use client";

import React, { useState, useEffect, useCallback, useId, useRef } from "react";
import Link from "next/link";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { hasCapability } from "@/lib/security/capabilities";
import type { StoreSettings } from "@/types/settings";
import { getErrorMessage } from "@/lib/utils/error";
import { ISTANBUL_TZ } from "@/lib/time/istanbul";
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
  ShieldAlert,
  Zap,
} from "lucide-react";

interface AdminHeaderProps {
  sidebarOpen?: boolean;
  onToggleSidebar: () => void;
  pendingOrderCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenCommandPalette?: () => void;
}

function getRoleBadgeText(role: string | null | undefined): string {
  switch (role) {
    case "superadmin":
      return "Süper Yönetici";
    case "admin":
      return "Yönetici";
    case "staff":
      return "Fırın Operasyon";
    default:
      return "Yetkili";
  }
}

export function AdminHeader({
  sidebarOpen = false,
  onToggleSidebar,
  pendingOrderCount = 0,
  soundEnabled = true,
  onToggleSound,
  onOpenCommandPalette,
}: AdminHeaderProps) {
  const { adminUser, logout } = useAdminAuth();
  const { settings: publicSettings } = useStoreSettings();
  const role = adminUser?.role ?? null;
  const canManageSettings = hasCapability(role, "settings.manage");
  const canCreateOrders = hasCapability(role, "orders.ops");

  const [timeStr, setTimeStr] = useState("");
  const [operational, setOperational] = useState<StoreSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(canManageSettings);
  const [savingToggle, setSavingToggle] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const confirmTitleId = useId();
  const confirmDescId = useId();

  useEffect(() => {
    const update = () => {
      setTimeStr(
        new Date().toLocaleTimeString("tr-TR", {
          timeZone: ISTANBUL_TZ,
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
    if (!canManageSettings) {
      setLoadingSettings(false);
      return;
    }
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
  }, [canManageSettings, fetchOperationalSettings]);

  const executeToggleOrderAcceptance = async () => {
    if (savingToggle || !canManageSettings) return;
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

  const openConfirmDialog = () => {
    if (!canManageSettings || loadingSettings || savingToggle) return;
    const dialog = confirmDialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.returnValue = "";
    dialog.showModal();
  };

  const handleConfirmDialogClose = () => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    const choice = dialog.returnValue;
    dialog.returnValue = "";
    if (choice === "confirm") {
      void executeToggleOrderAcceptance();
    }
  };

  const isBakeryOpen = canManageSettings
    ? (operational?.orderAcceptanceOpen ?? publicSettings.orderAcceptanceOpen)
    : publicSettings.orderAcceptanceOpen;

  return (
    <header className="sticky top-0 z-30 bg-[#FBF6EC] border-b border-[#E2D3BD] text-[#3B1E1A]">
      <div className="min-h-16 py-1.5 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-2">
        {/* Sol: Mobil Hamburger Menü & İstanbul Saat Göstergesi */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            aria-label="Yönetim menüsünü aç"
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar-drawer"
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E9D6] transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-sans text-[#6E5148] bg-[#FFFFFF] px-3 py-2 rounded-xl border border-[#E2D3BD]">
            <Clock className="w-3.5 h-3.5 text-[#B4532A] shrink-0" aria-hidden="true" />
            <span className="font-mono tabular-nums text-[#3B1E1A] font-bold">{timeStr || "--:--"}</span>
            <span className="text-[#E2D3BD]" aria-hidden="true">|</span>
            <span className="truncate">Beylikdüzü Taş Fırını</span>
          </div>
        </div>

        {/* Sağ: Hızlı İşlem, Şalter, Hızlı Sipariş, Zil, Bildirim ve Oturum */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Hızlı işlem komut paletini aç (Cmd veya Ctrl + K)"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 min-h-11 rounded-xl bg-[#FFFFFF] hover:bg-[#F3E9D6] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-sans font-bold transition-colors shadow-xs"
            >
              <Zap className="w-4 h-4 text-[#B4532A] shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Hızlı İşlem</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#F6EEDF] border border-[#E2D3BD] font-mono text-[10px] text-[#6E5148]">
                ⌘K
              </kbd>
            </button>
          )}
          {canManageSettings ? (
            <button
              type="button"
              onClick={openConfirmDialog}
              disabled={loadingSettings || savingToggle}
              aria-pressed={isBakeryOpen}
              className={`inline-flex items-center gap-1.5 px-3 min-h-11 rounded-xl text-xs font-sans font-bold border transition-colors disabled:opacity-60 ${
                loadingSettings && !operational
                  ? "bg-[#FFFFFF] border-[#E2D3BD] text-[#6E5148]"
                  : isBakeryOpen
                  ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130] hover:bg-[#D7E8DC]"
                  : "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114] hover:bg-[#F9DDD8]"
              }`}
            >
              {loadingSettings || savingToggle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
              ) : isBakeryOpen ? (
                <span className="w-2 h-2 rounded-full bg-[#1D5130] animate-pulse shrink-0" aria-hidden="true" />
              ) : (
                <Power className="w-3.5 h-3.5 text-[#7D2114] shrink-0" aria-hidden="true" />
              )}
              <span className="whitespace-nowrap">
                {loadingSettings && !operational
                  ? "Kontrol…"
                  : savingToggle
                  ? "Kaydediliyor…"
                  : isBakeryOpen
                  ? "Mağaza Açık"
                  : "Sipariş Alımı Kapalı"}
              </span>
            </button>
          ) : (
            <div
              className={`inline-flex items-center gap-1.5 px-3 min-h-11 rounded-xl text-xs font-sans font-bold border ${
                isBakeryOpen
                  ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                  : "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isBakeryOpen ? "bg-[#1D5130]" : "bg-[#7D2114]"
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">
                {isBakeryOpen ? "Mağaza Açık" : "Sipariş Kapalı"}
              </span>
            </div>
          )}

          {canCreateOrders && (
            <Link
              href="/admin/siparisler/yeni"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 min-h-11 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-serif font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">Hızlı Sipariş</span>
            </Link>
          )}

          {onToggleSound && (
            <button
              aria-label={soundEnabled ? "Sipariş zilini sessize al" : "Sipariş zilini aç"}
              aria-pressed={soundEnabled}
              type="button"
              onClick={onToggleSound}
              className={`min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl border transition-colors ${
                soundEnabled
                  ? "bg-[#FFFFFF] border-[#E2D3BD] text-[#B4532A] hover:bg-[#F3E9D6]"
                  : "bg-[#F3E9D6] border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A]"
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}

          <Link
            href="/admin/siparisler"
            aria-label={
              pendingOrderCount > 0
                ? `Bekleyen ${pendingOrderCount} sipariş`
                : "Bekleyen siparişler"
            }
            className="relative min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#F3E9D6] transition-colors"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {pendingOrderCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#B4532A] text-white font-mono tabular-nums text-[11px] font-bold flex items-center justify-center border border-[#FBF6EC]">
                {pendingOrderCount}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-[#E2D3BD]">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-serif font-bold text-[#3B1E1A] truncate max-w-[140px]">
                {adminUser?.displayName || "Yönetici"}
              </div>
              <div className="text-[11px] font-mono text-[#6E5148]">
                {getRoleBadgeText(adminUser?.role)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Güvenli çıkış yap"
              className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-[#6E5148] hover:text-[#7D2114] hover:border-[#E7B7AF] hover:bg-[#FCECE9] transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {toggleError && (
        <div
          role="alert"
          className="px-4 sm:px-6 py-2.5 bg-[#FCECE9] border-t border-[#E7B7AF] text-[#7D2114] text-xs font-medium flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{toggleError}</span>
          </span>
          <button
            type="button"
            onClick={() => setToggleError(null)}
            aria-label="Uyarıyı kapat"
            className="min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg hover:bg-[#F7D7D1] text-[#7D2114]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Mağaza Sipariş Alımı Onay Modalı (Native <dialog>) */}
      <dialog
        ref={confirmDialogRef}
        aria-labelledby={confirmTitleId}
        aria-describedby={confirmDescId}
        onClose={handleConfirmDialogClose}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#E2D3BD] bg-[#FFFFFF] p-0 text-[#3B1E1A] shadow-xl overscroll-contain backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                isBakeryOpen
                  ? "bg-[#FCECE9] border-[#E7B7AF] text-[#7D2114]"
                  : "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
              }`}
            >
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 id={confirmTitleId} className="font-serif text-lg font-bold text-[#3B1E1A]">
                {isBakeryOpen
                  ? "Mağaza sipariş alımı kapatılsın mı?"
                  : "Mağaza sipariş alımı açılsın mı?"}
              </h2>
              <p id={confirmDescId} className="text-sm text-[#6E5148] leading-relaxed">
                {isBakeryOpen
                  ? "Onayladığınızda müşteri vitrini anında yeni siparişlere kapanacaktır. Mevcut açık siparişler etkilenmez."
                  : "Onayladığınızda müşteri vitrini tekrar aktif olacak ve yeni sipariş alımı başlayacaktır."}
              </p>
            </div>
          </div>

          <form method="dialog" className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="submit"
              value="cancel"
              autoFocus
              className="min-h-11 px-4 rounded-xl border border-[#E2D3BD] bg-[#FBF6EC] hover:bg-[#F3E9D6] text-sm font-semibold text-[#3B1E1A] transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              value="confirm"
              className={`min-h-11 px-4 rounded-xl text-sm font-bold text-white transition-colors ${
                isBakeryOpen
                  ? "bg-[#B4532A] hover:bg-[#9C4421]"
                  : "bg-[#1D5130] hover:bg-[#163F25]"
              }`}
            >
              {isBakeryOpen ? "Evet, Sipariş Alımını Kapat" : "Evet, Sipariş Alımını Aç"}
            </button>
          </form>
        </div>
      </dialog>
    </header>
  );
}
