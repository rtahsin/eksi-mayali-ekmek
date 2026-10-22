"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { RAF } from "@/lib/bilim";
import { useSahneIlerleme } from "./useSahneIlerleme";
import type { Gorselli } from "./IlkOnGun";
import s from "./bilim.module.css";

// "Rafta ilk hafta" bayrak sahnesi. İmza: "Kim bayatlattı?" Okur üç şüphelinin dosyasını açar;
// her birinin lehine ve aleyhine kütüphane cümleleri çıkar, üçü de açılınca karar belirir: çok etkenli.

export interface Supheli {
  ad: string;
  lehine: ReactNode;
  ama: ReactNode;
}

export interface RaftaIlkHaftaProps {
  ust: string;
  baslik: string;
  soru: string;
  gorsel: Record<keyof typeof RAF.gorseller, Gorselli>;
  metin: Record<"basla" | "ilk24" | "nisasta" | "retro" | "ikiHiz" | "sertlesme" | "hiz" | "olcum", ReactNode>;
  supheliler: Supheli[];
  karar: ReactNode;
  children?: ReactNode;
}

function sayi(t: string) {
  return Number(t.replace(",", "."));
}

export function RaftaIlkHafta({ ust, baslik, soru, gorsel, metin, supheliler, karar, children }: RaftaIlkHaftaProps) {
  const kok = useRef<HTMLDivElement>(null);
  const saat = useRef<HTMLSpanElement>(null);
  useSahneIlerleme(kok, (olcum) => {
    const o = olcum.find((x) => x.el.dataset.saat !== undefined);
    if (o && saat.current) saat.current.textContent = `${Math.round(o.p * 24)} saat`;
  });
  const [secili, setSecili] = useState<number | null>(null);
  const [bakilan, setBakilan] = useState<number[]>([]);
  const hepsi = bakilan.length === supheliler.length;
  const enHizli = Math.max(...RAF.hizlar.map((h) => sayi(h.cok)));

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

      <section className={s.sahne} data-sahne data-saat style={{ height: "220svh" }} aria-label="Fırından çıktıktan sonraki saatler">
        <div className={`${s.sabit} ${s.saatSahne}`}>
          <p className={s.not}>Fırından çıktı. Geçen süre</p>
          <span ref={saat} className={s.saatSayi} aria-hidden="true">
            0 saat
          </span>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.basla}</p>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>İlk 24 saat</b>En büyük kayıp
              </p>
              <p>{metin.ilk24}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "220svh" }} aria-label="Nişasta">
        <div className={s.sabit}>
          <div className={s.dolgu}>
            <Image src={gorsel.nisasta1.src} alt={gorsel.nisasta1.alt} fill sizes="100vw" />
          </div>
          <div className={`${s.dolgu} ${s.gecis}`}>
            <Image src={gorsel.nisasta2.src} alt={gorsel.nisasta2.alt} fill sizes="100vw" />
          </div>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>Nişasta</b>Ekmek içinin malzemesi
              </p>
              <p>{metin.nisasta}</p>
              <span className={s.kunye}>{gorsel.nisasta1.kunye}</span>
            </div>
          </div>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.retro}</p>
              <span className={s.kunye}>{gorsel.nisasta2.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.sahne} data-sahne style={{ height: "200svh" }} aria-label="İki hız">
        <div className={`${s.sabit} ${s.ikiHiz}`}>
          <div className={s.hizSatir}>
            <span>amiloz · saatler</span>
            <span className={s.hizDolu} style={{ "--h": "min(1, var(--p, 0) * 4)" } as CSSProperties} />
          </div>
          <div className={s.hizSatir}>
            <span>amilopektin · günler, haftalar</span>
            <span className={s.hizDolu} style={{ "--h": "var(--p, 0)" } as CSSProperties} />
          </div>
          <span className={s.kunye}>Çubuklar şematik: yalnız iki hızın farkını gösterir.</span>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`} style={{ minHeight: "140svh" }}>
            <div className={s.kart}>
              <p className={s.gun}>
                <b>İki hız</b>Soğuyan nişasta geri döner
              </p>
              <p>{metin.ikiHiz}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${s.sahne} ${s.kabarma}`} data-sahne style={{ height: "200svh" }} aria-label="Sertleşme hızı">
        <div className={s.sabit}>
          <div className={`${s.dolgu} ${s.soluk}`}>
            <Image src={gorsel.panko.src} alt={gorsel.panko.alt} fill sizes="100vw" />
          </div>
          <figure className={s.araliklar}>
            <figcaption>Ekmek içinin sertleşme hızı, on günlük ev saklaması (N/gün)</figcaption>
            {RAF.hizlar.map((h) => (
              <div key={h.ad} className={s.aralik}>
                <span>{h.ad}</span>
                <span className={s.aralikHat}>
                  <span
                    className={s.aralikDolu}
                    style={{ "--a": sayi(h.en) / enHizli, "--b": sayi(h.cok) / enHizli } as CSSProperties}
                  />
                </span>
                <b>
                  {h.en}–{h.cok}
                </b>
              </div>
            ))}
          </figure>
        </div>
        <div className={s.akis}>
          <div className={`${s.adim} ${s.altta}`}>
            <div className={s.kart}>
              <p>{metin.sertlesme}</p>
              <p>{metin.hiz}</p>
              <span className={s.kunye}>{gorsel.panko.kunye}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={s.dava} aria-labelledby="dava-baslik">
        <h2 id="dava-baslik">Kim bayatlattı?</h2>
        <p className={s.not}>Üç şüpheli var. Her birinin dosyasını aç; lehine olanı ve &quot;ama&quot;sını gör.</p>
        <div className={s.supheliler} role="group" aria-label="Şüpheliler">
          {supheliler.map((sp, i) => (
            <button
              key={sp.ad}
              type="button"
              aria-pressed={secili === i}
              className={`${secili === i ? s.secili : ""} ${bakilan.includes(i) ? s.bakildi : ""}`}
              onClick={() => {
                setSecili(i);
                setBakilan((b) => (b.includes(i) ? b : [...b, i]));
              }}
            >
              {sp.ad}
            </button>
          ))}
        </div>
        <div className={s.dosya} aria-live="polite">
          {secili === null ? (
            <p className={s.not}>Bir şüpheli seç.</p>
          ) : (
            <>
              <p className={s.kucukBaslik}>Lehine</p>
              <p>{supheliler[secili].lehine}</p>
              <p className={s.kucukBaslik}>Ama</p>
              <p>{supheliler[secili].ama}</p>
            </>
          )}
        </div>
        <div className={`${s.hukum} ${hepsi ? s.hukumAcik : ""}`} aria-live="polite">
          {hepsi ? (
            <>
              <p className={s.kucukBaslik}>Karar</p>
              <p className={s.kararCumle}>{karar}</p>
            </>
          ) : (
            <p className={s.not}>
              Karar için üç dosyaya da bak ({bakilan.length}/{supheliler.length}).
            </p>
          )}
        </div>
      </section>

      <section className={s.karar} aria-labelledby="olcum-baslik">
        <h2 id="olcum-baslik">Bayatlık nasıl ölçülür</h2>
        <div className={s.dscBant} aria-hidden="true">
          <span>{RAF.dscAralik} · kristal amilopektinin erimesi</span>
        </div>
        <p>{metin.olcum}</p>
      </section>

      {children}
    </div>
  );
}
