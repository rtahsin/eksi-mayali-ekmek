"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { GECE } from "@/lib/bilim";
import d from "./deney.module.css";

// Gece dolapta: geceyi çevir. Okur saatin kolunu döndürür (bir tur 12 saat); aynı deneyin iki koşulu yan yana
// yürür. Varış süreleri ve 18. saatteki ölçümler kütüphaneden; kavanozlardaki yükselişin seyri şematiktir.

const { soguk, sicak, yukseklik } = GECE.deney;
const SON = soguk.saat * 60;
const TUR = 12 * 60;
const OLAYLAR = [
  { dk: sicak.dakika, ad: `${sicak.dakika} dk` },
  { dk: GECE.ph.saat * 60, ad: `${GECE.ph.saat} sa` },
  { dk: SON, ad: `${soguk.saat} sa` },
];

function sure(dk: number) {
  const sa = Math.floor(dk / 60);
  const m = Math.round(dk % 60);
  return sa ? `${sa} sa ${String(m).padStart(2, "0")} dk` : `${m} dk`;
}

function Kavanoz({ isi, maya, oran, vardi }: { isi: number; maya: number; oran: number; vardi: boolean }) {
  const h = 20 + oran * 90;
  return (
    <figure style={{ margin: 0 }}>
      <svg className={d.svg} viewBox="0 0 100 150" aria-hidden="true" style={{ maxWidth: 150, margin: "0 auto" }}>
        <rect x="15" y="15" width="70" height="115" fill="none" stroke="var(--y-murekkep)" />
        <line x1="10" x2="90" y1={130 - 90} y2={130 - 90} stroke="var(--y-kabuk)" strokeDasharray="4 3" />
        <text x="84" y={130 - 94} textAnchor="end" className={d.svgSoluk} style={{ fontSize: 8 }}>
          {yukseklik} cm
        </text>
        <rect x="16" y={130 - h} width="68" height={h} fill={vardi ? "color-mix(in srgb, var(--y-kabuk) 35%, #e6d8bb)" : "color-mix(in srgb, #e6d8bb 80%, var(--y-zemin))"} className={d.gecis} />
      </svg>
      <figcaption className={d.etiket} style={{ textAlign: "center" }}>
        {isi} °C · {maya} g maya
      </figcaption>
    </figure>
  );
}

export function GeceDeneyi({ sicakVaris, sogukVaris, ph }: { sicakVaris: ReactNode; sogukVaris: ReactNode; ph: ReactNode }) {
  const [dk, setDk] = useState(0);
  const kadran = useRef<HTMLDivElement>(null);
  const aci = useRef<number | null>(null);

  function acisi(e: PointerEvent<HTMLDivElement>) {
    const r = kadran.current!.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }
  function bas(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    aci.current = acisi(e);
  }
  function cevir(e: PointerEvent<HTMLDivElement>) {
    if (aci.current === null) return;
    const a = acisi(e);
    let f = a - aci.current;
    if (f > Math.PI) f -= 2 * Math.PI;
    if (f < -Math.PI) f += 2 * Math.PI;
    aci.current = a;
    setDk((m) => Math.min(SON, Math.max(0, m + (f / (2 * Math.PI)) * TUR)));
  }
  function tus(e: KeyboardEvent<HTMLDivElement>) {
    const adim: Record<string, number> = { ArrowRight: 15, ArrowUp: 15, ArrowLeft: -15, ArrowDown: -15, PageUp: 60, PageDown: -60 };
    const yeni = e.key in adim ? dk + adim[e.key] : e.key === "Home" ? 0 : e.key === "End" ? SON : null;
    if (yeni === null) return;
    e.preventDefault();
    setDk(Math.min(SON, Math.max(0, yeni)));
  }

  const dakikaKolu = ((dk % 60) / 60) * 360;
  const saatKolu = ((dk % TUR) / TUR) * 360;
  const sicakVardi = dk >= sicak.dakika;
  const sogukVardi = dk >= SON;
  const dolap = dk >= GECE.ph.saat * 60;

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <div
          ref={kadran}
          className={d.odak}
          role="slider"
          tabIndex={0}
          aria-label="Geçen süre. Saatin kolunu döndür ya da ok tuşlarını kullan."
          aria-valuemin={0}
          aria-valuemax={SON}
          aria-valuenow={Math.round(dk)}
          aria-valuetext={sure(dk)}
          onPointerDown={bas}
          onPointerMove={cevir}
          onPointerUp={() => (aci.current = null)}
          onPointerCancel={() => (aci.current = null)}
          onKeyDown={tus}
          style={{ width: "min(240px, 60vw)", aspectRatio: "1", touchAction: "none", cursor: "grab", borderRadius: "50%" }}
        >
          <svg className={d.svg} viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="94" fill="var(--y-zemin)" stroke="var(--y-murekkep)" />
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="100" y1="12" x2="100" y2={i % 3 === 0 ? 26 : 20} transform={`rotate(${i * 30} 100 100)`} stroke="var(--y-murekkep)" />
            ))}
            <line x1="100" y1="100" x2="100" y2="52" stroke="var(--y-murekkep)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${saatKolu} 100 100)`} />
            <line x1="100" y1="100" x2="100" y2="24" stroke="var(--y-kabuk)" strokeWidth="2" transform={`rotate(${dakikaKolu} 100 100)`} />
            <circle cx="100" cy="24" r="9" fill="var(--y-kabuk)" transform={`rotate(${dakikaKolu} 100 100)`} />
            <circle cx="100" cy="100" r="5" fill="var(--y-murekkep)" />
          </svg>
        </div>
        <p className={d.durum}>
          <b>{sure(dk)}</b> geçti · bir turda 12 saat
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className={d.dugme} onClick={() => setDk(OLAYLAR.find((o) => o.dk > dk + 0.5)?.dk ?? SON)}>
            Sonraki olay
          </button>
          <button type="button" className={d.dugme} onClick={() => setDk(0)}>
            Baştan
          </button>
        </div>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Aynı hamur, iki koşul · seyir şematik</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Kavanoz isi={sicak.sicaklik} maya={sicak.maya} oran={Math.min(1, dk / sicak.dakika)} vardi={sicakVardi} />
          <Kavanoz isi={soguk.sicaklik} maya={soguk.maya} oran={dk / SON} vardi={sogukVardi} />
        </div>
        <svg className={d.svg} viewBox="0 0 400 40" aria-hidden="true" style={{ marginTop: 12 }}>
          <line x1="10" x2="390" y1="14" y2="14" className={d.ince} />
          <rect x="10" y="10" width={(dk / SON) * 380} height="8" fill="var(--y-kabuk)" />
          {OLAYLAR.map((o) => (
            <g key={o.dk}>
              <line x1={10 + (o.dk / SON) * 380} x2={10 + (o.dk / SON) * 380} y1="4" y2="24" stroke="var(--y-murekkep)" />
              <text x={10 + (o.dk / SON) * 380} y="37" textAnchor={o.dk === SON ? "end" : o.dk === GECE.ph.saat * 60 ? "end" : "start"} className={d.svgSoluk}>
                {o.ad}
              </text>
            </g>
          ))}
        </svg>
        <div aria-live="polite">
          {sicakVardi && <p className={d.cumle}>{sicakVaris}</p>}
          {dolap && <p className={d.cumle}>{ph}</p>}
          {sogukVardi && <p className={d.cumle}>{sogukVaris}</p>}
        </div>
        <p className={d.sema}>Maya miktarı kilogram un başına. Varış süreleri ve {GECE.ph.saat}. saatteki ölçümler kütüphaneden; yükselişin seyri şematik.</p>
      </div>
    </div>
  );
}
