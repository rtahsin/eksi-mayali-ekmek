"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { YOGURMA } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Yoğurma tezgahında" bayrak sahnesi. İmza: yoğur. Okur tezgahtaki hamuru sağa sola sürttükçe dakika ilerler;
// yüksek ve düşük proteinli iki un aynı anda yoğrulur. Evre dakikaları ölçümdür; eğri biçimi, ağ ve çökme şematiktir.

export interface YogurmaTezgahiProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof YOGURMA.gorseller, Gorselli>;
  metin: Record<
    "ag" | "aile" | "denge" | "kompozit" | "direnc" | "evre" | "iskelet" | "kopma" | "gaz" | "gozenek" | "hacim" | "cwrs" | "tokat",
    ReactNode
  >;
  children?: ReactNode;
}

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
const PX_DK = 150; // bir dakikalık yoğurma için sürtülen yol, piksel (şematik)
const EVRELER = [...new Set([...UNLAR.flatMap((u) => [u.gelisme, u.tepe, u.cokme]), SON])].sort((a, b) => a - b);

const kis = (x: number) => Math.min(1, Math.max(0, x));
const sayi = (t: string) => Number(t.replace(",", "."));

function lcg(tohum: number) {
  let x = tohum;
  return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** Hamurun içindeki ağ: elips içinde düğümler, her düğüm en yakın üç komşusuna bağlı. Görünme ve kopma sırası ayrı karışık. */
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
  const kopmaSira = [...teller.keys()].sort((p, q) => teller[p].kopma - teller[q].kopma);
  return teller.map((t, i) => ({ ...t, kopmaSira: kopmaSira.indexOf(i) }));
})();

/** Örgü sahnesi: çözgü (dikey) ve atkı (yatay) iplikler, alttan geçişte atkıda boşluk; gözlere nişasta taneleri. */
const COZGU = [30, 70, 110, 150, 190, 230, 270];
const ATKI = [30, 70, 110, 150, 190, 230, 270];
const ATKI_YOL = ATKI.map((y, j) => {
  let d = "";
  let x0 = 0;
  COZGU.forEach((x, i) => {
    if ((i + j) % 2 === 0) {
      d += `M${x0} ${y}H${x - 7}`;
      x0 = x + 7;
    }
  });
  return `${d}M${x0} ${y}H300`;
});
const ORGU_TANE = (() => {
  const r = lcg(5);
  const t: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < COZGU.length - 1; i++)
    for (let j = 0; j < ATKI.length - 1; j++)
      if (r() < 0.55) t.push({ x: (COZGU[i] + COZGU[i + 1]) / 2, y: (ATKI[j] + ATKI[j + 1]) / 2, r: 9 + r() * 5 });
  return t;
})();

/** Gözenek: az yoğrulmuş (az, iri, kalın duvar) ve en uygun sürede yoğrulmuş (çok, küçük, ince duvar). Şematik. */
function gozenekler(tohum: number, adet: number, enR: number, cokR: number, duvar: number) {
  const r = lcg(tohum);
  const g: { x: number; y: number; r: number }[] = [];
  for (let deneme = 0; deneme < 4000 && g.length < adet; deneme++) {
    const yr = enR + r() * (cokR - enR);
    const x = 30 + r() * 240;
    const y = 50 + r() * 150;
    const icinde = ((x - 150) / (120 - yr)) ** 2 + ((y - 128) / (78 - yr)) ** 2 < 1;
    if (icinde && g.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + yr + duvar)) g.push({ x, y, r: yr });
  }
  return g;
}
const AZ = gozenekler(3, 13, 11, 21, 8);
const UYGUN = gozenekler(9, 70, 3.5, 8, 2.5);

function direnc(t: number, u: Un) {
  return t <= u.tepe ? 0.12 + 0.88 * (1 - (1 - t / u.tepe) ** 2) : 1 - 0.5 * ((t - u.tepe) / (SON - u.tepe)) ** 0.9;
}
/** Köprülerin kopma sırası (karışık). */
const KOPMA_SIRA = [3, 7, 1, 9, 5, 0, 8, 2, 6, 4];

const kx = (t: number) => 26 + (t / SON) * 284;
const ky = (r: number) => 126 - r * 98;

function iz(t: number, u: Un) {
  let d = `M${kx(0)} ${ky(direnc(0, u))}`;
  for (let x = 0.2; x < t; x += 0.2) d += `L${kx(x).toFixed(1)} ${ky(direnc(x, u)).toFixed(1)}`;
  return t > 0 ? `${d}L${kx(t).toFixed(1)} ${ky(direnc(t, u)).toFixed(1)}` : d;
}

function evreAdi(t: number, u: Un) {
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
    <svg
      className={s.hamurSema}
      viewBox="0 0 160 110"
      aria-hidden="true"
      style={{ "--dx": dx, "--sx": 1 + cok * 0.14, "--sy": 1 - cok * 0.24 } as CSSProperties}
    >
      <ellipse cx="80" cy="58" rx="72" ry="44" className={s.hamurGovde} />
      {AG.map((tel, i) => {
        if (i >= gorunen) return null;
        const [x1, y1] = tel.a;
        const [x2, y2] = tel.b;
        if (tel.kopmaSira < kopan) {
          const ax = x1 + (x2 - x1) * 0.4;
          const ay = y1 + (y2 - y1) * 0.4;
          const bx = x1 + (x2 - x1) * 0.6;
          const by = y1 + (y2 - y1) * 0.6;
          return <path key={i} d={`M${x1} ${y1}L${ax} ${ay}M${bx} ${by}L${x2} ${y2}`} className={s.telKopuk} />;
        }
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={s.tel} />;
      })}
    </svg>
  );
}

export function YogurmaTezgahi({ ust, baslik, soru, gorsel, metin, children }: YogurmaTezgahiProps) {
  const kok = useRef<HTMLDivElement>(null);
  useSahneIlerleme(kok);
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
    const d = e.clientX - z.x;
    z.x = e.clientX;
    if (d) setDk((m) => Math.min(SON, m + Math.abs(d) / PX_DK));
    setDx(Math.max(-60, Math.min(60, e.clientX - z.ilk)));
  }
  function birak() {
    surtme.current = null;
    setDx(0);
  }
  function tus(e: KeyboardEvent<HTMLDivElement>) {
    const tam = Math.floor(dk);
    const yeni =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? tam + 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? Math.ceil(dk) - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? SON
              : null;
    if (yeni === null) return;
    e.preventDefault();
    setDk(Math.min(SON, Math.max(0, yeni)));
  }

  const dakika = Math.floor(dk);

  return (
    <div ref={kok}>
      <Link href="/bilim" className={s.geri}>
        ← Levha dizini
      </Link>

      <section className={`${s.sahne} ${s.acilis}`} data-sahne style={{ height: "130svh" }}>
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.kapak.src} alt={gorsel.kapak.alt} fill sizes="100vw" priority />
          </div>
          <div className={s.ortu} />
          <div className={s.yazi}>
            <p className={s.ust}>{ust}</p>
            <h1 className={s.h1}>{baslik}</h1>
            <p className={s.soru}>{soru}</p>
            <span className={s.kunye}>{gorsel.kapak.kunye}</span>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "340svh" }} aria-label="Ağ örülür">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.orguFon}`}>
            <Image src={gorsel.gluten.src} alt={gorsel.gluten.alt} fill sizes="100vw" />
          </div>
          <div className={`${s.dolgu} ${s.orguFon} ${s.orguIkinci}`}>
            <Image src={gorsel.nisasta.src} alt={gorsel.nisasta.alt} fill sizes="100vw" />
          </div>
          <svg className={s.orgu} viewBox="0 0 300 300" aria-hidden="true">
            <rect width="300" height="300" className={s.orguZemin} />
            {COZGU.map((x, i) => (
              <path key={i} d={`M${x} 0Q${x + 6} 37.5 ${x} 75T${x} 150T${x} 225T${x} 300`} className={s.cozgu} style={{ "--i": i } as CSSProperties} />
            ))}
            {ATKI_YOL.map((d, j) => (
              <g key={j} className={s.atki} data-ters={j % 2 === 1 || undefined} style={{ "--j": j } as CSSProperties}>
                <path d={d} className={s.atkiGolge} />
                <path d={d} />
              </g>
            ))}
            {ORGU_TANE.map((t, k) => (
              <circle key={k} cx={t.x} cy={t.y} r={t.r} className={s.orguTane} style={{ "--k": k } as CSSProperties} />
            ))}
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Ağ</b>Su ve un buluşur
              </p>
              <p>{metin.ag}</p>
              <span className={s.kunye}>{gorsel.gluten.kunye}</span>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Örgü</b>Hem akar hem esner
              </p>
              <p>{metin.aile}</p>
              <p>{metin.denge}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gövde</b>Gözlere nişasta oturur
              </p>
              <p>{metin.kompozit}</p>
              <span className={s.kunye}>{gorsel.nisasta.kunye}</span>
              <span className={s.kunye}>Örgü çizimi şematik.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.yogur} aria-labelledby="yogur-baslik">
        <h2 id="yogur-baslik">Yoğur</h2>
        <p className={s.not}>Hamuru sağa sola sürt. İki un aynı anda yoğruluyor; ağ nerede kuruluyor, nerede kopuyor, izle.</p>
        <div
          className={s.tezgah}
          role="slider"
          tabIndex={0}
          aria-label="Yoğurma süresi. Hamuru sağa sola sürükle ya da ok tuşlarını kullan."
          aria-valuemin={0}
          aria-valuemax={SON}
          aria-valuenow={dakika}
          aria-valuetext={`${dakika}. dakika`}
          onPointerDown={bas}
          onPointerMove={sur}
          onPointerUp={birak}
          onPointerCancel={birak}
          onKeyDown={tus}
        >
          <span className={s.tezgahDakika}>
            dakika <b>{dakika}</b>
          </span>
          <div className={s.hamurlar}>
            {UNLAR.map((u) => (
              <figure key={u.ad} className={s.hamurKutu}>
                <Hamur u={u} t={dk} dx={dx} />
                <figcaption>{u.ad}</figcaption>
              </figure>
            ))}
          </div>
          {dk === 0 && <span className={s.surtIpucu}>⟵ sürt ⟶</span>}
        </div>

        <svg className={s.kayit} viewBox="0 0 320 150" aria-hidden="true">
          {[0, 4, 8, 12, 16, 20].map((t) => (
            <g key={t}>
              <line x1={kx(t)} x2={kx(t)} y1={22} y2={128} className={s.kayitIzgara} />
              <text x={kx(t)} y={144} textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          <text x={4} y={20} className={s.kayitBaslik}>
            direnç
          </text>
          <line x1={kx(dk)} x2={kx(dk)} y1={18} y2={128} className={s.kayitImlec} />
          {UNLAR.map((u, i) => (
            <g key={u.ad} data-dusuk={i === 1 || undefined} className={s.kayitIz}>
              <path d={iz(dk, u)} />
              {[u.gelisme, u.tepe, u.cokme].map((t) =>
                dk >= t ? (
                  <g key={t}>
                    <circle cx={kx(t)} cy={ky(direnc(t, u))} r={3.2} />
                    <text x={kx(t)} y={ky(direnc(t, u)) + (i === 0 ? -7 : 14)} textAnchor="middle">
                      {t}
                    </text>
                  </g>
                ) : null
              )}
            </g>
          ))}
        </svg>

        <ul className={s.evreListe} aria-live="polite">
          {UNLAR.map((u, i) => (
            <li key={u.ad}>
              <span className={s.izOrnek} data-dusuk={i === 1 || undefined} />
              <span>
                <b>{u.ad}</b> · son ulaşılan evre: {evreAdi(dk, u)}
              </span>
            </li>
          ))}
        </ul>

        <div className={s.dokDugmeler}>
          <button type="button" className={s.ikincilDugme} onClick={() => setDk(EVRELER.find((e) => e > dk + 1e-6) ?? SON)}>
            Sonraki evre
          </button>
          <button type="button" className={s.ikincilDugme} onClick={() => setDk(0)}>
            Baştan
          </button>
        </div>
        <p className={s.kunye}>
          Evre dakikaları aynı yoğurucuda ölçüldü. Direnç eğrisinin biçimi, hamurdaki ağ, çökme ve sürtme hızı şematik.
        </p>
        <p style={{ marginTop: 14 }}>{metin.direnc}</p>
        <p style={{ marginTop: 10 }}>{metin.evre}</p>
      </section>

      <section className={`${s.sahne} ${s.kopruSahne}`} data-sahne style={{ height: "340svh" }} aria-label="Köprüler kopar">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.kopruFon}`}>
            <Image src={gorsel.tepe.src} alt={gorsel.tepe.alt} fill sizes="100vw" />
          </div>
          <svg className={s.kopru} viewBox="0 0 300 170" aria-hidden="true">
            {[40, 110].map((y) => (
              <g key={y}>
                {[0, 1, 2, 3, 4].map((j) => (
                  <rect
                    key={j}
                    x={14 + j * 56}
                    y={y - 9}
                    width={44}
                    height={18}
                    rx={9}
                    className={s.altBirim}
                  />
                ))}
              </g>
            ))}
            {[
              ...[0, 1, 2, 3].flatMap((j) => [40, 110].map((y) => ({ x: 14 + j * 56 + 50, y, dik: false }))),
              ...[1, 3].map((j) => ({ x: 14 + j * 56 + 22, y: 75, dik: true })),
            ].map((k, i) => (
              <g key={i} className={s.kukurt} data-dik={k.dik || undefined} style={{ "--i": KOPMA_SIRA[i] } as CSSProperties}>
                <line x1={k.dik ? k.x : k.x - 6} y1={k.dik ? k.y - 26 : k.y} x2={k.dik ? k.x : k.x + 6} y2={k.dik ? k.y + 26 : k.y} />
                <circle cx={k.dik ? k.x : k.x - 4} cy={k.dik ? k.y - 13 : k.y} r={4.5} data-yon="-1" />
                <circle cx={k.dik ? k.x : k.x + 4} cy={k.dik ? k.y + 13 : k.y} r={4.5} data-yon="1" />
              </g>
            ))}
            <text x={150} y={162} textAnchor="middle" className={s.kopruEtiket}>
              S–S: disülfit köprüsü
            </text>
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>İskelet</b>Köprülerle bağlı
              </p>
              <p>{metin.iskelet}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Tepe</b>Sonra kopuş
              </p>
              <p>{metin.kopma}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.gaz}</p>
              <span className={s.kunye}>{gorsel.tepe.kunye}</span>
              <span className={s.kunye}>Alt birim ve köprü çizimi şematik.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "240svh" }} aria-label="Gözenekler">
        <div className={`${s.sabit} ${s.gozenekSahne}`}>
          <p className={s.gozenekEtiket}>
            <span data-a>Az yoğrulmuş</span>
            <span data-b>En uygun sürede yoğrulmuş</span>
          </p>
          <svg className={s.kesit} viewBox="0 0 300 220" aria-hidden="true">
            <defs>
              <clipPath id="yogurma-kesit">
                <ellipse cx="150" cy="128" rx="120" ry="78" />
              </clipPath>
            </defs>
            <ellipse cx="150" cy="128" rx="124" ry="82" className={s.kesitKabuk} />
            <ellipse cx="150" cy="128" rx="120" ry="78" className={s.kesitIc} />
            <g clipPath="url(#yogurma-kesit)">
              <g className={s.kesitA}>
                {AZ.map((g, i) => (
                  <circle key={i} cx={g.x} cy={g.y} r={g.r} />
                ))}
              </g>
              <g className={s.kesitB}>
                {UYGUN.map((g, i) => (
                  <circle key={i} cx={g.x} cy={g.y} r={g.r} />
                ))}
              </g>
            </g>
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gözenek</b>Gövde ekmeğe yansır
              </p>
              <p>{metin.gozenek}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.hacim}</p>
              <span className={s.kunye}>Kesit çizimi şematik.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="sure-baslik">
        <h2 id="sure-baslik">Süre una göre</h2>
        <div className={s.sureler}>
          {UNLAR.map((u, i) => (
            <div key={u.ad} className={s.sureSatir}>
              <span>
                {u.ad} · gelişme, tepe kıvam, çökme
                <b>
                  {u.gelisme} · {u.tepe} · {u.cokme}. dk
                </b>
              </span>
              <span className={s.sureHat}>
                <span className={s.sureDolu} data-dusuk={i === 1 || undefined} style={{ "--a": 0, "--b": u.cokme / 60 } as CSSProperties} />
                {[u.gelisme, u.tepe].map((t) => (
                  <span key={t} className={s.sureCentik} style={{ "--a": t / 60 } as CSSProperties} />
                ))}
              </span>
            </div>
          ))}
          <div className={s.sureSatir}>
            <span>
              CWRS buğdayı · rafine un<b>{YOGURMA.cwrs.rafine} dk</b>
            </span>
            <span className={s.sureHat}>
              <span className={s.sureDolu} style={{ "--a": 0, "--b": sayi(YOGURMA.cwrs.rafine) / 60 } as CSSProperties} />
            </span>
          </div>
          <div className={s.sureSatir}>
            <span>
              CWRS buğdayı · tam buğday unu<b>{YOGURMA.cwrs.tam} dk</b>
            </span>
            <span className={s.sureHat}>
              <span className={s.sureDolu} style={{ "--a": 0, "--b": sayi(YOGURMA.cwrs.tam) / 60 } as CSSProperties} />
            </span>
          </div>
          <div className={s.sureSatir}>
            <span>
              Geleneksel Tokat ekmeği · {YOGURMA.tokat.sicaklik} °C
              <b>
                {YOGURMA.tokat.en}–{YOGURMA.tokat.cok} dk
              </b>
            </span>
            <span className={s.sureHat}>
              <span className={s.sureDolu} style={{ "--a": YOGURMA.tokat.en / 60, "--b": YOGURMA.tokat.cok / 60 } as CSSProperties} />
            </span>
          </div>
          <p className={s.sureEksen} aria-hidden="true">
            {[0, 15, 30, 45, 60].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>
        <p className={s.kunye}>
          Ölçek dakika. İlk iki satır aynı yoğurucuda ölçüldü; öbürleri ayrı kaynaklardan. Çentikler gelişme ve tepe kıvam dakikası.
        </p>
        <p style={{ marginTop: 14 }}>{metin.cwrs}</p>
        <p style={{ marginTop: 10 }}>{metin.tokat}</p>
      </section>

      {children}
    </div>
  );
}
