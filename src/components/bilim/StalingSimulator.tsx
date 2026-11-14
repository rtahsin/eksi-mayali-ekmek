"use client";

import React, { useEffect, useId, useState } from "react";
import { Flame, AlertTriangle } from "lucide-react";
import {
  BREAD_STARCH_PROFILES,
  MAX_STALING_HOURS,
  STARCH_PROFILE_META,
  STORAGE_MODES,
  STORAGE_MODE_META,
  simulateStalingCurve,
  type BreadStarchProfile,
  type MarkerShape,
  type StorageMode,
} from "@/lib/baking/staling";

export interface StalingSimulatorProps {
  compact?: boolean;
  initialProfile?: BreadStarchProfile;
  onInteract?: () => void;
}

const MODE_COLOR_VAR: Record<StorageMode, string> = {
  fridge_4c: "var(--color-bad)",
  linen_20c: "var(--accent)",
  freezer_m18c: "var(--color-good)",
};

function renderSvgMarker(
  shape: MarkerShape,
  cx: number,
  cy: number,
  color: string,
  size: number = 5
) {
  if (shape === "square") {
    return (
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        fill={color}
        stroke="var(--surface)"
        strokeWidth={1.75}
      />
    );
  }
  if (shape === "diamond") {
    const d = size * 1.25;
    const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`;
    return (
      <polygon
        points={points}
        fill={color}
        stroke="var(--surface)"
        strokeWidth={1.75}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill={color}
      stroke="var(--surface)"
      strokeWidth={1.75}
    />
  );
}

function formatHourBadge(hours: number): string {
  if (hours === 0) return "0. saat · Fırından Çıkış";
  const days = hours / 24;
  if (Number.isInteger(days)) {
    return `${hours}. saat · ${days}. Gün`;
  }
  return `${hours}. saat · ${days.toFixed(1).replace(".", ",")}. Gün`;
}

export function StalingSimulator({
  compact = false,
  initialProfile = "wheat",
  onInteract,
}: StalingSimulatorProps) {
  const [profile, setProfile] = useState<BreadStarchProfile>(initialProfile);
  const [hours, setHours] = useState<number>(18);
  const [reheatAt200c, setReheatAt200c] = useState<boolean>(false);

  const uid = useId();
  const sliderId = `${uid}-staling-hours`;
  const chartTitleId = `${uid}-staling-chart-title`;
  const chartDescId = `${uid}-staling-chart-desc`;

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const sim = simulateStalingCurve({
    profile,
    hours,
    reheatAt200c,
    stepHours: 6,
  });

  // SVG Koordinat Sistemi
  const W = 680;
  const H = compact ? 250 : 290;
  const padL = 46;
  const padR = 22;
  const padT = 22;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const toX = (h: number) => padL + (h / MAX_STALING_HOURS) * plotW;
  const toY = (pct: number) => padT + plotH - (pct / 100) * plotH;

  const scrubberX = toX(sim.hours);
  const restingZoneWidth =
    (Math.min(sim.profileMeta.restingHours, MAX_STALING_HOURS) /
      MAX_STALING_HOURS) *
    plotW;

  const buildPolylinePoints = (
    mode: StorageMode,
    useRaw: boolean = false
  ): string => {
    return sim.series[mode]
      .map((pt) => {
        const val = useRaw ? pt.rawCrystallinityPct : pt.crystallinityPct;
        return `${toX(pt.hours).toFixed(1)},${toY(val).toFixed(1)}`;
      })
      .join(" ");
  };

  const handleProfileChange = (next: BreadStarchProfile) => {
    setProfile(next);
    onInteract?.();
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHours(Number(e.target.value));
    onInteract?.();
  };

  const handleToggleReheat = () => {
    setReheatAt200c((prev) => !prev);
    onInteract?.();
  };

  const sliderValueText = `${formatHourBadge(sim.hours)} — Buzdolabı %${sim.selected.fridge_4c.crystallinityPct.toString().replace(".", ",")} kristal, Bez torba %${sim.selected.linen_20c.crystallinityPct.toString().replace(".", ",")} kristal, Dondurucu %${sim.selected.freezer_m18c.crystallinityPct.toString().replace(".", ",")} kristal${reheatAt200c ? " (200°C fırınlama uygulandı)" : ""}`;

  const sliderVars: React.CSSProperties & Record<string, string | number> = {
    "--attr-min": 0,
    "--attr-max": MAX_STALING_HOURS,
    "--control-value": sim.hours,
  };

  return (
    <div
      className={`rounded-2xl border border-line bg-cream-surface text-ink shadow-xs ${
        compact ? "p-4 sm:p-6 space-y-5" : "p-5 sm:p-8 space-y-6"
      }`}
    >
      {/* Üst Laboratuvar Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent font-semibold">
            GIDA FİZİĞİ LABORATUVARI · AVRAMİ RETROGRADASYON MODELİ
          </p>
          <h3
            className={`font-serif font-bold text-ink tracking-tight ${
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
            }`}
          >
            Nişasta Kristalleşmesi &amp; Tazelik Simülatörü
          </h3>
        </div>
        <span className="font-mono text-xs px-3 py-1.5 rounded-lg bg-bg border border-line text-ink shrink-0 self-start sm:self-auto">
          {formatHourBadge(sim.hours)}
        </span>
      </div>

      {/* Kontrol 1: Somun Tipi Seçici */}
      <div className="space-y-2">
        <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          1. Somun Tahıl &amp; Jel Matrisi
        </span>
        <div
          role="group"
          aria-label="Somun tipi seçici"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {BREAD_STARCH_PROFILES.map((pKey) => {
            const meta = STARCH_PROFILE_META[pKey];
            const active = profile === pKey;
            return (
              <button
                key={pKey}
                type="button"
                aria-pressed={active}
                onClick={() => handleProfileChange(pKey)}
                className={`min-h-11 px-3.5 py-2.5 rounded-xl border text-left transition-all flex flex-col justify-center ${
                  active
                    ? "bg-ink text-bg border-ink shadow-xs"
                    : "bg-bg text-ink border-line hover:border-accent/60"
                }`}
              >
                <span className="font-serif font-bold text-sm flex items-center justify-between gap-2">
                  <span>{meta.label}</span>
                  <span className="font-mono text-[11px] opacity-80">
                    {active ? "● Seçili" : `${meta.restingHours} sa`}
                  </span>
                </span>
                <span
                  className={`text-[11px] font-mono mt-0.5 ${
                    active ? "opacity-85" : "text-ink-muted"
                  }`}
                >
                  İlk bıçak: {meta.restingHours} saat
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kontrol 2 & 3: Zaman Sürgüsü + 200°C Termal Çözünme Anahtarı */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end bg-bg p-4 rounded-xl border border-line">
        <div className="lg:col-span-8 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={sliderId}
              className="font-mono text-[11px] uppercase tracking-wider text-ink-muted"
            >
              2. Fırından Çıkıştan İtibaren Geçen Süre (0 – 168 Saat)
            </label>
            <output
              htmlFor={sliderId}
              className="font-mono text-sm font-bold text-ink tabular-nums"
            >
              {sim.hours} sa ({sim.day.toString().replace(".", ",")} gün)
            </output>
          </div>

          <input
            id={sliderId}
            type="range"
            className="ekmeklab-slider"
            min={0}
            max={MAX_STALING_HOURS}
            step={6}
            value={sim.hours}
            onChange={handleHoursChange}
            aria-valuetext={sliderValueText}
            style={sliderVars}
          />

          <div
            aria-hidden="true"
            className="flex justify-between font-mono text-[10px] text-ink-muted px-0.5"
          >
            <span>0 sa (Fırın)</span>
            <span>24 sa (1. Gün)</span>
            <span>72 sa (3. Gün)</span>
            <span>120 sa (5. Gün)</span>
            <span>168 sa (7. Gün)</span>
          </div>
        </div>

        <div className="lg:col-span-4">
          <button
            type="button"
            aria-pressed={reheatAt200c}
            onClick={handleToggleReheat}
            className={`w-full min-h-11 px-4 py-2.5 rounded-xl border font-sans text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              reheatAt200c
                ? "bg-accent text-white border-accent shadow-sm"
                : "bg-cream-surface text-ink border-line hover:border-accent"
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>200°C&apos;de 4 dk Fırınla (&gt;60°C Kristal Çözünmesi)</span>
          </button>
        </div>
      </div>

      {/* İlk Bıçak Dinlenme Uyarısı */}
      {sim.restingWarning && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 sm:p-4 rounded-xl border-l-4 border-accent bg-bg text-ink flex items-start gap-3"
        >
          <AlertTriangle
            className="w-5 h-5 text-accent shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="font-serif font-bold text-ink">
              {sim.restingWarning.title} ({sim.profileMeta.restingHours} saat eşiği)
            </p>
            <p className="text-ink-muted leading-relaxed">
              {sim.restingWarning.body}
            </p>
          </div>
        </div>
      )}

      {/* 200°C Termal Çözünme Açıklama Bandı */}
      {reheatAt200c && sim.hours > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl border border-accent/50 bg-bg text-xs sm:text-sm text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <p className="leading-relaxed">
            <strong className="font-serif">DSC &gt;60°C Termal Yenilenme Aktif:</strong>{" "}
            <span className="text-ink-muted">{sim.reheatSummary}</span>
          </p>
          <span className="font-mono text-xs font-bold text-accent shrink-0">
            Bez torbada −%{sim.selected.linen_20c.meltedCrystalPct.toString().replace(".", ",")} kristal eridi
          </span>
        </div>
      )}

      {/* İnteraktif SVG Kristalleşme Eğrisi */}
      <figure className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink-muted">
          <span>Y Ekseni: Amilopektin Kristalleşme İndeksi (%0 – %100)</span>
          <div className="flex flex-wrap items-center gap-3">
            {STORAGE_MODES.map((mKey) => {
              const m = STORAGE_MODE_META[mKey];
              return (
                <span key={mKey} className="inline-flex items-center gap-1.5 text-ink">
                  <span style={{ color: MODE_COLOR_VAR[mKey] }} aria-hidden="true">
                    {m.markerSymbol}
                  </span>
                  <span>{m.shortLabel}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-bg p-2 sm:p-3 overflow-hidden">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby={`${chartTitleId} ${chartDescId}`}
            className="w-full h-auto block select-none"
          >
            <title id={chartTitleId}>
              {sim.profileMeta.label} için 7 günlük amilopektin kristalleşme eğrileri
            </title>
            <desc id={chartDescId}>
              {sliderValueText}. Artı 4 derece buzdolabı kesikli çizgi ve kare işaretçi,
              artı 20 derece bez torba düz çizgi ve daire işaretçi, eksi 18 derece derin
              dondurucu noktalı çizgi ve elmas işaretçi ile gösterilir.
            </desc>

            <defs>
              <pattern
                id={`${uid}-rest-hatch`}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke="var(--line)"
                  strokeWidth="2"
                />
              </pattern>
            </defs>

            {/* İlk Bıçak Dinlenme Penceresi Gölgeli Bant */}
            <rect
              x={padL}
              y={padT}
              width={restingZoneWidth}
              height={plotH}
              fill={`url(#${uid}-rest-hatch)`}
              opacity={0.65}
            />
            <line
              x1={padL + restingZoneWidth}
              x2={padL + restingZoneWidth}
              y1={padT}
              y2={padT + plotH}
              stroke="var(--ink-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={padL + Math.max(4, restingZoneWidth + 4)}
              y={padT + 12}
              fill="var(--ink-muted)"
              fontSize="10"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              İlk bıçak ({sim.profileMeta.restingHours} sa)
            </text>

            {/* Yatay Y-Ekseni Izgara Çizgileri (%0, %25, %50, %75, %100) */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = toY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={y}
                    y2={y}
                    stroke="var(--line)"
                    strokeWidth={tick === 0 ? 1.4 : 0.8}
                  />
                  <text
                    x={padL - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="var(--ink-muted)"
                    fontSize="10.5"
                    fontFamily="var(--font-jetbrains-mono), monospace"
                  >
                    %{tick}
                  </text>
                </g>
              );
            })}

            {/* Dikey Gün Çizgileri (0..7 gün) */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((dayIdx) => {
              const hVal = dayIdx * 24;
              const x = toX(hVal);
              return (
                <g key={dayIdx}>
                  <line
                    x1={x}
                    x2={x}
                    y1={padT}
                    y2={padT + plotH}
                    stroke="var(--line)"
                    strokeWidth={dayIdx === 0 ? 1.4 : 0.7}
                  />
                  <text
                    x={x}
                    y={H - 12}
                    textAnchor="middle"
                    fill="var(--ink-muted)"
                    fontSize="10.5"
                    fontFamily="var(--font-jetbrains-mono), monospace"
                  >
                    {dayIdx === 0 ? "0 sa" : `${dayIdx}.gün`}
                  </text>
                </g>
              );
            })}

            {/* 200°C aktifse ısıtma öncesi ham eğrileri hayalet iz olarak çiz */}
            {reheatAt200c &&
              STORAGE_MODES.map((mKey) => {
                const m = STORAGE_MODE_META[mKey];
                return (
                  <polyline
                    key={`raw-${mKey}`}
                    fill="none"
                    stroke={MODE_COLOR_VAR[mKey]}
                    strokeWidth={1.6}
                    strokeDasharray={
                      m.strokeDasharray === "none" ? undefined : m.strokeDasharray
                    }
                    opacity={0.28}
                    points={buildPolylinePoints(mKey, true)}
                  />
                );
              })}

            {/* 3 Ana Saklama Eğrisi + Günlük Şekil İşaretçileri */}
            {STORAGE_MODES.map((mKey) => {
              const m = STORAGE_MODE_META[mKey];
              const color = MODE_COLOR_VAR[mKey];
              return (
                <g key={mKey}>
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={
                      m.strokeDasharray === "none" ? undefined : m.strokeDasharray
                    }
                    points={buildPolylinePoints(mKey, false)}
                  />
                  {sim.series[mKey]
                    .filter((pt) => pt.hours % 48 === 0 && pt.hours > 0)
                    .map((pt) => (
                      <g key={`${mKey}-${pt.hours}`}>
                        {renderSvgMarker(
                          m.markerShape,
                          toX(pt.hours),
                          toY(pt.crystallinityPct),
                          color,
                          3.6
                        )}
                      </g>
                    ))}
                </g>
              );
            })}

            {/* Seçili Saat Dikey Okuma Cetveli (Scrubber) */}
            <line
              x1={scrubberX}
              x2={scrubberX}
              y1={padT}
              y2={padT + plotH}
              stroke="var(--ink)"
              strokeWidth={1.6}
            />

            {/* 200°C Termal Çözünme Dikey Erime Vektörü */}
            {reheatAt200c &&
              sim.hours > 0 &&
              STORAGE_MODES.map((mKey) => {
                const pt = sim.selected[mKey];
                if (pt.meltedCrystalPct < 2) return null;
                const yRaw = toY(pt.rawCrystallinityPct);
                const yRevived = toY(pt.crystallinityPct);
                return (
                  <g key={`melt-${mKey}`}>
                    <line
                      x1={scrubberX}
                      x2={scrubberX}
                      y1={yRaw}
                      y2={yRevived - 4}
                      stroke={MODE_COLOR_VAR[mKey]}
                      strokeWidth={2}
                      strokeDasharray="2 2"
                    />
                  </g>
                );
              })}

            {/* Seçili Saatteki Aktif Nokta İşaretçileri */}
            {STORAGE_MODES.map((mKey) => {
              const m = STORAGE_MODE_META[mKey];
              const pt = sim.selected[mKey];
              return (
                <g key={`active-${mKey}`}>
                  {renderSvgMarker(
                    m.markerShape,
                    scrubberX,
                    toY(pt.crystallinityPct),
                    MODE_COLOR_VAR[mKey],
                    5.6
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <figcaption className="text-xs text-ink-muted font-sans leading-relaxed">
          {sim.profileMeta.matrixChemistryNote}
        </figcaption>
      </figure>

      {/* 3 Ortam Canlı Sayısal Karşılaştırma Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {STORAGE_MODES.map((mKey) => {
          const m = STORAGE_MODE_META[mKey];
          const snap = sim.selected[mKey];
          const color = MODE_COLOR_VAR[mKey];

          return (
            <div
              key={mKey}
              className="p-4 rounded-xl border border-line bg-bg flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-ink inline-flex items-center gap-1.5">
                    <span style={{ color }} aria-hidden="true">
                      {m.markerSymbol}
                    </span>
                    <span>{m.shortLabel}</span>
                  </span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cream-surface border border-line text-ink-muted">
                    {m.strokeDasharray === "none"
                      ? "Düz çizgi"
                      : m.strokeDasharray === "7 4"
                      ? "Kesikli"
                      : "Noktalı"}
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-snug">
                  {m.mechanismNote}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-xs">
                <div>
                  <dt className="font-mono text-[10px] uppercase text-ink-muted">
                    Kristalleşme
                  </dt>
                  <dd className="font-mono text-lg font-bold text-ink tabular-nums mt-0.5">
                    {reheatAt200c && snap.meltedCrystalPct > 0 && (
                      <span className="text-xs font-normal text-ink-muted line-through mr-1.5">
                        %{snap.rawCrystallinityPct.toString().replace(".", ",")}
                      </span>
                    )}
                    %{snap.crystallinityPct.toString().replace(".", ",")}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase text-ink-muted">
                    İç Yumuşaklık
                  </dt>
                  <dd className="font-mono text-lg font-bold text-ink tabular-nums mt-0.5">
                    {snap.softnessScore}
                    <span className="text-xs font-normal text-ink-muted">/100</span>
                  </dd>
                </div>
                <div className="col-span-2 pt-1">
                  <dt className="font-mono text-[10px] uppercase text-ink-muted">
                    Kabuk Durumu
                  </dt>
                  <dd className="font-sans text-xs font-medium text-ink mt-0.5">
                    {snap.crustStateLabel}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
