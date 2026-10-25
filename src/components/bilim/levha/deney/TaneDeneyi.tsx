"use client";

import { useState, type ReactNode } from "react";
import { TANE } from "@/lib/bilim";
import d from "./deney.module.css";

// Olgun tanenin içi: önce tahmin et (endosperm payı), sonra iki sayım: aynı nişasta sayarak ve kapladığı
// alana göre. Granül yerleşimi şematiktir; ölçüm olan yalnız oranlardır (TANE).

const A_R = 15;
const B_R = 3.5;
const SAYI_R = 4;

/** Deterministik yerleşim: sunucu ve tarayıcı aynı daireleri üretir. */
function yerlestir() {
  let tohum = 7;
  const rastgele = () => {
    tohum = (tohum * 16807) % 2147483647;
    return tohum / 2147483647;
  };
  const daireler: { x: number; y: number; a: boolean }[] = [];
  const sigar = (x: number, y: number, r: number) => daireler.every((q) => Math.hypot(q.x - x, q.y - y) > r + (q.a ? A_R : B_R) + 3);
  for (let i = 0; daireler.length < 6 && i < 4000; i++) {
    const x = 20 + rastgele() * 280;
    const y = 20 + rastgele() * 160;
    if (sigar(x, y, A_R)) daireler.push({ x, y, a: true });
  }
  for (let i = 0; daireler.length < 40 && i < 8000; i++) {
    const x = 8 + rastgele() * 304;
    const y = 8 + rastgele() * 184;
    if (sigar(x, y, B_R + 2)) daireler.push({ x, y, a: false });
  }
  return daireler;
}

const GRANULLER = yerlestir();
const TOPLAM = TANE.oranlar.reduce((n, o) => n + o.orta, 0);
const RENK = ["var(--y-ic)", "var(--y-kabuk)", "color-mix(in srgb, var(--y-kabuk) 45%, var(--y-zemin))", "var(--y-notr)"];
const ENDOSPERM = TANE.oranlar[0].orta;

export function TaneDeneyi({ ikiSayim }: { ikiSayim: ReactNode }) {
  const [tahmin, setTahmin] = useState(50);
  const [goster, setGoster] = useState(false);
  const [alan, setAlan] = useState(false);
  const fark = tahmin - ENDOSPERM;
  const yorum = Math.abs(fark) <= 5 ? "Çok yakın." : fark < 0 ? "Daha fazla." : "Biraz daha az.";

  return (
    <div className={d.duzen}>
      <div className={d.denetim}>
        <label className={d.kaydirici}>
          <span>
            Tahminin: endosperm payı <output>%{tahmin}</output>
          </span>
          <input
            type="range"
            aria-label="Endosperm payı tahmini"
            min={0}
            max={100}
            value={tahmin}
            onChange={(e) => {
              setTahmin(Number(e.target.value));
              setGoster(false);
            }}
          />
        </label>
        <button type="button" className={`${d.dugme} ${d.dugmeAna}`} onClick={() => setGoster(true)} aria-expanded={goster}>
          Ölçüme bak
        </button>
        <div aria-live="polite">
          {goster && (
            <p className={d.durum}>
              Ölçüm: nişastalı endosperm tanenin %{TANE.oranlar[0].yazi}&apos;ü. Senin tahminin %{tahmin}. <b>{yorum}</b>
            </p>
          )}
        </div>
        <fieldset className={d.secim}>
          <legend>İki sayım</legend>
          <button type="button" className={d.dugme} aria-pressed={!alan} onClick={() => setAlan(false)}>
            Sayarak
          </button>
          <button type="button" className={d.dugme} aria-pressed={alan} onClick={() => setAlan(true)}>
            Kapladığı alana göre
          </button>
        </fieldset>
        <p className={d.cumle}>{ikiSayim}</p>
      </div>

      <div className={d.levha}>
        <span className={d.levhaNo}>Tane ve nişasta · şematik</span>
        <svg className={d.svg} viewBox="0 0 320 40" role="img" aria-label="Tanenin kısımları, ağırlık payı">
          {(() => {
            let x = 0;
            return TANE.oranlar.map((o, i) => {
              const w = (o.orta / TOPLAM) * 320;
              const el = (
                <g key={o.ad}>
                  <rect x={x} y={goster ? 6 : 6} width={goster ? w - 2 : 0} height="22" fill={RENK[i]} className={d.gecis} />
                </g>
              );
              x += w;
              return el;
            });
          })()}
          <line x1={(tahmin / 100) * 320} x2={(tahmin / 100) * 320} y1="0" y2="34" stroke="var(--y-murekkep)" strokeWidth="2" />
        </svg>
        <p className={d.sema}>
          Dik çizgi: tahminin.{" "}
          {goster && TANE.oranlar.map((o, i) => (
            <span key={o.ad} style={{ marginRight: 10, whiteSpace: "nowrap" }}>
              <i style={{ display: "inline-block", width: 9, height: 9, background: RENK[i], marginRight: 4 }} />
              {o.ad} %{o.yazi}
            </span>
          ))}
        </p>
        <svg className={d.svg} viewBox="0 0 320 200" role="img" aria-label={alan ? "Nişasta granülleri, alan görünümü" : "Nişasta granülleri, sayı görünümü"} style={{ marginTop: 16 }}>
          {GRANULLER.map((g, i) => (
            <circle
              key={i}
              cx={g.x}
              cy={g.y}
              r={alan ? (g.a ? A_R : B_R) : SAYI_R}
              fill={g.a ? "var(--y-kabuk)" : "var(--y-ic)"}
              stroke="var(--y-zemin)"
              strokeWidth="1.5"
              className={d.gecis}
            />
          ))}
        </svg>
        <p className={d.sema}>
          Turuncu: A-tipi, büyük · mavi: B-tipi, küçük. Çizim şematik: 40 granülün 6&apos;sı A-tipi. Ölçüm: A-tipi sayının %{TANE.granul.sayi}&apos;i, alanın %{TANE.granul.alan}&apos;inden fazlası.
        </p>
      </div>
    </div>
  );
}
