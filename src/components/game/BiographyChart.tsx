"use client";

import React, { useMemo } from "react";
import type { BakeRun, MicroPhase } from "@/types/game";

/** Ekmeğin biyografisi: beslemeden kesime kadar sıcaklık, pH, canlılar ve hacim tek grafikte */

const C = { ink: "#3B1E1A", soft: "#6E5148", line: "#E2D3BD", yeast: "#D9A441", lab: "#B4532A", ph: "#5B7A8C", vol: "#8A5A3C", temp: "#9B2C1F" };
const BAND: Partial<Record<MicroPhase, string>> = { kavanoz: "Maya", mayalanma: "Mayalanma", dolap: "Dolap", firin: "Fırın" };

export function BiographyChart({ run }: { run: BakeRun }) {
  const W = 340;
  const H = 190;
  const P = { l: 6, r: 6, t: 18, b: 22 };
  // Otoliz ayrı bir kaptır (un + su); hamurun öyküsünü bölmesin
  const data = useMemo(() => run.samples.filter((s) => s.phase !== "sogutma" && s.phase !== "otoliz"), [run]);
  if (data.length < 2) return null;
  const t0 = data[0].t;
  const t1 = data[data.length - 1].t;
  // Fırın kısa ama önemli: zamanı fırın için genişlet (fırın dilimi grafiğin %18'i)
  const ovenStart = run.marks.firin;
  const pre = ovenStart - t0;
  const ovenLen = Math.max(0.1, t1 - ovenStart);
  const x = (t: number) => P.l + (W - P.l - P.r) * (t < ovenStart ? (0.82 * (t - t0)) / pre : 0.82 + (0.18 * (t - ovenStart)) / ovenLen);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - Math.max(0, Math.min(1, v)));
  const path = (f: (i: number) => number) => data.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(f(i)).toFixed(1)}`).join(" ");
  const lines = [
    { key: "yst", label: "Maya", color: C.yeast, d: path((i) => (data[i].pop.yst - 4) / 4.5) },
    { key: "lab", label: "Bakteri", color: C.lab, d: path((i) => (Math.max(data[i].pop.lacS, data[i].pop.lacP) - 5) / 5) },
    { key: "ph", label: "pH", color: C.ph, d: path((i) => (data[i].pH - 3.5) / 3) },
    { key: "vol", label: "Hacim", color: C.vol, d: path((i) => data[i].gas / 1.6) },
    { key: "temp", label: "Sıcaklık", color: C.temp, d: path((i) => (data[i].heat ? data[i].heat!.coreC : data[i].tempC) / 100) },
  ];
  const bands = (Object.keys(BAND) as MicroPhase[])
    .map((ph) => {
      const xs = data.filter((s) => s.phase === ph);
      if (!xs.length) return null;
      return { ph, a: x(xs[0].t), b: x(xs[xs.length - 1].t) };
    })
    .filter((b): b is { ph: MicroPhase; a: number; b: number } => b !== null);

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ekmeğin biyografisi grafiği">
        {bands.map((b, i) => (
          <g key={b.ph}>
            <rect x={b.a} y={P.t} width={Math.max(1, b.b - b.a)} height={H - P.t - P.b} fill={i % 2 ? "#F1E6D2" : "#F7EFDF"} />
            <text x={(b.a + b.b) / 2} y={H - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.soft}>
              {BAND[b.ph]}
            </text>
          </g>
        ))}
        {lines.map((l) => (
          <path key={l.key} d={l.d} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {run.events
          .filter((e) => ["maya_tepe", "iki_kat", "maya_oldu", "ic_pisti"].includes(e.key))
          .map((e) => (
            <g key={e.key}>
              <line x1={x(e.t)} x2={x(e.t)} y1={P.t} y2={H - P.b} stroke={C.ink} strokeDasharray="2 3" strokeWidth={1} />
              <circle cx={x(e.t)} cy={P.t - 6} r={3} fill={C.ink} />
            </g>
          ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold justify-center">
        {lines.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1">
            <span className="w-3 h-1 rounded" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
