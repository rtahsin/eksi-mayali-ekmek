"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  Radio,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  User,
  ArrowLeft,
} from "lucide-react";
import { Courier } from "@/types/courier";

interface CourierHeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  gpsActive: boolean;
  gpsAccuracy: number | null;
  onToggleGps: () => void;
  soundAlert: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  selectedCourierId: string;
  onSelectCourier: (id: string) => void;
  couriers: Courier[];
}

export function CourierHeader({
  selectedDate,
  onDateChange,
  gpsActive,
  gpsAccuracy,
  onToggleGps,
  soundAlert,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  selectedCourierId,
  onSelectCourier,
  couriers,
}: CourierHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#120E0B]/95 backdrop-blur-md border-b border-[#261E17] px-4 py-2.5 shadow-xl">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Branding & Date Picker */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="p-2 -ml-1 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
            title="Admin Paneline Dön"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-stone-950 font-bold shadow-md shadow-amber-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold font-serif text-stone-100 uppercase tracking-wider">
                  Kurye Konsolu
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-[11px] font-mono text-amber-400 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Controls (GPS, Sound, Fullscreen) */}
        <div className="flex items-center gap-1.5">
          {/* GPS Status / Toggle */}
          <button
            type="button"
            onClick={onToggleGps}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              gpsActive
                ? "bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-950/50"
                : "bg-stone-800 border border-stone-700 text-stone-300 hover:text-white"
            }`}
            title="Canlı GPS Konum Paylaşımını Başlat / Durdur"
          >
            <Radio className={`w-3.5 h-3.5 ${gpsActive ? "animate-pulse text-emerald-400" : "text-stone-400"}`} />
            <span className="text-[11px]">{gpsActive ? `±${gpsAccuracy}m` : "GPS Başlat"}</span>
          </button>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700"
            title="Ses ve Titreşim Bildirimi"
          >
            {soundAlert ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700"
            title="Tam Ekran"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Courier Selector Pill Strip */}
      <div className="max-w-xl mx-auto mt-2 pt-2 border-t border-stone-800/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-stone-400">
          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-medium">Aktif Kurye:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onSelectCourier("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCourierId === "all"
                ? "bg-amber-500 text-stone-950 font-bold shadow-sm"
                : "bg-stone-800/80 text-stone-400 hover:text-stone-200"
            }`}
          >
            Tümü
          </button>

          {couriers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCourier(c.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedCourierId === c.id
                  ? "bg-amber-500 text-stone-950 font-bold shadow-sm"
                  : "bg-stone-800/80 text-stone-400 hover:text-stone-200"
              }`}
            >
              <span>{c.displayName}</span>
              {c.isOnShift && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onSelectCourier("unassigned")}
            className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
              selectedCourierId === "unassigned"
                ? "bg-amber-500 text-stone-950 font-bold"
                : "bg-stone-800/60 text-stone-500 hover:text-stone-300"
            }`}
          >
            Atanmamış
          </button>
        </div>
      </div>
    </header>
  );
}
