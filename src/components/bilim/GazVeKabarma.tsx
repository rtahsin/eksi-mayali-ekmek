"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { GAZ } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Kabarırken doğan gaz ve koku" bayrak sahnesi. İmza: şekeri ver. Okur şekerleri maya hücresine sürükler;
// glukoz ve fruktoz hamurda durdukça maltoz geri döner. Her alınan şekerle aynı ürünler yanar: gaz da koku da aynı dönüşümden.
// Kavanozdaki kabarma ve kabarcıklar şematiktir.

export interface GazVeKabarmaProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof GAZ.gorseller, Gorselli>;
  metin: Record<
    | "hucre"
    | "gliserol"
    | "kabarma"
    | "baski"
    | "tukenme"
    | "maltoz"
    | "ayni"
    | "ag"
    | "reoloji"
    | "hacim"
    | "genlesme"
    | "sonGaz"
    | "ehrlich"
    | "ehrlichUc"
    | "etkin"
    | "tdel"
    | "ester"
    | "pisirme",
    ReactNode
  >;
  children?: ReactNode;
}

type Seker = (typeof GAZ.sekerler)[number];
const BASLANGIC: Seker[] = ["glukoz", "maltoz", "fruktoz", "maltoz", "glukoz", "maltoz", "fruktoz", "maltoz", "maltoz"];

function lcg(tohum: number) {
  let x = tohum;
  return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** Kavanozdaki kabarcıklar: her alınan şeker üç kabarcık ekler (şematik). */
const KABARCIK = (() => {
  const r = lcg(21);
  return Array.from({ length: BASLANGIC.length * 3 }, () => ({ x: 12 + r() * 76, y: 8 + r() * 84, r: 2.5 + r() * 4 }));
})();

const IZGARA = Array.from({ length: 100 }, (_, i) => i);
const KAT = Number(GAZ.hacimKat.replace(",", "."));

export function GazVeKabarma({ ust, baslik, soru, gorsel, metin, children }: GazVeKabarmaProps) {
  const kok = useRef<HTMLDivElement>(null);
  useSahneIlerleme(kok);
  const hucre = useRef<HTMLDivElement>(null);
  const [kalan, setKalan] = useState<(Seker | null)[]>(BASLANGIC);
  const [geri, setGeri] = useState<number | null>(null);
  const [baskiGoruldu, setBaskiGoruldu] = useState(false);
  const [durum, setDurum] = useState("");
  const [surukle, setSurukle] = useState<{ i: number; x0: number; y0: number; dx: number; dy: number } | null>(null);

  const verilen = kalan.filter((k) => k === null).length;
  const gfKaldi = kalan.some((k) => k === "glukoz" || k === "fruktoz");
  const bitti = verilen === BASLANGIC.length;

  function ver(i: number) {
    const k = kalan[i];
    if (!k) return;
    if (k === "maltoz" && gfKaldi) {
      setGeri(i);
      setBaskiGoruldu(true);
      setDurum("Maltoz geri döndü.");
      window.setTimeout(() => setGeri((g) => (g === i ? null : g)), 600);
      return;
    }
    setKalan((l) => l.map((x, j) => (j === i ? null : x)));
    setDurum(`Hücre ${k}u aldı.`);
  }

  function bas(e: PointerEvent<HTMLButtonElement>, i: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSurukle({ i, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 });
  }
  function sur(e: PointerEvent<HTMLButtonElement>) {
    setSurukle((d) => (d ? { ...d, dx: e.clientX - d.x0, dy: e.clientY - d.y0 } : d));
  }
  function birak(e: PointerEvent<HTMLButtonElement>) {
    const d = surukle;
    setSurukle(null);
    if (!d) return;
    const r = hucre.current?.getBoundingClientRect();
    const dokunma = Math.hypot(d.dx, d.dy) < 8;
    const icinde = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (dokunma || icinde) ver(d.i);
  }

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

      <section className={s.sahne} data-sahne style={{ height: "240svh" }} aria-label="Maya hücresi">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.hucreYakin}`}>
            <Image src={gorsel.hucre.src} alt={gorsel.hucre.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Hücre</b>Şekerden ne çıkar
              </p>
              <p>{metin.hucre}</p>
              <span className={s.kunye}>{gorsel.hucre.kunye}</span>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gliserol</b>Hücrenin su dengesi
              </p>
              <p>{metin.gliserol}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.imza} aria-labelledby="seker-baslik">
        <h2 id="seker-baslik">Şekeri ver</h2>
        <p className={s.not}>Şekerleri maya hücresine sürükle ya da dokun. Hamurda hangi şeker önce gidiyor, izle.</p>
        <div className={s.sekerMasa}>
          <div ref={hucre} className={s.mayaHucre} data-geri={geri !== null || undefined}>
            <div className={s.mayaResim} key={verilen}>
              <Image src={gorsel.hucre.src} alt="" fill sizes="40vw" />
            </div>
            <span>maya hücresi</span>
          </div>
          <div className={s.kavanoz} aria-hidden="true">
            <div className={s.kavanozHamur} style={{ "--h": (1 + (verilen / BASLANGIC.length) * 1.4) / 2.6 } as CSSProperties}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                {KABARCIK.slice(0, verilen * 3).map((k, i) => (
                  <ellipse key={i} cx={k.x} cy={k.y} rx={k.r} ry={k.r * 0.7} />
                ))}
              </svg>
            </div>
            <span>hamur</span>
          </div>
        </div>
        <ul className={s.sekerler} aria-label="Hamurdaki şekerler">
          {kalan.map((k, i) =>
            k ? (
              <li key={i}>
                <button
                  type="button"
                  className={s.seker}
                  data-tur={k}
                  data-geri={geri === i || undefined}
                  data-surukleniyor={surukle?.i === i || undefined}
                  style={surukle?.i === i ? ({ "--dx": `${surukle.dx}px`, "--dy": `${surukle.dy}px` } as CSSProperties) : undefined}
                  aria-label={`${k}: hücreye ver`}
                  onPointerDown={(e) => bas(e, i)}
                  onPointerMove={sur}
                  onPointerUp={birak}
                  onPointerCancel={() => setSurukle(null)}
                  onClick={(e) => {
                    if (e.detail === 0) ver(i);
                  }}
                >
                  {k}
                </button>
              </li>
            ) : (
              <li key={i} className={s.sekerBos} aria-hidden="true" />
            )
          )}
        </ul>
        <ul className={s.urunler} aria-label="Ürünler">
          {GAZ.urunler.map((u) => (
            <li key={`${u}-${verilen}`} data-acik={verilen > 0 || undefined}>
              {u}
            </li>
          ))}
        </ul>
        <p className={s.kunye}>
          Kavanozdaki kabarma ve kabarcıklar şematik. Ürün adları alkollü fermantasyonun kütüphanedeki tanımından; miktar gösterilmez.
        </p>
        <div aria-live="polite">
          {durum && <p className={s.durum}>{durum}</p>}
          {baskiGoruldu && <p style={{ marginTop: 6 }}>{metin.baski}</p>}
          {!gfKaldi && <p style={{ marginTop: 10 }}>{metin.tukenme}</p>}
          {bitti && (
            <>
              <p style={{ marginTop: 10 }}>{metin.maltoz}</p>
              <p className={s.sekerHukum}>{metin.ayni}</p>
            </>
          )}
        </div>
        {verilen > 0 && (
          <button
            type="button"
            className={s.ikincilDugme}
            style={{ marginTop: 14 }}
            onClick={() => {
              setKalan(BASLANGIC);
              setBaskiGoruldu(false);
              setDurum("");
            }}
          >
            Baştan
          </button>
        )}
        <p style={{ marginTop: 14 }}>{metin.kabarma}</p>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "440svh" }} aria-label="Gazı tutan ağ">
        <div className={`${s.sabit} ${s.gazSahne}`}>
          <div className={s.katSutun} aria-hidden="true">
            <div className={s.katDolu} style={{ "--kat": KAT } as CSSProperties} />
            {[1, 2, 3, 4].map((k) => (
              <span key={k} className={s.katCizgi} style={{ "--a": k / KAT } as CSSProperties}>
                {k}×
              </span>
            ))}
            <span className={s.katUst}>{GAZ.hacimKat} kat</span>
          </div>
          <div className={s.izgara} aria-hidden="true">
            {IZGARA.map((i) => (
              <span key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Ağ</b>Gazı tutan örgü
              </p>
              <p>{metin.ag}</p>
              <p>{metin.reoloji}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>{GAZ.hacimKat} kat</b>Fermantasyonun sonunda
              </p>
              <p>{metin.hacim}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Fırında</b>Gaz daha da genleşir
              </p>
              <p>{metin.genlesme}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>%{GAZ.sonGazPay}+</b>Somunun çoğu gaz
              </p>
              <p>{metin.sonGaz}</p>
              <span className={s.kunye}>
                Sütun: başlangıç hacmine göre kat. Izgara: 100 kare somun hacmi, dolan {GAZ.sonGazPay} kare gaz payının alt sınırı.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "320svh" }} aria-label="Amino asitten koku">
        <div className={`${s.sabit} ${s.ehrlichSahne}`}>
          <p className={s.ehrlichBaslik}>Ehrlich yolu</p>
          {GAZ.ehrlich.map((e, i) => (
            <div key={e.amino} className={s.cevir} style={{ "--i": i } as CSSProperties}>
              <div className={s.cevirIc}>
                <span className={s.cevirOn}>
                  <small>amino asit</small>
                  {e.amino}
                </span>
                <span className={s.cevirArka}>
                  <small>uçucu bileşik</small>
                  {e.bilesik}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Koku</b>Aynı üretimden
              </p>
              <p>{metin.ehrlich}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.ehrlichUc}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.etkin}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="maya-koku-baslik">
        <h2 id="maya-koku-baslik">Her maya başka kokar</h2>
        <figure className={s.torula}>
          <div className={s.torulaResim}>
            <Image src={gorsel.torula.src} alt={gorsel.torula.alt} fill sizes="(max-width: 700px) 100vw, 40rem" />
          </div>
          <figcaption className={s.kunye}>{gorsel.torula.kunye}</figcaption>
        </figure>
        <p>{metin.tdel}</p>
        <p className={s.not} style={{ marginTop: 14 }}>
          Ticari maya kontrolünden yüksek bulunan esterler
        </p>
        <ul className={s.esterler}>
          {GAZ.esterler.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p>{metin.ester}</p>
        <p style={{ marginTop: 10 }}>{metin.pisirme}</p>
        <figure className={s.torula} style={{ marginTop: 20 }}>
          <div className={s.torulaResim}>
            <Image src={gorsel.tasan.src} alt={gorsel.tasan.alt} fill sizes="(max-width: 700px) 100vw, 40rem" />
          </div>
          <figcaption className={s.kunye}>{gorsel.tasan.kunye}</figcaption>
        </figure>
      </section>

      {children}
    </div>
  );
}
