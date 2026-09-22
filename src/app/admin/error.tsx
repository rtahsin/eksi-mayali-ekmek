"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Admin Panel Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[400px]">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-1">
          <h2 className="text-xl font-bold font-serif text-stone-100">Panelde Bir Sorun Oluştu</h2>
          <p className="text-sm text-stone-400">
            Beklenmeyen bir hata nedeniyle bu bölüm yüklenemedi. Navigasyon barını kullanarak diğer sayfalara geçebilirsiniz.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 bg-stone-950 rounded-xl text-xs font-mono text-rose-400 border border-stone-800 text-left overflow-x-auto">
            {error.message}
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Bu Bölümü Yeniden Yükle</span>
        </button>
      </div>
    </div>
  );
}
