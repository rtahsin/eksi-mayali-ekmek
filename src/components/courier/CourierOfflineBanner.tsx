"use client";

import React from "react";
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

interface CourierOfflineBannerProps {
  isOnline: boolean;
  queueLength: number;
  isSyncing: boolean;
  onManualSync: () => void;
}

export function CourierOfflineBanner({
  isOnline,
  queueLength,
  isSyncing,
  onManualSync,
}: CourierOfflineBannerProps) {
  // If online and no queued items, don't show any disruptive banner
  if (isOnline && queueLength === 0 && !isSyncing) {
    return null;
  }

  // 1. Device is completely offline
  if (!isOnline) {
    return (
      <div className="bg-amber-950/80 border-b border-amber-600/40 text-amber-200 px-4 py-2.5 transition-all animate-fadeIn">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold font-serif uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>Çevrimdışı Mod</span>
                <span className="text-xs font-sans px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-semibold">
                  Bağlantı Yok
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-sans leading-tight mt-0.5">
                {queueLength > 0
                  ? `Cihazınızda ${queueLength} adet bekleyen teslimat işlemi kuyrukta kayıtlı.`
                  : "Onaylanan teslimatlar cihazınıza kaydedilecek, internet gelince otomatik gönderilecektir."}
              </p>
            </div>
          </div>

          {queueLength > 0 && (
            <div className="shrink-0 text-center font-mono font-bold text-xs bg-amber-500 text-stone-950 px-2 py-1 rounded-lg">
              {queueLength} Bekliyor
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Back online with pending items in queue
  return (
    <div className="bg-blue-950/80 border-b border-blue-600/40 text-blue-200 px-4 py-2.5 transition-all animate-fadeIn">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          </div>
          <div>
            <div className="text-xs font-bold font-serif uppercase tracking-wider text-blue-300">
              {isSyncing ? "Senkronize Ediliyor..." : "Bağlantı Yeniden Kuruldu"}
            </div>
            <p className="text-xs text-blue-200/80 font-sans leading-tight mt-0.5">
              {isSyncing
                ? `${queueLength} adet çevrimdışı işlem sunucuya aktarılıyor...`
                : `${queueLength} adet bekleyen teslimat işlemi sunucuya gönderilmeyi bekliyor.`}
            </p>
          </div>
        </div>

        {!isSyncing && (
          <button
            type="button"
            onClick={onManualSync}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold font-sans transition-all active:scale-95 shadow-md shadow-blue-900/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Şimdi Gönder</span>
          </button>
        )}
      </div>
    </div>
  );
}
