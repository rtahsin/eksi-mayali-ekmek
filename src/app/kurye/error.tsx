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
    <div className="min-h-screen bg-[#F6EEDF] text-[#3B1E1A] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#E2D3BD] rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] flex items-center justify-center mx-auto text-[#B4532A]">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold font-serif text-[#3B1E1A]">Kurye Konsolunda Hata Oluştu</h2>
          <p className="text-xs text-[#6E5148]">
            Hata otomatik olarak Sentry izleme paneline kaydedildi. Çevrimdışı kayıtlarınız kaybolmaz.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-[#FBF6EC] rounded-xl text-xs font-mono text-rose-700 border border-[#E2D3BD] text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <button
          type="button"
          onClick={() => reset()}
          className="w-full min-h-11 flex items-center justify-center gap-2 py-3 px-4 bg-[#B4532A] hover:bg-[#974220] text-white font-bold text-xs rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          <span>Konsolu Yeniden Başlat</span>
        </button>
      </div>
    </div>
  );
}
