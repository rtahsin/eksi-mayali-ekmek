import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getAn, getAnKimlikleri, getAtifKartlari, getKarakter, getKarakterKimlikleri, getYolculuk } from "@/lib/bilim/server";
import { Dipnotlu, Notlar, numaralandir } from "@/components/bilim/levha/Dipnot";
import { LEVHA_FONTLARI } from "@/components/bilim/levha/fontlar";
import { PaylasDugmesi } from "@/components/bilim/PaylasDugmesi";
import s from "@/components/bilim/levha/levha.module.css";

// Efsane dosyası (BILIM_PLATFORMU_PLANI §3), levha düzeninde: anların Yüzleşme bölümleri ve kaynakların
// ayrıldığı yerler tek kapıda. Metinler anların kendisidir; bu sayfa yeni cümle yazmaz, toplar ve anına bağlar.

export const metadata: Metadata = { title: "Efsane dosyası | Bilim odası | EkmekLab" };

const ROMA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const levha = (no: number) => `Levha ${String(no).padStart(2, "0")}`;
const atif = (id: string) => `[[${id}]]`;

export default function EfsaneDosyasi() {
  const sira = getAnKimlikleri();
  const duraklar = getYolculuk()
    .duraklar.map((d, i) => ({ id: d.id, ad: d.ad, roma: ROMA[i], anlar: d.anlar.map((a) => getAn(a.id)).filter((an) => an.yuzlesme.length > 0) }))
    .filter((d) => d.anlar.length > 0);
  const anlar = sira.map(getAn);
  const tartismali = anlar.filter((an) => an.ayrisan_kaynaklar.length > 0);
  const foylar = getKarakterKimlikleri()
    .map(getKarakter)
    .filter((k) => k.efsane);

  const inancSayisi = anlar.reduce((n, an) => n + an.yuzlesme.length, 0);
  const konuSayisi = tartismali.reduce((n, an) => n + an.ayrisan_kaynaklar.length, 0);
  const numara = numaralandir([
    ...duraklar.flatMap((d) => d.anlar.flatMap((an) => an.yuzlesme.map((y) => y.cevap))),
    ...foylar.map((k) => k.efsane ?? ""),
    ...tartismali.flatMap((an) => an.ayrisan_kaynaklar.flatMap((k) => k.bilgiler.map(atif))),
  ]);
  const kartlar = getAtifKartlari(numara.keys());
  const metin = (m: string) => <Dipnotlu metin={m} no={numara} sinif="dn" />;
  const notlar = (ids: string[]): ReactNode => (
    <sup className="dn">
      {[...new Set(ids.map((id) => numara.get(id)).filter((n): n is number => n !== undefined))].map((n, i) => (
        <span key={n}>
          {i > 0 && ","}
          <a href={`#dn-${n}`} aria-label={`Not ${n}`}>
            {n}
          </a>
        </span>
      ))}
    </sup>
  );

  return (
    <div className={`${LEVHA_FONTLARI} ${s.sayfa}`} lang="tr">
      <header className={s.kunye}>
        <Link href="/bilim">← Ekmeğin yolculuğu</Link>
        <span>EkmekLab · Bilim odası</span>
      </header>

      <section className={s.acilis}>
        <div>
          <p className={s.ust}>Ayrı kapı</p>
          <h1 className={s.baslik}>Efsane dosyası</h1>
          <p className={s.soru}>
            Ekmek üstüne {inancSayisi} yaygın inanç ve ölçümlerin söyledikleri. Her inanç geçtiği anla birlikte; sonda,
            kaynakların birbirinden ayrıldığı {konuSayisi} konu.
          </p>
        </div>
        <nav className={s.icindekiler} aria-label="Duraklar">
          <p className={s.etiket}>Duraklar</p>
          <ol>
            {duraklar.map((d) => (
              <li key={d.id}>
                <a href={`#durak-${d.id}`}>
                  {d.roma}. {d.ad} · {d.anlar.reduce((n, an) => n + an.yuzlesme.length, 0)}
                </a>
              </li>
            ))}
            <li>
              <a href="#ayrisan">Kaynakların ayrıldığı yerler</a>
            </li>
          </ol>
        </nav>
      </section>

      {duraklar.map((d) => (
        <section key={d.id} id={`durak-${d.id}`} className={s.dizinDurak} aria-labelledby={`durak-ad-${d.id}`}>
          <h2 id={`durak-ad-${d.id}`} className={s.dizinDurakAd}>
            <span className={s.bolumNo}>{d.roma}.</span> {d.ad}
          </h2>
          {d.anlar.map((an) => {
            const no = sira.indexOf(an.id) + 1;
            return (
              <div key={an.id} id={an.id} className={s.efsaneAn}>
                <Link href={`/bilim/${an.id}#yuzlesme`} className={s.efsaneAnBaslik}>
                  <span className={s.etiket}>{levha(no)}</span>
                  <span className={s.efsaneAnAd}>{an.baslik} →</span>
                </Link>
                <ol className={s.efsaneIzgara}>
                  {an.yuzlesme.map((y, i) => {
                    const yer = `${an.id}-${i + 1}`;
                    return (
                      <li key={yer} id={yer} className={s.efsaneKart}>
                        <p className={s.etiket}>
                          Dosya {no}.{i + 1}
                        </p>
                        <blockquote className={s.inanc}>{y.inanc}</blockquote>
                        <p className={s.etiket}>Ölçümler</p>
                        <p className={s.cevap}>{metin(y.cevap)}</p>
                        <PaylasDugmesi yer={yer} baslik={`Efsane dosyası: ${y.inanc}`} sinif={s.paylas} />
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      ))}

      {foylar.length > 0 && (
        <section className={s.ek} aria-labelledby="foylar">
          <h2 id="foylar" className={s.kucukBaslik}>
            Föylerden: canlıların ve moleküllerin kartlarındaki inançlar
          </h2>
          <div className={s.foylar}>
            {foylar.map((k) => (
              <article key={k.id} id={`foy-${k.id}`} className={s.foy}>
                <h3 className={s.foyAd}>{k.ad}</h3>
                <p>{metin(k.efsane ?? "")}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section id="ayrisan" className={s.ek} aria-labelledby="ayrisan-b">
        <h2 id="ayrisan-b" className={s.kucukBaslik}>
          Kaynakların ayrıldığı yerler · ölçümlerin henüz uzlaşmadığı konular
        </h2>
        {tartismali.map((an) => (
          <details key={an.id} className={s.cekmece}>
            <summary>
              {levha(sira.indexOf(an.id) + 1)} · {an.baslik} · {an.ayrisan_kaynaklar.length} konu
            </summary>
            <ul className={s.ayrisan}>
              {an.ayrisan_kaynaklar.map((k) => (
                <li key={k.konu}>
                  {k.konu}
                  {notlar(k.bilgiler)}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <section className={s.notlar} aria-labelledby="notlar-b">
        <h2 id="notlar-b" className={s.kucukBaslik}>
          Notlar ve kaynaklar
        </h2>
        <Notlar no={numara} kartlar={kartlar} s={{ liste: s.notListe, no: s.notNo, etiket: s.notEtiket, kaynak: s.notKaynak }} />
      </section>

      <nav className={s.gezinti} aria-label="Bilim odası">
        <Link href="/bilim">
          <span className={s.etiket}>← Dizin</span>
          <span className={s.gezintiAd}>Ekmeğin yolculuğu</span>
        </Link>
        <Link href={`/bilim/${sira[0]}`}>
          <span className={s.etiket}>{levha(1)} →</span>
          <span className={s.gezintiAd}>{anlar[0].baslik}</span>
        </Link>
      </nav>
    </div>
  );
}
