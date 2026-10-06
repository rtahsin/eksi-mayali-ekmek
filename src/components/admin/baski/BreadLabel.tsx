"use client";

import React from "react";
import { siteHost } from "@/lib/print/ref";

export interface BreadLabelProps {
  productName: string;
  tagline?: string | null;
  slug: string;
  refCode?: string | null;
  qrDataUrl: string;
  offsetX?: number; // mm
  offsetY?: number; // mm
  className?: string;
}

/**
 * 50mm × 70mm (5×7 cm) Ekmek Torbası / Ambalaj Etiketi
 * Şartname: Logo + Ekmek Adı + İsteğe bağlı tek satır + QR kod.
 * Kısıtlamalar: Adres, tarih ve gramaj KESİNLİKLE yer almaz.
 */
export function BreadLabel({
  productName,
  tagline,
  qrDataUrl,
  offsetX = 0,
  offsetY = 0,
  className = "",
}: BreadLabelProps) {
  const host = siteHost();

  return (
    <div
      className={`relative bg-white text-black font-sans box-border overflow-hidden select-none ${className}`}
      style={{
        width: "50mm",
        height: "70mm",
        maxWidth: "50mm",
        maxHeight: "70mm",
        colorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* Inner offset container for thermal printer calibration */}
      <div
        className="w-full h-full flex flex-col justify-between items-center text-center p-[3mm] box-border"
        style={{
          transform: `translate(${offsetX}mm, ${offsetY}mm)`,
        }}
      >
        {/* 1. Header: Logo & Atölye Kimliği */}
        <div className="w-full flex flex-col items-center shrink-0 pt-[1mm]">
          <div className="flex items-center justify-center gap-1">
            <span className="font-serif font-black tracking-[0.2em] text-[11pt] leading-none uppercase text-black">
              EKMEKLAB
            </span>
          </div>
          <span className="font-mono text-[5pt] tracking-[0.25em] uppercase text-stone-700 mt-[1mm] font-semibold">
            TAŞ FIRIN ATÖLYESİ
          </span>
          <div className="w-4/5 h-[0.4mm] bg-black mt-[1.5mm]" />
        </div>

        {/* 2. Middle: Ekmek Adı + İsteğe Bağlı Tek Satır */}
        <div className="w-full flex-1 flex flex-col items-center justify-center px-[1mm] my-[1mm]">
          <h1
            className="font-serif font-black text-black leading-[1.1] tracking-tight uppercase"
            style={{
              fontSize: productName.length > 24 ? "9.5pt" : productName.length > 16 ? "11pt" : "12.5pt",
              wordBreak: "break-word",
            }}
          >
            {productName}
          </h1>

          {tagline && tagline.trim() !== "" && (
            <p className="font-sans font-medium text-[6.5pt] leading-tight text-stone-800 mt-[1.5mm] line-clamp-2 max-w-[42mm]">
              {tagline.trim()}
            </p>
          )}
        </div>

        {/* 3. Bottom: QR Kod & Web Adresi */}
        <div className="w-full flex flex-col items-center shrink-0 pb-[1mm]">
          {/* QR Code Container */}
          <div className="w-[27mm] h-[27mm] flex items-center justify-center bg-white p-[0.5mm]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR: ${productName}`}
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div className="w-full h-full border border-dashed border-stone-300 flex items-center justify-center text-[6pt] text-stone-400">
                QR
              </div>
            )}
          </div>

          <div className="flex flex-col items-center mt-[1mm] space-y-[0.3mm]">
            <span className="font-mono text-[4.8pt] font-semibold tracking-[0.15em] text-stone-700 uppercase">
              Hikâyesi İçin Okutun
            </span>
            <span className="font-mono text-[6.5pt] font-bold tracking-[0.1em] text-black">
              {host}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
