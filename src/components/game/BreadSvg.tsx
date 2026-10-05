import React, { useId, useMemo } from "react";

/** Tohumlu sözde rastgele (aynı ekmek her çizimde aynı görünsün) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mix(c1: string, c2: string, t: number): string {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [a, b] = [p(c1), p(c2)];
  return `#${a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, "0")).join("")}`;
}

/** Kabuk rengi: soluk → altın → koyu → yanık */
export function crustColor(c: number): string {
  const stops = ["#E9CC93", "#C98A43", "#8F4D20", "#2A1A12"];
  const x = Math.min(0.999, Math.max(0, c)) * (stops.length - 1);
  const i = Math.floor(x);
  return mix(stops[i], stops[i + 1], x - i);
}

const INK = "#3B1E1A";
const CRUMB = "#F2E0B5";

interface BreadShape {
  width: number;
  height: number;
  base: number;
  cx: number;
}

function shapeOf(h: number, viewW: number, base: number): BreadShape {
  const height = 36 + 100 * h;
  const width = Math.min(viewW - 24, 270 + (0.6 - h) * 130);
  return { width, height, base, cx: viewW / 2 };
}

/** Kubbenin üst çizgisi: x (merkezden) → y */
function topY(s: BreadShape, x: number): number {
  const u = Math.min(1, Math.abs((2 * x) / s.width));
  return s.base - s.height * Math.pow(1 - u * u, 0.45);
}

function domePath(s: BreadShape): string {
  const steps = 40;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = -s.width / 2 + (s.width * i) / steps;
    pts.push(`${(s.cx + x).toFixed(1)},${topY(s, x).toFixed(1)}`);
  }
  const r = 14;
  return `M ${s.cx - s.width / 2},${s.base} L ${pts.join(" L ")} L ${s.cx + s.width / 2},${s.base} Q ${s.cx},${s.base + r} ${s.cx - s.width / 2},${s.base} Z`;
}

export interface BreadLook {
  height: number;
  ear: number;
  crust: number;
  openness: number;
  gummy: number;
}

/** Ekmeğin yandan görünüşü: kubbe, kabuk rengi, kesik ve kulak, un serpintisi, gravür taraması */
export function LoafSvg({ look, seed = 7, className }: { look: BreadLook; seed?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const W = 360;
  const s = shapeOf(look.height, W, 210);
  const color = crustColor(look.crust);
  const dots = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: 40 }, () => {
      const x = (rnd() - 0.5) * s.width * 0.8;
      return { x: s.cx + x, y: topY(s, x) + 4 + rnd() * 18, r: 0.8 + rnd() * 1.8 };
    });
  }, [seed, s]);

  // Kesik: kubbenin tepesine yakın, hafif eğri bir yarık; kulak = açıklık + üstte kalkan dudak
  const earOpen = 2 + look.ear * 14;
  const x1 = -s.width * 0.3;
  const x2 = s.width * 0.28;
  const depthBelowTop = 6 + s.height * 0.12;
  const cut = (side: -1 | 1) => {
    const pts: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = lerp(x1, x2, t);
      const open = Math.sin(t * Math.PI) * earOpen * 0.5;
      pts.push(`${(s.cx + x).toFixed(1)},${(topY(s, x) + depthBelowTop + side * open).toFixed(1)}`);
    }
    return pts;
  };
  const upper = cut(-1);
  const lower = cut(1);
  const slit = `M ${upper.join(" L ")} L ${[...lower].reverse().join(" L ")} Z`;

  return (
    <svg viewBox={`0 0 ${W} 240`} className={className} role="img" aria-label="Senin ekmeğin">
      <defs>
        <linearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(color, "#1E120C", 0.25)} />
          <stop offset="0.6" stopColor={color} />
          <stop offset="1" stopColor={mix(color, "#1E120C", 0.4)} />
        </linearGradient>
        <clipPath id={`k${id}`}>
          <path d={domePath(s)} />
        </clipPath>
        <pattern id={`h${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={INK} strokeWidth="0.9" opacity="0.22" />
        </pattern>
      </defs>
      <ellipse cx={s.cx} cy={s.base + 10} rx={s.width * 0.52} ry="9" fill={INK} opacity="0.12" />
      <path d={domePath(s)} fill={`url(#c${id})`} stroke={INK} strokeWidth="2" />
      <g clipPath={`url(#k${id})`}>
        <rect x="0" y="0" width={W} height="240" fill={`url(#h${id})`} />
        <path d={slit} fill={CRUMB} stroke={INK} strokeWidth="1.2" />
        {look.ear > 0.35 && (
          <path d={`M ${upper.join(" L ")}`} fill="none" stroke={mix(color, "#1E120C", 0.5)} strokeWidth={1.5 + look.ear * 3} strokeLinecap="round" />
        )}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFF8EA" opacity="0.75" />
        ))}
      </g>
    </svg>
  );
}

/** Kesit: iç yapı (gözeneklerin boyu ve dağılımı), kabuk kalınlığı, hamurumsu alt bant */
export function CrumbSvg({ look, seed = 11, className }: { look: BreadLook; seed?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const W = 360;
  const s = shapeOf(look.height, W, 215);
  const crust = crustColor(look.crust);
  const holes = useMemo(() => {
    const rnd = mulberry32(seed);
    const count = Math.round(lerp(140, 45, look.openness));
    const maxR = lerp(3, 16, look.openness);
    const out: { x: number; y: number; rx: number; ry: number; rot: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * s.width * 0.86;
      const top = topY(s, x) + 10;
      const bottom = s.base - 8 - look.gummy * 40;
      if (bottom <= top) continue;
      const y = lerp(top, bottom, rnd());
      const big = rnd() < look.openness * 0.6;
      const r = big ? lerp(maxR * 0.5, maxR, rnd()) : lerp(1.2, maxR * 0.45, rnd());
      out.push({ x: s.cx + x, y, rx: r, ry: r * lerp(0.55, 0.95, rnd()), rot: rnd() * 180 });
    }
    return out;
  }, [seed, s, look.openness, look.gummy]);

  return (
    <svg viewBox={`0 0 ${W} 240`} className={className} role="img" aria-label="Ekmeğinin kesiti">
      <defs>
        <clipPath id={`k${id}`}>
          <path d={domePath(s)} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset={1 - look.gummy * 0.45} stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#8A6A3E" stopOpacity={0.15 + look.gummy * 0.5} />
        </linearGradient>
      </defs>
      <path d={domePath(s)} fill={CRUMB} stroke={crust} strokeWidth={4 + look.crust * 7} />
      <g clipPath={`url(#k${id})`}>
        {holes.map((h, i) => (
          <ellipse
            key={i}
            cx={h.x}
            cy={h.y}
            rx={h.rx}
            ry={h.ry}
            transform={`rotate(${h.rot} ${h.x} ${h.y})`}
            fill="#D7B985"
            stroke="#B8955E"
            strokeWidth="0.6"
          />
        ))}
        <rect x="0" y="0" width={W} height="240" fill={`url(#g${id})`} />
      </g>
      <path d={domePath(s)} fill="none" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}
