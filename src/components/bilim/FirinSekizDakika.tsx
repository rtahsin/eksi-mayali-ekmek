"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { FIRIN_DENEYI } from "@/lib/bilim";
import { useSahneIlerleme, type SahneOlcumu } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Fırının ilk 8 dakikası" bayrak sahnesi: okur fırını ayarlar, kesit o deneyin ölçümleriyle cevap verir.
// Kesitteki bölgelerin yeri ve termometrenin dolması şematiktir; sayılar ve eşikler kütüphanedeki ölçümlerdir.

type GorselAnahtari = keyof typeof FIRIN_DENEYI.gorseller;
type MetinAnahtari =
  | "isi"
  | "tanim"
  | "bolgeler"
  | "yuzey"
  | "hacim"
  | "gozenek"
  | "maya"
  | "gluten1"
  | "gluten2"
  | "buhar1"
  | "buhar2"
  | "karar"
  | "durma";

export interface FirinSekizDakikaProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<GorselAnahtari, Gorselli>;
  metin: Record<MetinAnahtari, ReactNode>;
  children?: ReactNode;
}

type Firin = (typeof FIRIN_DENEYI.firinlar)[number];
const DAKIKA = 8;
const YOLLAR = ["iletim", "taşınım", "ışınım"];

function hacimYuzde(f: Firin, t: number) {
  // 0 ile 3. dakikadaki ölçüm arasında düz çizgi; sonrası çizilmez (180 °C'de 3–6. dakika ölçülmedi)
  return Number(f.hacim3.replace(",", ".")) * (Math.min(t, 3) / 3);
}

export function FirinSekizDakika({ ust, baslik, soru, gorsel, metin, children }: FirinSekizDakikaProps) {
  const kok = useRef<HTMLDivElement>(null);
  const kesit = useRef<HTMLElement>(null);
  const dakikaYazi = useRef<HTMLSpanElement>(null);
  const hacimYazi = useRef<HTMLSpanElement>(null);
  const durumYazi = useRef<HTMLSpanElement>(null);
  const [firinC, setFirinC] = useState<Firin["c"]>(220);
  const firin = FIRIN_DENEYI.firinlar.find((f) => f.c === firinC) ?? FIRIN_DENEYI.firinlar[2];
  const firinRef = useRef(firin);
  useEffect(() => {
    firinRef.current = firin;
  });

  const kesitiCiz = useCallback((p: number) => {
    const el = kesit.current;
    if (!el) return;
    const f = firinRef.current;
    const t = p * DAKIKA;
    const v = hacimYuzde(f, t);
    el.style.setProperty("--t8", (t / DAKIKA).toFixed(3));
    el.style.setProperty("--olcek", Math.cbrt(1 + v / 100).toFixed(4));
    if (dakikaYazi.current) dakikaYazi.current.textContent = `Dakika ${Math.floor(t + 0.001)}`;
    if (hacimYazi.current) {
      hacimYazi.current.textContent =
        t < 3 ? "Hacim: ölçüm 3. dakikada" : `Hacim: +%${f.hacim3} (3. dakika ölçümü)`;
    }
    if (durumYazi.current) {
      durumYazi.current.textContent =
        t < f.durdu ? (t >= 3 ? "Genişleme sürüyor (büyüklüğü ölçülmedi)" : "Genişliyor") : `Genişleme durdu (${f.durdu}. dakika)`;
    }
  }, []);

  useSahneIlerleme(kok, (olcum: SahneOlcumu[]) => {
    const o = olcum.find((x) => x.el === kesit.current);
    if (o) kesitiCiz(o.p);
  });

  useEffect(() => {
    const el = kesit.current;
    if (!el) return;
    const vh = window.innerHeight;
    const r = el.getBoundingClientRect();
    kesitiCiz(Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh))));
  }, [firinC, kesitiCiz]);

  return (
    <div ref={kok}>
      <Link href="/bilim" className={s.geri}>
        ← Levha dizini
      </Link>

      <section className={`${s.sahne} ${s.acilis}`} data-sahne style={{ height: "120svh" }}>
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.kapak.src} alt={gorsel.kapak.alt} fill sizes="100vw" priority />
          </div>
          <div className={s.ortu} />
          <div className={s.yazi}>
            <p className={s.ust}>{ust}</p>
            <h1 className={s.h1}>{baslik}</h1>
            <p className={s.soru}>{soru}</p>
            <fieldset className={s.firinSec}>
              <legend>Fırını kaç dereceye ayarlarsın?</legend>
              {FIRIN_DENEYI.firinlar.map((f) => (
                <button
                  key={f.c}
                  type="button"
                  aria-pressed={f.c === firinC}
                  className={f.c === firinC ? s.secili : undefined}
                  onClick={() => setFirinC(f.c)}
                >
                  {f.c} °C
                </button>
              ))}
            </fieldset>
            <span className={s.kunye}>{gorsel.kapak.kunye}</span>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "200svh" }} aria-label="Isı üç yoldan">
        <div className={`${s.sabit} ${s.kinetik}`}>
          {YOLLAR.map((y, i) => (
            <span key={y} className={s.kelime} style={{ "--i": i } as CSSProperties}>
              {y}
            </span>
          ))}
        </div>
        <div className={s.akis}>
          <div className={s.adim} style={{ minHeight: "120svh" }} />
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Kapak kapanır</b>
                {firinC} °C
              </p>
              <p>{metin.isi}</p>
            </div>
          </div>
        </div>
      </section>

      <section ref={kesit} className={s.sahne} data-sahne style={{ height: "480svh" }} aria-label="Kesit">
        <div className={`${s.sabit} ${s.kesitCerceve}`}>
          <div className={s.okumalar} aria-live="off">
            <span ref={dakikaYazi} className={s.dakika}>
              Dakika 0
            </span>
            <span>Fırın {firin.c} °C</span>
            <span ref={hacimYazi}>Hacim: ölçüm 3. dakikada</span>
            <span ref={durumYazi}>Genişliyor</span>
            <span>Merkez 100 °C&apos;ye {firin.merkez100}. dakikada varır</span>
          </div>
          <div className={`${s.dolgu} ${s.soluk}`}>
            <Image src={gorsel.kesit.src} alt={gorsel.kesit.alt} fill sizes="100vw" />
          </div>
          <div className={s.dakikaCubuk} aria-hidden="true">
            <span className={s.pencere} />
            <span className={s.durma} style={{ "--d": firin.durdu } as CSSProperties} />
            <span className={s.dolum} />
          </div>
          <svg className={s.kesitSvg} viewBox="0 0 400 260" role="img" aria-label="Ekmek kesiti: dış bölge, buharlaşma cephesi ve iç bölge">
            <g className={s.somun}>
              <path className={s.disBolge} d="M40 240 C40 120 120 70 200 70 C280 70 360 120 360 240 Z" />
              <g className={s.cephe}>
                <path d="M40 240 C40 120 120 70 200 70 C280 70 360 120 360 240 Z" />
              </g>
            </g>
          </svg>
          <p className={s.lejant}>
            <span className={s.lejDis}>dış bölge</span>
            <span className={s.lejCephe}>buharlaşma cephesi · ~100 °C</span>
            <span className={s.lejIc}>iç bölge</span>
          </p>
          <p className={s.sema}>
            Çubuk 0–8. dakika; açık bant fırın kabarmasının bittiği 6–8. dakikalar, dik çizgi senin fırınında genişlemenin durduğu dakika.
            Kesit şematiktir, bölgelerin yeri ölçü değildir; sayılar ölçümdür. 3. dakikaya kadarki büyüme yalnız 0 ile ölçümü birleştirir.
          </p>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.tanim}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.bolgeler}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.yuzey}</p>
              <span className={s.kunye}>{gorsel.kesit.kunye}</span>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.hacim}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.gozenek}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.mayaSahne}`} data-sahne style={{ height: "220svh" }} aria-label="Maya ve 50 derece">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.grilesen}`}>
            <Image src={gorsel.maya.src} alt={gorsel.maya.alt} fill sizes="100vw" />
          </div>
          <div className={s.termometre} aria-hidden="true">
            <span className={s.termoDolgu} />
            {FIRIN_DENEYI.esikler.map((e) => (
              <span key={e.c} className={s.esik} style={{ "--c": e.c } as CSSProperties}>
                {e.c} °C · {e.ad}
              </span>
            ))}
          </div>
        </div>
        <div className={s.akis}>
          <div className={s.adim} style={{ minHeight: "120svh" }} />
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>50 °C</b>Mayanın son işi
              </p>
              <p>{metin.maya}</p>
              <span className={s.kunye}>{gorsel.maya.kunye}</span>
              <span className={s.kunye}>Termometre şematik; eşikler ölçümdür.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.yakin}`} data-sahne style={{ height: "220svh" }} aria-label="Gluten ve 90 derece">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.gluten.src} alt={gorsel.gluten.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.ustte}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>90 °C</b>Ağ sıkılaşır
              </p>
              <p>{metin.gluten1}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.gluten2}</p>
              <span className={s.kunye}>{gorsel.gluten.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.buhar}`} data-sahne style={{ height: "240svh" }} aria-label="Buhar zinciri">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.soluk}`}>
            <Image src={gorsel.nisasta.src} alt={gorsel.nisasta.alt} fill sizes="100vw" />
          </div>
          <svg className={s.hucreler} viewBox="0 0 400 140" role="img" aria-label="Gaz hücreleri boyunca buharlaşıp yoğuşan su">
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={40 + i * 80} cy={60} r={32} />
            ))}
            <circle className={s.damla} cx={40} cy={60} r={9} />
            <text x="40" y="122" textAnchor="middle">sıcak taraf</text>
            <text x="360" y="122" textAnchor="middle">soğuk taraf</text>
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>~100 °C</b>Buhar taşır
              </p>
              <p>{metin.buhar1}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.buhar2}</p>
              <span className={s.kunye}>{gorsel.nisasta.kunye}</span>
              <span className={s.kunye}>Hücre çizimi şematik.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="karar-baslik">
        <h2 id="karar-baslik">Senin fırının: {firin.c} °C</h2>
        <table className={s.kararTablo}>
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
            {FIRIN_DENEYI.firinlar.map((f) => (
              <tr key={f.c} className={f.c === firin.c ? s.seciliSatir : undefined}>
                <th scope="row">{f.c} °C</th>
                <td>+%{f.hacim3}</td>
                <td>{f.durdu}. dakika</td>
                <td>{f.merkez100}. dakika</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={s.kararCumle}>{metin.karar}</p>
        <p>{metin.durma}</p>
      </section>

      {children}
    </div>
  );
}
