"use client";

import React, { useEffect, useId, useRef } from "react";
import { Printer, X } from "lucide-react";
import { CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";
import type { StudyoIssue } from "@/types/studyo";

interface GazeteSheetModalProps {
  open: boolean;
  onClose: () => void;
  issue: StudyoIssue;
}

export function GazeteSheetModal({ open, onClose, issue }: GazeteSheetModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const qrUrl = `/api/admin/studyo/qr?path=${encodeURIComponent(
    issue.newspaper.qrTargetPath
  )}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      closedby="any"
      onClose={onClose}
      className="studyo-modal-dialog m-auto w-[min(96vw,740px)] max-h-[92dvh] rounded-3xl bg-[#FBF6EC] text-[#3B1E1A] border border-[#E2D3BD] p-0 shadow-2xl open:flex open:flex-col"
    >
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#E2D3BD] bg-[#F6EEDF] print:hidden">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#6E5148]">
            Otomatik Yan Ürün · A5 Kese Kâğıdı Gazetesi
          </p>
          <h2 id={titleId} className="font-serif text-base font-bold text-[#3B1E1A]">
            {issue.newspaper.headline}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-11 px-4 rounded-xl bg-[#B4532A] text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Yazdır / PDF Kaydet</span>
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Kapat"
            className="min-w-11 min-h-11 rounded-xl bg-white border border-[#E2D3BD] text-[#3B1E1A] inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="overflow-y-auto p-6 sm:p-8 space-y-5 overflow-visible">
        <article className="rounded-2xl border-2 border-[#3B1E1A] bg-[#FBF6EC] p-6 space-y-5 overflow-visible pb-2">
          <div className="border-b-2 border-[#3B1E1A] pb-3 flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-[#6E5148]">
                {SITE_NAME} Fırın Evi Bilim Bülteni · {CONTACT.area}
              </p>
              <h3 className="font-serif text-2xl font-bold text-[#3B1E1A] leading-normal pb-1">
                {issue.newspaper.headline}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#3B1E1A] text-[#FBF6EC] font-mono text-xs font-bold">
              {issue.konuId} · {issue.ftsPaperCount} Tam Metin Kanıt
            </span>
          </div>

          <p className="font-serif italic text-base text-[#6E5148] leading-normal">
            {issue.newspaper.subheadline}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] space-y-1.5">
              <h4 className="font-mono text-xs font-bold uppercase text-[#8E3D1B]">
                Hamurda ve Fırında Ne Olur?
              </h4>
              <p className="text-sm leading-normal text-[#3B1E1A] pb-1">
                {issue.newspaper.leadFact}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F6EEDF] border border-[#E2D3BD] space-y-1.5">
              <h4 className="font-mono text-xs font-bold uppercase text-[#8E3D1B]">
                Efsane Mahkemesi: &ldquo;{issue.newspaper.mythTitle}&rdquo;
              </h4>
              <p className="text-sm leading-normal text-[#3B1E1A] pb-1">
                {issue.newspaper.mythCorrection}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2D3BD] space-y-1">
            <h4 className="font-mono text-xs font-bold uppercase text-[#3B1E1A]">
              Fırıncının Tezgâh Kuralı
            </h4>
            <p className="text-sm leading-normal text-[#3B1E1A] pb-1">
              {issue.newspaper.benchRule}
            </p>
          </div>

          <div className="pt-3 border-t border-[#E2D3BD] flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1 max-w-md">
              <p className="text-xs font-bold text-[#3B1E1A]">
                Taş Fırın Sofra Eşleşmesi: {issue.newspaper.pairingNote}
              </p>
              <p className="text-xs font-mono text-[#6E5148]">
                Tüm grafikler ve tam metin kaynakça: {SITE_URL}
                {issue.newspaper.qrTargetPath}
              </p>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E2D3BD]">
              <img
                src={qrUrl}
                alt={`${issue.konuId} Bilim QR`}
                width={84}
                height={84}
                className="w-21 h-21 block"
              />
              <div className="text-[11px] font-mono text-[#3B1E1A] leading-snug">
                <div className="font-bold">Kamerayla Okutun</div>
                <div className="text-[#6E5148]">Bilim Odası &amp;</div>
                <div className="text-[#6E5148]">Taze Somun Takvimi</div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </dialog>
  );
}
