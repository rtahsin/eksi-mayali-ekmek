"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "global-error" },
    });
  }, [error]);

  return (
    <html lang="tr">
      <body className="bg-[#F6EEDF] text-[#3B1E1A] font-sans min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-3xl p-6 shadow-md text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3D6] border border-[#E8C587] flex items-center justify-center mx-auto text-[#7A4A0B]">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-serif text-[#3B1E1A]">
              Beklenmeyen Bir Durum Oluştu
            </h1>
            <p className="text-sm text-[#6E5148]">
              Hata otomatik olarak izleme sistemine kaydedildi. Sayfayı yeniden yükleyerek devam edebilirsiniz.
            </p>
          </div>

          {error?.message && (
            <div
              role="alert"
              className="p-3 bg-[#FCECE9] rounded-xl text-xs font-mono text-[#7D2114] border border-[#E7B7AF] text-left overflow-x-auto"
            >
              {error.message}
            </div>
          )}

          <button
            type="button"
            onClick={() => reset()}
            className="w-full min-h-11 flex items-center justify-center gap-2 py-3 px-4 bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold text-sm rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Uygulamayı Yeniden Başlat</span>
          </button>
        </div>
      </body>
    </html>
  );
}
