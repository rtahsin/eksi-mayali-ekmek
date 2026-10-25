import type { CSSProperties, ReactNode } from "react";
import type { Grafik, GrafikRengi, OlcekSatiri } from "@/lib/bilim/grafik";
import { Kesit } from "./Kesit";
import g from "./grafik.module.css";

// Levha grafiklerinin çizimi. Veri src/lib/bilim/levhalar.ts'ten gelir; renkler ve yazılar sayfanın
// --y-… değişkenlerinden. İşaretler ince, değerler doğrudan etiketli; her grafikte ekran okuyucu tablosu var.

const RENK: Record<GrafikRengi, string> = {
  ic: "var(--y-ic)",
  kabuk: "var(--y-kabuk)",
  vurgu: "var(--y-vurgu)",
  notr: "var(--y-notr)",
};

/** Eksen tavanı: en büyük değeri biraz aşan yuvarlak sayı (17 → 20, 862,5 → 1000, 0,38 → 0,4). */
function tavan(enBuyuk: number): number {
  const kuvvet = 10 ** Math.floor(Math.log10(enBuyuk));
  for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * kuvvet >= enBuyuk * 1.08) return +(k * kuvvet).toPrecision(3);
  return 10 * kuvvet;
}

const tr = (n: number) => String(+n.toPrecision(6)).replace(".", ",");

function Cerceve({ no, baslik, not, kanit, kaynak, tablo, children }: { no: string; baslik: string; not?: string; kanit: string; kaynak?: ReactNode; tablo: [string, string][]; children: ReactNode }) {
  return (
    <figure className={g.sekil}>
      <figcaption className={g.ust}>
        <span className={g.no}>{no}</span>
        <span className={g.baslik}>{baslik}</span>
      </figcaption>
      <div className={g.govde} aria-hidden="true">
        {children}
      </div>
      <table className={g.gizli}>
        <tbody>
          {tablo.map(([a, b], i) => (
            <tr key={i}>
              <th scope="row">{a}</th>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={g.alt}>
        {not && <>{not} </>}
        <span className={g.kanit}>{kanit}</span>
        {kaynak}
      </p>
    </figure>
  );
}

function Sutunlar({ g: s }: { g: Extract<Grafik, { tur: "sutun" }> }) {
  const ust = tavan(Math.max(...s.ogeler.map((o) => o.deger)));
  return (
    <div className={g.sutunlar} style={{ "--adet": s.ogeler.length } as CSSProperties}>
      {s.ogeler.map((o) => (
        <div key={o.ad} className={g.sutun}>
          <span className={g.sutunAlan}>
            <span className={g.sutunCubuk} style={{ height: `${(o.deger / ust) * 100}%` }}>
              <b>{o.etiket}</b>
            </span>
          </span>
          <span className={g.sutunAd}>{o.ad}</span>
        </div>
      ))}
    </div>
  );
}

function Olcek({ g: o }: { g: Extract<Grafik, { tur: "olcek" }> }) {
  const alt = o.alt ?? (o.log ? 1 : 0);
  const x = (v: number) =>
    o.log ? ((Math.log10(v) - Math.log10(alt)) / (Math.log10(o.ust) - Math.log10(alt))) * 100 : ((v - alt) / (o.ust - alt)) * 100;
  const yuzde = (v: number) => `${Math.min(100, Math.max(0, x(v)))}%`;
  const tikler: number[] = [];
  if (o.log) for (let v = alt; v <= o.ust * 1.0001; v *= 10) tikler.push(v);
  else for (let v = alt; v <= o.ust + 1e-9; v += o.adim) tikler.push(+v.toPrecision(6));
  const satir = (s: OlcekSatiri) => {
    const renk = { "--renk": RENK[s.renk ?? "vurgu"] } as CSSProperties;
    let isaret: ReactNode = null;
    let merkez = 0;
    if (s.aralik) {
      merkez = (x(s.aralik[0]) + x(s.aralik[1])) / 2;
      isaret = <span className={g.bant} style={{ left: yuzde(s.aralik[0]), width: `calc(${yuzde(s.aralik[1])} - ${yuzde(s.aralik[0])})`, minWidth: 3 }} />;
    } else if (s.kadar !== undefined) {
      merkez = x(s.kadar);
      isaret = (
        <>
          <span className={g.bant} style={{ left: 0, width: yuzde(s.kadar) }} />
          <span className={g.uc} style={{ left: yuzde(s.kadar) }} />
        </>
      );
    } else if (s.den !== undefined) {
      merkez = x(s.den);
      isaret = (
        <>
          <span className={g.acikBant} style={{ left: yuzde(s.den), right: 0 }} />
          <span className={g.uc} style={{ left: yuzde(s.den) }} />
        </>
      );
    } else if (s.nokta !== undefined) {
      merkez = x(s.nokta);
      isaret = (
        <>
          {s.pay !== undefined && <span className={g.biyik} style={{ left: yuzde(s.nokta - s.pay), width: `calc(${yuzde(s.nokta + s.pay)} - ${yuzde(s.nokta - s.pay)})` }} />}
          <span className={g.nokta} style={{ left: yuzde(s.nokta) }} />
        </>
      );
    } else if (s.cizgi !== undefined) {
      merkez = x(s.cizgi);
      isaret = <span className={g.cizgiIsaret} style={{ left: yuzde(s.cizgi) }} />;
    }
    const hiza = merkez > 82 ? g.etiketSag : merkez < 12 ? g.etiketSol : "";
    return (
      <div key={s.ad} className={g.satir} style={renk}>
        <span className={g.satirAd}>{s.ad}</span>
        <div className={g.iz}>
          {tikler.map((t) => (
            <i key={t} className={g.izgara} style={{ left: yuzde(t) }} />
          ))}
          {isaret}
          <b className={`${g.deger} ${hiza}`} style={{ left: `${Math.min(100, Math.max(0, merkez))}%` }}>
            {s.etiket}
          </b>
        </div>
      </div>
    );
  };
  return (
    <>
      {o.lejant && (
        <div className={g.lejant}>
          {o.lejant.nokta && (
            <span>
              <i className={g.lejantNokta} /> {o.lejant.nokta}
            </span>
          )}
          {o.lejant.aralik && (
            <span>
              <i className={g.lejantBant} /> {o.lejant.aralik}
            </span>
          )}
        </div>
      )}
      {o.satirlar.map(satir)}
      <div className={g.satir}>
        <span />
        <div className={g.eksen}>
          {tikler.map((t, i) => (
            <span key={t} style={{ left: yuzde(t) }} className={i === tikler.length - 1 ? g.eksenSon : i === 0 ? g.eksenIlk : ""}>
              {tr(t)}
            </span>
          ))}
          {o.birim && <small className={g.eksenBirim}>{o.birim}</small>}
        </div>
      </div>
    </>
  );
}

function Pay({ g: p }: { g: Extract<Grafik, { tur: "pay" }> }) {
  return (
    <div className={g.pay}>
      <div className={g.payCubuk}>
        {p.parcalar.map((q, i) => (
          <span key={q.ad} className={g.payParca} data-sira={i} style={{ width: `${(q.deger / p.toplam.deger) * 100}%` }} />
        ))}
      </div>
      <div className={g.payEtiketler}>
        {p.parcalar.map((q, i) => (
          <span key={q.ad} data-sira={i}>
            <i />
            {q.ad} <b>{q.etiket}</b>
          </span>
        ))}
        <span className={g.payToplam}>
          {p.toplam.ad} <b>{p.toplam.etiket}</b>
        </span>
      </div>
    </div>
  );
}

function Cizgi({ g: c }: { g: Extract<Grafik, { tur: "cizgi" }> }) {
  const W = 320;
  const H = 190;
  const x = (v: number) => 40 + (v / c.xUst) * (W - 76);
  const y = (v: number) => 16 + (1 - v / c.yUst) * (H - 52);
  const noktalar = [...(c.sifirdan ? [{ x: 0, y: 0 }] : []), ...c.noktalar];
  const yol = noktalar.map((n, i) => `${i ? "L" : "M"}${x(n.x)},${y(n.y)}`).join(" ");
  const son = noktalar[noktalar.length - 1];
  const tikler = Array.from({ length: Math.floor(c.yUst / c.yAdim) + 1 }, (_, i) => i * c.yAdim);
  return (
    <svg className={g.cizgiSvg} viewBox={`0 0 ${W} ${H}`}>
      {tikler.map((v) => (
        <g key={v}>
          <line x1={x(0)} x2={x(c.xUst)} y1={y(v)} y2={y(v)} className={g.svgIzgara} />
          <text x={x(0) - 8} y={y(v) + 4} className={g.svgEksen} textAnchor="end">
            {v === tikler[tikler.length - 1] ? `${tr(v)} ${c.yBirim}` : tr(v)}
          </text>
        </g>
      ))}
      <path d={`${yol} L${x(son.x)},${y(0)} L${x(noktalar[0].x)},${y(0)} Z`} className={g.svgAlan} />
      <path d={yol} className={g.svgCizgi} />
      {c.noktalar.map((n) => (
        <g key={n.x}>
          <circle cx={x(n.x)} cy={y(n.y)} r={4} className={g.svgNokta}>
            <title>{`${n.xEtiket}: ${n.etiket}`}</title>
          </circle>
          <text x={x(n.x) - 8} y={y(n.y) - 10} className={g.svgDeger} textAnchor="end">
            {n.etiket}
          </text>
          <text x={x(n.x)} y={H - 14} className={g.svgEksen} textAnchor="middle">
            {n.xEtiket}
          </text>
        </g>
      ))}
      {c.sifirdan && (
        <text x={x(0)} y={H - 14} className={g.svgEksen} textAnchor="middle">
          0
        </text>
      )}
      <text x={x(c.xUst)} y={H - 1} className={g.svgEksen} textAnchor="end">
        {c.xBirim}
      </text>
    </svg>
  );
}

function OnceSonra({ g: o }: { g: Extract<Grafik, { tur: "once_sonra" }> }) {
  const W = 150;
  const H = 190;
  const y = (v: number) => 24 + (1 - v / o.ust) * (H - 56);
  const [x0, x1] = [28, W - 26];
  const orta = (r: readonly [number, number]) => (r[0] + r[1]) / 2;
  return (
    <div className={g.paneller}>
      {o.paneller.map((p) => (
        <div className={g.panel} key={p.ad}>
          <p className={g.panelAd}>{p.ad}</p>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            {[0, o.ust / 2, o.ust].map((v) => (
              <g key={v}>
                <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} className={g.svgIzgara} />
                <text x={x0 - 6} y={y(v) + 4} className={g.svgEksen} textAnchor="end">
                  {tr(v)}
                </text>
              </g>
            ))}
            <polygon points={`${x0},${y(p.once.deger[1])} ${x1},${y(p.sonra.deger[1])} ${x1},${y(p.sonra.deger[0])} ${x0},${y(p.once.deger[0])}`} className={g.svgBant} />
            <line x1={x0} y1={y(orta(p.once.deger))} x2={x1} y2={y(orta(p.sonra.deger))} className={g.svgCizgi} />
            <circle cx={x0} cy={y(orta(p.once.deger))} r={4} className={g.svgNokta} />
            <circle cx={x1} cy={y(orta(p.sonra.deger))} r={4} className={g.svgNokta} />
            <text x={x0} y={y(Math.max(...p.once.deger)) - 10} className={g.svgDeger} textAnchor="start">
              {p.once.etiket}
            </text>
            <text x={x1} y={y(Math.max(...p.sonra.deger)) - 10} className={g.svgDeger} textAnchor="end">
              {p.sonra.etiket}
            </text>
            <text x={x0} y={H - 8} className={g.svgEksen} textAnchor="middle">
              {o.xEtiket[0]}
            </text>
            <text x={x1} y={H - 8} className={g.svgEksen} textAnchor="middle">
              {o.xEtiket[1]}
            </text>
          </svg>
        </div>
      ))}
    </div>
  );
}

function tablo(gr: Grafik): [string, string][] {
  switch (gr.tur) {
    case "sutun":
      return gr.ogeler.map((o) => [o.ad, o.etiket]);
    case "olcek":
      return gr.satirlar.map((s) => [s.ad, s.etiket]);
    case "pay":
      return [...gr.parcalar.map((q): [string, string] => [q.ad, q.etiket]), [gr.toplam.ad, gr.toplam.etiket]];
    case "cizgi":
      return gr.noktalar.map((n) => [n.xEtiket, n.etiket]);
    case "once_sonra":
      return gr.paneller.map((p) => [p.ad, `${p.once.etiket} → ${p.sonra.etiket}`]);
    case "sema":
      return [];
  }
}

export function LevhaGrafik({ grafik, no, kanit, kaynak, semaAlt }: { grafik: Grafik; no: string; kanit: string; kaynak?: ReactNode; semaAlt?: ReactNode }) {
  if (grafik.tur === "sema") return <Kesit no={no} baslik={grafik.baslik} alt={semaAlt} />;
  const govde =
    grafik.tur === "sutun" ? <Sutunlar g={grafik} /> : grafik.tur === "olcek" ? <Olcek g={grafik} /> : grafik.tur === "pay" ? <Pay g={grafik} /> : grafik.tur === "cizgi" ? <Cizgi g={grafik} /> : <OnceSonra g={grafik} />;
  return (
    <Cerceve no={no} baslik={grafik.baslik} not={grafik.not} kanit={kanit} kaynak={kaynak} tablo={tablo(grafik)}>
      {govde}
    </Cerceve>
  );
}
