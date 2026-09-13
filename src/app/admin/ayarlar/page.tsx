"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Clock,
  Truck,
  Save,
  Info,
  MapPin,
  Lock,
  Volume2,
  Bell,
  Trash2,
  Power,
  Megaphone,
} from "lucide-react";
import { useTrustedDevice } from "@/hooks/useTrustedDevice";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { TrustedDevice, BEYLIKDUZU_NEIGHBORHOODS } from "@/types/admin";
import { createClient } from "@/lib/supabase/client";

export default function AdminSettingsPage() {
  const { deviceId: currentDeviceId, approveDevice: localApprove } = useTrustedDevice();
  const { adminUser } = useAdminAuth();

  // Devices state
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [manualDeviceName, setManualDeviceName] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Operational Settings state
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1000);
  const [shippingFee, setShippingFee] = useState<number>(150);
  const [deliveryWindow, setDeliveryWindow] = useState<string>("14:00 - 18:00");
  const [whatsappPhone, setWhatsappPhone] = useState<string>("0530 638 97 73");
  const [orderAcceptanceOpen, setOrderAcceptanceOpen] = useState<boolean>(true);
  const [announcementText, setAnnouncementText] = useState<string>("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);
  const [audioTesting, setAudioTesting] = useState(false);

  // Fetch settings & devices from Supabase API
  const loadSettings = useCallback(async () => {
    try {
      setLoadingDevices(true);
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
        if (Array.isArray(data.devices)) {
          setDevices(data.devices);
        }
      }
    } catch (err) {
      console.error("Load settings error:", err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Supabase Realtime channel for instant settings updates
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("bakery_settings_admin")
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
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Manually authorize a device
  const handleManualAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setManualSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "authorize_device",
          deviceId: manualCode.trim(),
          deviceName: manualDeviceName.trim() || "Mobil Cihaz",
          approvedBy: adminUser?.email || "Superadmin",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Yetkilendirilemedi");
      }

      localApprove(manualCode.trim());
      setManualCode("");
      setManualDeviceName("");
      loadSettings();
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleApproveDevice = async (id: string) => {
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "authorize_device",
          deviceId: id,
          approvedBy: adminUser?.email || "Superadmin",
        }),
      });
      localApprove(id);
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_device",
          deviceId: id,
        }),
      });
      loadSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("Bu cihaz kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_device",
          deviceId: id,
        }),
      });
      loadSettings();
    } catch (err) {
      console.error(err);
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
            Fırın Ayarları & Güvenli Cihazlar
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Yetkili cihazları yönetin, Beylikdüzü kurye ücreti, sipariş kabul durumunu ve bildirimleri yapılandırın.
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
                placeholder="Örn: 0530 638 97 73"
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

      {/* SECTION 2: Yetkili Cihazlar (Trusted Devices Whitelist) */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-serif">
                Yetkili Cihaz Listesi (Güvenli Cihazlar)
              </h2>
              <p className="text-xs text-stone-400">
                Tahsin Usta (tahsinreyhan@gmail.com) yetkisiyle tüm telefon ve bilgisayarlarınızı onaylayabilirsiniz.
              </p>
            </div>
          </div>

          <button
            onClick={loadSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>
        </div>

        {/* Informative Banner */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-stone-300 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Telefonunuzu Nasıl Yetkilendirirsiniz?</p>
            <p className="text-stone-400 leading-relaxed">
              Tahsin Usta olarak giriş yaptığınızda telefonunuz doğrudan yetkilendirilir. Diğer cihazlarınız için ekranda beliren <strong>Cihaz Kodu</strong>&apos;nu aşağıdaki forma yazarak veya listeden <strong>&apos;Onayla&apos;</strong> butonuna basarak kalıcı erişim izni verebilirsiniz.
            </p>
          </div>
        </div>

        {/* Manual Device Authorization Form */}
        <form
          onSubmit={handleManualAuthorize}
          className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 flex flex-col md:flex-row gap-3 items-end"
        >
          <div className="w-full md:w-1/2 space-y-1">
            <label className="text-xs font-semibold text-stone-300">Cihaz Kodu (Device ID)</label>
            <input
              type="text"
              required
              placeholder="Örn: dev_m1ab2c3d_xyz"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="w-full md:w-1/3 space-y-1">
            <label className="text-xs font-semibold text-stone-300">Cihaz İsmi (İsteğe Bağlı)</label>
            <input
              type="text"
              placeholder="Örn: Tahsin iPhone 15 Pro"
              value={manualDeviceName}
              onChange={(e) => setManualDeviceName(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={manualSubmitting}
            className="w-full md:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            {manualSubmitting ? "Onaylanıyor..." : "+ Cihazı Yetkilendir"}
          </button>
        </form>

        {/* Devices Table */}
        {loadingDevices ? (
          <div className="p-8 text-center text-stone-400 text-xs">Cihazlar listeleniyor...</div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs border border-dashed border-stone-800 rounded-xl">
            Henüz eklenmiş cihaz bulunmuyor. Giriş yapan yöneticiler otomatik olarak tanınır.
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((dev) => {
              const isCurrent = dev.id === currentDeviceId || dev.deviceId === currentDeviceId;
              const isMobile = /phone|android|iphone|ipad/i.test(dev.deviceName || dev.userAgent || "");

              return (
                <div
                  key={dev.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCurrent
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "bg-stone-950/40 border-stone-800 hover:border-stone-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 shrink-0">
                      {isMobile ? <Smartphone className="w-5 h-5 text-amber-400" /> : <Laptop className="w-5 h-5 text-sky-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-200 text-sm">{dev.deviceName || "Yetkili Cihaz"}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Şu Anki Cihazınız
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                        ID: {dev.deviceId || dev.id}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Son Giriş: {dev.lastUsedAt ? new Date(dev.lastUsedAt).toLocaleString("tr-TR") : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800/80">
                    {dev.approved ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Yetkili</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Onay Bekliyor</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {dev.approved ? (
                        <button
                          onClick={() => handleRevokeDevice(dev.id || dev.deviceId)}
                          className="px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                          Askıya Al
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveDevice(dev.id || dev.deviceId)}
                          className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30"
                        >
                          Onayla
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDevice(dev.id || dev.deviceId)}
                        className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Cihazı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
