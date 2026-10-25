import Link from "next/link";
import type { ReactNode } from "react";
import { KANIT_ETIKETI, splitCumleler, splitHamCumleler } from "@/lib/bilim";
import { grafikBilgileri, type Grafik } from "@/lib/bilim/grafik";
import { LEVHALAR } from "@/lib/bilim/levhalar";
import { getAn, getAnKimlikleri, getAtifKartlari, getKarakter, getKarakterKimlikleri, getYolculuk } from "@/lib/bilim/server";
import { Dipnotlu, Notlar, numaralandir } from "./Dipnot";
import { LevhaGrafik } from "./Grafik";
import { LEVHA_FONTLARI } from "./fontlar";
import s from "./levha.module.css";

// Levha düzeni (bilim atlası baskısı): bayrak sahnesi olmayan anların sayfası. Fotoğraf yok; anın kendi
// cümleleri, numaralı dipnotlar ve anın sayılarından çizilen grafikler (src/lib/bilim/levhalar.ts).

const ROMA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const TUR_ADI: Record<string, string> = { bakteri: "Bakteri", maya: "Maya", enzim: "Enzim", molekul: "Molekül", yapi: "Yapı" };

const yalin = (c: string) => splitCumleler(c)[0]?.govde ?? c;
const atif = (id: string) => `[[${id}]]`;

/** Bayrak anların imza etkileşimi: sayfanın başında kâğıt üstünde bir deney levhası. */
export interface LevhaDeneyi {
  baslik: string;
  yonerge: string;
  /** Deneyin gösterdiği anın cümleleri; dipnot sırasına bunlar da girer. */
  metinler?: string[];
  icerik: (metin: (m: string) => ReactNode) => ReactNode;
}

export function LevhaSayfasi({ anId, deney }: { anId: string; deney?: LevhaDeneyi }) {
  const an = getAn(anId);
  const tanim = LEVHALAR[anId];
  const sira = getAnKimlikleri();
  const no = sira.indexOf(anId) + 1;
  const levha = `Levha ${String(no).padStart(2, "0")}`;
  const durak = getYolculuk().duraklar.find((d) => d.id === an.durak)?.ad ?? "";
  const onceki = no > 1 ? getAn(sira[no - 2]) : null;
  const sonraki = no < sira.length ? getAn(sira[no]) : null;
  const kartKimlikleri = new Set(getKarakterKimlikleri());
  const karakterler = an.karakterler.filter((k) => kartKimlikleri.has(k)).map(getKarakter);

  // Giriş: ilk bölümün ilk cümlesi. Adım adım: sahne cümleleri, okuma bölümlerinde zaten geçenler çıkarılarak.
  const [giris, ...ilkKalan] = splitHamCumleler(an.anla[0].paragraflar[0]);
  const bolumler = an.anla.map((b, i) => ({ baslik: b.baslik, paragraflar: i === 0 ? [ilkKalan.join(" "), ...b.paragraflar.slice(1)].filter(Boolean) : b.paragraflar }));
  const okunan = new Set(an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler)).map(yalin));
  const adimlar = an.gor.adimlar
    .map((a) => splitHamCumleler(a.metin).filter((c) => !okunan.has(yalin(c))).join(" "))
    .filter(Boolean);

  const grafikler = tanim?.grafikler ?? [];
  const bolumGrafikleri = (i: number) => grafikler.filter((g) => "bolum" in g.yer && g.yer.bolum === i);
  const yuzGrafikleri = (i: number) => grafikler.filter((g) => "yuzlesme" in g.yer && g.yer.yuzlesme === i);
  const sekilNo = new Map<Grafik, string>();
  for (const g of [...an.anla.flatMap((_, i) => bolumGrafikleri(i)), ...an.yuzlesme.flatMap((_, i) => yuzGrafikleri(i))]) sekilNo.set(g, `Şek. ${no}.${sekilNo.size + 1}`);
  const cekmece = [...an.kanit.cekirdek, ...an.kanit.cekmece];

  // Dipnotlar sayfadaki görünme sırasıyla numaralanır.
  const numara = numaralandir([
    giris,
    ...(tanim?.rakamlar.map((r) => atif(r.bilgi)) ?? []),
    ...(deney?.metinler ?? []),
    ...adimlar,
    ...bolumler.flatMap((b, i) => [...b.paragraflar, bolumGrafikleri(i).flatMap(grafikBilgileri).map(atif).join(" ")]),
    ...an.yuzlesme.flatMap((y, i) => [y.cevap, yuzGrafikleri(i).flatMap(grafikBilgileri).map(atif).join(" ")]),
    ...an.baglar.flatMap((b) => b.bilgiler.map(atif)),
    ...an.ayrisan_kaynaklar.flatMap((k) => k.bilgiler.map(atif)),
    ...karakterler.flatMap((k) => [k.tek_cumle, ...k.bolumler.flatMap((b) => b.cumleler), k.efsane ?? ""]),
    ...cekmece.map(atif),
  ]);
  const kartlar = getAtifKartlari(numara.keys());

  const metin = (m: string) => <Dipnotlu metin={m} no={numara} sinif="dn" />;
  const notlar = (ids: string[]): ReactNode => {
    const sayilar = [...new Set(ids.map((id) => numara.get(id)).filter((n): n is number => n !== undefined))];
    return (
      <sup className="dn">
        {sayilar.map((n, i) => (
          <span key={n}>
            {i > 0 && ","}
            <a href={`#dn-${n}`} aria-label={`Not ${n}`}>
              {n}
            </a>
          </span>
        ))}
      </sup>
    );
  };
  const sekil = (g: Grafik) => {
    const durum = kartlar[g.bilgi]?.durum;
    const semaCumlesi = g.tur === "sema" ? [an.gor.adimlar.map((a) => a.metin), an.anla.flatMap((b) => b.paragraflar)].flat().flatMap(splitHamCumleler).find((c) => c.includes(atif(g.bilgi))) : undefined;
    return (
      <LevhaGrafik
        key={sekilNo.get(g)}
        grafik={g}
        no={sekilNo.get(g) ?? ""}
        kanit={durum ? KANIT_ETIKETI[durum] : ""}
        kaynak={notlar(grafikBilgileri(g))}
        semaAlt={semaCumlesi ? metin(semaCumlesi) : undefined}
      />
    );
  };

  const icindekiler = [
    ...(deney ? [{ yer: "deney", ad: `Deney: ${deney.baslik}` }] : []),
    ...(adimlar.length ? [{ yer: "adim", ad: "Adım adım" }] : []),
    ...bolumler.map((b, i) => ({ yer: `b${i}`, ad: `${ROMA[i]}. ${b.baslik}` })),
    ...(an.yuzlesme.length ? [{ yer: "yuzlesme", ad: "Yüzleşme" }] : []),
    ...(an.baglar.length ? [{ yer: "baglar", ad: "Neden, sonuç" }] : []),
    { yer: "notlar", ad: "Notlar ve kaynaklar" },
  ];

  return (
    <div className={`${LEVHA_FONTLARI} ${s.sayfa}`} lang="tr">
      <header className={s.kunye}>
        <Link href="/bilim">EkmekLab · Bilim odası</Link>
        <span>
          {levha} · {durak}
        </span>
      </header>

      <section className={s.acilis}>
        <div>
          <p className={s.ust}>{levha}</p>
          <h1 className={s.baslik}>{an.baslik}</h1>
          <p className={s.soru}>{an.soru}</p>
          <p className={s.giris}>{metin(giris)}</p>
        </div>
        <nav className={s.icindekiler} aria-label="Bu levhada">
          <p className={s.etiket}>Bu levhada</p>
          <ol>
            {icindekiler.map((x) => (
              <li key={x.yer}>
                <a href={`#${x.yer}`}>{x.ad}</a>
              </li>
            ))}
          </ol>
          {grafikler.length > 0 && <p className={s.icindekilerAlt}>{grafikler.length} şekil · {numara.size} not</p>}
        </nav>
      </section>

      {tanim && (
        <dl className={s.rakamlar}>
          {tanim.rakamlar.map((r) => (
            <div key={r.aciklama} className={s.rakam} data-renk={r.renk ?? "vurgu"}>
              <dt>
                {r.aciklama}
                {notlar([r.bilgi])}
              </dt>
              <dd>
                <span className={s.rakamDeger}>{r.deger}</span>
                <span className={s.rakamBirim}>{r.birim}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {deney && (
        <section id="deney" className={s.deney} aria-labelledby="deney-b">
          <p className={s.etiket}>Deney levhası</p>
          <h2 id="deney-b" className={s.bolumBaslik}>
            {deney.baslik}
          </h2>
          <p className={s.yuzAlt}>{deney.yonerge}</p>
          {deney.icerik(metin)}
        </section>
      )}

      {adimlar.length > 0 && (
        <section id="adim" className={s.adimlar} aria-labelledby="adim-b">
          <h2 id="adim-b" className={s.kucukBaslik}>
            Adım adım
          </h2>
          <ol>
            {adimlar.map((a, i) => (
              <li key={i}>{metin(a)}</li>
            ))}
          </ol>
        </section>
      )}

      {bolumler.map((b, i) => (
        <section key={b.baslik} id={`b${i}`} className={s.bolum} aria-labelledby={`b${i}-b`}>
          <p className={s.bolumNo}>{ROMA[i]}.</p>
          <h2 id={`b${i}-b`} className={s.bolumBaslik}>
            {b.baslik}
          </h2>
          <div className={s.bolumMetin}>
            {b.paragraflar.map((p, j) => (
              <p key={j}>{metin(p)}</p>
            ))}
          </div>
          {bolumGrafikleri(i).length > 0 && <div className={s.bolumSekil}>{bolumGrafikleri(i).map(sekil)}</div>}
        </section>
      ))}

      {an.yuzlesme.length > 0 && (
        <section id="yuzlesme" className={s.yuzlesme} aria-labelledby="yuzlesme-b">
          <h2 id="yuzlesme-b" className={s.bolumBaslik}>
            Yüzleşme
          </h2>
          <p className={s.yuzAlt}>
            Yaygın bir inanç ve ölçümlerin söyledikleri · <Link href={`/bilim/efsaneler#${an.id}`}>bütün inançlar: Efsane dosyası</Link>
          </p>
          <div className={s.inanclar}>
            {an.yuzlesme.map((y, i) => (
              <article key={y.inanc} className={s.inancKutu}>
                <p className={s.etiket}>Yaygın inanç</p>
                <blockquote className={s.inanc}>{y.inanc}</blockquote>
                <p className={s.etiket}>Ölçümler</p>
                <p className={s.cevap}>{metin(y.cevap)}</p>
                {yuzGrafikleri(i).length > 0 && <div className={s.inancSekil}>{yuzGrafikleri(i).map(sekil)}</div>}
              </article>
            ))}
          </div>
        </section>
      )}

      {an.baglar.length > 0 && (
        <section id="baglar" className={s.ek} aria-labelledby="baglar-b">
          <h2 id="baglar-b" className={s.kucukBaslik}>
            Neden, sonuç
          </h2>
          <div className={s.baglar}>
            {an.baglar.map((b) => (
              <dl key={b.kaldirac} className={s.bag}>
                <dt>Kaldıraç</dt>
                <dd className={s.kaldirac}>{b.kaldirac}</dd>
                <dt>Mekanizma</dt>
                <dd>{b.mekanizma}</dd>
                <dt>Sonuç</dt>
                <dd>
                  {b.sonuc}
                  {notlar(b.bilgiler)}
                </dd>
              </dl>
            ))}
          </div>
        </section>
      )}

      {an.ayrisan_kaynaklar.length > 0 && (
        <section className={s.ek} aria-labelledby="ayrisan-b">
          <h2 id="ayrisan-b" className={s.kucukBaslik}>
            Kaynakların ayrıldığı yerler
          </h2>
          <ul className={s.ayrisan}>
            {an.ayrisan_kaynaklar.map((k) => (
              <li key={k.konu}>
                {k.konu}
                {notlar(k.bilgiler)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {karakterler.length > 0 && (
        <section className={s.ek} aria-labelledby="foy-b">
          <h2 id="foy-b" className={s.kucukBaslik}>
            Bu anın canlıları ve molekülleri
          </h2>
          <div className={s.foylar}>
            {karakterler.map((k) => (
              <article key={k.id} className={s.foy}>
                <p className={s.etiket}>Föy · {TUR_ADI[k.tur] ?? k.tur}</p>
                <h3 className={s.foyAd}>{k.ad}</h3>
                {k.eski_ad && <p className={s.foyEski}>Eski adıyla {k.eski_ad}</p>}
                <p>{metin(k.tek_cumle)}</p>
                <details>
                  <summary>Föyün tamamı</summary>
                  <dl>
                    {k.bolumler.map((b) => (
                      <div key={b.baslik}>
                        <dt>{b.baslik}</dt>
                        {b.cumleler.map((c, i) => (
                          <dd key={i}>{metin(c)}</dd>
                        ))}
                      </div>
                    ))}
                    {k.efsane && (
                      <div>
                        <dt>Efsane</dt>
                        <dd>{metin(k.efsane)}</dd>
                      </div>
                    )}
                  </dl>
                </details>
              </article>
            ))}
          </div>
        </section>
      )}

      <section id="notlar" className={s.notlar} aria-labelledby="notlar-b">
        <h2 id="notlar-b" className={s.kucukBaslik}>
          Notlar ve kaynaklar
        </h2>
        <Notlar no={numara} kartlar={kartlar} s={{ liste: s.notListe, no: s.notNo, etiket: s.notEtiket, kaynak: s.notKaynak }} />
        <details className={s.cekmece}>
          <summary>Kanıt çekmecesi · bu anın dayandığı {cekmece.length} bilgi</summary>
          <ol>
            {cekmece
              .filter((b) => kartlar[b])
              .map((b) => (
                <li key={b}>
                  {kartlar[b].metin}
                  {notlar([b])}
                </li>
              ))}
          </ol>
        </details>
      </section>

      <nav className={s.gezinti} aria-label="Levhalar arasında">
        <Link href={onceki ? `/bilim/${onceki.id}` : "/bilim"}>
          <span className={s.etiket}>← {onceki ? `Levha ${String(no - 1).padStart(2, "0")}` : "Dizin"}</span>
          <span className={s.gezintiAd}>{onceki?.baslik ?? "Ekmeğin yolculuğu"}</span>
        </Link>
        <Link href={sonraki ? `/bilim/${sonraki.id}` : "/bilim"}>
          <span className={s.etiket}>{sonraki ? `Levha ${String(no + 1).padStart(2, "0")}` : "Dizin"} →</span>
          <span className={s.gezintiAd}>{sonraki?.baslik ?? "Ekmeğin yolculuğu"}</span>
        </Link>
      </nav>
    </div>
  );
}
