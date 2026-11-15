"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Eye, EyeOff, Flame, Loader2, Minus, Plus, X } from "lucide-react";
import type { BakeLog, BakeLogDay } from "@/types/bake";
import { bakeClock, totalLoaves } from "@/lib/bake/log";
import { shrinkPhoto } from "@/lib/media/shrinkPhoto";
import { getErrorMessage } from "@/lib/utils/error";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";

/**
 * Fırından çıktı: her fırın çıkışında ürün adetleri ve isteğe bağlı fotoğraf. Saat otomatik.
 * Üretim sayfasındaki tarih seçicisinden bağımsız, hep bugün içindir. Kayıtlar şimdilik sitede görünmez.
 */
export function FirindanCikti() {
  const date = useIstanbulToday();
  const [data, setData] = useState<BakeLogDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<"photo" | "save" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/bake-logs?day=${date}`, { cache: "no-store" });
      const body: BakeLogDay & { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const bump = (id: string, d: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(500, (c[id] ?? 0) + d)) }));

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy("photo");
    setError(null);
    try {
      setPhoto(await shrinkPhoto(file, "firin"));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const items = (data?.products ?? [])
    .filter((p) => (counts[p.id] ?? 0) > 0)
    .map((p) => ({ productId: p.id, name: p.name, quantity: counts[p.id] }));
  const total = items.reduce((s, it) => s + it.quantity, 0);
  const canSave = (items.length > 0 || photo !== null) && busy === null;

  const save = async () => {
    setBusy("save");
    setError(null);
    try {
      const form = new FormData();
      form.set("payload", JSON.stringify({ items, note }));
      if (photo) form.set("photo", photo);
      const res = await fetch("/api/admin/bake-logs", { method: "POST", body: form });
      const body: { log?: BakeLog; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !body.log) throw new Error(body.error || "Kaydedilemedi");
      setCounts({});
      setNote("");
      setPhoto(null);
      setSaved(`${bakeClock(body.log.bakedAt)} kaydedildi`);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleHidden = async (log: BakeLog) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/bake-logs/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: !log.hidden }),
      });
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Değiştirilemedi");
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const logs = data?.logs ?? [];

  return (
    <section id="firindan-cikti" className="scroll-mt-20 bg-white border border-[#E2D3BD] rounded-2xl p-5 space-y-4 shadow-sm print:hidden">
      <div>
        <h2 className="font-serif text-lg font-bold text-[#3B1E1A] flex items-center gap-2">
          <Flame className="w-5 h-5 text-[#B4532A]" aria-hidden="true" /> Bugün fırından çıktı
        </h2>
        <p className="text-xs text-[#6E5148] mt-1">
          Her çıkışta adetleri gir, istersen fotoğraf ekle; saati sistem yazar. Liste bugün satılan ekmeklerle başlar. Son çıkış saati ana sayfadaki rozette görünür; fotoğraflar henüz sitede yok.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-[#7D2114] bg-[#FCECE9] border border-[#E7B7AF] rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <ul className="divide-y divide-[#E2D3BD]">
            {data.products.filter((p) => p.soldToday || showOthers || (counts[p.id] ?? 0) > 0).map((p) => {
              const n = counts[p.id] ?? 0;
              return (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <span className="flex-1 text-sm font-medium text-[#3B1E1A]">
                    {p.name}
                    {!p.soldToday && <span className="block text-xs font-normal text-[#6E5148]">bugün satış günü değil</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => bump(p.id, -1)}
                    disabled={n === 0}
                    aria-label={`${p.name} bir azalt`}
                    className="w-12 h-12 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center transition-colors disabled:opacity-35"
                  >
                    <Minus className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={500}
                    value={n === 0 ? "" : n}
                    placeholder="0"
                    onChange={(e) => setCounts((c) => ({ ...c, [p.id]: Math.max(0, Math.min(500, Number(e.target.value) || 0)) }))}
                    aria-label={`${p.name} adedi`}
                    className="w-16 h-12 text-center font-mono tabular-nums text-xl font-bold rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] text-[#3B1E1A] placeholder:text-[#6E5148]/60 focus:outline-none focus:border-[#B4532A]"
                  />
                  <button
                    type="button"
                    onClick={() => bump(p.id, 1)}
                    aria-label={`${p.name} bir artır`}
                    className="w-12 h-12 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-5 h-5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {!showOthers && data.products.some((p) => !p.soldToday) && (
            <button
              type="button"
              onClick={() => setShowOthers(true)}
              className="h-11 w-full rounded-xl border border-dashed border-[#E2D3BD] bg-[#FBF6EC] hover:border-[#B4532A]/40 text-sm font-medium text-[#6E5148] hover:text-[#3B1E1A] flex items-center justify-center gap-1.5 transition-colors"
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" /> Bugün satılmayan {data.products.filter((p) => !p.soldToday).length} ürün
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- yerel önizleme (blob:) */}
                <img src={preview} alt="Seçilen fotoğraf" className="w-24 h-24 object-cover rounded-xl border border-[#E2D3BD]" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  aria-label="Fotoğrafı kaldır"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-[#E2D3BD] text-[#3B1E1A] hover:bg-[#FCECE9] hover:text-[#7D2114] shadow-sm flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="h-12 px-4 rounded-xl bg-[#F1E6D2] hover:bg-[#E2D3BD] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40"
              >
                {busy === "photo" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />} Fotoğraf
              </button>
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder="Not (ops.), ör. ilk çıkış"
              aria-label="Fırın çıkışı notu"
              className="flex-1 min-w-[160px] h-12 bg-white border border-[#E2D3BD] rounded-xl px-3 text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:border-[#B4532A]"
            />
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            className="w-full h-14 rounded-xl bg-[#B4532A] hover:bg-[#9C4421] text-white text-base font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 shadow-sm"
          >
            {busy === "save" ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Flame className="w-5 h-5" aria-hidden="true" />}
            {total > 0 ? `Fırından çıktı · ${total} ekmek` : "Fırından çıktı"}
          </button>
          {saved && (
            <p className="text-xs font-medium text-[#1D5130] bg-[#E5EFE7] border border-[#B4D3BC] rounded-xl px-3 py-2" aria-live="polite">
              {saved}
            </p>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl bg-[#FBF6EC] border border-[#E2D3BD] ${log.hidden ? "opacity-55" : ""}`}
            >
              {log.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- küçük admin önizlemesi
                <img src={log.photoUrl} alt="Fırından çıkış fotoğrafı" className="w-14 h-14 object-cover rounded-lg border border-[#E2D3BD]" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#F1E6D2] border border-[#E2D3BD]" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-mono tabular-nums text-sm font-bold text-[#8E3D1B]">
                  {bakeClock(log.bakedAt)}
                  {log.items.length > 0 && <span className="text-[#6E5148] font-normal"> · {totalLoaves(log)} ekmek</span>}
                  {log.hidden && <span className="text-[#6E5148] font-normal"> · gizli</span>}
                </div>
                <div className="text-xs text-[#6E5148] truncate">
                  {log.items.map((it) => `${it.name} ${it.quantity}`).join(", ") || "Yalnız fotoğraf"}
                  {log.note && ` — ${log.note}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void toggleHidden(log)}
                aria-label={log.hidden ? "Kaydı geri göster" : "Kaydı gizle"}
                className="w-11 h-11 rounded-xl bg-white hover:bg-[#F1E6D2] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center transition-colors"
              >
                {log.hidden ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
