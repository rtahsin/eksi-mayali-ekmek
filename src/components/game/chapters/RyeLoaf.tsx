"use client";

import React, { useMemo } from "react";

/** Gece Yarısı: kalıp ekmeği (mavi haşhaş kaplı), üst çatlaklar, kesit */

const rand = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

export interface RyeLook {
  /** 0–1 kalıptan yükselme */
  rise: number;
  /** 0–1 üst çatlakların derinliği */
  cracks: number;
  /** 0–1 kabuk rengi */
  crust: number;
  /** 0–1 haşhaş kaplaması */
  poppy: number;
  /** kalıpta mı */
  inTin?: boolean;
}

export function RyeLoafSvg({ look, className = "" }: { look: RyeLook; className?: string }) {
  const dots = useMemo(() => {
    const r = rand(11);
    return Array.from({ length: 220 }, () => ({ x: 40 + r() * 240, y: r(), s: 1.2 + r() * 1.3 }));
  }, []);
  const top = 92 - 26 * Math.min(1.2, look.rise);
  const crust = `hsl(${28 - 10 * look.crust} ${38 + 10 * look.crust}% ${42 - 26 * look.crust}%)`;
  const crackPaths = useMemo(() => {
    const r = rand(5);
    return Array.from({ length: 7 }, (_, i) => {
      const x = 62 + i * 32 + (r() - 0.5) * 10;
      return `M ${x} ${0} l ${(r() - 0.5) * 14} ${6 + r() * 6} l ${(r() - 0.5) * 12} ${4 + r() * 5}`;
    });
  }, []);
  return (
    <svg viewBox="0 0 320 170" className={className} role="img" aria-label="Çavdar kalıp ekmeği">
      {look.inTin !== false && <path d="M 30 70 L 40 160 H 280 L 290 70" fill="#4A4F55" stroke="#2A2E33" strokeWidth="3" />}
      <path d={`M 40 158 L 40 ${top + 12} Q 40 ${top} 60 ${top} H 260 Q 280 ${top} 280 ${top + 12} L 280 158 Z`} fill={crust} stroke="#3B1E1A" strokeWidth="2.5" />
      <clipPath id="ryetop">
        <path d={`M 40 158 L 40 ${top + 12} Q 40 ${top} 60 ${top} H 260 Q 280 ${top} 280 ${top + 12} L 280 158 Z`} />
      </clipPath>
      <g clipPath="url(#ryetop)">
        {dots.slice(0, Math.round(220 * look.poppy)).map((d, i) => (
          <ellipse key={i} cx={d.x} cy={top + 2 + d.y * (158 - top)} rx={d.s} ry={d.s * 0.8} fill="#4C5A78" opacity="0.9" />
        ))}
        {look.cracks > 0.05 &&
          crackPaths.map((p, i) => (
            <path key={i} d={p} transform={`translate(0 ${top})`} fill="none" stroke="#2A1612" strokeWidth={1 + 2.5 * look.cracks} strokeLinecap="round" opacity={Math.min(1, look.cracks * 1.4)} />
          ))}
      </g>
      {look.inTin !== false && <path d="M 30 70 L 40 160 H 280 L 290 70" fill="none" stroke="#2A2E33" strokeWidth="3" />}
    </svg>
  );
}

/** Kesit: koyu, tohumlu iç; yapışkanlık ıslak bant olarak görünür */
export function RyeCrumbSvg({ gummy, crust, className = "" }: { gummy: number; crust: number; className?: string }) {
  const seeds = useMemo(() => {
    const r = rand(23);
    return Array.from({ length: 70 }, () => ({ x: 30 + r() * 200, y: 30 + r() * 110, k: r() < 0.45 ? "kabak" : r() < 0.8 ? "keten" : "kirma", a: r() * 180 }));
  }, []);
  const crustC = `hsl(${24 - 8 * crust} 40% ${32 - 18 * crust}%)`;
  return (
    <svg viewBox="0 0 260 170" className={className} role="img" aria-label="Çavdar ekmeğinin kesiti">
      <rect x="18" y="18" width="224" height="134" rx="10" fill={crustC} stroke="#3B1E1A" strokeWidth="2.5" />
      <rect x="26" y="26" width="208" height="118" rx="6" fill="#5A3A28" />
      {seeds.map((s, i) =>
        s.k === "kabak" ? (
          <ellipse key={i} cx={s.x} cy={s.y} rx="5" ry="2.4" transform={`rotate(${s.a} ${s.x} ${s.y})`} fill="#6E8B4E" />
        ) : s.k === "keten" ? (
          <ellipse key={i} cx={s.x} cy={s.y} rx="2.2" ry="1.2" transform={`rotate(${s.a} ${s.x} ${s.y})`} fill="#8A5A3C" />
        ) : (
          <circle key={i} cx={s.x} cy={s.y} r="1.6" fill="#7A5236" />
        )
      )}
      {gummy > 0.25 && <rect x="30" y={72} width="200" height={10 + 30 * gummy} rx="8" fill="#3E2619" opacity={Math.min(0.9, gummy)} />}
      {Array.from({ length: 34 }, (_, i) => (
        <circle key={`p${i}`} cx={22 + (i % 17) * 13} cy={i < 17 ? 20 : 150} r="1.6" fill="#4C5A78" />
      ))}
    </svg>
  );
}
