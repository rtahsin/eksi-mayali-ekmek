import Link from "next/link";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import type { DergiIcerik } from "./tip";
import s from "./levha.module.css";

// Yön 1 · Levha: bilim atlası baskısı. Kâğıt, mürekkep, ince çizgi; şekiller numaralı, notlar dipte.

const serif = Newsreader({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], axes: ["opsz"], variable: "--f-serif", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], variable: "--f-mono", display: "swap" });

const ROMA = ["I", "II", "III", "IV", "V", "VI"];

export function Levha(p: DergiIcerik) {
  return (
    <div className={`${serif.variable} ${mono.variable} ${s.sayfa}`} lang="tr">
      <header className={s.kunye}>
        <Link href="/bilim">EkmekLab · Bilim odası</Link>
        <span>
          {p.levha} · {p.durak}
        </span>
      </header>

      <section className={s.acilis}>
        <div className={s.acilisMetin}>
          <p className={s.ust}>{p.levha}</p>
          <h1 className={s.baslik}>{p.baslik}</h1>
          <p className={s.soru}>{p.soru}</p>
          <p className={s.giris}>{p.giris}</p>
        </div>
        <div className={s.acilisSekil}>{p.kesit}</div>
      </section>

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
          <p className={s.bolumNo}>{ROMA[i]}.</p>
          <h2 id={`b${i}`} className={s.bolumBaslik}>
            {b.baslik}
          </h2>
          <div className={s.bolumMetin}>
            {b.paragraflar.map((x, j) => (
              <p key={j}>{x}</p>
            ))}
          </div>
          <div className={s.bolumSekil}>{b.sekiller}</div>
        </section>
      ))}

      <section className={s.yuzlesme} aria-labelledby="yuz">
        <h2 id="yuz" className={s.bolumBaslik}>
          Yüzleşme
        </h2>
        <p className={s.yuzAlt}>Yaygın bir inanç ve ölçümlerin söyledikleri</p>
        <div className={s.inanclar}>
          {p.yuzlesme.map((y) => (
            <article key={y.inanc} className={s.inancKutu}>
              <p className={s.etiket}>Yaygın inanç</p>
              <blockquote className={s.inanc}>{y.inanc}</blockquote>
              <p className={s.etiket}>Ölçümler</p>
              <p className={s.cevap}>{y.cevap}</p>
              {y.sekil && <div className={s.inancSekil}>{y.sekil}</div>}
            </article>
          ))}
        </div>
      </section>

      <section className={s.notlar} aria-labelledby="notlar">
        <h2 id="notlar" className={s.notBaslik}>
          Notlar ve kaynaklar
        </h2>
        {p.notlar({ liste: s.notListe, no: s.notNo, etiket: s.notEtiket, kaynak: s.notKaynak })}
      </section>
    </div>
  );
}
