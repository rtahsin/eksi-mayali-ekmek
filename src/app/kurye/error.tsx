"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function CourierError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Courier console unhandled error:", error);
    Sentry.captureException(error, {
      tags: { boundary: "courier-error" },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-[#120E0B] text-stone-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold font-serif text-stone-100">Kurye Konsolunda Hata Oluştu</h2>
          <p className="text-xs text-stone-400">
            Hata otomatik olarak Sentry izleme paneline kaydedildi. Çevrimdışı kayıtlarınız kaybolmaz.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-stone-950 rounded-xl text-xs font-mono text-rose-400 border border-stone-800 text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Konsolu Yeniden Başlat</span>
        </button>
      </div>
    </div>
  );
}
