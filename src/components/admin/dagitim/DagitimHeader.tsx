"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Truck, Tag, Map as MapIcon, MessageCircle, Printer } from "lucide-react";

interface DagitimHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onBulkLabelsOpen: () => void;
  onMapOpen: () => void;
  onShareWhatsApp: () => void;
  onPrint: () => void;
}

export function DagitimHeader({
  selectedDate,
  onDateChange,
  onBulkLabelsOpen,
  onMapOpen,
  onShareWhatsApp,
  onPrint,
}: DagitimHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/siparisler"
          className="p-2 rounded-xl bg-[#1A1410] border border-[#2F241D] text-foreground/70 hover:text-artisan-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Kurye Dağıtım & Rota Masası
          </h1>
          <p className="text-xs text-foreground/60 font-sans mt-0.5">
            Beylikdüzü mahalle bazlı sıralı teslimat rotası, kurye atama ve canlı navigasyon
          </p>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-[#1A1410] border border-[#2A201A] text-xs text-foreground font-mono focus:outline-none focus:border-artisan-gold"
        />

        {/* Courier Console Link */}
        <Link
          href="/kurye"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-sans font-bold shadow-md shadow-amber-500/20 transition-all"
          title="Kurye Mobil Konsolunu Başlat"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>🛵 Kurye Konsolu</span>
        </Link>

        {/* Bulk Labels Modal Button */}
        <button
          type="button"
          onClick={onBulkLabelsOpen}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#221A14] hover:bg-[#2C211A] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
          title="Torba ve Paket Etiketlerini Toplu Yazdır"
        >
          <Tag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Paket Etiketleri</span>
        </button>

        {/* Live Map Button */}
        <button
          type="button"
          onClick={onMapOpen}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-sans font-bold transition-all"
          title="Canlı Harita Görünümünü Aç"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Harita</span>
        </button>

        {/* WhatsApp Share Button */}
        <button
          type="button"
          onClick={onShareWhatsApp}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 text-xs font-sans font-medium transition-all"
          title="Rotayı ve Harita Linklerini Kuryeye Gönder"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>

        {/* Print Manifest */}
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#221A14] hover:bg-[#2C211A] border border-artisan-gold/30 text-artisan-gold text-xs font-sans font-medium transition-all"
          title="Manifesto Yazdır"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
