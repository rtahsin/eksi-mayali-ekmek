"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { collection, onSnapshot, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useTrustedDevice } from "@/hooks/useTrustedDevice";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { TrustedDevice, BEYLIKDUZU_NEIGHBORHOODS } from "@/types/admin";

export default function AdminSettingsPage() {
  const { deviceId: currentDeviceId, approveDevice, revokeDevice } = useTrustedDevice();
  const { adminUser, firebaseUser } = useAdminAuth();

  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [manualDeviceName, setManualDeviceName] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Operational Settings
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number>(1000);
  const [shippingFee, setShippingFee] = useState<number>(150);
  const [deliveryWindow, setDeliveryWindow] = useState<string>("14:00 - 18:00");
  const [whatsappPhone, setWhatsappPhone] = useState<string>("0530 638 97 73");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Listen to trusted devices
  useEffect(() => {
    const devicesRef = collection(db, "guvenli_cihazlar");
    const unsubscribe = onSnapshot(
      devicesRef,
      (snapshot) => {
        const list: TrustedDevice[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TrustedDevice);
        });
        setDevices(list);
        setLoadingDevices(false);
      },
      (err) => {
        console.error("Trusted devices fetch error:", err);
        setLoadingDevices(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch operational settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "ayarlar", "genel"));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.freeShippingThreshold !== undefined) {
            setFreeShippingThreshold(Number(data.freeShippingThreshold));
          }
          if (data.shippingFee !== undefined) {
            setShippingFee(Number(data.shippingFee));
          }
          if (data.deliveryWindow) {
            setDeliveryWindow(data.deliveryWindow);
          }
          if (data.whatsappPhone) {
            setWhatsappPhone(data.whatsappPhone);
          }
        }
      } catch (err) {
        console.warn("Settings fetch notice:", err);
      }
    };

    fetchSettings();
  }, []);

  // Save Operational Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedSuccess(false);

    try {
      await setDoc(
        doc(db, "ayarlar", "genel"),
        {
          freeShippingThreshold: Number(freeShippingThreshold),
          shippingFee: Number(shippingFee),
          deliveryWindow,
          whatsappPhone,
          updatedAt: new Date().toISOString(),
          updatedBy: adminUser?.email || firebaseUser?.email || "admin",
        },
        { merge: true }
      );
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err: any) {
      alert("Ayarlar kaydedilirken hata oluştu: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Manually authorize a device by code
  const handleManualAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setManualSubmitting(true);
    try {
      const code = manualCode.trim();
      const deviceRef = doc(db, "guvenli_cihazlar", code);
      await setDoc(
        deviceRef,
        {
          id: code,
          deviceId: code,
          deviceName: manualDeviceName.trim() || "Mobil Telefon (Yönetici)",
          approved: true,
          approvedAt: new Date().toISOString(),
          approvedBy: adminUser?.email || firebaseUser?.email || "Superadmin",
          lastUsedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setManualCode("");
      setManualDeviceName("");
      alert("Cihaz başarıyla yetkilendirildi! Artık bu cihazdan şifre ile doğrudan giriş yapılabilir.");
    } catch (err: any) {
      alert("Yetkilendirme hatası: " + err.message);
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-stone-900/80 p-6 rounded-2xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sistem & Güvenlik Konfigürasyonu</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-100 font-serif">
          Güvenli Cihazlar & Mağaza Ayarları
        </h1>
        <p className="text-stone-400 text-xs mt-1">
          Yalnızca onaylanmış telefon ve bilgisayarlarınızdan erişim izni verin, Beylikdüzü kurye ve sepet kurallarını yönetin.
        </p>
      </div>

      {/* SECTION 1: Güvenli Cihazlar (Trusted Devices) */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100 font-serif">
                Yetkili Cihaz Listesi (Whitelist)
              </h2>
              <p className="text-xs text-stone-400">
                Şifre doğru olsa dahi, bu listede onaylanmamış yabancı cihazların panele girmesi kesin olarak engellenir.
              </p>
            </div>
          </div>
        </div>

        {/* Informative Banner */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-stone-300 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Telefonunuzu Nasıl Eklersiniz?</p>
            <p className="text-stone-400 leading-relaxed">
              Cep telefonunuzun tarayıcısından <code className="text-amber-400 font-mono">/admin</code> adresini açın. Ekranda beliren <strong>Cihaz Kodu</strong>&apos;nu aşağıdaki forma yazarak veya aşağıdaki listede &apos;Onay Bekliyor&apos; olarak gördüğünüzde <strong>&apos;Onayla&apos;</strong> butonuna basarak telefonunuza anında güvenli giriş izni verebilirsiniz.
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
              placeholder="Örn: Tahsin iPhone 15"
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
          <div className="p-8 text-center text-stone-400 text-xs">Kayıtlı cihaz bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {devices.map((dev) => {
              const isCurrent = dev.id === currentDeviceId;
              const isMobile = /phone|android|iphone/i.test(dev.deviceName || dev.userAgent || "");

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
                      {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-200 text-sm">{dev.deviceName}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Şu Anki Cihazınız
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400 mt-0.5">
                        Kod: {dev.id}
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

                    {!isCurrent && (
                      <div>
                        {dev.approved ? (
                          <button
                            onClick={() => revokeDevice(dev.id)}
                            className="px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Yetkiyi Kaldır
                          </button>
                        ) : (
                          <button
                            onClick={() => approveDevice(dev.id, adminUser?.email || firebaseUser?.email || "admin")}
                            className="px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30"
                          >
                            Onayla
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Mağaza & Kurye Dağıtım Ayarları */}
      <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-100 font-serif">
              Beylikdüzü Kurye & Dağıtım Kuralları
            </h2>
            <p className="text-xs text-stone-400">
              Web sitesi ve manuel siparişlerde geçerli teslimat ücreti ve saat dilimleri.
            </p>
          </div>
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
                Bu tutar ve üzerindeki sepetlerde kurye ücreti 0 ₺ olarak hesaplanır.
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
                Limit altındaki siparişlere eklenecek kurye teslimat bedeli.
              </p>
            </div>

            {/* Delivery Time Window */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Günlük Kurye Dağıtım Saat Aralığı
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
                Müşteriye ve rota manifestosunda gösterilen teslimat aralığı.
              </p>
            </div>

            {/* WhatsApp Business Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">
                Resmi Sipariş & İletişim WhatsApp Hattı
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
                Müşteri bildirim mesajları ve vitrin sipariş yönlendirmesi.
              </p>
            </div>
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
