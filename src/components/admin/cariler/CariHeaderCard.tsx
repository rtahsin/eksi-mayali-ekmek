"use client";

import React from "react";
import { User, Phone, MapPin, Target, Wallet, Send, MessageCircle } from "lucide-react";
import { CariAccount } from "@/types/admin";

interface Props {
  cari: CariAccount | null;
  onSendWhatsApp: () => void;
}

export function CariHeaderCard({ cari, onSendWhatsApp }: Props) {
  if (!cari) return null;

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform group-hover:scale-110 duration-700">
        <User className="w-48 h-48" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-950/50 border border-stone-800 text-[10px] font-bold text-stone-400 tracking-wider">
            <span>Cari No: {cari.id.substring(0, 8).toUpperCase()}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-100 font-serif tracking-tight leading-none">
            {cari.businessName}
          </h1>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-2">
            {cari.contactPerson && (
              <div className="flex items-center gap-2 text-stone-400">
                <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center border border-stone-800 shrink-0">
                  <User className="w-4 h-4 text-stone-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider opacity-60">Yetkili</span>
                  <span className="text-xs font-semibold text-stone-300">{cari.contactPerson}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-stone-400">
              <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center border border-stone-800 shrink-0">
                <Phone className="w-4 h-4 text-stone-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider opacity-60">Telefon</span>
                <span className="text-xs font-semibold font-mono text-stone-300">{cari.phone}</span>
              </div>
            </div>

            {cari.address && (
              <div className="flex items-center gap-2 text-stone-400">
                <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center border border-stone-800 shrink-0">
                  <MapPin className="w-4 h-4 text-stone-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider opacity-60">Adres</span>
                  <span className="text-xs font-medium text-stone-300 line-clamp-2 max-w-[200px]">
                    {cari.address}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
          <div className="bg-stone-950/80 border border-stone-800 p-4 sm:p-5 rounded-2xl flex flex-col md:items-end w-full md:w-auto shadow-inner">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Güncel Bakiye
            </span>
            <div
              className={`text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight ${
                cari.balance > 0
                  ? "text-rose-400"
                  : cari.balance < 0
                  ? "text-emerald-400"
                  : "text-stone-300"
              }`}
            >
              {Math.abs(cari.balance).toLocaleString("tr-TR")} ₺
            </div>
            <div className="text-xs font-semibold mt-1">
              {cari.balance > 0 ? (
                <span className="text-rose-400/80">Alacaklıyız (Bize Borçlu)</span>
              ) : cari.balance < 0 ? (
                <span className="text-emerald-400/80">Borçluyuz (Tahsilat Fazlası)</span>
              ) : (
                <span className="text-stone-500">Bakiye Sıfır</span>
              )}
            </div>
          </div>

          <button
            onClick={onSendWhatsApp}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white border border-[#25D366]/20 font-bold text-xs transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Ekstre Gönder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
