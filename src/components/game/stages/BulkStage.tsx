"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { bulkRiseAt, doughTemperature } from "@/lib/game/sim";
import { sfx, buzz } from "@/lib/game/audio";
import { ClockArt } from "../art";
import { DoughBlob } from "../DoughBlob";
import { Btn, C, Feedback, StageTitle, Tahsin, mono } from "../ui";
import { ClockControls, useClock } from "../useClock";
import type { StageProps } from "./types";

const MAX_H = 5;

/** Kabarmayı cetvel gibi okutan küçük kavanoz (alikot yöntemi) */
function AliquotJar({ rise }: { rise: number }) {
  const lvl = Math.min(1, 0.35 + 0.32 * rise);
  return (
    <svg viewBox="0 0 92 170" className="h-44" role="img" aria-label={`Kabarma yüzde ${Math.round(rise * 100)}`}>
      <rect x="12" y="20" width="46" height="140" rx="8" fill="#FFFFFF66" stroke={C.ink} strokeWidth="3" />
      <rect x="15" y={157 - 134 * lvl} width="40" height={134 * lvl} rx="4" fill="#EAD3A2" />
      {[
        { k: 0, t: "başla" },
        { k: 0.5, t: "+%50" },
        { k: 0.75, t: "+%75" },
        { k: 1, t: "2×" },
      ].map((m) => {
        const y = 157 - 134 * (0.35 + 0.32 * m.k);
        return (
          <g key={m.t}>
            <line x1="58" y1={y} x2="66" y2={y} stroke={C.ink} strokeWidth="2" />
            <text x="69" y={y + 3} fontSize="8" fill={C.ink} fontFamily="var(--font-inter)">
              {m.t}
            </text>
          </g>
        );
      })}
      <rect x="8" y="10" width="54" height="12" rx="3" fill="#CDB792" stroke={C.ink} strokeWidth="2" />
    </svg>
  );
}

export function BulkStage({ d, set, level, done }: StageProps) {
  // 1× hızda bir saat ≈ 5 saniye: yarım saatlik katlama aralığı ~2,5 saniye; duraklatıp katlanabilir
  const clock = useClock(0.2, MAX_H);
  const t = clock.t;
  const [folds, setFolds] = useState<number[]>([]);
  const [lastFoldAt, setLastFoldAt] = useState(0);
  const [tighten, setTighten] = useState(0);
  const lastTick = useRef(0);

  const temp = doughTemperature(d.waterTempC, d.kneadQuality);
  const rise = bulkRiseAt(d, temp, t);
  const hydration = (d.waterGrams / 4000) * 100;
  // Yayılma hızı: su fazlalığı ve zayıf gluten hızlandırır; katlama sıfırlar
  const spreadRate = 0.18 + Math.max(0, hydration - (level.maxHydration - 8)) / 30 + (1 - level.glutenStrength) * 0.35;
  const spread = Math.min(1, (t - lastFoldAt) * spreadRate);
  const radius = 62 + rise * 22 + spread * 40 - tighten * 8;
  const loft = Math.max(0.15, 0.35 + rise * 0.35 - spread * 0.45 + tighten * 0.2);

  // Katlamanın verdiği gerginlik zamanla gevşer (yarım saatte ~%40)
  useEffect(() => {
    const dt = t - lastTick.current;
    if (dt <= 0) return;
    lastTick.current = t;
    setTighten((x) => x * 0.6 ** (dt / 0.5));
  }, [t]);

  const onFold = () => {
    if (!clock.started) return;
    sfx.pat(0.9);
    buzz(20);
    setLastFoldAt(t);
    setTighten((x) => Math.min(1.5, x + 0.6));
    const at = Math.round(t * 10) / 10;
    // Aynı anda art arda yapılan hareketler tek katlama sayılır
    setFolds((f) => (f.length && at - f[f.length - 1] < 0.2 ? f : [...f, at]));
  };

  const hint = useMemo(() => {
    if (t === 0) return "Hamur kasada. Zamanı başlat; hamur yayıldıkça kenarından tutup ortaya çekerek katla.";
    if (rise > 1.35) return "Dikkat! Hamur iki katını çoktan geçti; fazla kabarıyor.";
    if (rise >= 0.85) return "Neredeyse iki katına çıktı. Kabarcıklar yüzeyde. Bence vakti geldi.";
    if (spread > 0.6) return "Hamur yayılıyor! Hemen katla, gerginleştir.";
    if (spread < 0.25 && folds.length > 0) return "Hamur toparlandı. Yayılmayan hamuru katlamak boşa yorgunluk; bekle.";
    return "Yarım saatte bir bak. Yayılıyorsa katla.";
  }, [t, rise, spread, folds.length]);

  return (
    <div className="space-y-5">
      <StageTitle n={4} title="Katlamalı mayalanma" sub="Kenardan tut, ortaya çek: katla." />
      <Tahsin>{hint}</Tahsin>
      <div className="flex items-end gap-3">
        <div className="relative flex-1 aspect-square rounded-[28px] border-4 overflow-hidden" style={{ borderColor: C.ink, background: "#FFFFFF80" }}>
          <DoughBlob
            radius={Math.min(118, radius)}
            aspect={1.05}
            shag={0.05}
            sheen={0.25 + tighten * 0.35}
            loft={loft}
            bubbles={Math.min(1, rise * 0.9)}
            mode="fold"
            onFold={onFold}
            className="w-full h-full"
          />
          {spread > 0.6 && (
            <div className="absolute top-2 inset-x-0 text-center text-xs font-black animate-pulse" style={{ color: C.accent }}>
              YAYILIYOR
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <AliquotJar rise={rise} />
          <ClockArt hours={t} />
        </div>
      </div>
      <div className="grid grid-cols-3 text-center text-sm">
        <div>
          <div className="text-xl font-bold" style={mono}>
            {t.toFixed(1)} sa
          </div>
          <div style={{ color: C.soft }}>süre</div>
        </div>
        <div>
          <div className="text-xl font-bold" style={{ ...mono, color: rise > 1.35 ? C.bad : rise >= 0.85 ? C.good : C.ink }}>
            +%{Math.round(rise * 100)}
          </div>
          <div style={{ color: C.soft }}>hacim</div>
        </div>
        <div>
          <div className="text-xl font-bold" style={mono}>
            {folds.length}
          </div>
          <div style={{ color: C.soft }}>katlama</div>
        </div>
      </div>
      {t >= MAX_H && <Feedback tone="bad">Saat doldu; hamur uzun süre kaldı.</Feedback>}
      <ClockControls clock={clock} label="Hamuru kasaya koy, zamanı başlat" />
      {clock.started && (
        <Btn
          disabled={t < 0.5}
          onClick={() => {
            clock.pause();
            set("bulkHours", Math.max(0.5, t));
            set("foldTimes", folds);
            done();
          }}
        >
          Yeter, porsiyonla
        </Btn>
      )}
    </div>
  );
}
