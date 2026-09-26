"use client";

import React from "react";
import { Courier } from "@/types/courier";
import { X } from "lucide-react";

interface DagitimDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  couriers: Courier[];
  dispatchCourierId: string;
  onDispatchCourierIdChange: (id: string) => void;
  onConfirm: () => void;
  isBatchUpdating: boolean;
}

export function DagitimDispatchModal({
  isOpen,
  onClose,
  couriers,
  dispatchCourierId,
  onDispatchCourierIdChange,
  onConfirm,
  isBatchUpdating,
}: DagitimDispatchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              Toplu Dağıtım Onayı
            </span>
            <h3 className="text-lg font-bold font-serif text-stone-100 mt-0.5">
              Hepsini Yola Çıkar
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-300 leading-relaxed">
          Hazırlanmış ve bekleyen tüm siparişler <strong>&apos;Kuryede&apos;</strong> durumuna alınacak ve müşterilere canlı takip açılacaktır. Hangi kuryeye atanmasını istersiniz?
        </p>

        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-400">Kurye Seçimi:</label>
          <select
            value={dispatchCourierId}
            onChange={(e) => onDispatchCourierIdChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="keep">Mevcut Atanmış Kuryeleri Koru (Değiştirme)</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                Tümünü &quot;{c.displayName}&quot; Kuryesine Ata ({c.vehicleType === "motorcycle" ? "Moto" : "Araba"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-medium hover:bg-stone-700"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={isBatchUpdating}
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow"
          >
            {isBatchUpdating ? "Güncelleniyor..." : "Yola Çıkışı Onayla 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
