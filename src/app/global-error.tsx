"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#120E0B] text-stone-200 font-sans min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-serif text-stone-100">Kritik Bir Hata Oluştu</h1>
            <p className="text-sm text-stone-400">
              Sistem beklenmeyen bir durumla karşılaştı. Uygulamanın tamamen çökmemesi için bu ekran gösteriliyor.
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
            <span>Sistemi Yeniden Başlat</span>
          </button>
        </div>
      </body>
    </html>
  );
}
