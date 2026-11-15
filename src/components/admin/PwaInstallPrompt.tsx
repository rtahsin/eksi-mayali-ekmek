"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already in standalone (app) mode
    const checkStandalone = () => {
      const nav = window.navigator as NavigatorWithStandalone;
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // 2. Check if dismissed recently
    const dismissedAt = localStorage.getItem("ekmeklab_pwa_dismissed");
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 5) return; // Don't prompt again for 5 days
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // On iOS Safari, we can show instructions after 2.5 seconds
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // 4. Listen for Chrome/Android `beforeinstallprompt`
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("Install prompt error:", err);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("ekmeklab_pwa_dismissed", Date.now().toString());
  };

  if (isStandalone || !showPrompt || installed) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-2xl p-4 shadow-lg flex items-start gap-3.5 text-[#3B1E1A]">
        {/* App Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] p-1.5 flex items-center justify-center shrink-0 shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold font-serif text-[#3B1E1A] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />
              <span>EkmekLab Yönetim Uygulaması</span>
            </h4>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Kurulum bildirimini kapat"
              className="min-w-9 min-h-9 inline-flex items-center justify-center rounded-lg text-[#6E5148] hover:text-[#3B1E1A] hover:bg-[#F1E6D2] transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-[#6E5148] leading-snug">
            {isIOS
              ? "Uygulamayı iPhone ana ekranınıza eklemek için Safari'de Paylaş simgesine (kare yukarı ok) dokunup 'Ana Ekrana Ekle'yi seçin."
              : "Admin panelini telefonunuza tek dokunuşla tam ekran bağımsız bir uygulama olarak yükleyin."}
          </p>

          {!isIOS && deferredPrompt && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="flex items-center justify-center gap-2 w-full min-h-[44px] py-2 px-3 bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold rounded-xl text-xs transition-colors shadow-xs active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{installing ? "Yükleniyor..." : "Uygulamayı Telefona Yükle"}</span>
              </button>
            </div>
          )}

          {isIOS && (
            <div className="pt-1.5 flex items-center gap-2 text-xs text-[#8E3D1B] font-medium">
              <Share className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Paylaş ➔ Ana Ekrana Ekle</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
