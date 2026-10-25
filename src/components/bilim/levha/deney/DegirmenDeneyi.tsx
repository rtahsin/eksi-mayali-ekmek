"use client";

import { useEffect, useRef, useState } from "react";
import { DEGIRMEN } from "@/lib/bilim";
import d from "./deney.module.css";

// Değirmen taşında: su dök. Okur düğmeye basılı tuttukça iki nişasta tanesine su dökülür; sağlam tanenin
// göstergesi %39–87 bandında durur, kırık tane %200–430 bandına kadar içer. Bantlar ölçüm, dolum hızı şematik.

const OLCEK = 450;
const HIZ = 150;

export function DegirmenDeneyi() {
  const [dokulen, setDokulen] = useState(0);
  const [akiyor, setAkiyor] = useState(false);
  const son = useRef<number | null>(null);

  useEffect(() => {
    if (!akiyor) return;
    let kare = 0;
    son.current = null;
    const adim = (t: number) => {
      const dt = son.current === null ? 0 : (t - son.current) / 1000;
      son.current = t;
      setDokulen((x) => Math.min(DEGIRMEN.kirik.cok, x + dt * HIZ));
      kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [akiyor]);

  const saglam = Math.min(dokulen, DEGIRMEN.saglam.cok);
  const bitti = dokulen >= DEGIRMEN.kirik.cok;
  const y = (v: number) => 200 - (v / OLCEK) * 180;

  const gosterge = (x: number, ad: string, deger: number, bant: { en: number; cok: number }, kirik: boolean) => (
    <g>
      <circle cx={x} cy={110} r={22 + (deger / DEGIRMEN.kirik.cok) * 18} fill="color-mix(in srgb, var(--y-ic) 18%, var(--y-zemin))" stroke={kirik ? "var(--y-kabuk)" : "var(--y-murekkep)"} strokeDasharray={kirik ? "5 3" : undefined} />
      <rect x={x + 60} y={y(bant.cok)} width="22" height={y(bant.en) - y(bant.cok)} fill="color-mix(in srgb, var(--y-kabuk) 30%, transparent)" />
      <rect x={x + 66} y={y(deger)} width="10" height={200 - y(deger)} fill="var(--y-ic)" />
      <line x1={x + 56} x2={x + 86} y1="200" y2="200" className={d.ince} />
      <text x={x + 90} y={y(bant.cok) + 4} className={d.svgSoluk}>
        %{bant.cok}
      </text>
      <text x={x + 90} y={y(bant.en) + 4} className={d.svgSoluk}>
        %{bant.en}
      </text>
      <text x={x} y="232" textAnchor="middle" className={d.svgYazi}>
        {ad}
      </text>
    </g>
  );

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <button
          type="button"
          className={`${d.dugme} ${d.dugmeAna}`}
          onPointerDown={() => setAkiyor(true)}
          onPointerUp={() => setAkiyor(false)}
          onPointerLeave={() => setAkiyor(false)}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setAkiyor(true)}
          onKeyUp={() => setAkiyor(false)}
          style={{ minHeight: 64, fontSize: 17 }}
        >
          Basılı tut: su dök
        </button>
        <button type="button" className={d.dugme} onClick={() => setDokulen(0)}>
          Baştan
        </button>
        <dl className={d.okumalar} aria-live="polite">
          <div>
            <dt>Dökülen su</dt>
            <dd>ağırlığın %{Math.round(dokulen)}&apos;i</dd>
          </div>
          <div>
            <dt>Sağlam tane içti</dt>
            <dd>%{Math.round(saglam)}</dd>
          </div>
        </dl>
        {bitti && (
          <p className={d.durum}>
            <b>Kırık tane %{DEGIRMEN.kirik.cok}&apos;e kadar içti;</b> sağlam tane %{DEGIRMEN.saglam.en}–{DEGIRMEN.saglam.cok} bandında kaldı.
          </p>
        )}
      </div>
      <div className={d.levha}>
        <span className={d.levhaNo}>İki nişasta tanesi · şematik</span>
        <svg className={d.svg} viewBox="0 0 400 245" role="img" aria-label={`Sağlam tane %${Math.round(saglam)}, kırık tane %${Math.round(dokulen)} su içti`}>
          {gosterge(60, "sağlam tane", saglam, DEGIRMEN.saglam, false)}
          {gosterge(250, "kırık tane", dokulen, DEGIRMEN.kirik, true)}
        </svg>
        <p className={d.sema}>Bant: ölçülen su tutma aralığı (ağırlığın yüzdesi). Mavi sütun: şimdiye kadar içilen su. Dolum hızı ve tanelerin şişmesi şematik.</p>
      </div>
    </div>
  );
}
