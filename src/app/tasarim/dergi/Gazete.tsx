import Link from "next/link";
import { Archivo, Source_Serif_4 } from "next/font/google";
import type { DergiIcerik } from "./tip";
import s from "./gazete.module.css";

// Yön 3 · Bilim eki: gazete sayfası. Dar kalın başlıklar, sütunlu metin, kutulu grafikler, "efsane / ölçüm" tablosu.

const sans = Archivo({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--f-sans", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], axes: ["opsz"], variable: "--f-serif", display: "swap" });

export function Gazete(p: DergiIcerik) {
  return (
    <div className={`${sans.variable} ${serif.variable} ${s.sayfa}`} lang="tr">
      <header className={s.manset}>
        <Link href="/bilim" className={s.ad}>
          EkmekLab Bilim
        </Link>
        <div className={s.mansetAlt}>
          <span>{p.levha}</span>
          <span>{p.durak}</span>
          <span>Ekmeğin yolculuğu</span>
        </div>
      </header>

      <section className={s.acilis}>
        <h1 className={s.baslik}>{p.baslik}</h1>
        <p className={s.soru}>
          <span>{p.soru}</span>
        </p>
      </section>

      <div className={s.ust}>
        <div className={s.giris}>
          <p>{p.giris}</p>
          {p.bolumler[0].paragraflar.map((x, j) => (
            <p key={j}>{x}</p>
          ))}
        </div>
        <aside className={s.rakamlar} aria-label="Rakamlarla">
          <p className={s.kutuBaslik}>Rakamlarla</p>
          <dl>
            {p.rakamlar.map((r) => (
              <div key={r.aciklama} className={s.rakam} data-renk={r.renk}>
                <dt>{r.aciklama}</dt>
                <dd>
                  {r.deger} <small>{r.birim}</small>
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <div className={s.sekilSira}>
        <div className={s.kutu}>{p.kesit}</div>
        {p.bolumler[0].sekiller.map((f, j) => (
          <div key={j} className={s.kutu}>
            {f}
          </div>
        ))}
      </div>

      {p.bolumler.slice(1).map((b, i) => (
        <section key={b.baslik} className={s.bolum} aria-labelledby={`b${i}`}>
          <h2 id={`b${i}`} className={s.bolumBaslik}>
            {b.baslik}
          </h2>
          <div className={s.sutunlu}>
            {b.paragraflar.map((x, j) => (
              <p key={j}>{x}</p>
            ))}
          </div>
          <div className={s.sekilSira}>
            {b.sekiller.map((f, j) => (
              <div key={j} className={s.kutu}>
                {f}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className={s.yuzlesme} aria-labelledby="yuz">
        <h2 id="yuz" className={s.yuzBaslik}>
          Efsane mi, ölçüm mü?
        </h2>
        <div className={s.tablo}>
          <p className={s.tabloBas}>Yaygın inanç</p>
          <p className={s.tabloBas}>Ölçümler</p>
          {p.yuzlesme.map((y) => (
            <div key={y.inanc} className={s.tabloSatir}>
              <blockquote className={s.inanc}>{y.inanc}</blockquote>
              <div className={s.cevap}>
                <p>{y.cevap}</p>
                {y.sekil && <div className={s.kutu}>{y.sekil}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={s.notlar} aria-labelledby="notlar">
        <h2 id="notlar" className={s.kutuBaslik}>
          Notlar ve kaynaklar
        </h2>
        {p.notlar({ liste: s.notListe, no: s.notNo, etiket: s.notEtiket, kaynak: s.notKaynak })}
      </section>
    </div>
  );
}
