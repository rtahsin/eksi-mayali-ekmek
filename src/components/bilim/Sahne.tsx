"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import s from "./bilim.module.css";

// Gör katmanı: görüntü çerçevede sabit kalır, adımlar kaydıkça o adımın şekli ve açıklaması gelir.
// JavaScript yoksa ilk şekil görünür, adımlar okunur.

export interface SahneSekli {
  id: string;
  no: string;
  dosya: string;
  w: number;
  h: number;
  alt: string;
  kunye: ReactNode;
}

export interface SahneAdimi {
  govde: ReactNode;
  sekil: number;
  vurgu: string;
}

export function Sahne({ sekiller, adimlar }: { sekiller: SahneSekli[]; adimlar: SahneAdimi[] }) {
  const [aktif, setAktif] = useState(0);
  const adimRef = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const gozlem = new IntersectionObserver(
      (girdiler) => {
        for (const g of girdiler) {
          if (g.isIntersecting) setAktif(Number((g.target as HTMLElement).dataset.adim));
        }
      },
      { rootMargin: "-55% 0px -40% 0px" }
    );
    adimRef.current.forEach((el) => el && gozlem.observe(el));
    return () => gozlem.disconnect();
  }, []);

  const adim = adimlar[aktif];
  const sekil = sekiller[adim?.sekil ?? 0];

  return (
    <section className={s.sahne} aria-label="Gör">
      <figure className={s.cerceve}>
        <div className={s.sekilAlani}>
          {sekiller.map((g, i) => (
            <div key={g.id} className={`${s.sekil} ${i === adim?.sekil ? s.sekilAcik : ""}`} aria-hidden={i !== adim?.sekil}>
              <Image
                src={g.dosya}
                alt={g.alt}
                fill
                sizes="(min-width: 900px) 60vw, 100vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        {sekil && (
          <figcaption className={s.sekilYazi} aria-live="polite">
            <span className={s.sekilNo}>{sekil.no}</span>
            {adim?.vurgu}
            {sekil.kunye}
          </figcaption>
        )}
      </figure>
      <ol className={s.adimlar} style={{ listStyle: "none", margin: 0 }}>
        {adimlar.map((a, i) => (
          <li
            key={i}
            ref={(el) => {
              adimRef.current[i] = el;
            }}
            data-adim={i}
            className={`${s.adim} ${i === aktif ? s.adimAcik : ""}`}
          >
            <p>{a.govde}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
