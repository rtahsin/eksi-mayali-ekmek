"use client";

import { useState, type ReactNode } from "react";
import { ASITLIK_ZEMIN } from "@/lib/bilim";
import d from "./deney.module.css";

// Ekşi mayanın ilk 10 günü: gün cetveli. Okur günü seçer; o güne kadarki olaylar damgalanır, o günün durumu
// anın cümlesiyle gelir. Renk şeridi asitliğin arttığı yönü gösterir; ölçülmüş bir pH değeri değildir.

export interface IlkOnGunDurumu {
  gun: number;
  ad: string;
  metin: ReactNode;
}

const GUNLER = Array.from({ length: 11 }, (_, i) => i);
const x = (g: number) => 20 + (g / 10) * 360;

export function IlkOnGunDeneyi({ olaylar, durumlar }: { olaylar: readonly { gun: number; ad: string }[]; durumlar: IlkOnGunDurumu[] }) {
  const [gun, setGun] = useState(0);
  const durum = durumlar.filter((s) => gun >= s.gun).pop() ?? durumlar[0];

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <label className={d.kaydirici}>
          <span>
            Gün <output>{gun}</output>
          </span>
          <input type="range" aria-label="Gün" min={0} max={10} step={1} value={gun} onChange={(e) => setGun(Number(e.target.value))} />
        </label>
        <p className={d.durum} aria-live="polite">
          <b>
            Gün {gun} · {durum.ad}
          </b>
        </p>
        <p className={d.cumle}>{durum.metin}</p>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Gün cetveli</span>
        <svg className={d.svg} viewBox="0 0 400 100" role="img" aria-label={`Gün cetveli, ${gun}. gün`}>
          <defs>
            <linearGradient id="asitlik" x1="0" x2="1">
              {ASITLIK_ZEMIN.map(([g, c]) => (
                <stop key={g} offset={`${(g / 10) * 100}%`} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          <rect x="20" y="20" width="360" height="12" fill="url(#asitlik)" opacity="0.85" />
          <rect x={x(gun) - 2} y="14" width="4" height="24" fill="var(--y-murekkep)" />
          <line x1="20" x2="380" y1="70" y2="70" className={d.ince} />
          <line x1="20" x2={x(gun)} y1="70" y2="70" stroke="var(--y-kabuk)" strokeWidth="4" />
          {GUNLER.map((g) => (
            <g key={g}>
              <line x1={x(g)} x2={x(g)} y1="64" y2="76" stroke="var(--y-murekkep)" />
              <text x={x(g)} y="92" textAnchor="middle" className={d.svgSoluk}>
                {g}
              </text>
            </g>
          ))}
          {olaylar.map((o) => (
            <g key={o.ad} opacity={gun + 0.001 >= o.gun ? 1 : 0.3}>
              <circle cx={x(o.gun)} cy="70" r="5" fill={gun + 0.001 >= o.gun ? "var(--y-kabuk)" : "var(--y-zemin)"} stroke="var(--y-murekkep)" />
            </g>
          ))}
        </svg>
        <ol style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
          {olaylar.map((o) => (
            <li key={o.ad} className={d.etiket} style={{ width: "auto", margin: 0, color: gun + 0.001 >= o.gun ? "var(--y-murekkep)" : undefined }}>
              {o.gun} · {o.ad}
            </li>
          ))}
        </ol>
        <p className={d.sema}>Üst şerit asitliğin arttığı yönü gösterir; ölçülmüş bir pH değeri değildir. Noktalar anın olayları.</p>
      </div>
    </div>
  );
}
