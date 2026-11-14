"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  Gauge,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Scale,
  Wheat,
} from "lucide-react";
import type { ProductionDay } from "@/types/production";
import { calculateProductionDough } from "@/lib/production/doughMath";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { FirindanCikti } from "@/components/admin/uretim/FirindanCikti";

const inputCls =
  "bg-stone-950 border border-stone-800 rounded-xl px-3 min-h-[44px] text-sm text-stone-100 focus:outline-none focus:border-artisan-terracotta";

function formatDecimalTr(value: number, fractionDigits = 2): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Üretim & Paketleme Planı:
 * Seçilen gün için siparişlerden (paket bileşenleri açılarak) taş fırın somun adetlerini,
 * hamurhane yoğurma reçetesini (Hamur kg, Un kg, Su L, Canlı Ekşi Maya kg, Tuz g) ve
 * mandıra & şarküteri paketleme hazırlık listesini hesaplar.
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
  const [checkedPacks, setCheckedPacks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCheckedPacks({});
  }, [date]);

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

  const bakeLines = useMemo(
    () => data?.lines.filter((l) => !l.isAccompaniment && l.capacityUnits > 0) ?? [],
    [data]
  );
  const packLines = useMemo(
    () => data?.lines.filter((l) => l.isAccompaniment || l.capacityUnits === 0) ?? [],
    [data]
  );

  const retailLoaves = useMemo(() => bakeLines.reduce((s, l) => s + l.quantity, 0), [bakeLines]);
  const packTotalQty = useMemo(() => packLines.reduce((s, l) => s + l.quantity, 0), [packLines]);
  const checkedPackCount = useMemo(
    () => packLines.filter((l) => Boolean(checkedPacks[l.productId])).length,
    [packLines, checkedPacks]
  );

  const doughSummary = useMemo(
    () =>
      calculateProductionDough(bakeLines, {
        wholesaleLoaves: data?.wholesaleLoaves ?? 0,
      }),
    [bakeLines, data?.wholesaleLoaves]
  );

  const cap = data?.capacity;

  const togglePackItem = (productId: string) => {
    setCheckedPacks((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 print:max-w-none print:space-y-4 print:pb-0 print:p-4 print:bg-white print:text-black">
      {/* Üst Başlık: Seçili Günün Üretim & Paketleme Planı */}
      <header className="bg-stone-900/80 p-5 sm:p-6 rounded-2xl border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:bg-white print:border-b-2 print:border-x-0 print:border-t-0 print:border-black print:rounded-none print:p-0 print:pb-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 print:text-gray-700">
            EkmekLab Taş Fırın · Üretim & Paketleme Planı
          </p>
          <h1 className="text-2xl font-bold text-stone-100 font-serif mt-0.5 print:text-black">
            {formatTrDate(date, "long")} Üretim Planı
          </h1>
          <p className="text-stone-400 text-xs mt-1 print:text-gray-700">
            Aktif siparişlerden ve paket içeriklerinden hesaplanır; iptal edilen siparişler dahil değildir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {[0, 1, 2].map((offset) => {
            const d = addDays(today, offset);
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setDate(d)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border transition-colors ${
                  date === d
                    ? "bg-artisan-terracotta text-white border-artisan-terracotta"
                    : "bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700"
                }`}
              >
                {offset === 0 ? "Bugün" : offset === 1 ? "Yarın" : formatTrDate(d)}
              </button>
            );
          })}
          <input
            type="date"
            aria-label="Üretim tarihi seç"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Üretim verisini yenile"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 rounded-xl bg-artisan-terracotta hover:bg-artisan-terracotta/90 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Üretim & Paketleme Fişi Yazdır</span>
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 flex items-center gap-2 print:hidden"
        >
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 flex justify-center text-stone-400 text-sm gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin" /> Hesaplanıyor…
        </div>
      ) : data ? (
        <>
          {/* Üst KPI Kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            <Stat
              label="Sipariş"
              value={String(data.orderCount)}
              hint="İptal hariç aktif"
            />
            <Stat
              label="Toplam Pişecek Somun"
              value={String(retailLoaves + data.wholesaleLoaves)}
              hint={
                data.wholesaleLoaves > 0
                  ? `${retailLoaves} perakende + ${data.wholesaleLoaves} şarküteri`
                  : `${retailLoaves} perakende somun`
              }
            />
            <Stat
              label="Toplam Hamur (kg)"
              value={`${formatDecimalTr(doughSummary.totals.doughKg)} kg`}
              hint={`Un ${formatDecimalTr(doughSummary.totals.flourKg)} kg · Su ${formatDecimalTr(
                doughSummary.totals.waterLiters
              )} L`}
            />
            <Stat
              label="Mandıra & Şarküteri Kalemi"
              value={String(packTotalQty)}
              hint={packLines.length > 0 ? `${packLines.length} çeşit eşlikçi` : "Eşlikçi siparişi yok"}
            />
          </div>

          {/* Bölüm 1 — Taş Fırın Somun & Hamurhane Yoğurma Hesabı */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-4 print:bg-white print:border print:border-black print:p-4 break-inside-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2 print:text-black">
                <Wheat className="w-5 h-5 text-amber-500 print:text-black" />
                <span>Bölüm 1 — Taş Fırın Somun & Hamurhane Yoğurma Hesabı</span>
              </h2>
              <span className="text-xs font-mono text-stone-400 print:text-gray-700">
                +%12 pişme kaybı · %20 canlı maya · %2 tuz
              </span>
            </div>

            {doughSummary.lines.length === 0 && !doughSummary.wholesale ? (
              <p className="text-sm text-stone-400 print:text-gray-700">
                Bu gün için taş fırında pişirilecek somun siparişi bulunmuyor.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <caption className="sr-only">Taş fırın somun adetleri ve çeşit bazlı hamur hesabı</caption>
                    <thead>
                      <tr className="border-b border-stone-800 text-left text-xs uppercase tracking-wider text-stone-400 print:border-black print:text-black">
                        <th scope="col" className="py-2 pr-3">
                          Ekmek Çeşidi
                        </th>
                        <th scope="col" className="py-2 px-3 text-right">
                          Gramaj / Hidr.
                        </th>
                        <th scope="col" className="py-2 px-3 text-right">
                          Çiğ Hamur
                        </th>
                        <th scope="col" className="py-2 pl-3 text-right">
                          Adet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {doughSummary.lines.map((line) => (
                        <tr
                          key={line.productId}
                          className="border-b border-stone-800/80 last:border-0 print:border-gray-300"
                        >
                          <td className="py-2.5 pr-3 font-medium text-stone-100 print:text-black">
                            {line.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-stone-400 print:text-gray-700">
                            {Math.round(line.unitBakedGrams)} g · %{line.hydrationPct}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm text-stone-300 print:text-black">
                            {formatDecimalTr(line.doughKg)} kg
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono text-lg font-bold text-amber-300 print:text-black">
                            {line.loafCount}
                          </td>
                        </tr>
                      ))}
                      {doughSummary.wholesale && (
                        <tr className="border-t border-stone-800 print:border-gray-400">
                          <td className="py-2.5 pr-3 text-stone-300 print:text-black">
                            Şarküteriler (günlük toptan, ayarlardan)
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs text-stone-400 print:text-gray-700">
                            {Math.round(doughSummary.wholesale.unitBakedGrams)} g · %
                            {doughSummary.wholesale.hydrationPct}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm text-stone-300 print:text-black">
                            {formatDecimalTr(doughSummary.wholesale.doughKg)} kg
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono text-lg font-bold text-stone-200 print:text-black">
                            {doughSummary.wholesale.loafCount}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Hamurhane Toplam Yoğurma Reçetesi */}
                <div className="rounded-xl bg-stone-950/80 border border-amber-500/25 p-4 space-y-3 print:bg-gray-50 print:border-black">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5 print:text-black">
                      <Scale className="w-4 h-4" />
                      Hamurhane Toplam Yoğurma Özeti ({doughSummary.totals.loafCount} somun)
                    </span>
                    <span className="font-mono text-stone-400 print:text-gray-700">
                      Pişmiş hedef: {formatDecimalTr(doughSummary.totals.bakedGrams / 1000)} kg
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <DoughMetric
                      label="Toplam Hamur"
                      value={`${formatDecimalTr(doughSummary.totals.doughKg)} kg`}
                      sub="+%12 pişme payı"
                    />
                    <DoughMetric
                      label="Un"
                      value={`${formatDecimalTr(doughSummary.totals.flourKg)} kg`}
                      sub="Ana un (%100)"
                    />
                    <DoughMetric
                      label="Su"
                      value={`${formatDecimalTr(doughSummary.totals.waterLiters)} L`}
                      sub="Yoğurma suyu"
                    />
                    <DoughMetric
                      label="Canlı Ekşi Maya"
                      value={`${formatDecimalTr(doughSummary.totals.levainKg)} kg`}
                      sub="Levain (%20)"
                    />
                    <DoughMetric
                      label="Tuz"
                      value={`${Math.round(doughSummary.totals.saltGrams).toLocaleString("tr-TR")} g`}
                      sub="Deniz/kaya (%2)"
                    />
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Bölüm 2 — Mandıra & Şarküteri Paketleme Listesi */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-3 print:bg-white print:border print:border-black print:p-4 break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2 print:text-black">
                <Package className="w-5 h-5 text-amber-500 print:text-black" />
                <span>Bölüm 2 — Mandıra & Şarküteri Paketleme Listesi</span>
              </h2>
              {packLines.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-stone-400 print:text-black">
                    {checkedPackCount}/{packLines.length} hazır · toplam {packTotalQty} adet
                  </span>
                  {checkedPackCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setCheckedPacks({})}
                      className="text-amber-300 hover:underline print:hidden"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              )}
            </div>

            {packLines.length === 0 ? (
              <p className="text-sm text-stone-400 print:text-gray-700">
                Bu gün için hazırlanacak mandıra veya şarküteri eşlikçi siparişi yok.
              </p>
            ) : (
              <ul className="divide-y divide-stone-800 print:divide-gray-300">
                {packLines.map((l) => {
                  const checked = Boolean(checkedPacks[l.productId]);
                  const weightInfo =
                    l.weight && l.weight > 0 ? `${l.weight} ${l.weightUnit || "g"}` : null;
                  return (
                    <li key={l.productId}>
                      <label className="flex items-center justify-between gap-3 min-h-[48px] py-2 cursor-pointer select-none">
                        <span className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePackItem(l.productId)}
                            className="w-5 h-5 rounded accent-artisan-terracotta shrink-0 print:hidden"
                          />
                          <span
                            aria-hidden="true"
                            className="hidden print:inline-block font-mono text-lg leading-none text-black"
                          >
                            {checked ? "☑" : "☐"}
                          </span>
                          <span
                            className={`text-sm font-medium truncate print:text-black print:no-underline ${
                              checked ? "line-through text-stone-500" : "text-stone-100"
                            }`}
                          >
                            {l.name}
                            {weightInfo && (
                              <span className="ml-2 font-mono text-xs text-stone-400 print:text-gray-700">
                                ({weightInfo})
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="font-mono text-lg font-bold text-amber-300 shrink-0 print:text-black">
                          {l.quantity} adet
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Günlük Taş Fırın Kapasite Ayarı (yalnız ekranda) */}
          <section className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 space-y-3 print:hidden">
            <h2 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-500" /> Bu günün ekmek kapasitesi
            </h2>
            <p className="text-sm text-stone-300">
              {cap?.limit === null || cap?.limit === undefined
                ? `Sınır yok — ${cap?.used ?? 0} ekmeklik sipariş alındı.`
                : `${cap.used} / ${cap.limit} dolu${
                    cap.isOverride ? " (bu güne özel)" : " (ayarlardaki varsayılan)"
                  }. ${Math.max(0, cap.limit - cap.used)} ekmeklik yer kaldı.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min={0}
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                placeholder="ör. 40"
                className={`${inputCls} w-28`}
              />
              <input
                value={capNote}
                onChange={(e) => setCapNote(e.target.value)}
                placeholder="Not (ops.)"
                className={`${inputCls} flex-1 min-w-[160px]`}
              />
              <button
                type="button"
                disabled={savingCap || capInput === ""}
                onClick={() => void saveCapacity(Number(capInput))}
                className="min-h-[44px] px-4 rounded-xl bg-artisan-terracotta text-white text-sm font-bold disabled:opacity-40"
              >
                Bu güne kapasite koy
              </button>
              {cap?.isOverride && (
                <button
                  type="button"
                  disabled={savingCap}
                  onClick={() => void saveCapacity(null)}
                  className="min-h-[44px] px-4 rounded-xl bg-stone-800 text-stone-200 text-sm font-semibold"
                >
                  Kaldır
                </button>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Kapasite dolunca o gün için ekmek siparişi kapanır (eşlikçi siparişleri açık kalır). Genel varsayılan:
              Ayarlar → Üretim Kapasitesi.
            </p>
          </section>
        </>
      ) : null}

      {/* Alt Bölüm: Canlı Parti Kaydı & Fırından Çıktı (yalnız ekranda) */}
      <div className="pt-2 border-t border-stone-800/80 space-y-3 print:hidden">
        <div className="rounded-xl bg-amber-950/25 border border-amber-500/25 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-200/90">
          <Camera className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong>Canlı Vitrin Senkronu:</strong> Buradan girdiğiniz parti çıkış saati ana sayfa rozetinde,
            yüklediğiniz parti fotoğrafları ise doğrudan ilgili ürün sayfasındaki{" "}
            <strong>Canlı Parti Pasaportu</strong> bölümünde müşterilere gösterilir.
          </p>
        </div>
        <FirindanCikti />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-stone-900/70 border border-stone-800 print:bg-white print:border print:border-black print:p-3">
      <div className="text-[11px] uppercase tracking-wider text-stone-400 print:text-gray-700">{label}</div>
      <div className="font-serif text-2xl sm:text-3xl font-bold text-stone-100 mt-0.5 print:text-black">{value}</div>
      {hint && <div className="text-xs text-stone-400 mt-0.5 print:text-gray-700">{hint}</div>}
    </div>
  );
}

function DoughMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-stone-900/90 border border-stone-800 p-3 print:bg-white print:border-gray-400">
      <div className="text-[11px] uppercase tracking-wider text-stone-400 print:text-gray-700">{label}</div>
      <div className="font-mono text-base sm:text-lg font-bold text-stone-100 mt-0.5 print:text-black">{value}</div>
      <div className="text-[11px] text-stone-500 print:text-gray-600">{sub}</div>
    </div>
  );
}
