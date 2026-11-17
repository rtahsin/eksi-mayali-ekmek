"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Truck,
  Save,
  MapPin,
  Volume2,
  Power,
  Megaphone,
  CalendarDays,
  Wallet,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Wheat,
  Lock,
} from "lucide-react";
import type { StoreSettings } from "@/types/settings";
import { DEFAULT_NEIGHBORHOODS, DEFAULT_STORE_SETTINGS } from "@/lib/settings/schema";
import { computeDeliveryDates } from "@/lib/ordering/dates";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { hasCapability } from "@/lib/security/capabilities";

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Çar" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cmt" },
  { value: 0, label: "Paz" },
];

const inputCls =
  "w-full bg-[#FBF6EC] border border-[#E2D3BD] rounded-xl px-3 py-2 text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/65 focus:outline-none focus:border-[#B4532A]";

export default function AdminSettingsPage() {
  const { adminUser } = useAdminAuth();
  const canManageSettings = hasCapability(adminUser?.role, "settings.manage");

  const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [audioTesting, setAudioTesting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const pointerDownOutsideRef = useRef(false);

  const announcementId = useId();
  const shippingFeeId = useId();
  const freeThresholdId = useId();
  const minBasketId = useId();
  const windowId = useId();
  const daysAheadId = useId();
  const closedDateId = useId();
  const whatsappId = useId();
  const retailCapId = useId();
  const wholesaleId = useId();

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (confirmCloseOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [confirmCloseOpen]);

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const loadSettings = useCallback(async () => {
    if (!canManageSettings) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data: { operational?: StoreSettings; error?: string } = await res.json();
      if (!res.ok || !data.operational) throw new Error(data.error || `HTTP ${res.status}`);
      setForm(data.operational);
    } catch (err: unknown) {
      setLoadError("Ayarlar yüklenemedi: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [canManageSettings]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSettings) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_operational", value: form }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Ayarlar kaydedilemedi");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekday = (day: number) =>
    set(
      "openWeekdays",
      form.openWeekdays.includes(day) ? form.openWeekdays.filter((d) => d !== day) : [...form.openWeekdays, day].sort()
    );

  const toggleNeighborhood = (name: string) =>
    set(
      "neighborhoods",
      form.neighborhoods.includes(name) ? form.neighborhoods.filter((n) => n !== name) : [...form.neighborhoods, name]
    );

  const playTestChime = () => {
    setAudioTesting(true);
    new Audio("/audio/new-order.mp3").play().catch(() => undefined);
    setTimeout(() => setAudioTesting(false), 1500);
  };

  const handleAcceptanceClick = () => {
    if (form.orderAcceptanceOpen) {
      setConfirmCloseOpen(true);
    } else {
      set("orderAcceptanceOpen", true);
    }
  };

  const isPointerOutsideDialog = (e: React.PointerEvent<HTMLDialogElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  if (!canManageSettings) {
    return (
      <div className="max-w-lg mx-auto mt-12 bg-white border border-[#E2D3BD] rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-11 h-11 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] text-[#8E3D1B] flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-xl font-bold text-[#3B1E1A]">Yetki Gerekli</h1>
        <p className="text-sm text-[#6E5148]">
          Fırın ayarlarını görüntüleme ve değiştirme yetkisi yalnızca yönetici rollerine açıktır.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-xs font-bold transition-colors"
        >
          Komuta Merkezine Dön
        </Link>
      </div>
    );
  }

  const preview = computeDeliveryDates({ ...form });
  const allNeighborhoods = Array.from(new Set([...DEFAULT_NEIGHBORHOODS, ...form.neighborhoods]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#6E5148] gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Ayarlar yükleniyor…
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-28">
        <div className="bg-white p-6 rounded-2xl border border-[#E2D3BD] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#3B1E1A] font-serif">Fırın Ayarları</h1>
            <p className="text-[#6E5148] text-xs mt-1">
              Buradaki her değer vitrini, sepeti ve sipariş kontrolünü anında yönetir.
            </p>
          </div>
          <button
            type="button"
            onClick={playTestChime}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F1E6D2] hover:bg-[#E2D3BD] text-[#3B1E1A] rounded-xl text-xs font-bold border border-[#E2D3BD] transition-colors shrink-0"
          >
            <Volume2
              className={`w-4 h-4 ${audioTesting ? "text-[#B4532A] animate-pulse" : "text-[#6E5148]"}`}
              aria-hidden="true"
            />
            Sipariş Zilini Test Et
          </button>
        </div>

        {loadError && (
          <div role="alert" className="p-3.5 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-xs font-medium text-[#7D2114] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> {loadError}
          </div>
        )}

        {/* Sipariş alımı */}
        <Section icon={<Power className="w-5 h-5" aria-hidden="true" />} title="Sipariş Alımı">
          <button
            type="button"
            aria-pressed={form.orderAcceptanceOpen}
            onClick={handleAcceptanceClick}
            className={`w-full sm:w-auto px-4 py-3 rounded-xl text-sm font-bold border transition-colors ${
              form.orderAcceptanceOpen
                ? "bg-[#E5EFE7] text-[#1D5130] border-[#B4D3BC] hover:bg-[#D5E6D9]"
                : "bg-[#FCECE9] text-[#7D2114] border-[#E7B7AF] hover:bg-[#F7DDD8]"
            }`}
          >
            {form.orderAcceptanceOpen ? "● Sipariş alıyoruz (kapatmak için dokun)" : "○ Sipariş alımı KAPALI (açmak için dokun)"}
          </button>
          <Field
            htmlFor={announcementId}
            label="Vitrin duyurusu (isteğe bağlı)"
            icon={<Megaphone className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />}
          >
            <input
              id={announcementId}
              type="text"
              maxLength={300}
              value={form.announcementText}
              onChange={(e) => set("announcementText", e.target.value)}
              placeholder="Örn: Bu hafta sonu fırın kapalıdır."
              className={inputCls}
            />
          </Field>
        </Section>

        {/* Ücretler */}
        <Section icon={<Wallet className="w-5 h-5" aria-hidden="true" />} title="Ücretler">
          <div className="p-3 rounded-xl bg-[#E5EFE7] border border-[#B4D3BC] text-xs font-medium text-[#1D5130]">
            Beylikdüzü içi kapıya teslimat <strong className="font-mono tabular-nums">0 ₺</strong> (ücretsizdir). Değerler{" "}
            <strong className="font-mono tabular-nums">0</strong> kaldığında sepette teslimat ücreti yansıtılmaz.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field htmlFor={shippingFeeId} label="Teslimat ücreti (₺)" hint="0 ₺ = ücretsiz teslimat.">
              <input
                id={shippingFeeId}
                type="number"
                min={0}
                value={form.shippingFee}
                onChange={(e) => set("shippingFee", Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
            <Field htmlFor={freeThresholdId} label="Ücretsiz teslimat eşiği (₺)" hint="0 = eşiksiz ücretsiz veya sabit tarife.">
              <input
                id={freeThresholdId}
                type="number"
                min={0}
                value={form.freeShippingThreshold}
                onChange={(e) => set("freeShippingThreshold", Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
            <Field htmlFor={minBasketId} label="Minimum sepet (₺)" hint="0 = sınır yok.">
              <input
                id={minBasketId}
                type="number"
                min={0}
                value={form.minBasketAmount}
                onChange={(e) => set("minBasketAmount", Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
          </div>
        </Section>

        {/* Takvim */}
        <Section icon={<CalendarDays className="w-5 h-5" aria-hidden="true" />} title="Teslimat Takvimi">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              htmlFor={windowId}
              label="Teslimat saat aralığı"
              icon={<Truck className="w-3.5 h-3.5 text-[#B4532A]" aria-hidden="true" />}
            >
              <input
                id={windowId}
                type="text"
                maxLength={50}
                value={form.deliveryWindow}
                onChange={(e) => set("deliveryWindow", e.target.value)}
                placeholder="14:00 - 18:00"
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
            <Field htmlFor={daysAheadId} label="Kaç gün ileriye sipariş" hint="0 = sadece bugün">
              <input
                id={daysAheadId}
                type="number"
                min={0}
                max={30}
                value={form.maxDaysAhead}
                onChange={(e) => set("maxDaysAhead", Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
          </div>

          <Field label="Teslimat yapılan günler">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => {
                const on = form.openWeekdays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWeekday(d.value)}
                    aria-pressed={on}
                    className={`w-14 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                      on
                        ? "bg-[#B4532A] text-white border-[#B4532A] shadow-sm"
                        : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] hover:border-[#B4532A]/40"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field htmlFor={closedDateId} label="Kapalı tarihler (tatil, bakım…)">
            <div className="flex gap-2">
              <input
                id={closedDateId}
                type="date"
                min={istanbulToday()}
                value={newClosedDate}
                onChange={(e) => setNewClosedDate(e.target.value)}
                className={`${inputCls} font-mono tabular-nums`}
              />
              <button
                type="button"
                onClick={() => {
                  if (newClosedDate && !form.closedDates.includes(newClosedDate)) {
                    set("closedDates", [...form.closedDates, newClosedDate].sort());
                  }
                  setNewClosedDate("");
                }}
                className="px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Ekle
              </button>
            </div>
            {form.closedDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.closedDates.map((d) => (
                  <span
                    key={d}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#FCECE9] text-[#7D2114] border border-[#E7B7AF] flex items-center gap-1.5 font-medium"
                  >
                    {formatTrDate(d, "long")}
                    <button
                      type="button"
                      aria-label={`${d} kapalı tarihini kaldır`}
                      onClick={() => set("closedDates", form.closedDates.filter((x) => x !== d))}
                      className="hover:text-[#3B1E1A]"
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <div className="p-3 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-xs text-[#6E5148]">
            <span className="font-semibold text-[#3B1E1A]">Müşteri şu an şu günleri seçebilir: </span>
            {preview.length === 0 ? (
              <span className="text-[#7D2114] font-semibold">hiçbiri</span>
            ) : (
              preview.map((d) => d.label).join(", ")
            )}
          </div>
        </Section>

        {/* Fırın saatleri: girişteki "fırın şu an" rozeti */}
        <Section icon={<Clock className="w-5 h-5" aria-hidden="true" />} title="Fırın Saatleri">
          <p className="text-xs text-[#6E5148] -mt-2">
            Ana sayfadaki rozet bu saatlere göre konuşur: açılış, fırına giriş, teslimata çıkış ve kapanış. Kapalı günler yukarıdaki takvimden gelir.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(
              [
                ["open", "Açılış", "Fırın açık · ısınıyor"],
                ["oven", "Fırına giriş", "İlk ekmekler fırında"],
                ["dispatch", "Teslimata çıkış", "Ekmekler teslimatta"],
                ["close", "Kapanış", "Fırın kapalı"],
              ] as const
            ).map(([key, label, hint]) => (
              <Field key={key} label={label} hint={hint}>
                <input
                  type="time"
                  aria-label={label}
                  value={form.bakeHours[key]}
                  onChange={(e) => set("bakeHours", { ...form.bakeHours, [key]: e.target.value })}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </Field>
            ))}
          </div>
        </Section>

        {/* Mahalleler */}
        <Section icon={<MapPin className="w-5 h-5" aria-hidden="true" />} title="Teslimat Mahalleleri (Beylikdüzü)">
          <div className="flex flex-wrap gap-2">
            {allNeighborhoods.map((n) => {
              const on = form.neighborhoods.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNeighborhood(n)}
                  aria-pressed={on}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    on
                      ? "bg-[#F3E2D4] text-[#8E3D1B] border-[#DFB99F]"
                      : "bg-[#FBF6EC] text-[#6E5148] border-[#E2D3BD] line-through opacity-75"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={60}
              aria-label="Yeni mahalle adı"
              value={newNeighborhood}
              onChange={(e) => setNewNeighborhood(e.target.value)}
              placeholder="Yeni mahalle adı (Mah. yazmadan)"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => {
                const name = newNeighborhood.replace(/\s+Mah(\.|allesi)?$/i, "").trim();
                if (name.length >= 2 && !form.neighborhoods.includes(name)) set("neighborhoods", [...form.neighborhoods, name]);
                setNewNeighborhood("");
              }}
              className="px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Ekle
            </button>
          </div>
        </Section>

        {/* İletişim */}
        <Section icon={<Megaphone className="w-5 h-5" aria-hidden="true" />} title="İletişim">
          <Field
            htmlFor={whatsappId}
            label="İşletme WhatsApp hattı"
            hint="Müşterinin onay ve soru mesajları bu numaraya gider."
          >
            <input
              id={whatsappId}
              type="tel"
              value={form.whatsappPhone}
              onChange={(e) => set("whatsappPhone", e.target.value)}
              placeholder="0501 012 66 53"
              className={`${inputCls} font-mono tabular-nums`}
            />
          </Field>
        </Section>

        {/* Üretim (Faz 2) */}
        <Section icon={<Wheat className="w-5 h-5" aria-hidden="true" />} title="Üretim Kapasitesi">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              htmlFor={retailCapId}
              label="Günlük perakende ekmek kapasitesi"
              hint="Boş = sınırsız. Fırın günleri ile birlikte devreye girer."
            >
              <input
                id={retailCapId}
                type="number"
                min={0}
                value={form.dailyBreadCapacity ?? ""}
                onChange={(e) => set("dailyBreadCapacity", e.target.value === "" ? null : Number(e.target.value))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
            <Field
              htmlFor={wholesaleId}
              label="Günlük toptan (şarküteri) ekmek adedi"
              hint="Üretim planına eklenir."
            >
              <input
                id={wholesaleId}
                type="number"
                min={0}
                value={form.wholesaleDailyLoaves}
                onChange={(e) => set("wholesaleDailyLoaves", Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} font-mono tabular-nums`}
              />
            </Field>
          </div>
        </Section>

        {/* Kaydet çubuğu */}
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 lg:left-64 px-4 z-30 pointer-events-none">
          <div className="max-w-4xl mx-auto flex items-center justify-end gap-3 pointer-events-auto">
            {saveError && (
              <span role="alert" className="text-xs font-medium text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] px-3 py-2 rounded-lg shadow-sm">
                {saveError}
              </span>
            )}
            {saved && (
              <span className="text-xs font-bold text-[#1D5130] flex items-center gap-1 bg-[#E5EFE7] border border-[#B4D3BC] px-3 py-2 rounded-lg shadow-sm">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Kaydedildi
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-[#B4532A] hover:bg-[#9C4421] text-white font-bold rounded-xl text-sm shadow-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {saving ? "Kaydediliyor…" : "Ayarları Kaydet"}
            </button>
          </div>
        </div>
      </form>

      {/* Sipariş Alımı Kapatma Onay Modalı */}
      <dialog
        ref={confirmDialogRef}
        aria-labelledby="close-orders-title"
        onCancel={(e) => {
          e.preventDefault();
          setConfirmCloseOpen(false);
        }}
        onPointerDown={(e) => {
          pointerDownOutsideRef.current = isPointerOutsideDialog(e);
        }}
        onPointerUp={(e) => {
          if (pointerDownOutsideRef.current && isPointerOutsideDialog(e)) {
            setConfirmCloseOpen(false);
          }
          pointerDownOutsideRef.current = false;
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white border border-[#E2D3BD] text-[#3B1E1A] p-6 shadow-2xl backdrop:bg-[#3B1E1A]/45 backdrop:backdrop-blur-[2px] backdrop:overflow-hidden backdrop:overscroll-contain"
      >
        {confirmCloseOpen && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FCECE9] border border-[#E7B7AF] text-[#7D2114] flex items-center justify-center shrink-0">
                <Power className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="close-orders-title" className="font-serif text-lg font-bold text-[#3B1E1A]">
                  Sipariş alımı kapatılsın mı?
                </h2>
                <p className="text-xs text-[#6E5148] mt-1 leading-relaxed">
                  &ldquo;Ayarları Kaydet&rdquo; butonuna bastığınızda müşteri vitrini yeni sipariş alımına kapanır. Emin misiniz?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmCloseOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-xs font-bold transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  set("orderAcceptanceOpen", false);
                  setConfirmCloseOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#9B2C1F] hover:bg-[#7D2114] text-white text-xs font-bold transition-colors"
              >
                Evet, Alımı Kapat
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[#E2D3BD] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      <h2 className="flex items-center gap-3 text-lg font-bold text-[#3B1E1A] font-serif">
        <span className="w-9 h-9 rounded-xl bg-[#F3E2D4] border border-[#DFB99F] flex items-center justify-center text-[#8E3D1B]">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  icon,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs font-semibold text-[#3B1E1A] flex items-center gap-1.5">
          {icon}
          {label}
        </label>
      ) : (
        <div className="text-xs font-semibold text-[#3B1E1A] flex items-center gap-1.5">
          {icon}
          {label}
        </div>
      )}
      {children}
      {hint && <p className="text-xs text-[#6E5148]">{hint}</p>}
    </div>
  );
}
