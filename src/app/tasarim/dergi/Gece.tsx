import Link from "next/link";
import { Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import type { DergiIcerik } from "./tip";
import s from "./gece.module.css";

// Yön 2 · Gece baskısı: koyu dergi. Büyük serif başlıklar ve rakamlar, ışıyan ince çizgiler, geniş boşluk.

const serif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"], variable: "--f-serif", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--f-sans", display: "swap" });

export function Gece(p: DergiIcerik) {
  return (
    <div className={`${serif.variable} ${sans.variable} ${s.sayfa}`} lang="tr">
      <header className={s.acilis}>
        <div className={s.kunye}>
          <Link href="/bilim">Bilim odası</Link>
          <span>
            {p.levha} · {p.durak}
          </span>
        </div>
        <div className={s.acilisIc}>
          <div>
            <h1 className={s.baslik}>{p.baslik}</h1>
            <p className={s.soru}>{p.soru}</p>
          </div>
          <div className={s.acilisSekil}>{p.kesit}</div>
        </div>
      </header>

      <p className={s.giris}>{p.giris}</p>

      <dl className={s.rakamlar}>
        {p.rakamlar.map((r) => (
          <div key={r.aciklama} className={s.rakam} data-renk={r.renk}>
            <dt>{r.aciklama}</dt>
            <dd>
              <span className={s.rakamDeger}>{r.deger}</span>
              <span className={s.rakamBirim}>{r.birim}</span>
            </dd>
          </div>
        ))}
      </dl>

      {p.bolumler.map((b, i) => (
        <section key={b.baslik} className={s.bolum} aria-labelledby={`b${i}`}>
          <div className={s.bolumBas}>
            <span className={s.bolumNo}>{String(i + 1).padStart(2, "0")}</span>
            <h2 id={`b${i}`} className={s.bolumBaslik}>
              {b.baslik}
            </h2>
          </div>
          <div className={s.bolumMetin}>
            {b.paragraflar.map((x, j) => (
              <p key={j}>{x}</p>
            ))}
          </div>
          <div className={s.bolumSekil}>
            {b.sekiller.map((f, j) => (
              <div key={j} className={s.pano}>
                {f}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className={s.yuzlesme} aria-labelledby="yuz">
        <p className={s.yuzUst}>Yüzleşme</p>
        <h2 id="yuz" className={s.gizli}>
          Yüzleşme
        </h2>
        {p.yuzlesme.map((y) => (
          <article key={y.inanc} className={s.inancKutu}>
            <blockquote className={s.inanc}>{y.inanc}</blockquote>
            <div className={s.cevapKutu}>
              <p className={s.etiket}>Ölçümler</p>
              <p>{y.cevap}</p>
              {y.sekil && <div className={s.pano}>{y.sekil}</div>}
            </div>
          </article>
        ))}
      </section>

      <section className={s.notlar} aria-labelledby="notlar">
        <h2 id="notlar" className={s.etiket}>
          Notlar ve kaynaklar
        </h2>
        {p.notlar({ liste: s.notListe, no: s.notNo, etiket: s.notEtiket, kaynak: s.notKaynak })}
      </section>
    </div>
  );
}
