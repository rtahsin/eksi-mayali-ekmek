"use client";

import React from "react";
import { Loader2, X } from "lucide-react";
import type { StornoDraft } from "@/hooks/useFinanceDashboard";

interface FinanceStornoBannerProps {
  draft: StornoDraft;
  busy: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FinanceStornoBanner({
  draft,
  busy,
  onReasonChange,
  onClose,
  onSubmit,
}: FinanceStornoBannerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl bg-[#FEF3D6] border border-[#E8C587] p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-base font-bold text-[#7A4A0B]">
            Ters Kayıt (Storno) Onayı
          </h2>
          <p className="text-xs text-[#3B1E1A] mt-0.5">
            Muhasebe kaydı silinmez; seçilen işlem (<strong>{draft.label}</strong>) için zıt yönlü storno kaydı oluşturulur.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Storno formunu kapat"
          className="min-w-11 min-h-11 rounded-xl hover:bg-black/5 inline-flex items-center justify-center"
        >
          <X className="w-4 h-4 text-[#7A4A0B]" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft.reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="İptal / düzeltme nedenini yazın (ör. çift fatura girişi)…"
          required
          className="flex-1 min-h-11 px-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8C587] text-sm text-[#3B1E1A]"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 px-4 rounded-xl bg-[#7A4A0B] hover:bg-[#5E3807] text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          <span>Ters Kaydı Kes</span>
        </button>
      </div>
    </form>
  );
}
