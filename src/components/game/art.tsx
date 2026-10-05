"use client";

import React, { useId } from "react";
import { C } from "./ui";

/** Ortak gravür taraması (desen) */
function Hatch({ id, angle = -35, opacity = 0.18, gap = 6 }: { id: string; angle?: number; opacity?: number; gap?: number }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
      <line x1="0" y1="0" x2="0" y2={gap} stroke={C.ink} strokeWidth="0.9" opacity={opacity} />
    </pattern>
  );
}

/**
 * Maya kavanozu: dolum seviyesi, kubbe (tepeye çıkarken) / çökmüş yüzey (tepeden sonra), lastik,
 * kabarcıklar ve tepeden sonra camdaki iz.
 */
export function JarArt({ level, dome, fallen, bubbles, band }: { level: number; dome: number; fallen: boolean; bubbles: number; band: number }) {
  const id = useId().replace(/:/g, "");
  const top = 40;
  const bottom = 190;
  const y = bottom - (bottom - top) * level;
  const bandY = bottom - (bottom - top) * band;
  const domeH = fallen ? -4 : 10 * dome;
  const peakY = bottom - (bottom - top) * Math.min(1, level + 0.08);
  return (
    <svg viewBox="0 0 140 210" className="w-full h-full" role="img" aria-label="Maya kavanozu">
      <defs>
        <Hatch id={`h${id}`} angle={60} opacity={0.12} />
        <clipPath id={`j${id}`}>
          <rect x="22" y="30" width="96" height="164" rx="14" />
        </clipPath>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4E4BF" />
          <stop offset="1" stopColor="#DCC089" />
        </linearGradient>
      </defs>
      <rect x="22" y="30" width="96" height="164" rx="14" fill="#FFFFFF55" stroke={C.ink} strokeWidth="3" />
      <g clipPath={`url(#j${id})`}>
        {fallen && <rect x="22" y={peakY} width="96" height={y - peakY} fill="#E8D4A6" opacity="0.45" />}
        <path d={`M 18 ${y} Q 70 ${y - domeH * 2} 122 ${y} L 122 200 L 18 200 Z`} fill={`url(#m${id})`} />
        <path d={`M 18 ${y} Q 70 ${y - domeH * 2} 122 ${y} L 122 200 L 18 200 Z`} fill={`url(#h${id})`} />
        {Array.from({ length: Math.round(28 * bubbles) }, (_, i) => {
          const bx = 30 + ((i * 37) % 80);
          const by = y + 8 + ((i * 53) % Math.max(10, bottom - y - 10));
          const r = 1.5 + (i % 4) * 1.6;
          return <circle key={i} cx={bx} cy={by} r={r} fill="#FFF8E9" stroke="#B3925A" strokeWidth="0.8" />;
        })}
      </g>
      <rect x="18" y={bandY - 3} width="104" height="6" rx="3" fill={C.accent} />
      <rect x="30" y="16" width="80" height="18" rx="4" fill="#CDB792" stroke={C.ink} strokeWidth="2.5" />
      <rect x="34" y="38" width="10" height="120" rx="5" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}

/** Dijital mutfak tartısı + kase */
export function ScaleArt({ grams, target, unit = "g", filling }: { grams: number; target?: [number, number]; unit?: string; filling: number }) {
  const id = useId().replace(/:/g, "");
  const inT = target ? grams >= target[0] && grams <= target[1] : false;
  return (
    <svg viewBox="0 0 280 170" className="w-full" role="img" aria-label="Tartı">
      <ellipse cx="140" cy="156" rx="118" ry="9" fill={C.ink} opacity="0.1" />
      <rect x="30" y="112" width="220" height="40" rx="10" fill="#E9DFCF" stroke={C.ink} strokeWidth="3" />
      <rect x="92" y="120" width="96" height="24" rx="4" fill="#1F2A1F" />
      <text x="140" y="138" textAnchor="middle" fontSize="16" fontFamily="var(--font-jetbrains-mono)" fill={inT ? "#A8E07A" : "#E9F5DC"}>
        {Math.round(grams)} {unit}
      </text>
      <path d="M 60 112 Q 60 60 140 60 Q 220 60 220 112 Z" fill="#F7F0E4" stroke={C.ink} strokeWidth="3" />
      <clipPath id={`b${id}`}>
        <path d="M 62 110 Q 62 62 140 62 Q 218 62 218 110 Z" />
      </clipPath>
      <rect x="60" y={110 - 46 * Math.min(1, filling)} width="160" height="60" fill="#E7D3A6" clipPath={`url(#b${id})`} />
      <path d="M 54 60 L 226 60" stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Termometre */
export function ThermometerArt({ c, min = 0, max = 40, target }: { c: number; min?: number; max?: number; target?: [number, number] }) {
  const t = Math.max(0, Math.min(1, (c - min) / (max - min)));
  const ok = target ? c >= target[0] && c <= target[1] : true;
  const color = ok ? C.good : c > (target?.[1] ?? 99) ? C.bad : "#4E7FA8";
  return (
    <svg viewBox="0 0 60 220" className="h-full" role="img" aria-label={`${c.toFixed(1)} derece`}>
      <rect x="20" y="10" width="20" height="170" rx="10" fill="#FFFFFF" stroke={C.ink} strokeWidth="3" />
      {target && (
        <rect
          x="20"
          y={170 - 160 * ((target[1] - min) / (max - min))}
          width="20"
          height={160 * ((target[1] - target[0]) / (max - min))}
          fill="#9DB47E55"
        />
      )}
      <rect x="25" y={170 - 160 * t} width="10" height={160 * t + 15} rx="5" fill={color} />
      <circle cx="30" cy="192" r="18" fill={color} stroke={C.ink} strokeWidth="3" />
    </svg>
  );
}

/** Taş tabanlı fırın: kapak, kızıl ışık, buhar */
export function OvenArt({ open, glow, steam, children }: { open: boolean; glow: number; steam: number; children?: React.ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative w-full aspect-[4/3]">
      <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" role="img" aria-label="Fırın">
        <defs>
          <Hatch id={`h${id}`} angle={45} opacity={0.15} gap={7} />
          <radialGradient id={`g${id}`} cx="50%" cy="70%" r="60%">
            <stop offset="0" stopColor="#F59E0B" stopOpacity={0.55 * glow} />
            <stop offset="1" stopColor="#2A1A12" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="10" y="10" width="380" height="280" rx="18" fill="#3A2A22" stroke={C.ink} strokeWidth="4" />
        <rect x="10" y="10" width="380" height="280" rx="18" fill={`url(#h${id})`} />
        <rect x="40" y="50" width="320" height="190" rx="10" fill="#1B110C" />
        <rect x="40" y="50" width="320" height="190" rx="10" fill={`url(#g${id})`} />
        <rect x="40" y="214" width="320" height="16" fill="#7A6455" />
        <path d="M 40 214 L 360 214" stroke="#A88D74" strokeWidth="2" />
        <circle cx="340" cy="30" r="8" fill="#B4532A" />
        <circle cx="315" cy="30" r="8" fill="#B4532A" />
      </svg>
      <div className="absolute" style={{ left: "10%", right: "10%", top: "20%", bottom: "26%" }}>
        {children}
      </div>
      {steam > 0 &&
        Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="absolute rounded-full blur-md pointer-events-none"
            style={{
              left: `${15 + i * 11}%`,
              bottom: "30%",
              width: 46,
              height: 46,
              background: "#FFFFFF",
              opacity: 0.35 * steam,
              animation: `steamup ${2.4 + (i % 3) * 0.5}s ease-out ${i * 0.25}s infinite`,
            }}
          />
        ))}
      <div
        className="absolute rounded-xl transition-all duration-700 origin-bottom"
        style={{
          left: "8%",
          right: "8%",
          top: "14%",
          bottom: "18%",
          background: "linear-gradient(#4A372D, #2E211A)",
          border: `4px solid ${C.ink}`,
          transform: open ? "perspective(1200px) rotateX(-75deg)" : "none",
          opacity: open ? 0 : 1,
        }}
      >
        <div className="absolute inset-x-[12%] top-[30%] h-[34%] rounded-lg" style={{ background: `rgba(245,158,11,${0.18 + 0.4 * glow})`, border: "3px solid #1B110C" }} />
        <div className="absolute inset-x-[30%] bottom-[10%] h-3 rounded-full" style={{ background: "#B4532A" }} />
      </div>
      <style>{`@keyframes steamup{0%{transform:translateY(0) scale(.6);opacity:0}30%{opacity:.6}100%{transform:translateY(-140px) scale(1.6);opacity:0}}`}</style>
    </div>
  );
}

/** Atölye kapısı (giriş sahnesi) */
export function DoorArt({ open }: { open: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative w-full aspect-[3/4] max-w-[220px] mx-auto">
      <div
        className="absolute inset-0 rounded-t-[140px] overflow-hidden"
        style={{ background: "radial-gradient(circle at 50% 75%, #FFD48A 0%, #F59E0B 35%, #7A3A18 75%, #2A1A12 100%)" }}
      >
        <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full opacity-80">
          <rect x="60" y="250" width="180" height="90" rx="40" fill="#2A1A12" />
          <rect x="85" y="275" width="130" height="40" rx="20" fill="#F59E0B" opacity="0.8" />
          <path d="M 40 360 L 260 360" stroke="#2A1A12" strokeWidth="6" />
        </svg>
        {open &&
          Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${10 + ((i * 47) % 80)}%`,
                top: `${30 + ((i * 29) % 60)}%`,
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                background: "#FFF3D6",
                opacity: 0.8,
                animation: `flour ${3 + (i % 4)}s linear ${i * 0.2}s infinite`,
              }}
            />
          ))}
      </div>
      <div
        className="absolute inset-0 rounded-t-[140px] origin-left transition-transform duration-[1400ms] ease-[cubic-bezier(.6,.05,.3,1)]"
        style={{ transform: open ? "perspective(900px) rotateY(-102deg)" : "perspective(900px) rotateY(0deg)" }}
      >
        <svg viewBox="0 0 300 400" className="w-full h-full drop-shadow-xl" role="img" aria-label="Atölye kapısı">
          <defs>
            <Hatch id={`h${id}`} angle={90} opacity={0.22} gap={5} />
          </defs>
          <path d="M 0 400 L 0 140 A 150 140 0 0 1 300 140 L 300 400 Z" fill="#8A5A3C" stroke={C.ink} strokeWidth="5" />
          <path d="M 0 400 L 0 140 A 150 140 0 0 1 300 140 L 300 400 Z" fill={`url(#h${id})`} />
          {[75, 150, 225].map((x) => (
            <line key={x} x1={x} y1={x === 150 ? 2 : 30} x2={x} y2="400" stroke={C.ink} strokeWidth="3" opacity="0.6" />
          ))}
          <rect x="20" y="170" width="260" height="14" fill="#5C3A26" stroke={C.ink} strokeWidth="2" />
          <rect x="20" y="320" width="260" height="14" fill="#5C3A26" stroke={C.ink} strokeWidth="2" />
          <circle cx="255" cy="255" r="10" fill="#C9A24A" stroke={C.ink} strokeWidth="3" />
          <g transform="translate(150 95)">
            <circle r="44" fill="#F7EBD3" stroke={C.ink} strokeWidth="4" />
            <text y="-12" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.ink} fontFamily="var(--font-fraunces)">
              EKMEK
            </text>
            <text y="8" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.ink} fontFamily="var(--font-fraunces)">
              LAB
            </text>
            <text y="26" textAnchor="middle" fontSize="8" fill={C.ink} fontFamily="var(--font-inter)">
              ATÖLYE
            </text>
          </g>
        </svg>
      </div>
      <style>{`@keyframes flour{0%{transform:translateY(0);opacity:0}20%{opacity:.9}100%{transform:translateY(-120px) translateX(20px);opacity:0}}`}</style>
    </div>
  );
}

/** Bannetondan çıkmış hamurun üstten görünüşü: un halkaları */
export function BannetonTop({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative w-full aspect-[4/3]">
      <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" role="img" aria-label="Fırın küreği üstünde hamur">
        <rect x="20" y="40" width="360" height="220" rx="24" fill="#C9A06C" stroke={C.ink} strokeWidth="4" />
        <rect x="170" y="250" width="60" height="50" fill="#A87D4E" stroke={C.ink} strokeWidth="4" />
        <ellipse cx="200" cy="150" rx="150" ry="92" fill="#F4E6C6" stroke={C.ink} strokeWidth="3" />
        {[0.85, 0.68, 0.51, 0.34].map((k) => (
          <ellipse key={k} cx="200" cy="150" rx={150 * k} ry={92 * k} fill="none" stroke="#FFFFFF" strokeWidth="6" opacity="0.75" />
        ))}
      </svg>
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

/** Saat (zaman atlamalı sahneler için) */
export function ClockArt({ hours, night = false }: { hours: number; night?: boolean }) {
  const a = (hours % 12) * 30;
  const m = (hours % 1) * 360;
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16" role="img" aria-label={`${hours.toFixed(1)} saat`}>
      <circle cx="40" cy="40" r="34" fill={night ? "#2E2A4A" : "#FFFFFF"} stroke={C.ink} strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="40" y1="10" x2="40" y2="15" stroke={night ? "#E8E2FF" : C.ink} strokeWidth="2" transform={`rotate(${i * 30} 40 40)`} />
      ))}
      <line x1="40" y1="40" x2="40" y2="22" stroke={night ? "#E8E2FF" : C.ink} strokeWidth="4" strokeLinecap="round" transform={`rotate(${a} 40 40)`} />
      <line x1="40" y1="40" x2="40" y2="14" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${m} 40 40)`} />
      <circle cx="40" cy="40" r="3" fill={C.ink} />
    </svg>
  );
}
