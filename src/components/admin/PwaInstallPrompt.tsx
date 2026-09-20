"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share, PlusSquare, Check } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already in standalone (app) mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
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
      // On iOS Safari, we can show instructions after 2 seconds
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // 4. Listen for Chrome/Android `beforeinstallprompt`
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Also check if appinstalled event fires
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#1A1410] border border-artisan-gold/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3.5 text-stone-200">
        
        {/* App Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#F7EBD3] p-1.5 flex items-center justify-center shrink-0 shadow-md">
          <img src="/logo/logo_mark.png" alt="EkmekLab" className="w-full h-full object-contain" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-serif text-stone-100 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
              <span>EkmekLab Yönetim Uygulaması</span>
            </h4>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-stone-400 leading-snug">
            {isIOS
              ? "Uygulamayı iPhone ana ekranınıza eklemek için Safari'de Paylaş simgesine (kare yukarı ok) dokunup 'Ana Ekrana Ekle'yi seçin."
              : "Admin panelini telefonunuza tek dokunuşla tam ekran bağımsız bir uygulama olarak yükleyin."}
          </p>

          {!isIOS && deferredPrompt && (
            <div className="pt-2">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{installing ? "Yükleniyor..." : "Uygulamayı Telefona Yükle"}</span>
              </button>
            </div>
          )}

          {isIOS && (
            <div className="pt-1.5 flex items-center gap-2 text-[10px] text-amber-400/90 font-medium">
              <Share className="w-3.5 h-3.5" />
              <span>Paylaş ➔ Ana Ekrana Ekle</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
