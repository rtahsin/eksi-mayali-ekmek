"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DEGIRMEN } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Değirmen taşında" bayrak sahnesi. İmza: su dök. Okur düğmeye basılı tuttukça iki nişasta tanesine su dökülür;
// sağlam tanenin göstergesi %39–87 bandında durur, kırık tane %200–430 bandına kadar içer.
// Bantlar ölçüm aralığıdır; dolum hızı ve tanelerin şişmesi şematiktir.

export interface DegirmenTasindaProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof DEGIRMEN.gorseller, Gorselli>;
  metin: Record<"tas" | "kuvvet" | "tavlama" | "hasar" | "kristal" | "su" | "suKorelasyon" | "olcum" | "seker" | "olculu" | "dusme", ReactNode>;
  children?: ReactNode;
}

const sayi = (t: string) => Number(t.replace(",", "."));
const OLCEK = 450; // gösterge üst sınırı, ağırlığın yüzdesi
const HIZ = 150; // saniyede dökülen (şematik)
const CATLAKLAR = [
  "M40 30 L95 80 L120 150 L170 190",
  "M260 20 L230 90 L250 140",
  "M300 160 L240 175 L200 230",
  "M60 220 L110 180 L150 200",
  "M180 40 L200 100 L160 130",
];

export function DegirmenTasinda({ ust, baslik, soru, gorsel, metin, children }: DegirmenTasindaProps) {
  const kok = useRef<HTMLDivElement>(null);
  useSahneIlerleme(kok);
  const [dokulen, setDokulen] = useState(0);
  const [akiyor, setAkiyor] = useState(false);
  const son = useRef<number | null>(null);

  useEffect(() => {
    if (!akiyor) return;
    let kare = 0;
    son.current = null;
    const adim = (t: number) => {
      const dt = son.current === null ? 0 : (t - son.current) / 1000;
      son.current = t;
      setDokulen((d) => Math.min(DEGIRMEN.kirik.cok, d + dt * HIZ));
      kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [akiyor]);

  const saglam = Math.min(dokulen, DEGIRMEN.saglam.cok);
  const kirik = dokulen;
  const bitti = dokulen >= DEGIRMEN.kirik.cok;

  function gosterge(ad: string, deger: number, bant: { en: number; cok: number }, kirikMi: boolean) {
    return (
      <div className={s.bardak}>
        <div className={s.taneSema} style={{ "--s": 1 + (deger / DEGIRMEN.kirik.cok) * 0.7 } as CSSProperties} data-kirik={kirikMi || undefined} />
        <div className={s.olcek}>
          <span className={s.bant} style={{ "--a": bant.en / OLCEK, "--b": bant.cok / OLCEK } as CSSProperties} />
          <span className={s.su} style={{ "--h": deger / OLCEK } as CSSProperties} />
        </div>
        <p className={s.bardakAd}>
          {ad}
          <b>
            %{bant.en}–{bant.cok}
          </b>
        </p>
      </div>
    );
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

      <section className={s.sahne} data-sahne style={{ height: "240svh" }} aria-label="Taş döner">
        <div className={`${s.sabit} ${s.tasSahne}`}>
          <div className={s.tasDaire}>
            <Image src={gorsel.tas.src} alt={gorsel.tas.alt} fill sizes="90vmin" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Taş</b>Sıkıştırır, keser, aşındırır
              </p>
              <p>{metin.tas}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.kuvvet}</p>
              <span className={s.kunye}>{gorsel.tas.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.kabarma}`} data-sahne style={{ height: "170svh" }} aria-label="Tavlama">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.tavlama.src} alt={gorsel.tavlama.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.ustte}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Tavlama</b>Önce ıslatılır
              </p>
              <p>{metin.tavlama}</p>
              <span className={s.kunye}>{gorsel.tavlama.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "230svh" }} aria-label="Kristal düzen bozulur">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.sonenKristal}`}>
            <Image src={gorsel.polarize.src} alt={gorsel.polarize.alt} fill sizes="100vw" />
          </div>
          <svg className={s.catlak} viewBox="0 0 320 260" preserveAspectRatio="none" aria-hidden="true">
            {CATLAKLAR.map((d, i) => (
              <path key={i} d={d} pathLength={1} style={{ "--i": i } as CSSProperties} />
            ))}
          </svg>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Hasar</b>Nişasta da kırılır
              </p>
              <p>{metin.hasar}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.kristal}</p>
              <span className={s.kunye}>{gorsel.polarize.kunye}</span>
              <span className={s.kunye}>Sönme ve çatlaklar şematik.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.suDok} aria-labelledby="su-baslik">
        <h2 id="su-baslik">Su dök</h2>
        <p className={s.not}>Düğmeye basılı tut; iki nişasta tanesi ne kadar su içiyor, izle.</p>
        <div className={s.bardaklar}>
          {gosterge("sağlam tane", saglam, DEGIRMEN.saglam, false)}
          {gosterge("kırık tane", kirik, DEGIRMEN.kirik, true)}
        </div>
        <div className={s.dokDugmeler}>
          <button
            type="button"
            className={s.gosterDugme}
            aria-pressed={akiyor}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setAkiyor(true);
            }}
            onPointerUp={() => setAkiyor(false)}
            onPointerCancel={() => setAkiyor(false)}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                setAkiyor(true);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") setAkiyor(false);
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {akiyor ? "Dökülüyor…" : "Basılı tut: su dök"}
          </button>
          <button type="button" className={s.ikincilDugme} onClick={() => setDokulen(DEGIRMEN.kirik.cok)}>
            Hepsini dök
          </button>
          <button type="button" className={s.ikincilDugme} onClick={() => setDokulen(0)}>
            Boşalt
          </button>
        </div>
        <p className={s.kunye}>Gösterge: ağırlığının yüzdesi olarak emilen su. Bantlar ölçüm aralığıdır; dolum ve şişme şematik.</p>
        <div aria-live="polite">
          {dokulen > DEGIRMEN.saglam.cok && (
            <p className={s.durum}>
              {bitti ? "İki gösterge de bandının üst ucunda." : "Sağlam tanenin göstergesi bandının üst ucunda; kırık tanenin göstergesi yükseliyor."}
            </p>
          )}
        </div>
        <p>{metin.su}</p>
        <p style={{ marginTop: 10 }}>{metin.suKorelasyon}</p>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "200svh" }} aria-label="Mayanın şekeri">
        <div className={`${s.sabit} ${s.sekerSahne}`}>
          <div className={s.halkaGrafik} style={{ "--hedef": DEGIRMEN.sekerPay / 100 } as CSSProperties}>
            <span>%{DEGIRMEN.sekerPay}</span>
          </div>
          <p className={s.not}>2 saatlik fermantasyonda tüketilen şekerlerin amilazdan gelen payı</p>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`} style={{ minHeight: "130svh" }}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Maya</b>Kırık nişastadan şeker
              </p>
              <p>{metin.seker}</p>
              <p>{metin.olcum}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="olculu-baslik">
        <h2 id="olculu-baslik">Ölçülüsü iyi</h2>
        <div className={s.bantSatir}>
          <span>Hasarlı nişasta · derlemedeki uygun aralık</span>
          <span className={s.bantHat}>
            <span className={s.bantDolu} style={{ "--a": sayi(DEGIRMEN.olculu.en) / 30, "--b": sayi(DEGIRMEN.olculu.cok) / 30 } as CSSProperties}>
              %{DEGIRMEN.olculu.en}–{DEGIRMEN.olculu.cok}
            </span>
          </span>
        </div>
        <p>{metin.olculu}</p>
        <div className={s.bantSatir}>
          <span>Düşme sayısı · ekmeklik un için en uygun</span>
          <span className={s.bantHat}>
            <span className={s.bantDolu} style={{ "--a": DEGIRMEN.dusme.en / 500, "--b": DEGIRMEN.dusme.cok / 500 } as CSSProperties}>
              {DEGIRMEN.dusme.en}–{DEGIRMEN.dusme.cok} sn
            </span>
          </span>
        </div>
        <p>{metin.dusme}</p>
      </section>

      {children}
    </div>
  );
}
