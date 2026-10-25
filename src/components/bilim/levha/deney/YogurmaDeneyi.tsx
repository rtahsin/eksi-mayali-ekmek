"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { YOGURMA } from "@/lib/bilim";
import d from "./deney.module.css";

// Yoğurma tezgahında: yoğur. Okur tezgahtaki hamuru sağa sola sürttükçe dakika ilerler; yüksek ve düşük
// proteinli iki un aynı anda yoğrulur. Evre dakikaları ölçümdür; eğri biçimi, ağ ve çökme şematiktir.

interface Un {
  ad: string;
  gelisme: number;
  tepe: number;
  cokme: number;
}

const UNLAR: Un[] = [
  { ad: "Yüksek proteinli un", ...YOGURMA.yuksek },
  { ad: "Düşük proteinli un", ...YOGURMA.dusuk },
];
const SON = YOGURMA.asiri;
const PX_DK = 150;
const kis = (x: number) => Math.min(1, Math.max(0, x));

function lcg(tohum: number) {
  let x = tohum;
  return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** Hamurun içindeki ağ: elips içinde düğümler, her düğüm en yakın üç komşusuna bağlı. Şematik. */
const AG = (() => {
  const r = lcg(11);
  const dugum: [number, number][] = [];
  while (dugum.length < 26) {
    const x = 16 + r() * 128;
    const y = 20 + r() * 76;
    if (((x - 80) / 62) ** 2 + ((y - 58) / 36) ** 2 < 1) dugum.push([x, y]);
  }
  const kenar = new Map<string, [number, number]>();
  dugum.forEach((a, i) => {
    dugum
      .map((b, j) => [j, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2] as const)
      .filter(([j]) => j !== i)
      .sort((p, q) => p[1] - q[1])
      .slice(0, 3)
      .forEach(([j]) => kenar.set([i, j].sort((p, q) => p - q).join("-"), [i, j]));
  });
  const teller = [...kenar.values()].map(([i, j]) => ({ a: dugum[i], b: dugum[j], kopma: r() }));
  const sira = [...teller.keys()].sort((p, q) => teller[p].kopma - teller[q].kopma);
  return teller.map((t, i) => ({ ...t, kopmaSira: sira.indexOf(i) }));
})();

function direnc(t: number, u: Un) {
  return t <= u.tepe ? 0.12 + 0.88 * (1 - (1 - t / u.tepe) ** 2) : 1 - 0.5 * ((t - u.tepe) / (SON - u.tepe)) ** 0.9;
}
const kx = (t: number) => 30 + (t / SON) * 350;
const ky = (r: number) => 126 - r * 98;
function iz(t: number, u: Un) {
  let p = `M${kx(0)} ${ky(direnc(0, u))}`;
  for (let x = 0.2; x < t; x += 0.2) p += `L${kx(x).toFixed(1)} ${ky(direnc(x, u)).toFixed(1)}`;
  return t > 0 ? `${p}L${kx(t).toFixed(1)} ${ky(direnc(t, u)).toFixed(1)}` : p;
}
function evre(t: number, u: Un) {
  if (t >= SON) return `aşırı yoğurma (${SON}. dk)`;
  if (t >= u.cokme) return `çökme (${u.cokme}. dk)`;
  if (t >= u.tepe) return `tepe kıvam (${u.tepe}. dk)`;
  if (t >= u.gelisme) return `gelişme (${u.gelisme}. dk)`;
  return "henüz yok";
}

function Hamur({ u, t, dx }: { u: Un; t: number; dx: number }) {
  const gorunen = Math.round(AG.length * kis(t / u.tepe));
  const kopan = Math.round(AG.length * 0.7 * kis((t - u.tepe) / (SON - u.tepe)));
  const cok = kis((t - u.cokme) / (SON - u.cokme));
  return (
    <svg className={d.svg} viewBox="0 0 160 110" aria-hidden="true" style={{ transform: `translateX(${dx * 0.15}px) scale(${1 + cok * 0.14}, ${1 - cok * 0.24})`, transformOrigin: "50% 100%" }}>
      <ellipse cx="80" cy="58" rx="72" ry="44" fill="color-mix(in srgb, #e6d8bb 70%, var(--y-zemin))" stroke="var(--y-murekkep)" />
      {AG.map((tel, i) => {
        if (i >= gorunen) return null;
        const [x1, y1] = tel.a;
        const [x2, y2] = tel.b;
        if (tel.kopmaSira < kopan) {
          const ax = x1 + (x2 - x1) * 0.4;
          const ay = y1 + (y2 - y1) * 0.4;
          const bx = x1 + (x2 - x1) * 0.6;
          const by = y1 + (y2 - y1) * 0.6;
          return <path key={i} d={`M${x1} ${y1}L${ax} ${ay}M${bx} ${by}L${x2} ${y2}`} stroke="var(--y-kabuk)" strokeWidth="1" />;
        }
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--y-ic)" strokeWidth="1.3" />;
      })}
    </svg>
  );
}

export function YogurmaDeneyi() {
  const [dk, setDk] = useState(0);
  const [dx, setDx] = useState(0);
  const surtme = useRef<{ x: number; ilk: number } | null>(null);

  function bas(e: PointerEvent<HTMLDivElement>) {
    surtme.current = { x: e.clientX, ilk: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function sur(e: PointerEvent<HTMLDivElement>) {
    const z = surtme.current;
    if (!z) return;
    const fark = e.clientX - z.x;
    z.x = e.clientX;
    if (fark) setDk((m) => Math.min(SON, m + Math.abs(fark) / PX_DK));
    setDx(Math.max(-60, Math.min(60, e.clientX - z.ilk)));
  }
  function birak() {
    surtme.current = null;
    setDx(0);
  }
  function tus(e: KeyboardEvent<HTMLDivElement>) {
    const tam = Math.floor(dk);
    const yeni = e.key === "ArrowRight" || e.key === "ArrowUp" ? tam + 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? Math.ceil(dk) - 1 : e.key === "Home" ? 0 : e.key === "End" ? SON : null;
    if (yeni === null) return;
    e.preventDefault();
    setDk(Math.min(SON, Math.max(0, yeni)));
  }

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <div
          className={`${d.levha} ${d.odak}`}
          role="slider"
          tabIndex={0}
          aria-label="Yoğurma süresi; sağa sola sürt ya da ok tuşlarını kullan"
          aria-valuemin={0}
          aria-valuemax={SON}
          aria-valuenow={Math.floor(dk)}
          aria-valuetext={`${Math.floor(dk)}. dakika`}
          onPointerDown={bas}
          onPointerMove={sur}
          onPointerUp={birak}
          onPointerCancel={birak}
          onKeyDown={tus}
          style={{ touchAction: "pan-y", cursor: "grab", userSelect: "none", padding: "26px 18px 16px" }}
        >
          <span className={d.levhaNo}>Tezgah · sağa sola sürt</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {UNLAR.map((u) => (
              <div key={u.ad}>
                <Hamur u={u} t={dk} dx={dx} />
                <p className={d.etiket} style={{ textAlign: "center", marginTop: 6 }}>
                  {u.ad}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={d.dugme} onClick={() => setDk(0)}>
            Baştan
          </button>
        </div>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Direnç izi · dakika {Math.floor(dk)}</span>
        <svg className={d.svg} viewBox="0 0 400 150" role="img" aria-label="İki unun yoğurma direnci, dakikaya göre (şematik eğri)">
          <line x1={kx(0)} x2={kx(SON)} y1="128" y2="128" className={d.ince} />
          {[0, 5, 10, 15, 20].map((m) => (
            <text key={m} x={kx(m)} y="144" textAnchor="middle" className={d.svgSoluk}>
              {m}
            </text>
          ))}
          <path d={iz(dk, UNLAR[0])} fill="none" stroke="var(--y-ic)" strokeWidth="2" />
          <path d={iz(dk, UNLAR[1])} fill="none" stroke="var(--y-kabuk)" strokeWidth="2" strokeDasharray="6 3" />
        </svg>
        <dl className={d.okumalar} aria-live="polite">
          {UNLAR.map((u, i) => (
            <div key={u.ad}>
              <dt>
                {i === 0 ? "— " : "- - "}
                {u.ad}
              </dt>
              <dd>{evre(dk, u)}</dd>
            </div>
          ))}
        </dl>
        <p className={d.sema}>
          Evreler aynı yoğurucuda ölçüldü: yüksek proteinli unda {YOGURMA.yuksek.gelisme}/{YOGURMA.yuksek.tepe}/{YOGURMA.yuksek.cokme}., düşük proteinlide {YOGURMA.dusuk.gelisme}/{YOGURMA.dusuk.tepe}/{YOGURMA.dusuk.cokme}. dakika; {SON}. dakika aşırı yoğurma. Eğri ve ağ şematik.
        </p>
      </div>
    </div>
  );
}
