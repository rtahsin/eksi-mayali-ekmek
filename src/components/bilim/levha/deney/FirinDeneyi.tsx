"use client";

import { useState } from "react";
import { FIRIN_DENEYI } from "@/lib/bilim";
import d from "./deney.module.css";

// Fırının ilk 8 dakikası: okur fırını 180/200/220 °C'ye ayarlar, dakikayı ilerletir; kesit o deneyin
// ölçümleriyle büyür. Kesitin biçimi ve cephenin yeri şematiktir; sayılar ölçümdür (FIRIN_DENEYI).

type Firin = (typeof FIRIN_DENEYI.firinlar)[number];
const DAKIKA = 8;

/** 0 ile 3. dakikadaki ölçüm arasında düz çizgi; sonrası çizilmez (180 °C'de 3–6. dakika ölçülmedi). */
const hacim = (f: Firin, t: number) => Number(f.hacim3.replace(",", ".")) * (Math.min(t, 3) / 3);

export function FirinDeneyi() {
  const [c, setC] = useState<Firin["c"]>(220);
  const [t, setT] = useState(0);
  const f = FIRIN_DENEYI.firinlar.find((x) => x.c === c) ?? FIRIN_DENEYI.firinlar[2];
  const olcek = Math.cbrt(1 + hacim(f, t) / 100);
  const cephe = Math.min(1, t / f.merkez100);
  const durum = t < f.durdu ? (t >= 3 ? "sürüyor (büyüklüğü ölçülmedi)" : "sürüyor") : `durdu (${f.durdu}. dakika)`;

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <fieldset className={d.secim}>
          <legend>Fırın sıcaklığı</legend>
          {FIRIN_DENEYI.firinlar.map((x) => (
            <button key={x.c} type="button" className={d.dugme} aria-pressed={x.c === c} onClick={() => setC(x.c)}>
              {x.c} °C
            </button>
          ))}
        </fieldset>
        <label className={d.kaydirici}>
          <span>
            Dakika <output>{Math.floor(t + 0.001)}</output>
          </span>
          <input type="range" aria-label="Dakika" min={0} max={DAKIKA} step={0.1} value={t} onChange={(e) => setT(Number(e.target.value))} />
        </label>
        <dl className={d.okumalar}>
          <div>
            <dt>Hacim, 3. dakika</dt>
            <dd>{t < 3 ? "ölçüm 3. dakikada" : `+%${f.hacim3}`}</dd>
          </div>
          <div>
            <dt>Genişleme</dt>
            <dd>{durum}</dd>
          </div>
          <div>
            <dt>Merkez 100 °C</dt>
            <dd>{f.merkez100}. dakikada</dd>
          </div>
          <div>
            <dt>Fırın</dt>
            <dd>{f.c} °C</dd>
          </div>
        </dl>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Kesit · şematik</span>
        <svg className={d.svg} viewBox="0 0 400 270" role="img" aria-label={`Ekmek kesiti, ${f.c} °C fırında ${Math.floor(t)}. dakika`}>
          <defs>
            <pattern id="firinTarama" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--y-kabuk)" strokeWidth="1.2" />
            </pattern>
          </defs>
          <line x1="20" x2="380" y1="240" y2="240" className={d.ince} />
          <g style={{ transform: `scale(${olcek})`, transformOrigin: "200px 240px" }} className={d.gecis}>
            <path d="M60 240 C60 140 130 90 200 90 C270 90 340 140 340 240 Z" fill="url(#firinTarama)" stroke="var(--y-kabuk)" />
            {/* Buharlaşma cephesi: kabuktan merkeze doğru ilerler (şematik) */}
            <path
              d="M60 240 C60 140 130 90 200 90 C270 90 340 140 340 240 Z"
              fill="color-mix(in srgb, var(--y-ic) 16%, var(--y-zemin))"
              stroke="var(--y-ic)"
              strokeDasharray="4 3"
              style={{ transform: `scale(${1 - cephe * 0.82})`, transformOrigin: "200px 200px" }}
              className={d.gecis}
            />
          </g>
        </svg>
        <svg className={d.svg} viewBox="0 0 400 46" aria-hidden="true">
          <line x1="20" x2="380" y1="20" y2="20" className={d.ince} />
          <rect x="20" y="15" width={(t / DAKIKA) * 360} height="10" fill="var(--y-kabuk)" />
          <line x1={20 + (f.durdu / DAKIKA) * 360} x2={20 + (f.durdu / DAKIKA) * 360} y1="8" y2="32" stroke="var(--y-murekkep)" strokeWidth="2" />
          {Array.from({ length: DAKIKA + 1 }, (_, i) => (
            <text key={i} x={20 + (i / DAKIKA) * 360} y="44" textAnchor="middle" className={d.svgSoluk}>
              {i}
            </text>
          ))}
        </svg>
        <p className={d.sema}>Taralı: dış bölge · mavi: iç bölge · kesikli çizgi: buharlaşma cephesi. Çubuk 0–8. dakika; dik çizgi bu fırında genişlemenin durduğu dakika. Kesitin biçimi şematik, sayılar ölçüm.</p>
      </div>

      <table className={d.tablo} style={{ gridColumn: "1 / -1" }}>
        <caption>Aynı küçük kalıp ekmeği, üç fırın sıcaklığında</caption>
        <thead>
          <tr>
            <th scope="col">Fırın</th>
            <th scope="col">İlk 3 dakikada hacim</th>
            <th scope="col">Genişleme durdu</th>
            <th scope="col">Merkez 100 °C</th>
          </tr>
        </thead>
        <tbody>
          {FIRIN_DENEYI.firinlar.map((x) => (
            <tr key={x.c} data-secili={x.c === c}>
              <th scope="row">{x.c} °C</th>
              <td>+%{x.hacim3}</td>
              <td>{x.durdu}. dakika</td>
              <td>{x.merkez100}. dakika</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
