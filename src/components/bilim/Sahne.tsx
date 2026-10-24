"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSahneIlerleme } from "./useSahneIlerleme";
import s from "./bilim.module.css";

// Bayrak olmayan anların ortak sahnesi: açılış görüntüsü kaydırdıkça yaklaşır ve başlık söner;
// ardından görüntü çerçevede sabit kalır, adım kartları iki yandan sırayla akar ve her adım kendi şeklini getirir.

export interface SahneSekli {
  id: string;
  no: string;
  dosya: string;
  alt: string;
  kunye: ReactNode;
}

export interface SahneAdimi {
  govde: ReactNode;
  sekil: number;
  vurgu: string;
}

export function Sahne({
  ust,
  baslik,
  soru,
  sekiller,
  adimlar,
}: {
  ust: string;
  baslik: string;
  soru: string;
  sekiller: SahneSekli[];
  adimlar: SahneAdimi[];
}) {
  const kok = useRef<HTMLDivElement>(null);
  const adimRef = useRef<(HTMLDivElement | null)[]>([]);
  const [aktif, setAktif] = useState(0);
  useSahneIlerleme(kok);

  useEffect(() => {
    const gozlem = new IntersectionObserver(
      (girdiler) => {
        for (const g of girdiler) {
          if (g.isIntersecting) setAktif(Number((g.target as HTMLElement).dataset.adim));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    adimRef.current.forEach((el) => el && gozlem.observe(el));
    return () => gozlem.disconnect();
  }, []);

  const acilis = sekiller[0];
  const adim = adimlar[aktif];
  const sekil = sekiller[adim?.sekil ?? 0];

  return (
    <div ref={kok}>
      <Link href="/bilim" className={s.geri}>
        ← Levha dizini
      </Link>
      <section className={`${s.sahne} ${s.acilis}`} data-sahne style={{ height: "130svh" }}>
        <div className={s.sabit}>
          {acilis && (
            <div className={s.dolgu}>
              <Image src={acilis.dosya} alt={acilis.alt} fill sizes="100vw" priority />
            </div>
          )}
          <div className={s.ortu} />
          <div className={s.yazi}>
            <p className={s.ust}>{ust}</p>
            <h1 className={s.h1}>{baslik}</h1>
            <p className={s.soru}>{soru}</p>
            {acilis && <span className={s.kunye}>{acilis.kunye}</span>}
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.ortak}`} aria-label="Gör">
        <div className={s.sabit}>
          {sekiller.map((g, i) => (
            <div key={g.id} className={`${s.sekil} ${i === adim?.sekil ? s.sekilAcik : ""}`} aria-hidden={i !== adim?.sekil}>
              <Image src={g.dosya} alt={g.alt} fill sizes="100vw" />
            </div>
          ))}
          {sekil && (
            <p className={`${s.sekilYazi} ${s.kunye}`} aria-live="polite">
              {sekil.no} · {adim?.vurgu} · {sekil.kunye}
            </p>
          )}
        </div>
        <div className={s.akis}>
          {adimlar.map((a, i) => (
            <div
              key={i}
              ref={(el) => {
                adimRef.current[i] = el;
              }}
              data-adim={i}
              className={s.adim}
            >
              <div className={s.kart}>
                <p>{a.govde}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
