"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { GECE } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Gece dolapta" bayrak sahnesi. İmza: geceyi çevir. Okur saatin kolunu parmağıyla döndürür; geçen süre iki hamuru
// birlikte yürütür: 35 °C'deki hamur 8 cm'ye 15 dakikada, 5 °C'deki 21 saatte varır. 18. saatte başka deneylerin
// 4 °C ölçümleri belirir. Varış süreleri ölçümdür; kavanozlardaki yükselişin seyri şematiktir.

export interface GeceDolaptaProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof GECE.gorseller, Gorselli>;
  metin: Record<
    | "sicaklik"
    | "dolap"
    | "deney"
    | "sicakVaris"
    | "sogukVaris"
    | "ph"
    | "fitik"
    | "serin"
    | "ikiTur"
    | "ester"
    | "durmaz"
    | "tazelik"
    | "inanc",
    ReactNode
  >;
  children?: ReactNode;
}

const { soguk, sicak, yukseklik } = GECE.deney;
const SON = soguk.saat * 60; // dakika
const TUR = 12 * 60; // saatin bir turu
const OLAYLAR = [
  { dk: sicak.dakika, ad: `${sicak.dakika} dk` },
  { dk: GECE.ph.saat * 60, ad: `${GECE.ph.saat} sa` },
  { dk: SON, ad: `${soguk.saat} sa` },
];
const ISI_BAS = GECE.endustriyel;
const ISI_SON = 2; // soğuyan sahnenin vardığı gösterge (şematik)
const ISI_P = 0.7; // gösterge bu ilerlemede son değerine varır; sonrası kartlara kalır

const BANTLAR = [
  { ad: "Gece dolabı", en: 0, cok: 5 },
  { ad: "Serin ekşi maya fermantasyonu", ...GECE.serin },
  { ad: "Kazachstania humilis · en uygun", ...GECE.khumOptimum },
  { ad: "Ekşi maya bakterileri · en uygun büyüme", ...GECE.labOptimum },
  { ad: "F. sanfranciscensis · en uygun", ...GECE.fsanOptimum },
];
const ISI_EKSEN = 45;

function sure(dk: number) {
  const sa = Math.floor(dk / 60);
  const d = Math.round(dk % 60);
  return sa ? `${sa} sa ${String(d).padStart(2, "0")} dk` : `${d} dk`;
}

function Kavanoz({
  isi,
  maya,
  oran,
  vardi,
}: {
  isi: number;
  maya: number;
  oran: number;
  vardi: boolean;
}) {
  return (
    <figure className={s.geceKavanoz}>
      <div className={s.geceKap}>
        <span className={s.geceCizgi}>{yukseklik} cm</span>
        <div
          className={s.geceHamur}
          style={{ "--h": 0.2 + oran * 0.6 } as CSSProperties}
          data-vardi={vardi || undefined}
        />
      </div>
      <figcaption>
        <b>{isi} °C</b>
        {maya} g maya
      </figcaption>
    </figure>
  );
}

export function GeceDolapta({
  ust,
  baslik,
  soru,
  gorsel,
  metin,
  children,
}: GeceDolaptaProps) {
  const kok = useRef<HTMLDivElement>(null);
  const derece = useRef<HTMLSpanElement>(null);
  useSahneIlerleme(kok, (olcum) => {
    const el = olcum.find((o) => o.el.dataset.isi !== undefined);
    if (el && derece.current)
      derece.current.textContent = String(
        Math.round(ISI_BAS - (ISI_BAS - ISI_SON) * Math.min(1, el.p / ISI_P)),
      );
  });
  const [dk, setDk] = useState(0);
  const kadran = useRef<HTMLDivElement>(null);
  const aci = useRef<number | null>(null);

  function acisi(e: PointerEvent<HTMLDivElement>) {
    const r = kadran.current!.getBoundingClientRect();
    return Math.atan2(
      e.clientY - (r.top + r.height / 2),
      e.clientX - (r.left + r.width / 2),
    );
  }
  function bas(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    aci.current = acisi(e);
  }
  function cevir(e: PointerEvent<HTMLDivElement>) {
    if (aci.current === null) return;
    const a = acisi(e);
    let d = a - aci.current;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    aci.current = a;
    setDk((m) => Math.min(SON, Math.max(0, m + (d / (2 * Math.PI)) * TUR)));
  }
  function tus(e: KeyboardEvent<HTMLDivElement>) {
    const adim: Record<string, number> = {
      ArrowRight: 15,
      ArrowUp: 15,
      ArrowLeft: -15,
      ArrowDown: -15,
      PageUp: 60,
      PageDown: -60,
    };
    let yeni: number | null =
      e.key in adim
        ? dk + adim[e.key]
        : e.key === "Home"
          ? 0
          : e.key === "End"
            ? SON
            : null;
    if (yeni === null) return;
    e.preventDefault();
    yeni = Math.min(SON, Math.max(0, yeni));
    setDk(yeni);
  }

  const dakikaKolu = ((dk % 60) / 60) * 360;
  const saatKolu = ((dk % TUR) / TUR) * 360;
  const sicakVardi = dk >= sicak.dakika;
  const sogukVardi = dk >= SON;
  const dolapOlcum = dk >= GECE.ph.saat * 60;

  return (
    <div ref={kok}>
      <Link href="/bilim" className={s.geri}>
        ← Levha dizini
      </Link>

      <section
        className={`${s.sahne} ${s.acilis}`}
        data-sahne
        style={{ height: "130svh" }}
      >
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image
              src={gorsel.kapak.src}
              alt={gorsel.kapak.alt}
              fill
              sizes="100vw"
              priority
            />
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

      <section
        className={s.sahne}
        data-sahne
        data-isi
        style={{ height: "260svh" }}
        aria-label="Hamur soğur"
      >
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.buz}`}>
            <Image
              src={gorsel.soguk.src}
              alt={gorsel.soguk.alt}
              fill
              sizes="100vw"
            />
          </div>
          <div className={s.buzOrtu} />
          <div className={s.isiOkuma} aria-hidden="true">
            <span>
              <span ref={derece}>{ISI_BAS}</span> °C
            </span>
            <ul>
              <li style={{ "--t": 0 } as CSSProperties}>
                {GECE.endustriyel} °C · endüstriyel fermantasyonda tipik
              </li>
              <li
                style={
                  {
                    "--t": ((ISI_BAS - 30) / (ISI_BAS - ISI_SON)) * ISI_P,
                  } as CSSProperties
                }
              >
                {GECE.mayaOptimum} °C · ekmek mayası için en uygun
              </li>
              <li
                style={
                  {
                    "--t":
                      ((ISI_BAS - GECE.geciktirme) / (ISI_BAS - ISI_SON)) *
                      ISI_P,
                  } as CSSProperties
                }
              >
                {GECE.geciktirme} °C · geciktirmede yaygın
              </li>
              <li
                style={
                  {
                    "--t":
                      ((ISI_BAS - GECE.geciktirme) / (ISI_BAS - ISI_SON)) *
                      ISI_P,
                  } as CSSProperties
                }
              >
                {GECE.dolap} °C · gece dolabı
              </li>
            </ul>
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Isı</b>Bir hız ayarı
              </p>
              <p>{metin.sicaklik}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Dolap</b>Maya yavaşlar
              </p>
              <p>{metin.dolap}</p>
              <span className={s.kunye}>{gorsel.soguk.kunye}</span>
              <span className={s.kunye}>
                Soğuma efekti ve gösterge şematik.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.imza} aria-labelledby="gece-baslik">
        <h2 id="gece-baslik">Geceyi çevir</h2>
        <p className={s.not}>
          Saatin kolunu parmağınla döndür. İki hamur aynı saatte nerede?
        </p>
        <p style={{ margin: "8px 0 14px" }}>{metin.deney}</p>
        <div className={s.geceMasa}>
          <div className={s.kadranKutu}>
            <div
              ref={kadran}
              className={s.kadran}
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
            >
              <svg viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r="94" className={s.kadranYuz} />
                {Array.from({ length: 12 }, (_, i) => (
                  <line
                    key={i}
                    x1="100"
                    y1="12"
                    x2="100"
                    y2={i % 3 === 0 ? 26 : 20}
                    transform={`rotate(${i * 30} 100 100)`}
                    className={s.kadranCentik}
                  />
                ))}
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="52"
                  className={s.saatKolu}
                  transform={`rotate(${saatKolu} 100 100)`}
                />
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="24"
                  className={s.dakikaKolu}
                  transform={`rotate(${dakikaKolu} 100 100)`}
                />
                <circle
                  cx="100"
                  cy="24"
                  r="9"
                  className={s.kolTutamak}
                  transform={`rotate(${dakikaKolu} 100 100)`}
                />
                <circle cx="100" cy="100" r="5" className={s.kolMerkez} />
              </svg>
            </div>
            <span className={s.kadranOkuma}>{sure(dk)}</span>
          </div>
          <Kavanoz
            isi={sicak.sicaklik}
            maya={sicak.maya}
            oran={Math.min(1, dk / sicak.dakika)}
            vardi={sicakVardi}
          />
          <Kavanoz
            isi={soguk.sicaklik}
            maya={soguk.maya}
            oran={dk / SON}
            vardi={sogukVardi}
          />
        </div>
        <div className={s.geceSerit} aria-hidden="true">
          <span
            className={s.geceSeritDolu}
            style={{ "--a": dk / SON } as CSSProperties}
          />
          {OLAYLAR.map((o) => (
            <span
              key={o.dk}
              className={s.geceOlay}
              data-gecti={dk >= o.dk || undefined}
              style={{ "--a": o.dk / SON } as CSSProperties}
            >
              {o.ad}
            </span>
          ))}
        </div>
        <div className={s.dokDugmeler}>
          <button
            type="button"
            className={s.ikincilDugme}
            onClick={() =>
              setDk(OLAYLAR.find((o) => o.dk > dk + 0.5)?.dk ?? SON)
            }
          >
            Sonraki olay
          </button>
          <button
            type="button"
            className={s.ikincilDugme}
            onClick={() => setDk(0)}
          >
            Baştan
          </button>
        </div>
        <p className={s.kunye}>
          Maya miktarı kilogram un başına. Varış süreleri ve {GECE.ph.saat}.
          saatteki ölçümler kütüphaneden; kavanozlardaki yükselişin seyri
          şematik. Bir turda 12 saat.
        </p>
        <div aria-live="polite">
          {sicakVardi && (
            <p className={s.geceOlayMetin}>
              <b>{sicak.dakika} dk</b>
              {metin.sicakVaris}
            </p>
          )}
          {dolapOlcum && (
            <p className={s.geceOlayMetin}>
              <b>
                {GECE.ph.saat} sa · başka deneyler, {GECE.ph.dolap} °C
              </b>
              {metin.ph} {metin.fitik}
            </p>
          )}
          {sogukVardi && (
            <p className={s.geceOlayMetin}>
              <b>{soguk.saat} sa</b>
              {metin.sogukVaris}
            </p>
          )}
        </div>
      </section>

      <section
        className={s.sahne}
        data-sahne
        style={{ height: "300svh" }}
        aria-label="Dolaptaki topluluk"
      >
        <div className={`${s.sabit} ${s.toplulukSahne}`}>
          <div className={`${s.dolgu} ${s.toplulukFon}`}>
            <Image
              src={gorsel.topluluk.src}
              alt={gorsel.topluluk.alt}
              fill
              sizes="100vw"
            />
          </div>
          <div className={s.isiBantlar} aria-hidden="true">
            {BANTLAR.map((b, i) => (
              <div
                key={b.ad}
                className={s.isiBant}
                style={{ "--i": i } as CSSProperties}
              >
                <span>
                  {b.ad}
                  <b>
                    {b.en}–{b.cok} °C
                  </b>
                </span>
                <span className={s.isiHat}>
                  <span
                    style={
                      {
                        "--a": b.en / ISI_EKSEN,
                        "--b": b.cok / ISI_EKSEN,
                      } as CSSProperties
                    }
                  />
                </span>
              </div>
            ))}
            <p className={s.sureEksen}>
              {[0, 15, 30, 45].map((t) => (
                <span key={t}>{t} °C</span>
              ))}
            </p>
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Topluluk</b>Serinde öne çıkanlar
              </p>
              <p>{metin.serin}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.ikiTur}</p>
              <span className={s.kunye}>{gorsel.topluluk.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="sabah-baslik">
        <h2 id="sabah-baslik">Sabaha kalan</h2>
        <p className={s.not}>
          {GECE.geciktirme} °C'de, {GECE.esterKarsi[0]} ve {GECE.esterKarsi[1]}{" "}
          °C'ye göre artan esterler
        </p>
        <ul className={s.esterler}>
          {GECE.esterler.map((e) => (
            <li key={e} data-guclu={e === GECE.esterler[1] || undefined}>
              {e}
              {e === GECE.esterler[1] && (
                <small> · koku etkinlik değeri en yüksek</small>
              )}
            </li>
          ))}
        </ul>
        <p>{metin.ester}</p>
        <p style={{ marginTop: 10 }}>{metin.durmaz}</p>
        <p style={{ marginTop: 10 }}>{metin.tazelik}</p>
        <p style={{ marginTop: 10 }}>{metin.inanc}</p>
      </section>

      {children}
    </div>
  );
}
