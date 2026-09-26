"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, ShieldCheck, X, Navigation, AlertCircle } from "lucide-react";

interface LocationConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsentGiven: (lat: number, lng: number) => void;
  orderId?: string;
}

export function LocationConsentModal({
  isOpen,
  onClose,
  onConsentGiven,
}: LocationConsentModalProps) {
  const [requesting, setRequesting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("Tarayıcınız konum servisini desteklemiyor.");
      return;
    }

    setRequesting(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRequesting(false);
        onConsentGiven(pos.coords.latitude, pos.coords.longitude);
        onClose();
      },
      (err) => {
        setRequesting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Konum erişimi reddedildi. Tarayıcı adres çubuğundan konum izni veriniz.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("Cihazınızın GPS sinyali alınamadı.");
        } else {
          setGeoError("Konum alınırken bir hata oluştu.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#18130F] border border-[#261E17] rounded-2xl shadow-2xl p-6 text-[#F7EBD3] overflow-hidden">
        {/* Amber glow decoration */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-200 hover:bg-[#261E17] rounded-lg transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#F7EBD3]">Canlı Konum Paylaşımı</h3>
            <span className="text-xs text-[#F59E0B] font-medium tracking-wide">İsteğe Bağlı Kolaylık</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-stone-300 leading-relaxed mb-4">
          Kuryemizin taze ekşi mayalı ekmeklerinizi kapınıza en hızlı ve sıcak şekilde ulaştırabilmesi
          için konumunuzu kuryeyle anlık olarak paylaşabilirsiniz.
        </p>

        {/* KVKK Information Box */}
        <div className="bg-[#120E0B] border border-[#261E17] rounded-xl p-3.5 mb-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="text-xs text-stone-400 leading-snug">
            <strong className="text-stone-200 block mb-1">KVKK & Gizlilik Güvencesi:</strong>
            Konum bilginiz sadece bu teslimat için kurye ekranında görüntülenir. Teslimat tamamlandıktan 72 saat sonra
            otomatik ve kalıcı olarak sistemimizden silinir.{" "}
            <Link
              href="/kvkk"
              target="_blank"
              className="text-[#F59E0B] hover:underline inline-block mt-0.5"
            >
              Aydınlatma Metni →
            </Link>
          </div>
        </div>

        {/* Error notification if geolocation denied */}
        {geoError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 sm:flex-row-reverse">
          <button
            onClick={handleRequestLocation}
            disabled={requesting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#C85A32] text-black font-semibold text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {requesting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Konum Alınıyor...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-current" />
                <span>Konumumu Paylaş</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={requesting}
            className="py-3 px-4 rounded-xl bg-[#261E17] hover:bg-[#342920] text-stone-300 font-medium text-sm transition-colors text-center"
          >
            Şimdi Değil
          </button>
        </div>
      </div>
    </div>
  );
}
