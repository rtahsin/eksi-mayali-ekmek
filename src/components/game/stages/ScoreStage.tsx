"use client";

import React, { useRef, useState } from "react";
import { sfx, buzz } from "@/lib/game/audio";
import { BannetonTop } from "../art";
import { Btn, C, Feedback, StageTitle, Tahsin } from "../ui";
import type { StageProps } from "./types";
import type { ScoreCut } from "@/types/game";

const DOUGH = { cx: 200, cy: 150, rx: 150, ry: 92 };

/** Kesik: bıçağın tutuşunu seç, hamurun üstünde tek ve kararlı bir hareketle kes */
export function ScoreStage({ set, done }: StageProps) {
  const [blade, setBlade] = useState<30 | 90 | null>(null);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [cut, setCut] = useState<ScoreCut | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const t0 = useRef(0);
  const drawing = useRef(false);

  const pt = (e: React.PointerEvent) => {
    const b = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * 400, y: ((e.clientY - b.top) / b.height) * 300 };
  };

  const finish = () => {
    drawing.current = false;
    if (path.length < 2) return;
    const a = path[0];
    const b = path[path.length - 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const inside = ((mid.x - DOUGH.cx) / DOUGH.rx) ** 2 + ((mid.y - DOUGH.cy) / DOUGH.ry) ** 2 <= 1;
    if (len < 50 || !inside) {
      setWarn(!inside ? "Kesik hamurun üstünde olmalı." : "Çok kısa; ekmeğin boyunca kes.");
      setPath([]);
      return;
    }
    const ms = Math.max(1, performance.now() - t0.current);
    let ang = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
    if (ang > 90) ang = 180 - ang;
    const result: ScoreCut = {
      angleToAxis: Math.round(ang),
      coverage: Math.min(1, Math.abs(b.x - a.x) / (DOUGH.rx * 2)),
      speed: Math.max(0, Math.min(1, (len / ms - 0.15) / 0.9)),
      blade: blade ?? 30,
    };
    setCut(result);
    set("cut", result);
    sfx.slice();
    buzz(25);
  };

  const quality =
    cut &&
    (cut.angleToAxis <= 25 && cut.coverage >= 0.55 && cut.coverage <= 0.95 && cut.speed >= 0.45
      ? "good"
      : cut.speed < 0.3
      ? "slow"
      : cut.angleToAxis > 35
      ? "angle"
      : "length");

  const d = path.length > 1 ? `M ${path.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")}` : "";

  return (
    <div className="space-y-5">
      <StageTitle n={6} title="Kesik" sub="Tek hareket. Kararlı ol." />
      {!blade ? (
        <>
          <Tahsin>Hamur dolaptan geldi, soğuk ve sıkı; kesmenin tam vakti. Bıçağı nasıl tutacaksın?</Tahsin>
          <div className="grid grid-cols-2 gap-3">
            {([30, 90] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  sfx.unlock();
                  setBlade(b);
                }}
                className="rounded-2xl p-4 border-2 space-y-2"
                style={{ borderColor: C.ink, background: C.card }}
              >
                <svg viewBox="0 0 120 70" className="w-full">
                  <path d="M 10 55 Q 60 35 110 55" fill="none" stroke="#C9A06C" strokeWidth="6" />
                  <g transform={`translate(60 42) rotate(${b === 30 ? -60 : -90})`}>
                    <rect x="0" y="-3" width="46" height="6" rx="2" fill={C.ink} />
                    <rect x="-14" y="-4" width="16" height="8" rx="2" fill="#B9C2C8" stroke={C.ink} strokeWidth="1" />
                  </g>
                </svg>
                <div className="font-bold">{b === 30 ? "Yatık (30°)" : "Dik (90°)"}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <Tahsin>{cut ? "Bakalım fırında nasıl açılacak…" : "Ekmeğin uzun ekseni boyunca, ortadan biraz yanda, tek ve hızlı bir çizgi çek."}</Tahsin>
          <BannetonTop>
            <svg
              ref={svgRef}
              viewBox="0 0 400 300"
              className="absolute inset-0 w-full h-full"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                if (cut) return;
                try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
                drawing.current = true;
                t0.current = performance.now();
                setWarn(null);
                setPath([pt(e)]);
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const p = pt(e);
                setPath((ps) => [...ps, p]);
              }}
              onPointerUp={finish}
              onPointerCancel={finish}
            >
              {d && (
                <>
                  <path d={d} fill="none" stroke="#5C3A26" strokeWidth={cut ? 9 : 3} strokeLinecap="round" style={{ transition: "stroke-width .6s" }} />
                  {cut && <path d={d} fill="none" stroke="#F2E0B5" strokeWidth={4} strokeLinecap="round" />}
                </>
              )}
            </svg>
          </BannetonTop>
          {warn && <Feedback tone="warn">{warn}</Feedback>}
          {cut && quality && (
            <Feedback tone={quality === "good" ? "good" : "warn"}>
              {quality === "good"
                ? `Temiz kesik: ${cut.angleToAxis}° eksene, boyun %${Math.round(cut.coverage * 100)}'i.`
                : quality === "slow"
                ? "Bıçak yavaş gitti; hamuru sürükledi, kesik pürüzlü."
                : quality === "angle"
                ? `Kesik eksene ${cut.angleToAxis}° açılı; ekmek yamuk açılabilir.`
                : `Boyun %${Math.round(cut.coverage * 100)}'i: ${cut.coverage < 0.55 ? "kısa kaldı" : "uçlara kadar gitmiş"}.`}
            </Feedback>
          )}
          {cut && <Btn onClick={done}>Fırına ver</Btn>}
        </>
      )}
    </div>
  );
}
