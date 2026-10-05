"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";

/**
 * Canlı hamur: yaylı noktalardan oluşan, fizikle hareket eden bir kütle (SVG, rAF ile doğrudan DOM'a çizilir).
 * Modlar: "fold" (kenardan tutup ortaya çek → katla), "rub" (etrafında daire çiz → gerginlik),
 * "poke" (bastır → iz; geri dönüş hızı kabarmayı anlatır), "tap" (vur → şapırt).
 */

export type BlobMode = "none" | "tap" | "fold" | "rub" | "poke";

export interface DoughBlobProps {
  /** Dinlenme yarıçapı (viewBox 300×300 içinde) */
  radius: number;
  /** Yatay/dikey oran (1 = yuvarlak, >1 oval) */
  aspect?: number;
  /** Pürüzlülük: yoğrulmamış hamur 1, ipek gibi 0 */
  shag?: number;
  /** Gergin yüzeyin parlaklığı (0–1) */
  sheen?: number;
  /** Yükseklik hissi: gölge ve ışık (0–1) */
  loft?: number;
  /** Yüzeyde görünen kabarcık yoğunluğu (0–1) */
  bubbles?: number;
  /** Yırtık çizgileri (0–1) */
  tears?: number;
  /** Un serpintisi (0–1) */
  flour?: number;
  color?: string;
  mode?: BlobMode;
  /** Parmak izinin geri dönüş hızı (0 = dönmez, 1 = hemen) */
  pokeRecovery?: number;
  onFold?: (angleDeg: number) => void;
  onRub?: (radians: number) => void;
  onPoke?: () => void;
  onTap?: () => void;
  className?: string;
}

const N = 40;
const CX = 150;
const CY = 150;

function seeded(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Kapalı ve yumuşak yol (Catmull-Rom → Bezier) */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

export function DoughBlob({
  radius,
  aspect = 1,
  shag = 0,
  sheen = 0.3,
  loft = 0.5,
  bubbles = 0,
  tears = 0,
  flour = 0,
  color = "#EAD3A2",
  mode = "none",
  pokeRecovery = 0.5,
  onFold,
  onRub,
  onPoke,
  onTap,
  className,
}: DoughBlobProps) {
  const id = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);
  const clipRef = useRef<SVGPathElement>(null);
  const dimpleRef = useRef<SVGEllipseElement>(null);

  const st = useRef({
    r: Array.from({ length: N }, () => radius),
    v: Array.from({ length: N }, () => 0),
    drag: null as null | { startAngle: number; startDist: number; maxDist: number; px: number; py: number; lastAngle: number },
    dimple: null as null | { x: number; y: number; depth: number },
    props: { radius, aspect, shag, pokeRecovery },
  });
  useEffect(() => {
    st.current.props = { radius, aspect, shag, pokeRecovery };
  });

  // Fizik döngüsü
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const s = st.current;
      const { radius: R, aspect: A, shag: S } = s.props;
      const pts: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const ell = 1 / Math.sqrt((Math.cos(a) / A) ** 2 + Math.sin(a) ** 2);
        // Pürüzlü hamur: düşük frekanslı topaklar + hafif düzensizlik (yıldız gibi diken değil)
        const lump = S * (0.07 * Math.sin(a * 3 + 1.7) + 0.045 * Math.sin(a * 5 + 4.1 + now / 3000) + 0.03 * Math.sin(a * 7 + 2.3) + 0.018 * Math.sin(a * 11 + 0.5));
        let target = R * ell * (1 + lump) * (1 + 0.01 * Math.sin(now / 900 + a * 2));
        const dr = s.drag;
        if (dr) {
          const dx = dr.px - CX;
          const dy = dr.py - CY;
          const pa = Math.atan2(dy, dx);
          const pd = Math.hypot(dx, dy);
          let diff = Math.abs(a - pa);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          const w = Math.exp(-(diff * diff) / 0.18);
          if (pd > target) target += (pd - target) * w * 0.85;
        }
        s.v[i] = (s.v[i] + (target - s.r[i]) * 0.13) * 0.8;
        s.r[i] += s.v[i];
        pts.push([CX + Math.cos(a) * s.r[i], CY + Math.sin(a) * s.r[i] * 0.92]);
      }
      const d = smoothClosed(pts);
      bodyRef.current?.setAttribute("d", d);
      clipRef.current?.setAttribute("d", d);
      const dm = s.dimple;
      if (dm && dimpleRef.current) {
        dm.depth *= 1 - 0.004 - 0.05 * s.props.pokeRecovery;
        dimpleRef.current.setAttribute("cx", dm.x.toFixed(1));
        dimpleRef.current.setAttribute("cy", dm.y.toFixed(1));
        dimpleRef.current.setAttribute("rx", (6 + 8 * dm.depth).toFixed(1));
        dimpleRef.current.setAttribute("ry", (5 + 6 * dm.depth).toFixed(1));
        dimpleRef.current.setAttribute("opacity", Math.min(0.6, dm.depth).toFixed(2));
        if (dm.depth < 0.02) s.dimple = null;
      } else if (dimpleRef.current) {
        dimpleRef.current.setAttribute("opacity", "0");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toSvg = useCallback((e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const b = el.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * 300, y: ((e.clientY - b.top) / b.height) * 300 };
  }, []);

  const impulse = (fn: (a: number, i: number) => number) => {
    const s = st.current;
    for (let i = 0; i < N; i++) s.v[i] += fn((i / N) * Math.PI * 2, i);
  };

  const onDown = (e: React.PointerEvent) => {
    if (mode === "none") return;
    const p = toSvg(e);
    const dx = p.x - CX;
    const dy = p.y - CY;
    const ang = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    if (mode === "tap") {
      impulse(() => 5);
      onTap?.();
      return;
    }
    if (mode === "poke") {
      if (dist < radius * 1.05) {
        st.current.dimple = { x: p.x, y: p.y, depth: 1 };
        impulse((a) => -2 * Math.exp(-((a - ang) ** 2) / 0.3));
        onPoke?.();
      }
      return;
    }
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
    st.current.drag = { startAngle: ang, startDist: dist, maxDist: dist, px: p.x, py: p.y, lastAngle: ang };
  };

  const onMove = (e: React.PointerEvent) => {
    const dr = st.current.drag;
    if (!dr) return;
    const p = toSvg(e);
    dr.px = p.x;
    dr.py = p.y;
    const dx = p.x - CX;
    const dy = p.y - CY;
    const dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    dr.maxDist = Math.max(dr.maxDist, dist);
    if (mode === "fold") {
      const startedAtEdge = dr.startDist > radius * 0.55;
      if (startedAtEdge && dist < radius * 0.35 && dr.maxDist > radius * 0.8) {
        const deg = (dr.startAngle * 180) / Math.PI;
        st.current.drag = null;
        impulse((a) => {
          let diff = Math.abs(a - dr.startAngle);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          return diff < 1.2 ? -9 * (1 - diff / 1.2) : 2.5;
        });
        onFold?.(deg);
      }
    } else if (mode === "rub") {
      let d = ang - dr.lastAngle;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      dr.lastAngle = ang;
      if (dist > radius * 0.5 && dist < radius * 1.8 && Math.abs(d) < 0.8) {
        onRub?.(Math.abs(d));
        impulse((a) => {
          let diff = Math.abs(a - ang);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          return -1.2 * Math.exp(-(diff * diff) / 0.1);
        });
      }
    }
  };

  const onUp = () => {
    st.current.drag = null;
  };

  // Kabarcıklar ve un (tohumlu, sabit konum; yoğunluğa göre görünür)
  const bubbleDots = Array.from({ length: 26 }, (_, i) => {
    const a = seeded(i + 40) * Math.PI * 2;
    const rr = Math.sqrt(seeded(i + 80)) * radius * 0.8;
    return { x: CX + Math.cos(a) * rr * aspect, y: CY + Math.sin(a) * rr * 0.9, r: 1.5 + seeded(i + 3) * 4.5, on: seeded(i + 120) < bubbles };
  });
  const flourDots = Array.from({ length: 34 }, (_, i) => {
    const a = seeded(i + 200) * Math.PI * 2;
    const rr = Math.sqrt(seeded(i + 260)) * radius * 0.85;
    return { x: CX + Math.cos(a) * rr * aspect, y: CY + Math.sin(a) * rr * 0.9, r: 0.8 + seeded(i + 9) * 2.2, on: seeded(i + 300) < flour };
  });
  const tearLines = [0, 1, 2].filter((i) => tears > i * 0.33).map((i) => {
    const a = seeded(i + 500) * Math.PI * 2;
    const x = CX + Math.cos(a) * radius * 0.35;
    const y = CY + Math.sin(a) * radius * 0.3;
    return `M ${x} ${y} l ${8 + seeded(i) * 6} ${-4 + seeded(i + 1) * 8} l ${6} ${5} l ${7 + seeded(i + 2) * 5} ${-3}`;
  });

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 300 300"
      className={className}
      style={{ touchAction: mode === "none" ? "auto" : "none", cursor: mode === "none" ? "default" : "grab" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="img"
      aria-label="Hamur"
    >
      <defs>
        <radialGradient id={`g${id}`} cx="45%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFF6E2" stopOpacity={0.55 + 0.35 * loft} />
          <stop offset="0.55" stopColor={color} />
          <stop offset="1" stopColor="#C9A670" />
        </radialGradient>
        <radialGradient id={`s${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <path ref={clipRef} d="" />
        </clipPath>
      </defs>
      <ellipse cx={CX} cy={CY + radius * 0.85} rx={radius * aspect * 0.95} ry={10 + 8 * loft} fill="#3B1E1A" opacity={0.08 + 0.1 * loft} />
      <path ref={bodyRef} d="" fill={`url(#g${id})`} stroke="#B8955E" strokeWidth="1.2" />
      <g clipPath={`url(#c${id})`} pointerEvents="none">
        <ellipse cx={CX - radius * 0.25} cy={CY - radius * 0.35} rx={radius * 0.55 * aspect} ry={radius * 0.28} fill={`url(#s${id})`} opacity={sheen * 0.85} />
        {bubbleDots.map((b, i) =>
          b.on ? <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="none" stroke="#B8955E" strokeWidth="1" opacity="0.7" /> : null
        )}
        {flourDots.map((f, i) => (f.on ? <circle key={`f${i}`} cx={f.x} cy={f.y} r={f.r} fill="#FFFDF6" opacity="0.85" /> : null))}
        {tearLines.map((d, i) => (
          <path key={`t${i}`} d={d} fill="none" stroke="#8C6A3A" strokeWidth="2" strokeLinecap="round" />
        ))}
        <ellipse ref={dimpleRef} cx={CX} cy={CY} rx="0" ry="0" fill="#8C6A3A" opacity="0" />
      </g>
    </svg>
  );
}
