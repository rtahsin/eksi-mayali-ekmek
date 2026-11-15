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
}: CourierCardProps) {
  const getVehicleIcon = (type: Courier["vehicleType"]) => {
    switch (type) {
      case "motorcycle":
        return <Bike className="w-4 h-4 text-[#24476B]" aria-hidden="true" />;
      case "car":
        return <Car className="w-4 h-4 text-[#1D5130]" aria-hidden="true" />;
      case "on_foot":
        return <Footprints className="w-4 h-4 text-[#8E3D1B]" aria-hidden="true" />;
      default:
        return <Bike className="w-4 h-4 text-[#24476B]" aria-hidden="true" />;
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
    <div className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 hover:border-[#B4532A]/40 transition-colors space-y-4 shadow-xs">
      {/* Header: Name, Vehicle, Shift Badge */}
      <div className="flex items-start justify-between gap-3 border-b border-[#E2D3BD] pb-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif font-bold text-base text-[#3B1E1A]">
              {courier.displayName}
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                courier.isOnShift
                  ? "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC]"
                  : "bg-[#F1E6D2] text-[#6E5148] border-[#E2D3BD]"
              }`}
            >
              {courier.isOnShift ? "Vardiyada (Aktif)" : "Vardiya Dışı"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#6E5148] mt-1 font-mono">
            {getVehicleIcon(courier.vehicleType)}
            <span>{getVehicleLabel(courier.vehicleType)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(courier)}
            aria-label={`${courier.displayName} düzenle`}
            className="min-w-10 min-h-10 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] inline-flex items-center justify-center transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggleShift(courier.id, courier.isOnShift)}
            aria-label={courier.isOnShift ? "Vardiyayı kapat" : "Vardiyayı başlat"}
            aria-pressed={courier.isOnShift}
            className={`min-w-10 min-h-10 rounded-xl border text-xs font-semibold inline-flex items-center justify-center transition-colors ${
              courier.isOnShift
                ? "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC] hover:bg-[#D7E8DC]"
                : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:text-[#3B1E1A] hover:bg-[#F1E6D2]"
            }`}
          >
            <Power className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD]">
          <span className="text-xs font-mono text-[#6E5148] uppercase block">Atanan Sipariş</span>
          <span className="text-base font-bold font-mono tabular-nums text-[#3B1E1A]">{assignedOrderCount}</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD]">
          <span className="text-xs font-mono text-[#6E5148] uppercase block">Teslim Edilen</span>
          <span className="text-base font-bold font-mono tabular-nums text-[#1D5130]">{completedOrderCount}</span>
        </div>
      </div>

      {/* Phone and Live Location info */}
      <div className="space-y-2 text-xs text-[#6E5148]">
        <div className="flex items-center justify-between">
          <span className="text-[#6E5148]">Telefon:</span>
          <a
            href={`tel:${courier.phone}`}
            className="font-mono tabular-nums text-[#8E3D1B] hover:underline flex items-center gap-1 font-bold"
          >
            <Phone className="w-3 h-3" aria-hidden="true" />
            <span>{courier.phone}</span>
          </a>
        </div>

        {courier.currentLat && courier.currentLng ? (
          <div className="p-2.5 rounded-xl bg-[#EEF3F8] border border-[#C5D5E4] text-xs flex items-center justify-between text-[#24476B]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Canlı GPS Konumu Var</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${courier.currentLat},${courier.currentLng}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#24476B] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Haritada Gör</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="text-xs text-[#6E5148] italic">
            Henüz GPS sinyali alınmadı
          </div>
        )}
      </div>
    </div>
  );
}
