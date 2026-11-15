"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { X, UserPlus, AlertCircle } from "lucide-react";
import { Courier, CourierVehicleType } from "@/types/courier";
import { useCouriers } from "@/hooks/useCouriers";

interface CourierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier?: Courier | null;
  onSaved?: () => void;
}

function isOutsideDialog(e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement): boolean {
  const r = dialog.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();
  const nameId = useId();
  const phoneId = useId();
  const vehicleId = useId();
  const shiftId = useId();
  const activeId = useId();

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
    setError(null);
  }, [courier, isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.returnValue = "";
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(e) => {
        e.currentTarget.returnValue = "";
        onClose();
      }}
      onPointerDown={(e) => {
        pressedOutsideRef.current = isOutsideDialog(e, e.currentTarget);
      }}
      onPointerUp={(e) => {
        if (pressedOutsideRef.current && isOutsideDialog(e, e.currentTarget)) {
          onClose();
        }
        pressedOutsideRef.current = false;
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-[#FFFFFF] border border-[#E2D3BD] p-0 text-[#3B1E1A] shadow-2xl overscroll-contain backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain"
    >
      {isOpen && (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2D3BD] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] flex items-center justify-center text-[#B4532A]">
                <UserPlus className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 id={titleId} className="font-serif font-bold text-base text-[#3B1E1A]">
                  {courier ? "Kurye Bilgilerini Güncelle" : "Yeni Kurye Ekle"}
                </h3>
                <p className="text-xs text-[#6E5148]">
                  {courier ? courier.displayName : "Dağıtım ekibine yeni kurye tanımlayın"}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Kurye formunu kapat"
              onClick={onClose}
              className="min-w-10 min-h-10 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#6E5148] hover:text-[#3B1E1A] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label htmlFor={nameId} className="block text-[#3B1E1A] font-semibold mb-1">
                Kurye Adı Soyadı:
              </label>
              <input
                id={nameId}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Örn: Mehmet Demir"
                required
                autoComplete="name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
            </div>

            <div>
              <label htmlFor={phoneId} className="block text-[#3B1E1A] font-semibold mb-1">
                Telefon Numarası:
              </label>
              <input
                id={phoneId}
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Örn: 0532 123 4567"
                required
                autoComplete="tel"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              />
            </div>

            <div>
              <label htmlFor={vehicleId} className="block text-[#3B1E1A] font-semibold mb-1">
                Dağıtım Araç Tipi:
              </label>
              <select
                id={vehicleId}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as CourierVehicleType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] text-sm text-[#3B1E1A] focus:outline-none focus:ring-2 focus:ring-[#B4532A]"
              >
                <option value="motorcycle">Motosiklet</option>
                <option value="car">Otomobil / Panelvan</option>
                <option value="bicycle">Bisiklet</option>
                <option value="on_foot">Yaya Kurye</option>
              </select>
            </div>

            {courier && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label
                  htmlFor={shiftId}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] cursor-pointer"
                >
                  <input
                    id={shiftId}
                    type="checkbox"
                    checked={isOnShift}
                    onChange={(e) => setIsOnShift(e.target.checked)}
                    className="w-4 h-4 accent-[#B4532A] rounded"
                  />
                  <span className="text-xs font-medium text-[#3B1E1A]">Vardiyada (Aktif)</span>
                </label>

                <label
                  htmlFor={activeId}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] cursor-pointer"
                >
                  <input
                    id={activeId}
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#B4532A] rounded"
                  />
                  <span className="text-xs font-medium text-[#3B1E1A]">Hesap Aktif</span>
                </label>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="p-2.5 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-[#E2D3BD]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="min-h-11 px-4 py-2.5 rounded-xl bg-[#FBF6EC] hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] font-semibold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 px-5 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold shadow-xs active:scale-95 transition-colors disabled:opacity-50"
              >
                {loading ? "Kaydediliyor..." : courier ? "Güncelle" : "Kurye Oluştur"}
              </button>
            </div>
          </form>
        </div>
      )}
    </dialog>
  );
}
