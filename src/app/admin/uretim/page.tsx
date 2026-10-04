"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Printer, Wheat, Package, Gauge, AlertCircle, RefreshCw } from "lucide-react";
import type { ProductionDay } from "@/types/production";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";

const inputCls =
  "bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500";

/**
 * Üretim: seçilen gün için siparişlerden ne pişirilecek (paketler içindeki ürünlere açılır),
 * şarküterilere giden toptan adet ve günün ekmek kapasitesi. Siparişe göre üretim için.
 */
export default function ProductionPage() {
  const today = useIstanbulToday();
  const [date, setDate] = useState(() => addDays(today, 1));
  const [data, setData] = useState<ProductionDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capInput, setCapInput] = useState("");
  const [capNote, setCapNote] = useState("");
  const [savingCap, setSavingCap] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/production?date=${date}`, { cache: "no-store" });
      const body: ProductionDay & { error?: string } = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
      setCapInput(body.capacity.isOverride && body.capacity.limit !== null ? String(body.capacity.limit) : "");
      setCapNote(body.capacity.note ?? "");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCapacity = async (value: number | null) => {
    setSavingCap(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, breadCapacity: value, note: capNote }),
      });
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Kaydedilemedi");
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSavingCap(false);
    }
  };

  const bakeLines = data?.lines.filter((l) => l.capacityUnits > 0) ?? [];
  const packLines = data?.lines.filter((l) => l.capacityUnits === 0) ?? [];
  const retailLoaves = bakeLines.reduce((s, l) => s + l.quantity, 0);
  const cap = data?.capacity;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16 print:max-w-none print:text-black">
      <div className="bg-stone-900/80 p-5 sm:p-6 rounded-2xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-white print:border-0 print:p-0">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 font-serif print:text-black">Üretim — {formatTrDate(date, "long")}</h1>
          <p className="text-stone-400 text-xs mt-1 print:hidden">Siparişlerden hesaplanır; iptal edilenler dahil değildir.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {[0, 1, 2].map((offset) => {
            const d = addDays(today, offset);
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setDate(d)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  date === d ? "bg-amber-500 text-stone-950 border-amber-500" : "bg-stone-950 text-stone-300 border-stone-800"
                }`}
              >
                {offset === 0 ? "Bugün" : offset === 1 ? "Yarın" : formatTrDate(d)}
              </button>
            );
          })}
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={inputCls} />
          <button type="button" onClick={() => void load()} aria-label="Yenile" className="p-2.5 rounded-xl bg-stone-800 text-stone-300">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Yazdır
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 flex justify-center text-stone-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Hesaplanıyor…
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Sipariş" value={String(data.orderCount)} />
            <Stat label="Perakende ekmek" value={String(retailLoaves)} />
            <Stat
              label="Toplam pişecek"
              value={String(retailLoaves + data.wholesaleLoaves)}
              hint={data.wholesaleLoaves ? `+${data.wholesaleLoaves} şarküteri` : undefined}
            />
          </div>

          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-3 print:bg-white print:border-black">
            <h2 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2 print:text-black">
              <Wheat className="w-5 h-5 text-amber-500" /> Fırın
            </h2>
            {bakeLines.length === 0 && !data.wholesaleLoaves ? (
              <p className="text-sm text-stone-500">Bu gün için pişirilecek sipariş yok.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {bakeLines.map((l) => (
                    <tr key={l.productId} className="border-b border-stone-800 last:border-0 print:border-stone-300">
                      <td className="py-2.5 text-stone-200 print:text-black">{l.name}</td>
                      <td className="py-2.5 text-right font-mono text-lg font-bold text-amber-300 print:text-black">{l.quantity}</td>
                    </tr>
                  ))}
                  {data.wholesaleLoaves > 0 && (
                    <tr>
                      <td className="py-2.5 text-stone-400 print:text-black">Şarküteriler (toptan, ayarlardan)</td>
                      <td className="py-2.5 text-right font-mono text-lg font-bold text-stone-300 print:text-black">{data.wholesaleLoaves}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>

          {packLines.length > 0 && (
            <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-3 print:bg-white print:border-black">
              <h2 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2 print:text-black">
                <Package className="w-5 h-5 text-amber-500" /> Hazırlanacak eşlikçiler
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {packLines.map((l) => (
                    <tr key={l.productId} className="border-b border-stone-800 last:border-0 print:border-stone-300">
                      <td className="py-2.5 text-stone-200 print:text-black">{l.name}</td>
                      <td className="py-2.5 text-right font-mono text-lg font-bold text-stone-200 print:text-black">{l.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-3 print:hidden">
            <h2 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-500" /> Bu günün ekmek kapasitesi
            </h2>
            <p className="text-sm text-stone-300">
              {cap?.limit === null || cap?.limit === undefined
                ? `Sınır yok — ${cap?.used ?? 0} ekmeklik sipariş alındı.`
                : `${cap.used} / ${cap.limit} dolu${cap.isOverride ? " (bu güne özel)" : " (ayarlardaki varsayılan)"}. ${Math.max(0, cap.limit - cap.used)} ekmeklik yer kaldı.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <input type="number" min={0} value={capInput} onChange={(e) => setCapInput(e.target.value)} placeholder="ör. 40" className={`${inputCls} w-28`} />
              <input value={capNote} onChange={(e) => setCapNote(e.target.value)} placeholder="Not (ops.)" className={`${inputCls} flex-1 min-w-[140px]`} />
              <button
                type="button"
                disabled={savingCap || capInput === ""}
                onClick={() => void saveCapacity(Number(capInput))}
                className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-sm font-bold disabled:opacity-40"
              >
                Bu güne kapasite koy
              </button>
              {cap?.isOverride && (
                <button
                  type="button"
                  disabled={savingCap}
                  onClick={() => void saveCapacity(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-200 text-sm font-semibold"
                >
                  Kaldır
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-500">
              Kapasite dolunca o gün için ekmek siparişi kapanır (sadece eşlikçi siparişleri açık kalır). Genel varsayılan: Ayarlar → Üretim Kapasitesi.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 print:bg-white print:border-black">
      <div className="text-[11px] uppercase tracking-wider text-stone-500">{label}</div>
      <div className="font-serif text-3xl font-bold text-stone-100 print:text-black">{value}</div>
      {hint && <div className="text-[11px] text-stone-400">{hint}</div>}
    </div>
  );
}
