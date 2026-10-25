"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { KESIK } from "@/lib/bilim";
import d from "./deney.module.css";

// Kesik atılınca: kesiği at. Okur hamurun üstüne kesik çizer (en çok dört), sonra fırına verir; pişirme saati
// 900 saniyeye akar, kenar 450, eksen 900 saniyede sabitlenir (ölçüm). Büyüme, açılma ve renk şematiktir.

type Nokta = [number, number];
const SON = KESIK.eksen.sn;
const HIZ = 150;
const HAZIR: Record<string, Nokta[][]> = {
  "Tek uzun kesik": [[[72, 116], [110, 106], [150, 100], [190, 94], [228, 84]]],
  "Üç çapraz kesik": [[[80, 120], [118, 82]], [[128, 124], [166, 86]], [[176, 126], [214, 88]]],
};
const icinde = ([x, y]: Nokta) => ((x - 150) / 118) ** 2 + ((y - 104) / 68) ** 2 < 1;
const yol = (c: Nokta[]) => c.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const yavas = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2;

export function KesikDeneyi({ kinetik, kabukOlur }: { kinetik: ReactNode; kabukOlur: ReactNode }) {
  const tuval = useRef<SVGSVGElement>(null);
  const [cizgiler, setCizgiler] = useState<Nokta[][]>([]);
  const [aktif, setAktif] = useState<Nokta[] | null>(null);
  const [sn, setSn] = useState(0);
  const [piyor, setPiyor] = useState(false);
  const son = useRef<number | null>(null);

  useEffect(() => {
    if (!piyor) return;
    let kare = 0;
    son.current = null;
    const adim = (t: number) => {
      const dt = son.current === null ? 0 : (t - son.current) / 1000;
      son.current = t;
      setSn((v) => {
        const yeni = Math.min(SON, v + dt * HIZ);
        if (yeni >= SON) setPiyor(false);
        return yeni;
      });
      kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [piyor]);

  const ciziliyor = sn === 0 && !piyor;
  function nokta(e: PointerEvent<SVGSVGElement>): Nokta {
    const r = tuval.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 200];
  }
  function bas(e: PointerEvent<SVGSVGElement>) {
    if (!ciziliyor || cizgiler.length >= 4) return;
    const n = nokta(e);
    if (!icinde(n)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setAktif([n]);
  }
  function sur(e: PointerEvent<SVGSVGElement>) {
    if (!aktif) return;
    const n = nokta(e);
    const [px, py] = aktif[aktif.length - 1];
    if (icinde(n) && Math.hypot(n[0] - px, n[1] - py) > 3) setAktif([...aktif, n]);
  }
  function birak() {
    if (aktif && aktif.length > 2) setCizgiler((c) => [...c, aktif]);
    setAktif(null);
  }

  const buyume = yavas(sn / KESIK.kenar.sn);
  const acilma = yavas(sn / SON);
  const renk = Math.min(1, Math.max(0, (sn - KESIK.kenar.sn) / (SON - KESIK.kenar.sn)));
  const bitti = sn >= SON;

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <p className={d.etiket}>{ciziliyor ? `Hamurun üstüne kesik çiz · ${cizgiler.length}/4` : "Fırında"}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className={`${d.dugme} ${d.dugmeAna}`} disabled={piyor || bitti} onClick={() => setPiyor(true)}>
            Fırına ver
          </button>
          {ciziliyor &&
            Object.entries(HAZIR).map(([ad, c]) => (
              <button key={ad} type="button" className={d.dugme} onClick={() => setCizgiler(c)}>
                {ad}
              </button>
            ))}
          {(cizgiler.length > 0 || sn > 0) && (
            <button
              type="button"
              className={d.dugme}
              onClick={() => {
                setPiyor(false);
                setSn(0);
                setCizgiler([]);
              }}
            >
              Yeni hamur
            </button>
          )}
        </div>
        <dl className={d.okumalar} aria-live="polite">
          <div>
            <dt>Pişirme</dt>
            <dd>{Math.round(sn)} sn</dd>
          </div>
          {[
            { ad: "Kenar", ...KESIK.kenar },
            { ad: "Eksen", ...KESIK.eksen },
          ].map((h) => (
            <div key={h.ad}>
              <dt>{h.ad} yüksekliği</dt>
              <dd>{sn >= h.sn ? `${h.mm} mm'de sabit` : `${h.sn} sn'de sabitlenir`}</dd>
            </div>
          ))}
        </dl>
        {bitti && (
          <>
            <p className={d.cumle}>{kinetik}</p>
            <p className={d.durum}>{kabukOlur}</p>
          </>
        )}
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Somun, üstten · şematik</span>
        <svg ref={tuval} className={d.svg} viewBox="0 0 300 200" role="img" aria-label={`Somun, ${cizgiler.length} kesik`} onPointerDown={bas} onPointerMove={sur} onPointerUp={birak} onPointerCancel={birak} style={{ cursor: ciziliyor ? "crosshair" : "default" }}>
          <g style={{ transform: `scale(${1 + buyume * 0.12})`, transformOrigin: "150px 104px" }}>
            <ellipse cx="150" cy="104" rx="122" ry="72" fill={`color-mix(in srgb, var(--y-kabuk) ${Math.round(renk * 70)}%, #e6d8bb)`} stroke="var(--y-murekkep)" />
            {cizgiler.map((c, i) => (
              <g key={i}>
                <path d={yol(c)} fill="none" stroke="color-mix(in srgb, #e6d8bb 70%, var(--y-zemin))" strokeWidth={2 + acilma * 12} strokeLinecap="round" />
                <path d={yol(c)} fill="none" stroke="var(--y-murekkep)" strokeWidth="1.2" />
              </g>
            ))}
            {aktif && <path d={yol(aktif)} fill="none" stroke="var(--y-murekkep)" strokeWidth="1.5" />}
          </g>
        </svg>
        <svg className={d.svg} viewBox="0 0 400 40" aria-hidden="true">
          <line x1="10" x2="390" y1="14" y2="14" className={d.ince} />
          <rect x="10" y="10" width={(sn / SON) * 380} height="8" fill="var(--y-kabuk)" />
          {[KESIK.kenar, KESIK.eksen].map((h) => (
            <g key={h.sn}>
              <line x1={10 + (h.sn / SON) * 380} x2={10 + (h.sn / SON) * 380} y1="4" y2="24" stroke="var(--y-murekkep)" />
              <text x={Math.min(375, 10 + (h.sn / SON) * 380)} y="37" textAnchor="middle" className={d.svgSoluk}>
                {h.sn} sn
              </text>
            </g>
          ))}
        </svg>
        <p className={d.sema}>Sabitlenme anları ve yükseklikler ölçüm. Büyüme, kesiğin açılması ve renk şematik; saat hızlandırılmış.</p>
      </div>
    </div>
  );
}
