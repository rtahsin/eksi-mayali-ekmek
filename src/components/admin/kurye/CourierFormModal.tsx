"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Save, AlertCircle } from "lucide-react";
import { Courier, CourierVehicleType } from "@/types/courier";
import { useCouriers } from "@/hooks/useCouriers";

interface CourierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier?: Courier | null;
  onSaved?: () => void;
}

export function CourierFormModal({
  isOpen,
  onClose,
  courier,
  onSaved,
}: CourierFormModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<CourierVehicleType>("motorcycle");
  const [isActive, setIsActive] = useState(true);
  const [isOnShift, setIsOnShift] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createCourier, updateCourier } = useCouriers();

  useEffect(() => {
    if (courier) {
      setDisplayName(courier.displayName);
      setPhone(courier.phone);
      setVehicleType(courier.vehicleType);
      setIsActive(courier.isActive);
      setIsOnShift(courier.isOnShift);
    } else {
      setDisplayName("");
      setPhone("");
      setVehicleType("motorcycle");
      setIsActive(true);
      setIsOnShift(false);
    }
  }, [courier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !phone.trim()) {
      setError("Kurye adı ve telefon numarası zorunludur.");
      return;
    }

    setLoading(true);
    setError(null);

    let res;
    if (courier) {
      res = await updateCourier(courier.id, {
        displayName: displayName.trim(),
        phone: phone.trim(),
        vehicleType,
        isActive,
        isOnShift,
      });
    } else {
      res = await createCourier({
        displayName: displayName.trim(),
        phone: phone.trim(),
        vehicleType,
      });
    }

    setLoading(false);

    if (res.success) {
      if (onSaved) onSaved();
      onClose();
    } else {
      setError(res.error || "İşlem sırasında bir hata oluştu.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#18130F] border border-[#261E17] rounded-3xl p-6 text-stone-100 shadow-2xl space-y-5 overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#261E17] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#F7EBD3]">
                {courier ? "Kurye Bilgilerini Güncelle" : "Yeni Kurye Ekle"}
              </h3>
              <p className="text-[11px] text-stone-400">
                {courier ? courier.displayName : "Dağıtım ekibine yeni kurye tanımlayın"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-[#261E17] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Kurye Adı Soyadı:
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Örn: Mehmet Demir"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#120E0B] border border-[#261E17] text-stone-100 focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Telefon Numarası:
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Örn: 0532 123 4567"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#120E0B] border border-[#261E17] text-stone-100 font-mono focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div>
            <label className="block text-stone-300 font-medium mb-1">
              Dağıtım Araç Tipi:
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as CourierVehicleType)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#120E0B] border border-[#261E17] text-stone-100 focus:outline-none focus:border-[#F59E0B]"
            >
              <option value="motorcycle">🏍️ Motosiklet</option>
              <option value="car">🚗 Otomobil / Panelvan</option>
              <option value="bicycle">🚲 Bisiklet</option>
              <option value="on_foot">🚶 Yaya Kurye</option>
            </select>
          </div>

          {courier && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#120E0B] border border-[#261E17] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOnShift}
                  onChange={(e) => setIsOnShift(e.target.checked)}
                  className="w-4 h-4 accent-[#F59E0B] rounded"
                />
                <span className="text-xs text-stone-300">Vardiyada (Aktif)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#120E0B] border border-[#261E17] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#F59E0B] rounded"
                />
                <span className="text-xs text-stone-300">Hesap Aktif</span>
              </label>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-[#261E17] hover:bg-[#342920] text-stone-300 font-medium transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : courier ? "Güncelle" : "Kurye Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
