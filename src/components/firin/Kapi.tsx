"use client";

import { useEffect, useState } from "react";
import { FIRIN_CIZELGESI, firinAniSirasi, selam } from "@/lib/firin/durum";
import { istanbulTime } from "@/lib/time/istanbul";
import s from "./firin.module.css";

// Kapı: açılış görseli yerine fırının o anki hâli. Sunucu sayfayı en fazla bir dakikalık ISR ile çizer;
// tarayıcıda saat dakikada bir yeniden okunur. İlk çizim sunucunun değeriyle aynıdır (hidrasyon uyuşur).

interface Props {
  /** Sunucunun çizdiği anın sırası ve selamı */
  ilkSira: number;
  ilkSelam: string;
}

function saatYazi(now: Date) {
  const { hour, minute } = istanbulTime(now);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function Kapi({ ilkSira, ilkSelam }: Props) {
  const [durum, setDurum] = useState<{ sira: number; selam: string; saat: string | null }>({ sira: ilkSira, selam: ilkSelam, saat: null });

  useEffect(() => {
    const oku = () => {
      const now = new Date();
      setDurum({ sira: firinAniSirasi(now), selam: selam(now), saat: saatYazi(now) });
    };
    oku();
    const t = window.setInterval(oku, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const an = FIRIN_CIZELGESI[durum.sira];

  return (
    <section className={s.kapi} aria-labelledby="kapi-baslik">
      <div className={`${s.ic} ${s.kapiIc}`}>
        <div className={s.kapiMetin}>
          <p className={s.selam}>{durum.selam}.</p>
          <p className={`${s.etiket} ${s.simdi}`}>Şu an fırında{durum.saat ? ` · ${durum.saat}` : ""}</p>
          <h1 id="kapi-baslik" className={s.kapiBaslik} aria-live="polite">
            {an.baslik}
          </h1>
          <p className={s.kapiNot}>{an.not}</p>
          <ol className={s.cizelge} aria-label="Fırının günü">
            {FIRIN_CIZELGESI.map((a, i) => (
              <li key={a.bas} aria-current={i === durum.sira ? "true" : undefined}>
                <b>{a.bas}</b>
                {a.ad}
              </li>
            ))}
          </ol>
          <a href="#tezgah" className={s.kapiDugme}>
            Tezgâha bak ↓
          </a>
        </div>
        <div className={`${s.yer} ${s.yerKoyu} ${s.kapiGorsel}`} role="img" aria-label="Fotoğraf yeri">
          {an.gorsel}
          <br />
          (çekilecek)
        </div>
      </div>
    </section>
  );
}
