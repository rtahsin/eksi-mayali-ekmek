"use client";

import React, { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import type { StoreSettings } from "@/types/settings";
import { DEFAULT_NEIGHBORHOODS, DEFAULT_STORE_SETTINGS } from "@/lib/settings/schema";
import { computeDeliveryDates } from "@/lib/ordering/dates";
import { formatTrDate, istanbulToday } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";

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
  "w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [audioTesting, setAudioTesting] = useState(false);

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const loadSettings = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const preview = computeDeliveryDates({ ...form });
  const allNeighborhoods = Array.from(new Set([...DEFAULT_NEIGHBORHOODS, ...form.neighborhoods]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Ayarlar yükleniyor…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-28">
      <div className="bg-stone-900/80 p-6 rounded-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif">Fırın Ayarları</h1>
          <p className="text-stone-400 text-xs mt-1">
            Buradaki her değer vitrini, sepeti ve sipariş kontrolünü anında yönetir.
          </p>
        </div>
        <button
          type="button"
          onClick={playTestChime}
          className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold border border-stone-700 shrink-0"
        >
          <Volume2 className={`w-4 h-4 ${audioTesting ? "text-amber-400 animate-pulse" : "text-stone-400"}`} />
          Sipariş Zilini Test Et
        </button>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {loadError}
        </div>
      )}

      {/* Sipariş alımı */}
      <Section icon={<Power className="w-5 h-5" />} title="Sipariş Alımı">
        <button
          type="button"
          onClick={() => set("orderAcceptanceOpen", !form.orderAcceptanceOpen)}
          className={`w-full sm:w-auto px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
            form.orderAcceptanceOpen
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-red-500/15 text-red-300 border-red-500/30"
          }`}
        >
          {form.orderAcceptanceOpen ? "● Sipariş alıyoruz (kapatmak için dokun)" : "○ Sipariş alımı KAPALI (açmak için dokun)"}
        </button>
        <Field label="Vitrin duyurusu (isteğe bağlı)" icon={<Megaphone className="w-3.5 h-3.5 text-amber-500" />}>
          <input
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
      <Section icon={<Wallet className="w-5 h-5" />} title="Ücretler">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Teslimat ücreti (₺)" hint="Eşiğin altındaki siparişlere eklenir.">
            <input type="number" min={0} value={form.shippingFee} onChange={(e) => set("shippingFee", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Ücretsiz teslimat eşiği (₺)" hint="0 = her siparişe ücret uygulanır.">
            <input type="number" min={0} value={form.freeShippingThreshold} onChange={(e) => set("freeShippingThreshold", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Minimum sepet (₺)" hint="0 = sınır yok.">
            <input type="number" min={0} value={form.minBasketAmount} onChange={(e) => set("minBasketAmount", Number(e.target.value))} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Takvim */}
      <Section icon={<CalendarDays className="w-5 h-5" />} title="Teslimat Takvimi">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Aynı gün için son sipariş saati" icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}>
            <input type="time" value={form.orderCutoffTime} onChange={(e) => set("orderCutoffTime", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Teslimat saat aralığı" icon={<Truck className="w-3.5 h-3.5 text-amber-500" />}>
            <input type="text" maxLength={50} value={form.deliveryWindow} onChange={(e) => set("deliveryWindow", e.target.value)} placeholder="14:00 - 18:00" className={inputCls} />
          </Field>
          <Field label="Kaç gün ileriye sipariş" hint="0 = sadece bugün">
            <input type="number" min={0} max={30} value={form.maxDaysAhead} onChange={(e) => set("maxDaysAhead", Number(e.target.value))} className={inputCls} />
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
                  className={`w-14 py-2.5 rounded-xl text-sm font-bold border ${
                    on ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-950 text-stone-500 border-stone-800"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Kapalı tarihler (tatil, bakım…)">
          <div className="flex gap-2">
            <input type="date" min={istanbulToday()} value={newClosedDate} onChange={(e) => setNewClosedDate(e.target.value)} className={inputCls} />
            <button
              type="button"
              onClick={() => {
                if (newClosedDate && !form.closedDates.includes(newClosedDate)) {
                  set("closedDates", [...form.closedDates, newClosedDate].sort());
                }
                setNewClosedDate("");
              }}
              className="px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
          {form.closedDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.closedDates.map((d) => (
                <span key={d} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 flex items-center gap-1.5">
                  {formatTrDate(d, "long")}
                  <button type="button" aria-label={`${d} kapalı tarihini kaldır`} onClick={() => set("closedDates", form.closedDates.filter((x) => x !== d))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>

        <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-400">
          <span className="font-semibold text-stone-300">Müşteri şu an şu günleri seçebilir: </span>
          {preview.length === 0 ? <span className="text-red-300">hiçbiri</span> : preview.map((d) => d.label).join(", ")}
        </div>
      </Section>

      {/* Mahalleler */}
      <Section icon={<MapPin className="w-5 h-5" />} title="Teslimat Mahalleleri (Beylikdüzü)">
        <div className="flex flex-wrap gap-2">
          {allNeighborhoods.map((n) => {
            const on = form.neighborhoods.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => toggleNeighborhood(n)}
                aria-pressed={on}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                  on ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "bg-stone-950 text-stone-500 border-stone-800 line-through"
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
            className="px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-bold flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </div>
      </Section>

      {/* İletişim */}
      <Section icon={<Megaphone className="w-5 h-5" />} title="İletişim">
        <Field label="İşletme WhatsApp hattı" hint="Müşterinin onay ve soru mesajları bu numaraya gider.">
          <input type="tel" value={form.whatsappPhone} onChange={(e) => set("whatsappPhone", e.target.value)} placeholder="0501 012 66 53" className={inputCls} />
        </Field>
      </Section>

      {/* Üretim (Faz 2) */}
      <Section icon={<Wheat className="w-5 h-5" />} title="Üretim Kapasitesi">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Günlük perakende ekmek kapasitesi" hint="Boş = sınırsız. Fırın günleri ile birlikte devreye girer.">
            <input
              type="number"
              min={0}
              value={form.dailyBreadCapacity ?? ""}
              onChange={(e) => set("dailyBreadCapacity", e.target.value === "" ? null : Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Günlük toptan (şarküteri) ekmek adedi" hint="Üretim planına eklenir.">
            <input type="number" min={0} value={form.wholesaleDailyLoaves} onChange={(e) => set("wholesaleDailyLoaves", Number(e.target.value))} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Kaydet çubuğu */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 lg:left-64 px-4 z-30 pointer-events-none">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-3 pointer-events-auto">
          {saveError && <span className="text-xs text-red-300 bg-stone-950/90 px-3 py-2 rounded-lg">{saveError}</span>}
          {saved && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-stone-950/90 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> Kaydedildi
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-lg shadow-black/40 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Kaydediliyor…" : "Ayarları Kaydet"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-3 text-lg font-bold text-stone-100 font-serif">
        <span className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, hint, icon, children }: { label: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
