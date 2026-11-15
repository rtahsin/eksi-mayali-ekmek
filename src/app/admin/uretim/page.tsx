"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Gauge,
  Loader2,
  Package,
  Printer,
  Radio,
  RefreshCw,
  Scale,
  Wheat,
} from "lucide-react";
import type { ProductionDay } from "@/types/production";
import { calculateProductionDough } from "@/lib/production/doughMath";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useIstanbulToday } from "@/hooks/useIstanbulToday";
import { createClient } from "@/lib/supabase/client";
import { hasCapability } from "@/lib/security/capabilities";
import { addDays, formatTrDate } from "@/lib/time/istanbul";
import { getErrorMessage } from "@/lib/utils/error";
import { FirindanCikti } from "@/components/admin/uretim/FirindanCikti";

interface ChecksResponse {
  date?: string;
  checks?: Record<string, boolean>;
  error?: string;
}

const inputCls =
  "bg-[#FFFFFF] border border-[#E2D3BD] rounded-xl px-3 min-h-[44px] text-sm text-[#3B1E1A] placeholder:text-[#6E5148]/70 focus:outline-none focus:ring-2 focus:ring-[#B4532A]";

function formatDecimalTr(value: number, fractionDigits = 2): string {
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function packCheckKey(productId: string): string {
  return `pack:${productId}`;
}

function extractCheckChange(
  record: unknown
): { checkKey: string; checked: boolean } | null {
  if (!record || typeof record !== "object") return null;
  const obj = record as Record<string, unknown>;
  const checkKey = typeof obj.check_key === "string" ? obj.check_key : null;
  if (!checkKey) return null;
  return {
    checkKey,
    checked: obj.checked === true,
  };
}

/**
 * Üretim & Paketleme Planı:
 * Seçilen gün için siparişlerden taş fırın somun adetlerini, hamurhane yoğurma reçetesini
 * ve çoklu çalışan senkronlu mandıra & şarküteri paketleme listesini hesaplar.
 */
export default function ProductionPage() {
  const { adminUser } = useAdminAuth();
  const canManageSettings = hasCapability(adminUser?.role, "settings.manage");

  const today = useIstanbulToday();
  const [date, setDate] = useState(() => addDays(today, 1));
  const [data, setData] = useState<ProductionDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [capInput, setCapInput] = useState("");
  const [capNote, setCapNote] = useState("");
  const [savingCap, setSavingCap] = useState(false);

  const [checkedPacks, setCheckedPacks] = useState<Record<string, boolean>>({});
  const [checksLoading, setChecksLoading] = useState(false);
  const [savingCheckKeys, setSavingCheckKeys] = useState<Set<string>>(() => new Set());
  const [checksError, setChecksError] = useState<string | null>(null);
  const [realtimeLive, setRealtimeLive] = useState(false);

  const loadProduction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/production?date=${date}`, { cache: "no-store" });
      const body = (await res.json()) as ProductionDay & { error?: string };
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

  const loadChecks = useCallback(async () => {
    setChecksLoading(true);
    setChecksError(null);
    try {
      const res = await fetch(`/api/admin/production/checks?date=${date}`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as ChecksResponse;
      if (!res.ok) {
        setChecksError(body.error || `Paketleme onayları alınamadı (HTTP ${res.status}).`);
        return;
      }
      setCheckedPacks(body.checks && typeof body.checks === "object" ? body.checks : {});
    } catch (err: unknown) {
      setChecksError(getErrorMessage(err) || "Paketleme onayları yüklenemedi.");
    } finally {
      setChecksLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setCheckedPacks({});
    void loadProduction();
    void loadChecks();
  }, [loadProduction, loadChecks]);

  // Çoklu çalışan canlı senkron: Realtime + pencere odağında tazeleme
  useEffect(() => {
    const onFocus = () => {
      void loadChecks();
    };
    window.addEventListener("focus", onFocus);

    const supabase = createClient();
    if (!supabase) {
      setRealtimeLive(false);
      return () => {
        window.removeEventListener("focus", onFocus);
      };
    }

    const channel = supabase
      .channel(`production-checks-${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "production_checks",
          filter: `delivery_date=eq.${date}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldChange = extractCheckChange(payload.old);
            if (oldChange) {
              setCheckedPacks((prev) => ({ ...prev, [oldChange.checkKey]: false }));
            }
            return;
          }
          const nextChange = extractCheckChange(payload.new);
          if (nextChange) {
            setCheckedPacks((prev) => ({ ...prev, [nextChange.checkKey]: nextChange.checked }));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeLive(status === "SUBSCRIBED");
      });

    return () => {
      setRealtimeLive(false);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [date, loadChecks]);

  const saveCapacity = async (value: number | null) => {
    setSavingCap(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, breadCapacity: value, note: capNote }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Kaydedilemedi");
      await loadProduction();
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
    () => packLines.filter((l) => Boolean(checkedPacks[packCheckKey(l.productId)])).length,
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

  const togglePackItem = async (productId: string) => {
    const key = packCheckKey(productId);
    if (savingCheckKeys.has(key)) return;

    const prevChecked = Boolean(checkedPacks[key]);
    const nextChecked = !prevChecked;

    setChecksError(null);
    setCheckedPacks((prev) => ({ ...prev, [key]: nextChecked }));
    setSavingCheckKeys((prev) => new Set(prev).add(key));

    try {
      const res = await fetch("/api/admin/production/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, checkKey: key, checked: nextChecked }),
      });
      const body = (await res.json().catch(() => ({}))) as ChecksResponse;
      if (!res.ok) {
        throw new Error(body.error || `Onay kaydedilemedi (HTTP ${res.status}).`);
      }
    } catch (err: unknown) {
      setCheckedPacks((prev) => ({ ...prev, [key]: prevChecked }));
      setChecksError(getErrorMessage(err) || "Paketleme işareti sunucuya yazılamadı.");
    } finally {
      setSavingCheckKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const resetAllPackChecks = async () => {
    const activeKeys = packLines
      .map((l) => packCheckKey(l.productId))
      .filter((k) => Boolean(checkedPacks[k]));

    if (activeKeys.length === 0) return;

    setChecksError(null);
    setCheckedPacks((prev) => {
      const next = { ...prev };
      for (const k of activeKeys) next[k] = false;
      return next;
    });
    setSavingCheckKeys((prev) => {
      const next = new Set(prev);
      for (const k of activeKeys) next.add(k);
      return next;
    });

    try {
      const results = await Promise.all(
        activeKeys.map(async (checkKey) => {
          const res = await fetch("/api/admin/production/checks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, checkKey, checked: false }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as ChecksResponse;
            return body.error || `HTTP ${res.status}`;
          }
          return null;
        })
      );
      const firstErr = results.find((r) => r !== null);
      if (firstErr) {
        setChecksError(firstErr);
        await loadChecks();
      }
    } catch {
      setChecksError("Sıfırlama sırasında bağlantı hatası oluştu.");
      await loadChecks();
    } finally {
      setSavingCheckKeys((prev) => {
        const next = new Set(prev);
        for (const k of activeKeys) next.delete(k);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 print:max-w-none print:space-y-4 print:pb-0 print:p-4 print:bg-white print:text-black">
      {/* Üst Başlık: Seçili Günün Üretim & Paketleme Planı */}
      <header className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#E2D3BD] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:bg-white print:border-b-2 print:border-x-0 print:border-t-0 print:border-black print:rounded-none print:p-0 print:pb-3 print:shadow-none">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#8E3D1B] font-semibold print:text-gray-700">
            EkmekLab Taş Fırın · Üretim & Paketleme Planı
          </p>
          <h1 className="text-2xl font-bold text-[#3B1E1A] font-serif mt-0.5 print:text-black">
            {formatTrDate(date, "long")} Üretim Planı
          </h1>
          <p className="text-[#6E5148] text-xs mt-1 print:text-gray-700">
            Aktif siparişlerden ve paket içeriklerinden hesaplanır; iptal edilen siparişler dahil değildir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {[0, 1, 2].map((offset) => {
            const d = addDays(today, offset);
            const active = date === d;
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setDate(d)}
                className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold border transition-colors ${
                  active
                    ? "bg-[#B4532A] text-white border-[#B4532A]"
                    : "bg-[#FBF6EC] text-[#3B1E1A] border-[#E2D3BD] hover:bg-[#F3E2D4]"
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
            onClick={() => {
              void loadProduction();
              void loadChecks();
            }}
            aria-label="Üretim verisini yenile"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-[#3B1E1A] flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading || checksLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Üretim & Paketleme Fişi Yazdır</span>
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-[#FCECE9] border border-[#E7B7AF] text-xs text-[#7D2114] flex items-center gap-2 print:hidden"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 flex justify-center items-center text-[#6E5148] text-sm gap-2 print:hidden">
          <Loader2 className="w-4 h-4 animate-spin text-[#B4532A]" aria-hidden="true" /> Hesaplanıyor…
        </div>
      ) : data ? (
        <>
          {/* Üst KPI Kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
            <Stat label="Sipariş" value={String(data.orderCount)} hint="İptal hariç aktif" />
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
          <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 space-y-4 shadow-sm print:bg-white print:border print:border-black print:p-4 print:rounded-none print:shadow-none break-inside-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2
                id="dough-table-heading"
                className="font-serif text-lg font-bold text-[#3B1E1A] flex items-center gap-2 print:text-black"
              >
                <Wheat className="w-5 h-5 text-[#B4532A] print:text-black" aria-hidden="true" />
                <span>Bölüm 1 — Taş Fırın Somun & Hamurhane Yoğurma Hesabı</span>
              </h2>
              <span className="text-xs font-mono text-[#6E5148] print:text-gray-700">
                +%12 pişme kaybı · %20 canlı maya · %2 tuz
              </span>
            </div>

            {doughSummary.lines.length === 0 && !doughSummary.wholesale ? (
              <p className="text-sm text-[#6E5148] print:text-gray-700">
                Bu gün için taş fırında pişirilecek somun siparişi bulunmuyor.
              </p>
            ) : (
              <>
                <div
                  tabIndex={0}
                  role="region"
                  aria-labelledby="dough-table-heading"
                  className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-[#B4532A] rounded-xl"
                >
                  <table className="w-full text-sm border-collapse">
                    <caption className="sr-only">Taş fırın somun adetleri ve çeşit bazlı hamur hesabı</caption>
                    <thead>
                      <tr className="border-b border-[#E2D3BD] text-left text-xs uppercase tracking-wider text-[#6E5148] print:border-black print:text-black">
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
                          className="border-b border-[#E2D3BD]/70 last:border-0 print:border-gray-300"
                        >
                          <th scope="row" className="py-2.5 pr-3 font-medium text-left text-[#3B1E1A] print:text-black">
                            {line.name}
                          </th>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-[#6E5148] print:text-gray-700">
                            {Math.round(line.unitBakedGrams)} g · %{line.hydrationPct}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sm text-[#3B1E1A] print:text-black">
                            {formatDecimalTr(line.doughKg)} kg
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-lg font-bold text-[#8E3D1B] print:text-black">
                            {line.loafCount}
                          </td>
                        </tr>
                      ))}
                      {doughSummary.wholesale && (
                        <tr className="border-t border-[#E2D3BD] print:border-gray-400">
                          <th scope="row" className="py-2.5 pr-3 font-medium text-left text-[#6E5148] print:text-black">
                            Şarküteriler (günlük toptan, ayarlardan)
                          </th>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-[#6E5148] print:text-gray-700">
                            {Math.round(doughSummary.wholesale.unitBakedGrams)} g · %
                            {doughSummary.wholesale.hydrationPct}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sm text-[#3B1E1A] print:text-black">
                            {formatDecimalTr(doughSummary.wholesale.doughKg)} kg
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-lg font-bold text-[#3B1E1A] print:text-black">
                            {doughSummary.wholesale.loafCount}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Hamurhane Toplam Yoğurma Reçetesi */}
                <div className="rounded-2xl bg-[#FBF6EC] border border-[#DFB99F] p-4 space-y-3 print:bg-gray-50 print:border-black">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#8E3D1B] flex items-center gap-1.5 print:text-black">
                      <Scale className="w-4 h-4" aria-hidden="true" />
                      Hamurhane Toplam Yoğurma Özeti (
                      <span className="font-mono tabular-nums">{doughSummary.totals.loafCount}</span> somun)
                    </span>
                    <span className="font-mono tabular-nums text-[#6E5148] print:text-gray-700">
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

          {/* Bölüm 2 — Çoklu Çalışan Senkronlu Mandıra & Şarküteri Paketleme Listesi */}
          <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 space-y-3 shadow-sm print:bg-white print:border print:border-black print:p-4 print:rounded-none print:shadow-none break-inside-avoid">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-[#3B1E1A] flex items-center gap-2 print:text-black">
                  <Package className="w-5 h-5 text-[#B4532A] print:text-black" aria-hidden="true" />
                  <span>Bölüm 2 — Mandıra & Şarküteri Paketleme Listesi</span>
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold print:hidden ${
                    realtimeLive
                      ? "bg-[#E5EFE7] border-[#B4D3BC] text-[#1D5130]"
                      : "bg-[#FBF6EC] border-[#E2D3BD] text-[#6E5148]"
                  }`}
                >
                  <Radio className="w-3 h-3" aria-hidden="true" />
                  {realtimeLive ? "Ekip Canlı Senkron" : "Sunucu Senkronlu"}
                </span>
              </div>

              {packLines.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono tabular-nums text-[#6E5148] print:text-black">
                    {checkedPackCount}/{packLines.length} hazır · toplam {packTotalQty} adet
                  </span>
                  {checkedPackCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void resetAllPackChecks()}
                      className="text-[#8E3D1B] font-semibold hover:underline print:hidden"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
              )}
            </div>

            {checksError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-[#FEF3D6] border border-[#E8C587] text-xs text-[#7A4A0B] flex items-center gap-2 print:hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{checksError}</span>
              </div>
            )}

            {packLines.length === 0 ? (
              <p className="text-sm text-[#6E5148] print:text-gray-700">
                Bu gün için hazırlanacak mandıra veya şarküteri eşlikçi siparişi yok.
              </p>
            ) : (
              <ul className="divide-y divide-[#E2D3BD] print:divide-gray-300">
                {packLines.map((l) => {
                  const key = packCheckKey(l.productId);
                  const checked = Boolean(checkedPacks[key]);
                  const isSaving = savingCheckKeys.has(key);
                  const weightInfo = l.weight && l.weight > 0 ? `${l.weight} ${l.weightUnit || "g"}` : null;

                  return (
                    <li key={l.productId}>
                      <label className="flex items-center justify-between gap-3 min-h-[48px] py-2 cursor-pointer select-none">
                        <span className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSaving}
                            onChange={() => void togglePackItem(l.productId)}
                            className="w-5 h-5 rounded border-[#E2D3BD] accent-[#B4532A] shrink-0 print:hidden"
                          />
                          <span
                            aria-hidden="true"
                            className="hidden print:inline-block font-mono text-lg leading-none text-black"
                          >
                            {checked ? "☑" : "☐"}
                          </span>
                          <span
                            className={`text-sm font-medium truncate print:text-black print:no-underline ${
                              checked ? "line-through text-[#6E5148]" : "text-[#3B1E1A]"
                            }`}
                          >
                            {l.name}
                            {weightInfo && (
                              <span className="ml-2 font-mono text-xs text-[#6E5148] print:text-gray-700">
                                ({weightInfo})
                              </span>
                            )}
                          </span>
                          {isSaving && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B4532A] print:hidden" aria-hidden="true" />
                          )}
                          {checked && !isSaving && (
                            <CheckCircle2
                              className="w-4 h-4 text-[#1D5130] shrink-0 print:hidden"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="font-mono tabular-nums text-lg font-bold text-[#8E3D1B] shrink-0 print:text-black">
                          {l.quantity} adet
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Günlük Taş Fırın Kapasite Ayarı — yalnız ayar yetkili rollere */}
          {canManageSettings && (
            <section className="bg-[#FFFFFF] border border-[#E2D3BD] rounded-3xl p-5 space-y-3 shadow-sm print:hidden">
              <h2 className="font-serif text-lg font-bold text-[#3B1E1A] flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#B4532A]" aria-hidden="true" /> Bu günün ekmek kapasitesi
              </h2>
              <p className="text-sm text-[#3B1E1A]">
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
                  aria-label="Günlük somun kapasitesi"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  placeholder="ör. 40"
                  className={`${inputCls} w-28 font-mono tabular-nums`}
                />
                <input
                  aria-label="Kapasite notu"
                  value={capNote}
                  onChange={(e) => setCapNote(e.target.value)}
                  placeholder="Not (ops.)"
                  className={`${inputCls} flex-1 min-w-[160px]`}
                />
                <button
                  type="button"
                  disabled={savingCap || capInput === ""}
                  onClick={() => void saveCapacity(Number(capInput))}
                  className="min-h-[44px] px-4 rounded-xl bg-[#B4532A] hover:bg-[#9D4622] text-white text-sm font-bold disabled:opacity-40 transition-colors"
                >
                  Bu güne kapasite koy
                </button>
                {cap?.isOverride && (
                  <button
                    type="button"
                    disabled={savingCap}
                    onClick={() => void saveCapacity(null)}
                    className="min-h-[44px] px-4 rounded-xl bg-[#FBF6EC] hover:bg-[#F3E2D4] border border-[#E2D3BD] text-[#3B1E1A] text-sm font-semibold transition-colors"
                  >
                    Kaldır
                  </button>
                )}
              </div>
              <p className="text-xs text-[#6E5148]">
                Kapasite dolunca o gün için ekmek siparişi kapanır (eşlikçi siparişleri açık kalır). Genel
                varsayılan: Ayarlar → Üretim Kapasitesi.
              </p>
            </section>
          )}
        </>
      ) : null}

      {/* Alt Bölüm: Canlı Parti Kaydı & Fırından Çıktı (yalnız ekranda) */}
      <div id="firindan-cikti" className="pt-4 border-t border-[#E2D3BD] space-y-3 print:hidden">
        <div className="rounded-2xl bg-[#FBF6EC] border border-[#E2D3BD] px-4 py-3 flex items-start gap-2.5 text-xs text-[#3B1E1A]">
          <Camera className="w-4 h-4 text-[#B4532A] shrink-0 mt-0.5" aria-hidden="true" />
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
    <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E2D3BD] shadow-sm print:bg-white print:border print:border-black print:p-3 print:rounded-none print:shadow-none">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5148] print:text-gray-700">
        {label}
      </div>
      <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#3B1E1A] mt-0.5 print:text-black">
        {value}
      </div>
      {hint && <div className="text-xs text-[#6E5148] mt-0.5 print:text-gray-700">{hint}</div>}
    </div>
  );
}

function DoughMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-[#FFFFFF] border border-[#E2D3BD] p-3 print:bg-white print:border-gray-400">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6E5148] print:text-gray-700">
        {label}
      </div>
      <div className="font-mono tabular-nums text-base sm:text-lg font-bold text-[#3B1E1A] mt-0.5 print:text-black">
        {value}
      </div>
      <div className="text-[11px] text-[#6E5148] print:text-gray-600">{sub}</div>
    </div>
  );
}
