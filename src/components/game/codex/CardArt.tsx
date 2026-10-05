"use client";

import React from "react";

/** Defter kartlarının küçük gravür çizimleri (büyüteçteki görünümle aynı dil) */
const INK = "#3B1E1A";

export function CardArt({ art, size = 64, locked = false }: { art: string; size?: number; locked?: boolean }) {
  const fill = (c: string) => (locked ? "#E2D3BD" : c);
  const stroke = locked ? "#CDB792" : INK;
  const common = { stroke, strokeWidth: 2.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  let body: React.ReactNode;
  switch (art) {
    case "yst":
      body = (
        <>
          <ellipse cx="28" cy="34" rx="15" ry="11" fill={fill("#D9A441")} {...common} />
          <ellipse cx="45" cy="30" rx="7" ry="5.5" fill={fill("#D9A441")} {...common} />
          <ellipse cx="24" cy="31" rx="5" ry="4" fill={locked ? "none" : "#F4DDA5"} />
        </>
      );
      break;
    case "lacS":
      body = [0, 1, 2].map((i) => <rect key={i} x={8 + i * 17} y={28} width={15} height={7} rx={3.5} fill={fill("#B4532A")} {...common} transform={`rotate(${-12 + i * 6} 32 32)`} />);
      break;
    case "lacP":
      body = [0, 1, 2, 3].map((i) => <circle key={i} cx={14 + i * 12} cy={32 + (i % 2 ? 3 : -3)} r={5.5} fill={fill("#C27A4E")} {...common} />);
      break;
    case "ent":
      body = (
        <>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M 22 ${28 + i * 4} q -5 -4 -9 0 t -9 0`} fill="none" {...common} strokeWidth={1.2} />
          ))}
          <rect x="22" y="25" width="24" height="13" rx="6.5" fill={fill("#7A8450")} {...common} />
        </>
      );
      break;
    case "gluten":
      body = (
        <path d="M6 20 Q 20 10 32 22 T 58 20 M6 36 Q 20 26 32 38 T 58 36 M6 52 Q 20 42 32 54 T 58 52 M18 14 L22 58 M42 12 L40 58" fill="none" {...common} stroke={locked ? stroke : "#8A5A3C"} />
      );
      break;
    case "nisasta":
      body = (
        <>
          <ellipse cx="28" cy="32" rx="19" ry="13" fill={fill("#FBF6EC")} {...common} />
          <ellipse cx="26" cy="32" rx="12" ry="8" fill="none" {...common} strokeWidth={1} />
          <ellipse cx="25" cy="32" rx="6" ry="4" fill="none" {...common} strokeWidth={1} />
          <circle cx="52" cy="22" r="5" fill={fill("#FBF6EC")} {...common} />
          <circle cx="50" cy="46" r="4" fill={fill("#FBF6EC")} {...common} />
        </>
      );
      break;
    case "amilaz":
    case "proteaz":
    case "fitaz":
      body = (
        <>
          <path d="M32 32 L52 22 A 20 20 0 1 0 52 42 Z" fill={fill(art === "fitaz" ? "#9A6C88" : "#7B4B6A")} {...common} />
          <circle cx="26" cy="24" r="2.5" fill={locked ? stroke : "#FBF6EC"} />
          {art === "proteaz" && <path d="M44 26 l4 4 l-4 4" fill="none" {...common} stroke="#FBF6EC" />}
        </>
      );
      break;
    case "maltoz":
      body = [18, 42].map((cx) => <polygon key={cx} points={hex(cx, 32, 11)} fill={fill("#F1D48A")} {...common} />);
      break;
    case "co2":
      body = (
        <>
          <circle cx="32" cy="32" r="8" fill={fill("#6E5148")} {...common} />
          <circle cx="15" cy="32" r="6" fill={fill("#B4532A")} {...common} />
          <circle cx="49" cy="32" r="6" fill={fill("#B4532A")} {...common} />
        </>
      );
      break;
    case "asit":
      body = (
        <text x="32" y="42" textAnchor="middle" fontSize="28" fontWeight="800" fill={locked ? stroke : "#C0583A"} fontFamily="var(--font-inter)">
          H⁺
        </text>
      );
      break;
    case "tuz":
      body = (
        <>
          <rect x="16" y="16" width="32" height="32" fill={fill("#EEF2F4")} {...common} />
          <path d="M16 32 H48 M32 16 V48" {...common} strokeWidth={1} />
        </>
      );
      break;
    case "pentozan":
      body = <path d="M8 32 H56 M16 32 l6 -10 M28 32 l6 10 M40 32 l6 -10 M50 32 l5 10" fill="none" {...common} stroke={locked ? stroke : "#8A5A3C"} />;
      break;
    case "kabarcik":
      body = (
        <>
          <circle cx="28" cy="34" r="16" fill={fill("#FFFDF7")} {...common} />
          <circle cx="48" cy="20" r="7" fill={fill("#FFFDF7")} {...common} />
          <circle cx="22" cy="28" r="4" fill={locked ? "none" : "#FFFFFF"} />
        </>
      );
      break;
    case "aroma":
      body = <path d="M18 50 q -6 -10 4 -18 q 10 -8 2 -20 M32 50 q -6 -10 4 -18 q 10 -8 2 -20 M46 50 q -6 -10 4 -18 q 10 -8 2 -20" fill="none" {...common} stroke={locked ? stroke : "#B4532A"} />;
      break;
    case "kavanoz":
      body = (
        <>
          <rect x="16" y="14" width="32" height="42" rx="6" fill={fill("#FFFFFF")} {...common} />
          <rect x="18" y="30" width="28" height="24" rx="3" fill={fill("#EAD3A2")} />
          <path d="M14 30 H50" {...common} stroke={locked ? stroke : "#B4532A"} />
        </>
      );
      break;
    case "termometre":
      body = (
        <>
          <rect x="27" y="8" width="10" height="38" rx="5" fill={fill("#FFFFFF")} {...common} />
          <circle cx="32" cy="50" r="8" fill={fill("#B4532A")} {...common} />
          <rect x="30" y="24" width="4" height="22" fill={locked ? stroke : "#B4532A"} />
        </>
      );
      break;
    case "dolap":
      body = (
        <>
          <rect x="16" y="8" width="32" height="48" rx="4" fill={fill("#EEF2F4")} {...common} />
          <path d="M16 26 H48 M42 14 V20 M42 32 V40" {...common} />
        </>
      );
      break;
    case "firin":
    case "buhar":
      body = (
        <>
          <path d="M8 52 V30 Q 32 6 56 30 V52 Z" fill={fill("#C9A06C")} {...common} />
          <path d="M18 52 V38 Q 32 24 46 38 V52" fill={fill("#3B1E1A")} {...common} />
          {art === "buhar" && <path d="M26 24 q -4 -6 0 -12 M34 22 q -4 -6 0 -12" fill="none" {...common} stroke={locked ? stroke : "#FBF6EC"} />}
        </>
      );
      break;
    case "bicak":
      body = (
        <>
          <path d="M8 40 L44 18 L50 24 Z" fill={fill("#B9C2C8")} {...common} />
          <rect x="46" y="20" width="12" height="7" rx="2" transform="rotate(-32 52 23)" fill={fill("#3B1E1A")} {...common} />
        </>
      );
      break;
    case "otoliz":
      body = (
        <>
          <path d="M8 30 H56 L50 52 H14 Z" fill={fill("#EAD3A2")} {...common} />
          <path d="M20 22 q 4 -6 0 -12 M32 22 q 4 -6 0 -12 M44 22 q 4 -6 0 -12" fill="none" {...common} stroke={locked ? stroke : "#6E5148"} strokeWidth={1.4} />
        </>
      );
      break;
    case "efsane":
      body = (
        <>
          <circle cx="32" cy="32" r="20" fill={fill("#FBF6EC")} {...common} />
          <path d="M18 18 L46 46" {...common} stroke={locked ? stroke : "#9B2C1F"} strokeWidth={4} />
        </>
      );
      break;
    case "tarih":
    default:
      body = (
        <>
          <path d="M14 46 Q 32 20 50 46 Z" fill={fill("#C9A06C")} {...common} />
          <path d="M20 44 l3 -6 M28 44 l2 -8 M36 44 l-1 -8 M44 44 l-3 -6" {...common} strokeWidth={1.2} />
        </>
      );
  }
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      {body}
    </svg>
  );
}

function hex(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
}
