"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Save,
  MapPin,
  Volume2,
  Power,
  Megaphone,
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { BEYLIKDUZU_NEIGHBORHOODS } from "@/types/admin";
import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";

export default function AdminSettingsPage() {
  const { adminUser } = useAdminAuth();

  // Operational Settings state
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1000);
  const [shippingFee, setShippingFee] = useState<number>(150);
  const [deliveryWindow, setDeliveryWindow] = useState<string>("14:00 - 18:00");
  const [orderCutoffTime, setOrderCutoffTime] = useState<string>("12:00");
  const [whatsappPhone, setWhatsappPhone] = useState<string>("0501 012 66 53");
  const [orderAcceptanceOpen, setOrderAcceptanceOpen] = useState<boolean>(true);
  const [announcementText, setAnnouncementText] = useState<string>("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);
  const [audioTesting, setAudioTesting] = useState(false);

  // Fetch operational settings from the admin API
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.operational) {
          if (data.operational.freeShippingThreshold !== undefined) {
            setFreeShippingThreshold(Number(data.operational.freeShippingThreshold));
          }
          if (data.operational.shippingFee !== undefined) {
            setShippingFee(Number(data.operational.shippingFee));
          }
          if (data.operational.deliveryWindow) {
            setDeliveryWindow(data.operational.deliveryWindow);
          }
          if (data.operational.orderCutoffTime) {
            setOrderCutoffTime(data.operational.orderCutoffTime);
          }
          if (data.operational.whatsappPhone) {
            setWhatsappPhone(data.operational.whatsappPhone);
          }
          if (data.operational.orderAcceptanceOpen !== undefined) {
            setOrderAcceptanceOpen(Boolean(data.operational.orderAcceptanceOpen));
          }
          if (data.operational.announcementText !== undefined) {
            setAnnouncementText(data.operational.announcementText);
          }
        }
      }
    } catch (err) {
      console.error("Load settings error:", err);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Supabase Realtime channel for instant settings updates
    const supabase = createClient();
    if (!supabase) return;

    const channelId = `bakery_settings_admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bakery_settings" },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSettings]);

  // Save Operational Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_operational",
          value: {
            freeShippingThreshold: Number(freeShippingThreshold),
            shippingFee: Number(shippingFee),
            deliveryWindow,
            orderCutoffTime,
            whatsappPhone,
            orderAcceptanceOpen,
            announcementText,
            updatedAt: new Date().toISOString(),
            updatedBy: adminUser?.email || "admin",
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Ayarlar kaydedilemedi");
      }

      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err: unknown) {
      alert("Hata: " + getErrorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  };

  // Test Chime Sound
  const playTestChime = () => {
    try {
      setAudioTesting(true);
      const audio = new Audio("/audio/new-order.mp3");
      audio.play().catch(() => {
        // Fallback tone
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      });
      setTimeout(() => setAudioTesting(false), 1500);
    } catch (err) {
      setAudioTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-stone-900/80 p-6 rounded-2xl border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fırın Operasyon & Sistem Konfigürasyonu</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif">
            Fırın Ayarları
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Beylikdüzü kurye ücreti, sipariş kabul durumunu ve bildirimleri yapılandırın.
          </p>
        </div>

        {/* Chime Sound Test Button */}
        <button
          onClick={playTestChime}
          disabled={audioTesting}
          className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 transition-all active:scale-95 shrink-0"
        >
          <Volume2 className={`w-4 h-4 ${audioTesting ? "text-amber-400 animate-pulse" : "text-stone-400"}`} />
          <span>{audioTesting ? "Zil Çalıyor..." : "Sipariş Zilini Test Et"}</span>
        </button>
      </div>

      {/* SECTION 1: Mağaza Operasyon & Kurye Kuralları */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-serif">
                Mağaza & Dağıtım Kuralları
              </h2>
              <p className="text-xs text-stone-400">
                Web sitesi vitrini ve sepette uygulanan teslimat parametreleri
              </p>
            </div>
          </div>

          {/* Quick Order Acceptance Toggle */}
          <button
            type="button"
            onClick={() => setOrderAcceptanceOpen(!orderAcceptanceOpen)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              orderAcceptanceOpen
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{orderAcceptanceOpen ? "Sipariş Alımı: Açık" : "Sipariş Alımı: Kapalı"}</span>
          </button>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free Shipping Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Ücretsiz Kurye Teslimat Limiti (₺)
              </label>
              <input
                type="number"
                min={0}
                required
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-stone-400">
                Bu tutar ve üzerindeki sepetlerde kurye teslimat ücreti 0 ₺ olarak hesaplanır.
              </p>
            </div>

            {/* Flat Shipping Fee */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Sabit Kurye Ücreti (Limit Altı) (₺)
              </label>
              <input
                type="number"
                min={0}
                required
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-stone-400">
                Limit altındaki kurye siparişlerine otomatik eklenen teslimat bedeli.
              </p>
            </div>

            {/* Delivery Time Window */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Günlük Dağıtım Saat Aralığı
              </label>
              <input
                type="text"
                required
                value={deliveryWindow}
                onChange={(e) => setDeliveryWindow(e.target.value)}
                placeholder="Örn: 14:00 - 18:00"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-stone-400">
                Müşteriye ve kurye manifestosunda gösterilen teslimat zaman aralığı.
              </p>
            </div>

            {/* Same-Day Order Cutoff Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Aynı Gün Sipariş Cutoff Saati</span>
              </label>
              <input
                type="text"
                required
                value={orderCutoffTime}
                onChange={(e) => setOrderCutoffTime(e.target.value)}
                placeholder="Örn: 12:00"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-stone-400">
                Bu saatten sonra vitrinde aynı gün teslimat kapatılır ve siparişler yarına aktarılır.
              </p>
            </div>

            {/* WhatsApp Business Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Resmi WhatsApp İletişim & Sipariş Hattı
              </label>
              <input
                type="text"
                required
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="Örn: 0501 012 66 53"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-stone-400">
                Müşteri bildirimleri ve tek tıkla sipariş yönlendirme hattı.
              </p>
            </div>
          </div>

          {/* Announcement Banner Input */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
              <Megaphone className="w-3.5 h-3.5 text-amber-500" />
              <span>Vitrin Duyuru / Uyarı Metni (İsteğe Bağlı)</span>
            </div>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Örn: Taze ekmeklerimiz saat 14:00'te fırından çıkmaktadır. Erken sipariş veriniz."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Delivery Region Info Box */}
          <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>Yetkili Dağıtım Bölgesi: Sadece Beylikdüzü</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BEYLIKDUZU_NEIGHBORHOODS.map((neighborhood) => (
                <span
                  key={neighborhood}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-stone-800/80 text-stone-300 border border-stone-700/60"
                >
                  {neighborhood}
                </span>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            {settingsSavedSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Ayarlar başarıyla kaydedildi!
              </span>
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? "Kaydediliyor..." : "Ayarları Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
