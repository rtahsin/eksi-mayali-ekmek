"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { TANE } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Olgun tanenin içi" bayrak sahnesi. İmza: iki sayım. Aynı nişasta alanı sayarak bakınca küçük B granülleriyle,
// alana bakınca büyük A granülleriyle dolu görünür. Çizim şematiktir: 40 granülün 6'sı A-tipi (sayının %15'i),
// yarıçaplar alanın %75'ten fazlasını A-tipine verecek biçimde seçildi; ölçüm olan yalnız bu iki orandır.

export interface OlgunTaneProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof TANE.gorseller, Gorselli>;
  metin: Record<"kisimlar" | "endosperm" | "protein" | "granul" | "ikiSayim" | "gluten" | "takvim", ReactNode>;
  children?: ReactNode;
}

const A_R = 15;
const B_R = 3.5;
const SAYI_R = 4;

/** Deterministik yerleşim: sunucu ve tarayıcı aynı daireleri üretir. */
function granulleriYerlestir() {
  let tohum = 7;
  const rastgele = () => {
    tohum = (tohum * 16807) % 2147483647;
    return tohum / 2147483647;
  };
  const daireler: { x: number; y: number; a: boolean }[] = [];
  const sigar = (x: number, y: number, r: number) =>
    daireler.every((d) => Math.hypot(d.x - x, d.y - y) > r + (d.a ? A_R : B_R) + 3);
  for (let deneme = 0; daireler.length < 6 && deneme < 4000; deneme++) {
    const x = 20 + rastgele() * 280;
    const y = 20 + rastgele() * 160;
    if (sigar(x, y, A_R)) daireler.push({ x, y, a: true });
  }
  for (let deneme = 0; daireler.length < 40 && deneme < 8000; deneme++) {
    const x = 8 + rastgele() * 304;
    const y = 8 + rastgele() * 184;
    if (sigar(x, y, B_R + 2)) daireler.push({ x, y, a: false });
  }
  return daireler;
}

const GRANULLER = granulleriYerlestir();
const ORAN_TOPLAM = TANE.oranlar.reduce((n, o) => n + o.orta, 0);
const ORAN_RENK = ["#e9dcc0", "#b07a45", "#d9b25e", "#8fb36a"];
const ENDOSPERM = TANE.oranlar[0].orta;

export function OlgunTane({ ust, baslik, soru, gorsel, metin, children }: OlgunTaneProps) {
  const kok = useRef<HTMLDivElement>(null);
  useSahneIlerleme(kok);
  const [tahmin, setTahmin] = useState(50);
  const [goster, setGoster] = useState(false);
  const [alan, setAlan] = useState(false);

  const fark = tahmin - ENDOSPERM;
  const yorum = Math.abs(fark) <= 5 ? "Çok yakın." : fark < 0 ? "Daha fazla." : "Biraz daha az.";

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

      <section className={s.tahmin} aria-labelledby="tahmin-baslik">
        <h2 id="tahmin-baslik">Önce sen tahmin et</h2>
        <label htmlFor="tahmin-kaydirici" className={s.kilitEtiket}>
          Tanenin ağırlığının ne kadarı nişastalı endosperm? <b>%{tahmin}</b>
        </label>
        <input
          id="tahmin-kaydirici"
          className={s.kaydirici}
          type="range"
          min={0}
          max={100}
          step={1}
          value={tahmin}
          onChange={(e) => {
            setTahmin(Number(e.target.value));
            setGoster(false);
          }}
        />
        <button type="button" className={s.gosterDugme} onClick={() => setGoster(true)} aria-expanded={goster}>
          Göster
        </button>
        <div className={`${s.oranCubuk} ${goster ? s.oranAcik : ""}`} aria-hidden={!goster}>
          {TANE.oranlar.map((o, i) => (
            <span key={o.ad} style={{ "--w": o.orta / ORAN_TOPLAM, background: ORAN_RENK[i] } as CSSProperties} />
          ))}
          {goster && <i className={s.tahminIsaret} style={{ "--t": tahmin / 100 } as CSSProperties} />}
        </div>
        {goster && (
          <ul className={s.oranListe}>
            {TANE.oranlar.map((o, i) => (
              <li key={o.ad}>
                <i style={{ background: ORAN_RENK[i] }} />%{o.yazi} {o.ad}
              </li>
            ))}
          </ul>
        )}
        <div aria-live="polite">
          {goster && (
            <>
              <p className={s.durum}>
                Senin tahminin %{tahmin}. {yorum}
              </p>
              <p>{metin.endosperm}</p>
              <p style={{ marginTop: 10 }}>{metin.kisimlar}</p>
            </>
          )}
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "200svh" }} aria-label="Alöronun altındaki protein yokuşu">
        <div className={`${s.sabit} ${s.yokus}`}>
          <div className={s.yokusSerit}>
            <span className={s.yokusAleron}>alöron</span>
            <span className={s.yokusBant}>ilk {TANE.protein.mikron} µm · proteinin ~%{TANE.protein.pay}&apos;u</span>
            <span className={s.yokusTepe}>%{TANE.protein.tepe}&apos;ye kadar protein</span>
            <span className={s.yokusIc}>tanenin içine doğru</span>
          </div>
          <span className={s.kunye}>Şerit şematik: yokuşun biçimi çizim, sayılar ölçümdür.</span>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`} style={{ minHeight: "120svh" }}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Protein yokuşu</b>Alöronun hemen altı
              </p>
              <p>{metin.protein}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.yakin}`} data-sahne style={{ height: "170svh" }} aria-label="Nişasta granülleri">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.polarize.src} alt={gorsel.polarize.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Nişasta</b>Yarı kristal taneler
              </p>
              <p>{metin.granul}</p>
              <span className={s.kunye}>{gorsel.polarize.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.ikiSayim} aria-labelledby="sayim-baslik">
        <h2 id="sayim-baslik">İki sayım</h2>
        <p className={s.not}>Aynı nişasta, iki ölçü. Önce say, sonra kapladığı yere bak.</p>
        <div className={s.supheliler} role="group" aria-label="Ölçü">
          <button type="button" aria-pressed={!alan} className={!alan ? s.secili : undefined} onClick={() => setAlan(false)}>
            Sayarak
          </button>
          <button type="button" aria-pressed={alan} className={alan ? s.secili : undefined} onClick={() => setAlan(true)}>
            Kapladığı alana göre
          </button>
        </div>
        <svg
          className={`${s.granulAlani} ${alan ? s.alanModu : ""}`}
          viewBox="0 0 320 200"
          role="img"
          aria-label={alan ? "Nişasta granülleri, alan görünümü" : "Nişasta granülleri, sayı görünümü"}
        >
          {GRANULLER.map((g, i) => (
            <circle
              key={i}
              cx={g.x}
              cy={g.y}
              r={g.a ? A_R : B_R}
              className={g.a ? s.granulA : s.granulB}
              style={{ "--k": g.a ? SAYI_R / A_R : SAYI_R / B_R } as CSSProperties}
            />
          ))}
        </svg>
        <p className={s.durum} aria-live="polite">
          {alan ? "Görünüm: kapladığı alan" : "Görünüm: sayı (her granül aynı büyüklükte nokta)"}
        </p>
        <p>{metin.ikiSayim}</p>
        <p className={s.lejant}>
          <span className={s.lejA}>A-tipi · büyük</span>
          <span className={s.lejB}>B-tipi · küçük</span>
        </p>
        <span className={s.kunye}>Çizim şematik: 40 granülün 6&apos;sı A-tipi; ölçüm olan yalnız sayı ve alan oranlarıdır.</span>
      </section>

      <section className={s.karar} aria-labelledby="takvim-baslik">
        <h2 id="takvim-baslik">Tane takvimi</h2>
        <p className={s.not}>Çiçeklenmeden sonraki günler</p>
        <div className={s.takvim}>
          <div className={s.takvimEksen} aria-hidden="true">
            {[0, 5, 10, 15, 20].map((g) => (
              <span key={g} style={{ "--g": g / 21 } as CSSProperties}>
                {g}
              </span>
            ))}
          </div>
          {TANE.takvim.map((t) => (
            <div key={t.ad} className={s.takvimSatir}>
              <span>
                {t.ad} · <small>{t.yazi}</small>
              </span>
              <span className={s.takvimHat}>
                <span
                  className={`${s.takvimDolu} ${"acikBaslangic" in t ? s.acikBas : ""}`}
                  style={{ "--a": t.bas / 21, "--b": t.son / 21 } as CSSProperties}
                />
              </span>
            </div>
          ))}
        </div>
        <p>{metin.takvim}</p>
        <p style={{ marginTop: 10 }}>{metin.gluten}</p>
      </section>

      {children}
    </div>
  );
}
