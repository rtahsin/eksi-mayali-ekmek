"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin unhandled error:", error);
    Sentry.captureException(error, {
      tags: { boundary: "admin-error" },
    });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-stone-200">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold font-serif text-stone-100">Yönetim Panelinde Bir Sorun Oluştu</h2>
          <p className="text-xs text-stone-400">
            Hata otomatik olarak Sentry hata izleme sistemine kaydedildi.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-stone-950 rounded-xl text-xs font-mono text-rose-400 border border-stone-800 text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-artisan-terracotta hover:bg-artisan-terracotta-dark text-white font-bold text-xs rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tekrar Dene</span>
        </button>
      </div>
    </div>
  );
}
