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
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-[#3B1E1A]">
      <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-6 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#FEF3D6] border border-[#E8C587] flex items-center justify-center mx-auto text-[#7A4A0B]">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold font-serif text-[#3B1E1A]">Yönetim Panelinde Bir Sorun Oluştu</h2>
          <p className="text-xs text-[#6E5148]">
            Hata otomatik olarak Sentry hata izleme sistemine kaydedildi.
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
          className="w-full min-h-11 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold text-xs rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tekrar Dene</span>
        </button>
      </div>
    </div>
  );
}
