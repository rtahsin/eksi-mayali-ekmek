"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { asitlikZemini } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import s from "./bilim.module.css";

// "Ekşi mayanın ilk 10 günü" bayrak sahnesi: kaydırma, kavanozun saatidir.
// Gün cetveli kaydırmayla ilerler ve olayları damgalar; sayfanın zemini asitliğin yönünde renk değiştirir;
// kapanışta cetvel okura geçer (gün kaydırıcısı). Hareket azaltıldığında sahneler durağan, cetvel ve renk çalışır.

export interface Gorselli {
  src: string;
  alt: string;
  kunye: ReactNode;
}

export interface IlkOnGunProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<"kase" | "mercek" | "gun1" | "kabarma" | "devirSol" | "devirSag", Gorselli>;
  metin: Record<"mercek" | "gun1a" | "gun1b" | "kabarma" | "devirA" | "devirB" | "denge", ReactNode>;
  serit: Gorselli[];
  olaylar: readonly { gun: number; ad: string }[];
  durumlar: { gun: number; ad: string; metin: ReactNode; gorsel: Gorselli }[];
  children?: ReactNode;
}

const GUNLER = Array.from({ length: 11 }, (_, i) => i);

export function IlkOnGun({ ust, baslik, soru, gorsel, metin, serit, olaylar, durumlar, children }: IlkOnGunProps) {
  const kok = useRef<HTMLDivElement>(null);
  const cetvel = useRef<HTMLElement>(null);
  const gunYazi = useRef<HTMLSpanElement>(null);
  const olayYazi = useRef<HTMLSpanElement>(null);
  const seritRef = useRef<HTMLDivElement>(null);
  const kapanis = useRef<HTMLElement>(null);
  const [secili, setSecili] = useState(10);

  function zemin(g: number) {
    kok.current?.closest<HTMLElement>("[data-oda]")?.style.setProperty("--zemin", asitlikZemini(g));
  }

  useSahneIlerleme(kok, (olcum) => {
    const vh = window.innerHeight;
    const kapanista = (kapanis.current?.getBoundingClientRect().top ?? vh) < vh * 0.6;
    cetvel.current?.classList.toggle(s.gizli, kapanista);
    if (kapanista) return;
    let gun = 0;
    for (const o of olcum) {
      const [a, b] = (o.el.dataset.gun ?? "0 0").split(" ").map(Number);
      if (o.ust <= vh * 0.5) gun = a + (b - a) * o.p;
    }
    zemin(gun);
    cetvel.current?.style.setProperty("--gun", gun.toFixed(3));
    if (gunYazi.current) gunYazi.current.textContent = `Gün ${Math.floor(gun + 0.001)}`;
    const olay = olaylar.filter((o) => gun + 0.001 >= o.gun).pop();
    if (olayYazi.current) olayYazi.current.textContent = olay?.ad ?? "";
    cetvel.current?.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      b.classList.toggle(s.damga, gun + 0.001 >= Number(b.dataset.gun));
    });
  });

  useEffect(() => {
    const el = seritRef.current;
    if (!el) return;
    const olc = () => el.style.setProperty("--genislik", `${el.scrollWidth}px`);
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, []);

  function gunuAc(g: number) {
    const sahneler = Array.from(kok.current?.querySelectorAll<HTMLElement>("[data-sahne]") ?? []);
    const hedef =
      sahneler.find((x) => {
        const [a, c] = (x.dataset.gun ?? "0 0").split(" ").map(Number);
        return c > a && g >= a && g <= c;
      }) ?? sahneler[0];
    if (!hedef) return;
    const [a, c] = (hedef.dataset.gun ?? "0 0").split(" ").map(Number);
    const p = c > a ? (g - a) / (c - a) : 0;
    const ust = hedef.getBoundingClientRect().top + window.scrollY;
    const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: ust + p * (hedef.offsetHeight - window.innerHeight), behavior: azalt ? "auto" : "smooth" });
  }

  const durum = durumlar.filter((d) => secili >= d.gun).pop() ?? durumlar[0];

  return (
    <div ref={kok} className={s.cetvelli}>
      <Link href="/bilim" className={s.geri}>
        ← Levha dizini
      </Link>

      <section className={`${s.sahne} ${s.acilis}`} data-sahne data-gun="0 0" style={{ height: "130svh" }}>
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.kase.src} alt={gorsel.kase.alt} fill sizes="100vw" priority />
          </div>
          <div className={s.halka} aria-hidden="true" />
          <div className={s.ortu} />
          <div className={s.yazi}>
            <p className={s.ust}>{ust}</p>
            <h1 className={s.h1}>{baslik}</h1>
            <p className={s.soru}>{soru}</p>
            <span className={s.kunye}>{gorsel.kase.kunye}</span>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne data-gun="0 1" style={{ height: "240svh" }} aria-label="Mercek">
        <div className={s.sabit}>
          <div className={s.mercekAlt}>
            <Image src={gorsel.kase.src} alt="" fill sizes="100vw" />
          </div>
          <div className={s.mercekIc}>
            <Image src={gorsel.mercek.src} alt={gorsel.mercek.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={s.adim} style={{ minHeight: "140svh" }} />
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gün 0</b>Un ve su
              </p>
              <p>{metin.mercek}</p>
              <span className={s.kunye}>{gorsel.mercek.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne data-gun="1 2" aria-label="Birinci gün">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.gun1.src} alt={gorsel.gun1.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.sagda}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gün 1</b>Kalabalık
              </p>
              <p>{metin.gun1a}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.sagda}`}>
            <div className={s.kart}>
              <p>{metin.gun1b}</p>
              <span className={s.kunye}>{gorsel.gun1.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.kabarma}`} data-sahne data-gun="2 3" style={{ height: "170svh" }} aria-label="İkinci ve üçüncü gün">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.kabarma.src} alt={gorsel.kabarma.alt} fill sizes="100vw" />
          </div>
          <p className={s.vurgu} aria-hidden="true">
            Kabarıyor. Peki kabartan kim?
          </p>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.ustte}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gün 2–3</b>Sahte kabarma
              </p>
              <p>{metin.kabarma}</p>
              <span className={s.kunye}>{gorsel.kabarma.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne data-gun="3 5" style={{ height: "340svh" }} aria-label="Üçüncü ile beşinci gün arası">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.devirSol.src} alt={gorsel.devirSol.alt} fill sizes="100vw" />
          </div>
          <div className={`${s.dolgu} ${s.devirSag}`}>
            <Image src={gorsel.devirSag.src} alt={gorsel.devirSag.alt} fill sizes="100vw" />
          </div>
          <div className={s.ayirici} aria-hidden="true" />
          <span className={`${s.taraf} ${s.tarafSol}`}>İlk günler</span>
          <span className={`${s.taraf} ${s.tarafSag}`}>5. gün</span>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`} style={{ minHeight: "120svh" }}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gün 3–5</b>Devir
              </p>
              <p>{metin.devirA}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.devirB}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <span className={s.kunye}>Sol: {gorsel.devirSol.kunye}</span>
              <span className={s.kunye}>Sağ: {gorsel.devirSag.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne data-gun="5 10" style={{ height: "260svh" }} aria-label="Altıncı günden onuncu güne">
        <div className={s.sabit}>
          <div ref={seritRef} className={s.seritYatay}>
            {serit.map((g) => (
              <figure key={g.src}>
                <div className={s.seritResim}>
                  <Image src={g.src} alt={g.alt} fill sizes="(min-width: 900px) 520px, 78vw" />
                </div>
                <figcaption className={s.kunye}>{g.kunye}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`} style={{ minHeight: "160svh" }}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Gün 6–10</b>Denge
              </p>
              <p>{metin.denge}</p>
            </div>
          </div>
        </div>
      </section>

      <section ref={kapanis} className={s.kapanis} aria-labelledby="oynat-baslik">
        <div>
          <h2 id="oynat-baslik">On günü sen oynat</h2>
          <label htmlFor="gun-kaydirici" className={s.not}>
            Gün seç
          </label>
          <input
            id="gun-kaydirici"
            className={s.kaydirici}
            type="range"
            min={0}
            max={10}
            step={1}
            value={secili}
            onChange={(e) => {
              const g = Number(e.target.value);
              setSecili(g);
              zemin(g);
            }}
          />
          <div className={s.cizelge} aria-hidden="true">
            {GUNLER.map((g) => (
              <span key={g}>{g}</span>
            ))}
          </div>
          <p className={s.durum} aria-live="polite">
            Gün {secili} · {durum.ad}
          </p>
          <p>{durum.metin}</p>
          <p className={s.not} style={{ marginTop: 12 }}>
            Zeminin rengi asitliğin arttığı yönü gösterir; ölçülmüş bir pH değeri değildir.
          </p>
        </div>
        <div>
          <div className={s.oynatResim}>
            <Image src={durum.gorsel.src} alt={durum.gorsel.alt} fill sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
          <span className={s.kunye} style={{ marginTop: 8 }}>
            {durum.gorsel.kunye}
          </span>
        </div>
      </section>

      {children}

      <nav ref={cetvel} className={s.cetvel} aria-label="Gün cetveli">
        <div className={s.okuma}>
          <span ref={gunYazi}>Gün 0</span>
          <span ref={olayYazi}>{olaylar[0]?.ad}</span>
        </div>
        <div className={s.hat}>
          <div className={s.tum} />
          <div className={s.dolu} />
          {GUNLER.map((g) => (
            <button
              key={g}
              type="button"
              data-gun={g}
              style={{ "--d": g } as CSSProperties}
              aria-label={`Gün ${g}`}
              onClick={() => gunuAc(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
