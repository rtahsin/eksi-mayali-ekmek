"use client";

import React from "react";
import { Courier } from "@/types/courier";
import {
  Bike,
  Car,
  Footprints,
  Phone,
  MapPin,
  ExternalLink,
  Edit2,
  Power,
  Clock,
} from "lucide-react";

interface CourierCardProps {
  courier: Courier;
  assignedOrderCount?: number;
  completedOrderCount?: number;
  onEdit: (courier: Courier) => void;
  onToggleShift: (courierId: string, currentShift: boolean) => void;
  onToggleActive: (courierId: string, currentActive: boolean) => void;
}

export function CourierCard({
  courier,
  assignedOrderCount = 0,
  completedOrderCount = 0,
  onEdit,
  onToggleShift,
  onToggleActive,
}: CourierCardProps) {
  const getVehicleIcon = (type: Courier["vehicleType"]) => {
    switch (type) {
      case "motorcycle":
        return <Bike className="w-4 h-4 text-blue-400" />;
      case "car":
        return <Car className="w-4 h-4 text-emerald-400" />;
      case "on_foot":
        return <Footprints className="w-4 h-4 text-amber-400" />;
      default:
        return <Bike className="w-4 h-4 text-blue-400" />;
    }
  };

  const getVehicleLabel = (type: Courier["vehicleType"]) => {
    switch (type) {
      case "motorcycle":
        return "Motosiklet";
      case "car":
        return "Otomobil / Panelvan";
      case "bicycle":
        return "Bisiklet";
      case "on_foot":
        return "Yaya";
    }
  };

  return (
    <div className="bg-[#18130F] border border-[#261E17] rounded-3xl p-5 hover:border-[#F59E0B]/30 transition-all space-y-4 shadow-xl">
      {/* Header: Name, Vehicle, Shift Badge */}
      <div className="flex items-start justify-between gap-3 border-b border-[#261E17] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-[#F7EBD3]">
              {courier.displayName}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                courier.isOnShift
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-stone-800 text-stone-400 border-stone-700"
              }`}
            >
              {courier.isOnShift ? "Vardiyada (Aktif)" : "Vardiya Dışı"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-400 mt-1 font-mono">
            {getVehicleIcon(courier.vehicleType)}
            <span>{getVehicleLabel(courier.vehicleType)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(courier)}
            className="p-2 rounded-xl bg-[#261E17] hover:bg-[#342920] text-stone-300 transition-colors"
            title="Kuryeyi Düzenle"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleShift(courier.id, courier.isOnShift)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
              courier.isOnShift
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-stone-900 text-stone-500 border-stone-800 hover:text-stone-300"
            }`}
            title={courier.isOnShift ? "Vardiyayı Kapat" : "Vardiyayı Başlat"}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-2xl bg-[#120E0B] border border-[#261E17]">
          <span className="text-[10px] font-mono text-stone-500 uppercase block">Atanan Sipariş</span>
          <span className="text-base font-bold text-stone-200">{assignedOrderCount}</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#120E0B] border border-[#261E17]">
          <span className="text-[10px] font-mono text-stone-500 uppercase block">Teslim Edilen</span>
          <span className="text-base font-bold text-emerald-400">{completedOrderCount}</span>
        </div>
      </div>

      {/* Phone and Live Location info */}
      <div className="space-y-2 text-xs text-stone-400">
        <div className="flex items-center justify-between">
          <span className="text-stone-500">Telefon:</span>
          <a
            href={`tel:${courier.phone}`}
            className="font-mono text-[#F59E0B] hover:underline flex items-center gap-1 font-bold"
          >
            <Phone className="w-3 h-3" />
            <span>{courier.phone}</span>
          </a>
        </div>

        {courier.currentLat && courier.currentLng ? (
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] flex items-center justify-between text-blue-300">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Canlı GPS Konumu Var</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${courier.currentLat},${courier.currentLng}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Haritada Gör</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="text-[11px] text-stone-600 italic">
            Henüz GPS sinyali alınmadı
          </div>
        )}
      </div>
    </div>
  );
}
