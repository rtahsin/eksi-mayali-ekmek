"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { KABUK, virgullu } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Kabuğun kızarması" bayrak sahnesi. İmza: iki kilit. Okur sıcaklığı ve su aktivitesini ayarlar;
// kabuk rengi yalnız ikisi birden eşiği geçince açılır, o koşulda geçerli bilgiler anın kendi cümleleriyle belirir.
// Renk yalnız eşik mantığını gösterir, koyuluk ölçü değildir.

export interface KabukKizarmasiProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof KABUK.gorseller, Gorselli>;
  metin: Record<"renk" | "maillard" | "karamel" | "koku" | "naoh" | "akrilamid", ReactNode>;
  kilit: Record<"renk" | "maltoz" | "hmf" | "akrilamid", ReactNode>;
  katman: Record<"dis" | "kabukta" | "kalanSu", ReactNode>;
  olcum: Record<"tost" | "kavilca", ReactNode>;
  children?: ReactNode;
}

const ZINCIR = ["indirgen şeker + aminik bileşik", "Amadori ve Heyns bileşikleri · renksiz", "melanoidin · esmer"];
const KATMANLAR = ["dış kabuk · en kuru katman", "iç kabuk", "ekmek içi"];

export function KabukKizarmasi({ ust, baslik, soru, gorsel, metin, kilit, katman, olcum, children }: KabukKizarmasiProps) {
  const kok = useRef<HTMLDivElement>(null);
  useSahneIlerleme(kok);
  const [sicaklik, setSicaklik] = useState(100);
  const [suYuzde, setSuYuzde] = useState(95); // su aktivitesi × 100, kayan nokta hatası olmasın diye tamsayı

  const isiAcik = sicaklik > KABUK.renkC;
  const kuruAcik = suYuzde < KABUK.renkAw * 100;
  const renk = isiAcik && kuruAcik;
  const ekler = [
    sicaklik > KABUK.maltozC && kilit.maltoz,
    suYuzde < KABUK.hmfAw * 100 && kilit.hmf,
    sicaklik >= KABUK.akrilamidC && kilit.akrilamid,
  ].filter(Boolean);
  const tostEnCok = Math.max(...KABUK.tost.map((t) => t.indeks));
  const kv = [Number(KABUK.kavilca.kavilca.replace(",", ".")), Number(KABUK.kavilca.beyaz.replace(",", "."))];

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

      <section className={s.sahne} data-sahne style={{ height: "230svh" }} aria-label="Maillard zinciri">
        <div className={`${s.sabit} ${s.zincir}`}>
          <svg className={s.zincirCizgi} viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M5 4 L5 96" pathLength={1} />
          </svg>
          <ol className={s.zincirDugum}>
            {ZINCIR.map((z, i) => (
              <li key={z} style={{ "--i": i } as CSSProperties}>
                {z}
              </li>
            ))}
          </ol>
        </div>
        <div className={s.akis}>
          <div className={s.adim} style={{ minHeight: "130svh" }} />
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Maillard</b>Şeker ile protein buluşur
              </p>
              <p>{metin.renk}</p>
              <p>{metin.maillard}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.yakin}`} data-sahne style={{ height: "170svh" }} aria-label="Karamelleşme">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.sils.src} alt={gorsel.sils.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.ustte}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>İki yol</b>Karamelleşme de yürür
              </p>
              <p>{metin.karamel}</p>
              <span className={s.kunye}>{gorsel.sils.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "230svh" }} aria-label="Kabuk kokusu">
        <div className={`${s.sabit} ${s.koku}`}>
          {KABUK.kokular.map((k, i) => (
            <span key={k} style={{ "--i": i, "--x": (i * 37) % 55 } as CSSProperties} aria-hidden="true">
              {k}
            </span>
          ))}
        </div>
        <div className={s.akis}>
          <div className={s.adim} style={{ minHeight: "130svh" }} />
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Koku</b>Yüzeyde doğan uçucular
              </p>
              <p>{metin.koku}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.kilit} aria-labelledby="kilit-baslik">
        <div className={s.kilitSol}>
          <h2 id="kilit-baslik">İki kilit</h2>
          <p className={s.not}>Yüzeyin sıcaklığını ve kuruluğunu sen ayarla; rengin ne zaman başladığına bak.</p>
          <div className={`${s.kilitResim} ${renk ? s.renkAcik : ""}`}>
            <Image src={gorsel.kapak.src} alt={gorsel.kapak.alt} fill sizes="(min-width: 900px) 45vw, 100vw" />
          </div>
          <span className={s.kunye}>Renk yalnız eşiğin açılıp açılmadığını gösterir; koyuluk ölçü değildir.</span>
        </div>
        <div>
          <label className={s.kilitEtiket} htmlFor="kilit-sicaklik">
            Yüzey sıcaklığı <b>{sicaklik} °C</b>
            <span className={isiAcik ? s.acikKilit : s.kapaliKilit}>{isiAcik ? "kilit açık" : `${KABUK.renkC} °C'yi aşmalı`}</span>
          </label>
          <input
            id="kilit-sicaklik"
            className={s.kaydirici}
            type="range"
            min={80}
            max={200}
            step={5}
            value={sicaklik}
            onChange={(e) => setSicaklik(Number(e.target.value))}
          />
          <label className={s.kilitEtiket} htmlFor="kilit-su">
            Su aktivitesi <b>{virgullu(suYuzde / 100)}</b>
            <span className={kuruAcik ? s.acikKilit : s.kapaliKilit}>
              {kuruAcik ? "kilit açık" : `${virgullu(KABUK.renkAw)}'nın altına inmeli`}
            </span>
          </label>
          <input
            id="kilit-su"
            className={s.kaydirici}
            type="range"
            min={20}
            max={100}
            step={5}
            value={suYuzde}
            onChange={(e) => setSuYuzde(Number(e.target.value))}
            aria-valuetext={virgullu(suYuzde / 100)}
          />
          <p className={s.cizelge} aria-hidden="true">
            <span>kuru</span>
            <span>nemli</span>
          </p>
          <p className={s.durum} aria-live="polite">
            {renk ? "Renk başlar." : "Renk başlamaz."}
          </p>
          <p>{kilit.renk}</p>
          <div className={s.ekler} aria-live="polite">
            <p className={s.kucukBaslik}>Bu koşulda kütüphane ayrıca şunu söylüyor</p>
            {ekler.length ? ekler.map((e, i) => <p key={i}>{e}</p>) : <p className={s.not}>Bu koşul için ek bir bilgi yok.</p>}
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.kabarma}`} data-sahne style={{ height: "170svh" }} aria-label="NaOH">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.laugen.src} alt={gorsel.laugen.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>NaOH</b>Kabuğun kimyası elle değişir
              </p>
              <p>{metin.naoh}</p>
              <span className={s.kunye}>{gorsel.laugen.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "300svh" }} aria-label="Akrilamid ve kabuk katmanları">
        <div className={`${s.sabit} ${s.katmanlar}`}>
          {KATMANLAR.map((k, i) => (
            <div key={k} className={s.katman} style={{ "--i": i } as CSSProperties}>
              <span>{k}</span>
            </div>
          ))}
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.sagda}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Akrilamid</b>Aynı ısıda doğan başka bileşik
              </p>
              <p>{metin.akrilamid}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.sagda}`}>
            <div className={s.kart}>
              <p>{katman.kabukta}</p>
              <p>{katman.dis}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.sagda}`}>
            <div className={s.kart}>
              <p>{katman.kalanSu}</p>
              <span className={s.kunye}>Katman çizimi şematik.</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.karar} aria-labelledby="olcum-baslik">
        <h2 id="olcum-baslik">Ölçülen esmerlik</h2>
        <figure className={s.cubuklar}>
          <figcaption>Tost ekmeği · esmerleşme indeksi</figcaption>
          {KABUK.tost.map((t) => (
            <div key={t.firin} className={s.cubuk}>
              <span>
                {t.firin} °C fırın, {t.ic} °C içi
              </span>
              <span className={s.cubukDolu} style={{ "--w": t.indeks / tostEnCok } as CSSProperties}>
                {t.indeks}
              </span>
            </div>
          ))}
        </figure>
        <p>{olcum.tost}</p>
        <figure className={s.cubuklar}>
          <figcaption>Kabuk · esmerleşme indeksi (başka bir çalışma, ayrı ölçek)</figcaption>
          {[
            ["Kavılca ekmeği", KABUK.kavilca.kavilca, kv[0]],
            ["Beyaz ekmek", KABUK.kavilca.beyaz, kv[1]],
          ].map(([ad, yazi, n]) => (
            <div key={ad} className={s.cubuk}>
              <span>{ad}</span>
              <span className={s.cubukDolu} style={{ "--w": Number(n) / Math.max(...kv) } as CSSProperties}>
                {yazi}
              </span>
            </div>
          ))}
        </figure>
        <p>{olcum.kavilca}</p>
      </section>

      {children}
    </div>
  );
}
