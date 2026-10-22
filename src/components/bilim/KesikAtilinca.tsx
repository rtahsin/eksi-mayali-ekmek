"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { KESIK } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Kesik atılınca" bayrak sahnesi. İmza: kesiği at. Okur hamurun üstüne parmağıyla kesik çizer, sonra fırına verir;
// pişirme saati 900 saniyeye akar, kenar 450 saniyede, eksen 900 saniyede sabitlenir (ölçüm). Somunun büyümesi,
// kesiğin açılması ve rengi şematiktir.

export interface KesikAtilincaProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof KESIK.gorseller, Gorselli>;
  metin: Record<
    | "kisitli"
    | "hizli"
    | "dortOlay"
    | "acilma"
    | "sifir"
    | "kinetik"
    | "kabukOlur"
    | "cephe"
    | "ikiBolge"
    | "nem"
    | "kalinlik"
    | "renk"
    | "sonHacim"
    | "gaz"
    | "efsane",
    ReactNode
  >;
  children?: ReactNode;
}

type Nokta = [number, number];
const SON = KESIK.eksen.sn;
const HIZ = 150; // saniyede pişirme saniyesi (şematik hızlandırma)
const HAZIR: Record<string, Nokta[][]> = {
  "Tek uzun kesik": [
    [
      [72, 116],
      [110, 106],
      [150, 100],
      [190, 94],
      [228, 84],
    ],
  ],
  "Üç çapraz kesik": [
    [
      [80, 120],
      [118, 82],
    ],
    [
      [128, 124],
      [166, 86],
    ],
    [
      [176, 126],
      [214, 88],
    ],
  ],
};

const icinde = ([x, y]: Nokta) =>
  ((x - 150) / 118) ** 2 + ((y - 104) / 68) ** 2 < 1;
const yol = (c: Nokta[]) =>
  c
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("");
const yavas = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 2;

/** Basınç sahnesinin kapalı gözenekleri. */
const GOZ = Array.from({ length: 15 }, (_, i) => ({
  x: 50 + (i % 5) * 50 + (Math.floor(i / 5) % 2) * 22,
  y: 60 + Math.floor(i / 5) * 60,
  i,
}));

/** Sıcaklık cetveli: 95–225 °C. */
const ALT = 95;
const UST = 225;
const konum = (t: number) => ((t - ALT) / (UST - ALT)) * 100;

export function KesikAtilinca({
  ust,
  baslik,
  soru,
  gorsel,
  metin,
  children,
}: KesikAtilincaProps) {
  const kok = useRef<HTMLDivElement>(null);
  useSahneIlerleme(kok);
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
    return [
      ((e.clientX - r.left) / r.width) * 300,
      ((e.clientY - r.top) / r.height) * 200,
    ];
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
    if (icinde(n) && Math.hypot(n[0] - px, n[1] - py) > 3)
      setAktif([...aktif, n]);
  }
  function birak() {
    if (aktif && aktif.length > 2) setCizgiler((c) => [...c, aktif]);
    setAktif(null);
  }

  const kenarOran = yavas(sn / KESIK.kenar.sn);
  const acilma = yavas(sn / SON);
  const renk = Math.min(
    1,
    Math.max(0, (sn - KESIK.kenar.sn) / (SON - KESIK.kenar.sn)),
  );
  const bitti = sn >= SON;

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
        style={{ height: "340svh" }}
        aria-label="Gözeneklerdeki basınç"
      >
        <div className={`${s.sabit} ${s.basincSahne}`}>
          <div className={`${s.dolgu} ${s.basincFon}`}>
            <Image
              src={gorsel.cavdar.src}
              alt={gorsel.cavdar.alt}
              fill
              sizes="100vw"
            />
          </div>
          <div className={s.basincSaat} aria-hidden="true">
            <svg viewBox="0 0 120 70">
              <path d="M10 62A50 50 0 0 1 110 62" className={s.basincYay} />
              <line x1="60" y1="62" x2="60" y2="20" className={s.basincIgne} />
            </svg>
            <span>basınç farkı</span>
          </div>
          <svg className={s.gozenekAg} viewBox="0 0 320 200" aria-hidden="true">
            {GOZ.map((g) => (
              <circle
                key={g.i}
                cx={g.x}
                cy={g.y}
                r={14}
                pathLength={100}
                style={{ "--i": g.i } as CSSProperties}
              />
            ))}
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Basınç</b>Kapalı gözeneklerde buhar
              </p>
              <p>{metin.hizli}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.dortOlay}</p>
              <p>{metin.acilma}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Açılır</b>Basınç sıfıra iner
              </p>
              <p>{metin.sifir}</p>
              <span className={s.kunye}>{gorsel.cavdar.kunye}</span>
              <span className={s.kunye}>
                Gözenek ve gösterge çizimi şematik.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.imza} aria-labelledby="kesik-baslik">
        <h2 id="kesik-baslik">Kesiği at</h2>
        <p className={s.not}>
          Hamurun üstüne parmağınla kesik çiz (en çok dört), sonra fırına ver.
        </p>
        <p style={{ margin: "8px 0 12px" }}>{metin.kisitli}</p>
        <div className={s.kesikMasa}>
          <svg
            ref={tuval}
            className={s.kesikTuval}
            data-ciziliyor={ciziliyor || undefined}
            viewBox="0 0 300 200"
            role="img"
            aria-label={`Hamurun üstten görünüşü, ${cizgiler.length} kesik`}
            onPointerDown={bas}
            onPointerMove={sur}
            onPointerUp={birak}
            onPointerCancel={birak}
          >
            <g
              className={s.somunUst}
              style={
                {
                  "--s": 1 + kenarOran * 0.12,
                  "--r": renk,
                  "--a": acilma,
                } as CSSProperties
              }
            >
              <ellipse
                cx="150"
                cy="104"
                rx="122"
                ry="72"
                className={s.somunGovde}
              />
              {cizgiler.map((c, i) => (
                <g key={i}>
                  <path d={yol(c)} className={s.kesikDis} />
                  <path d={yol(c)} className={s.kesikIc} />
                  <path d={yol(c)} className={s.kesikIz} />
                </g>
              ))}
              {aktif && <path d={yol(aktif)} className={s.kesikIz} />}
            </g>
          </svg>
          <div className={s.firinSaat}>
            <span>
              <b>{Math.round(sn)}</b> sn
            </span>
            {[
              { ad: "kenar", ...KESIK.kenar },
              { ad: "eksen", ...KESIK.eksen },
            ].map((h) => (
              <div key={h.ad} className={s.firinIz}>
                <span>
                  {h.ad} yüksekliği
                  <b data-sabit={sn >= h.sn || undefined}>
                    {sn >= h.sn
                      ? `${h.mm} mm'de sabit`
                      : `${h.sn} sn'de sabitlenir`}
                  </b>
                </span>
                <span className={s.firinHat}>
                  <span
                    className={s.firinDolu}
                    style={{ "--a": sn / SON } as CSSProperties}
                  />
                  <span
                    className={s.firinCentik}
                    style={{ "--a": h.sn / SON } as CSSProperties}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={s.dokDugmeler}>
          <button
            type="button"
            className={s.gosterDugme}
            disabled={piyor || bitti}
            onClick={() => setPiyor(true)}
          >
            Fırına ver
          </button>
          {ciziliyor &&
            Object.entries(HAZIR).map(([ad, c]) => (
              <button
                key={ad}
                type="button"
                className={s.ikincilDugme}
                onClick={() => setCizgiler(c)}
              >
                {ad}
              </button>
            ))}
          {(cizgiler.length > 0 || sn > 0) && (
            <button
              type="button"
              className={s.ikincilDugme}
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
        <p className={s.kunye}>
          Kenar ve eksen yüksekliklerinin sabitlendiği an ve değer ölçüm.
          Somunun büyümesi, kesiğin açılması ve rengi şematik; saat
          hızlandırılmış.
        </p>
        <div aria-live="polite">
          {sn >= KESIK.kenar.sn && (
            <p className={s.durum}>
              {bitti
                ? `${SON} sn: eksen de sabit.`
                : `${KESIK.kenar.sn} sn: kenar sabit, eksen sürüyor.`}
            </p>
          )}
          {bitti && (
            <>
              <p>{metin.kinetik}</p>
              <p className={s.sekerHukum}>{metin.kabukOlur}</p>
            </>
          )}
        </div>
      </section>

      <section
        className={s.sahne}
        data-sahne
        style={{ height: "340svh" }}
        aria-label="Kabuk bağlar"
      >
        <div className={`${s.sabit} ${s.kabukSahne}`}>
          <svg
            className={s.kabukKesit}
            viewBox="0 0 300 180"
            aria-hidden="true"
          >
            <path
              d="M20 160C20 60 80 20 150 20S280 60 280 160Z"
              className={s.kesitIcBolge}
            />
            <path
              d="M20 160C20 60 80 20 150 20S280 60 280 160"
              className={s.kesitKabukBant}
            />
            <path
              d="M20 160C20 60 80 20 150 20S280 60 280 160"
              className={s.cephe}
            />
            <text x="150" y="112" textAnchor="middle" className={s.kesitYazi}>
              iç · ~{KESIK.icSicaklik} °C
            </text>
            <text x="150" y="12" textAnchor="middle" className={s.kesitYazi}>
              kabuk · nem %{KESIK.kabukNem.en}–{KESIK.kabukNem.cok}
            </text>
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Cephe</b>Su dışarı doğru buharlaşır
              </p>
              <p>{metin.cephe}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.ikiBolge}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Kalınlık</b>Kabuk neden kalınlaşır
              </p>
              <p>{metin.nem}</p>
              <p>{metin.kalinlik}</p>
              <span className={s.kunye}>
                Kesit çizimi ve cephenin ilerleyişi şematik.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="cetvel-baslik">
        <h2 id="cetvel-baslik">Yüzeyin sıcaklık cetveli</h2>
        <div className={s.cetvel}>
          <span
            className={s.cetvelBant}
            style={
              {
                "--a": konum(KESIK.esmerlesme.digerleri.en),
                "--b": konum(KESIK.esmerlesme.digerleri.cok),
              } as CSSProperties
            }
          />
          <span
            className={s.cetvelBant}
            data-ideal
            style={
              {
                "--a": konum(KESIK.ideal.en),
                "--b": konum(KESIK.ideal.cok),
              } as CSSProperties
            }
          />
          {[
            { t: KESIK.icSicaklik, ad: "kabuk oluşumu" },
            { t: KESIK.esmerlesme.esas, ad: "esmerleşme başlangıcı · esas alınan" },
            { t: KESIK.renkKosul.sicaklik, ad: "esmerleşme başlangıcı · bildirilen; renk oluşumu için asgari koşul" },
            { t: (KESIK.ideal.en + KESIK.ideal.cok) / 2, etiket: `${KESIK.ideal.en}–${KESIK.ideal.cok} °C`, ad: "ideal kabuk rengi" },
            ...KESIK.ayarlar.map((a) => ({ t: a, ad: "fırın ayarı" })),
          ].map((m: { t: number; ad: string; etiket?: string }) => (
            <span key={`${m.t}-${m.ad}`} className={s.cetvelIsaret} style={{ "--a": konum(m.t) } as CSSProperties}>
              <b>{m.etiket ?? `${m.t} °C`}</b>
              {m.ad}
            </span>
          ))}
        </div>
        <p className={s.kunye}>
          Cetvel {ALT}–{UST} °C. Açık bantlar: bildirilen esmerleşme başlangıcı
          ve ideal renk aralığı.
        </p>
        <p style={{ marginTop: 14 }}>{metin.renk}</p>
        <p style={{ marginTop: 10 }}>{metin.sonHacim}</p>
        <p className={s.gazBuyuk}>
          %{KESIK.gazPay.en}–{KESIK.gazPay.cok}
        </p>
        <p>{metin.gaz}</p>
        <p style={{ marginTop: 10 }}>{metin.efsane}</p>
        <figure className={s.torula} style={{ marginTop: 20 }}>
          <div className={s.torulaResim}>
            <Image
              src={gorsel.somun.src}
              alt={gorsel.somun.alt}
              fill
              sizes="(max-width: 700px) 100vw, 40rem"
            />
          </div>
          <figcaption className={s.kunye}>{gorsel.somun.kunye}</figcaption>
        </figure>
      </section>

      {children}
    </div>
  );
}
