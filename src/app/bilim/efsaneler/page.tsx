import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DURAK_ZEMIN, findAtiflar } from "@/lib/bilim";
import { getAn, getAnKimlikleri, getAtifKartlari, getKarakter, getKarakterKimlikleri, getYolculuk } from "@/lib/bilim/server";
import { Metin } from "@/components/bilim/Metin";
import { KanitDugmesi } from "@/components/bilim/KanitDugmesi";
import { KaynakPaneli } from "@/components/bilim/KaynakPaneli";
import { PaylasDugmesi } from "@/components/bilim/PaylasDugmesi";
import s from "@/components/bilim/bilim.module.css";

// Efsane dosyası (BILIM_PLATFORMU_PLANI §3): anların Yüzleşme bölümleri ve kaynakların ayrıldığı yerler tek kapıda.
// Metinler anların kendisidir; bu sayfa yeni cümle yazmaz, yalnız toplar ve anına geri bağlar.

export const metadata: Metadata = { title: "Efsane dosyası | Bilim odası | EkmekLab" };

const levha = (no: number) => `Levha ${String(no).padStart(2, "0")}`;

export default function EfsaneDosyasi() {
  const sira = getAnKimlikleri();
  const duraklar = getYolculuk()
    .duraklar.map((d) => ({ id: d.id, ad: d.ad, anlar: d.anlar.map((a) => getAn(a.id)).filter((an) => an.yuzlesme.length > 0) }))
    .filter((d) => d.anlar.length > 0);
  const anlar = sira.map(getAn);
  const tartismali = anlar.filter((an) => an.ayrisan_kaynaklar.length > 0);
  const foylar = getKarakterKimlikleri()
    .map(getKarakter)
    .filter((k) => k.efsane);

  const inancSayisi = anlar.reduce((n, an) => n + an.yuzlesme.length, 0);
  const konuSayisi = tartismali.reduce((n, an) => n + an.ayrisan_kaynaklar.length, 0);
  const kartlar = getAtifKartlari([
    ...anlar.flatMap((an) => an.yuzlesme.flatMap((y) => findAtiflar(y.cevap))),
    ...tartismali.flatMap((an) => an.ayrisan_kaynaklar.flatMap((k) => k.bilgiler)),
    ...foylar.flatMap((k) => findAtiflar(k.efsane ?? "")),
  ]);

  return (
    <div className={s.oda} data-oda>
      <Link href="/bilim" className={s.geri}>
        ← Ekmeğin yolculuğu
      </Link>
      <header className={s.dizinBaslik}>
        <p className={s.ust}>EkmekLab · Bilim odası</p>
        <h1 className={s.h1}>Efsane dosyası</h1>
        <p className={s.soru}>
          Ekmek üstüne {inancSayisi} yaygın inanç ve ölçümlerin söyledikleri. Her inanç geçtiği anla birlikte; her
          cevabın sonunda kaynağı. Sonda, kaynakların birbirinden ayrıldığı {konuSayisi} konu.
        </p>
        <nav className={s.dosyaSekme} aria-label="Duraklar">
          {duraklar.map((d) => (
            <a key={d.id} href={`#durak-${d.id}`} style={{ "--durak": DURAK_ZEMIN[d.id] } as CSSProperties}>
              {d.ad} <span>{d.anlar.reduce((n, an) => n + an.yuzlesme.length, 0)}</span>
            </a>
          ))}
          <a href="#ayrisan">Ayrışan kaynaklar</a>
        </nav>
      </header>

      {duraklar.map((d) => (
        <section
          key={d.id}
          id={`durak-${d.id}`}
          className={`${s.durak} ${s.dosyaDurak}`}
          style={{ "--durak": DURAK_ZEMIN[d.id] } as CSSProperties}
          aria-labelledby={`durak-ad-${d.id}`}
        >
          <h2 id={`durak-ad-${d.id}`} className={s.durakAd}>
            {d.ad}
          </h2>
          {d.anlar.map((an) => {
            const no = sira.indexOf(an.id) + 1;
            return (
              <div key={an.id} id={an.id} className={s.dosyaAn}>
                <Link href={`/bilim/${an.id}#yuzlesme`} className={s.dosyaAnBaslik}>
                  <span className={s.levhaNo}>{levha(no)}</span>
                  <span className={s.levhaAd}>{an.baslik} →</span>
                </Link>
                <ol className={s.dosyaListe}>
                  {an.yuzlesme.map((y, i) => {
                    const yer = `${an.id}-${i + 1}`;
                    return (
                      <li key={yer} id={yer} className={s.efsane}>
                        <p className={s.efsaneNo}>
                          Dosya {no}.{i + 1}
                        </p>
                        <p className={s.inanc}>“{y.inanc}”</p>
                        <p className={s.efsaneEtiket}>Ölçümler</p>
                        <p>
                          <Metin metin={y.cevap} kartlar={kartlar} />
                        </p>
                        <PaylasDugmesi yer={yer} baslik={`Efsane dosyası: ${y.inanc}`} />
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
        <section className={s.oku} aria-labelledby="foylar">
          <h2 id="foylar" className={s.bolumAd}>
            Föylerden
            <small>Canlıların ve moleküllerin kartlarındaki inançlar</small>
          </h2>
          <div className={s.govde}>
            {foylar.map((k) => (
              <div key={k.id} id={`foy-${k.id}`}>
                <h3>{k.ad}</h3>
                <p>
                  <Metin metin={k.efsane ?? ""} kartlar={kartlar} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={s.oku} aria-labelledby="ayrisan">
        <h2 id="ayrisan" className={s.bolumAd}>
          Kaynakların ayrıldığı yerler
          <small>Ölçümlerin henüz uzlaşmadığı konular, anlarına göre</small>
        </h2>
        <div className={s.govde}>
          {tartismali.map((an) => (
            <details key={an.id} className={s.cekmece}>
              <summary>
                {levha(sira.indexOf(an.id) + 1)} · {an.baslik} · {an.ayrisan_kaynaklar.length} konu
              </summary>
              {an.ayrisan_kaynaklar.map((k) => (
                <p key={k.konu} className={s.bag}>
                  {k.konu} <KanitDugmesi ids={k.bilgiler} kartlar={kartlar} metin="bilgilere bak" />
                </p>
              ))}
            </details>
          ))}
        </div>
      </section>

      <nav className={s.gezinti} aria-label="Bilim odası">
        <Link href="/bilim">
          <span className={s.levhaNo}>← Dizin</span>
          <span className={s.levhaAd}>Ekmeğin yolculuğu</span>
        </Link>
        <Link href={`/bilim/${sira[0]}`}>
          <span className={s.levhaNo}>{levha(1)} →</span>
          <span className={s.levhaAd}>{anlar[0].baslik}</span>
        </Link>
      </nav>
      <KaynakPaneli kartlar={kartlar} />
    </div>
  );
}
