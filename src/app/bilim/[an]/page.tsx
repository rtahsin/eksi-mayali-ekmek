import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { KANIT_ETIKETI, cumleEtiketi, findAtiflar, type AtifKarti, type Gorsel } from "@/lib/bilim";
import {
  getAn,
  getAnKimlikleri,
  getAtifKartlari,
  getGorsel,
  getKarakter,
  getKarakterKimlikleri,
  getYolculuk,
} from "@/lib/bilim/server";
import { Metin } from "@/components/bilim/Metin";
import { Foy } from "@/components/bilim/Foy";
import { KaynakPaneli } from "@/components/bilim/KaynakPaneli";
import { Sahne, type SahneAdimi, type SahneSekli } from "@/components/bilim/Sahne";
import s from "@/components/bilim/bilim.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAnKimlikleri().map((an) => ({ an }));
}

interface PageProps {
  params: Promise<{ an: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { an } = await params;
  if (!getAnKimlikleri().includes(an)) return {};
  return { title: `${getAn(an).baslik} | Bilim odası | EkmekLab` };
}

function Kunye({ g }: { g: Gorsel }) {
  const yazar = g.makale ? `${g.yazar.split(",")[0]} vd.` : g.yazar;
  return (
    <span className={s.kunye}>
      {g.makale ? "makale şekli" : "gerçek görüntü"} · {yazar} ·{" "}
      {g.lisans_url ? <a href={g.lisans_url}>{g.lisans}</a> : g.lisans} ·{" "}
      <a href={g.kaynak_sayfa}>{g.makale ? `${g.makale.dergi} ${g.makale.yil}` : "Wikimedia Commons"}</a>
      {g.panel && ` · panel ${g.panel}`}
      {g.renk_haritasi && " · gri tonlar renklendirildi, renk bilgi taşımaz"}
    </span>
  );
}

function KanitDugmesi({ ids, kartlar, metin }: { ids: string[]; kartlar: Record<string, AtifKarti>; metin?: string }) {
  const durum = cumleEtiketi(ids.filter((id) => kartlar[id]).map((id) => kartlar[id].durum));
  if (!durum) return null;
  return (
    <button
      type="button"
      className={`${s.etiket} ${durum === "tartismali" ? s.celisiyor : ""}`}
      data-atif={ids.join(" ")}
      aria-haspopup="dialog"
    >
      {metin ?? KANIT_ETIKETI[durum]}
    </button>
  );
}

export default async function AnSayfasi({ params }: PageProps) {
  const { an: id } = await params;
  const sira = getAnKimlikleri();
  const idx = sira.indexOf(id);
  if (idx < 0) notFound();

  const an = getAn(id);
  const durak = getYolculuk().duraklar.find((d) => d.id === an.durak);
  const levha = String(idx + 1).padStart(2, "0");
  const kartKimlikleri = new Set(getKarakterKimlikleri());
  const karakterler = an.karakterler.filter((k) => kartKimlikleri.has(k)).map(getKarakter);

  const metinler = [
    ...an.gor.adimlar.map((a) => a.metin),
    ...an.anla.flatMap((b) => b.paragraflar),
    ...an.yuzlesme.map((y) => y.cevap),
    ...karakterler.flatMap((k) => [k.tek_cumle, ...k.bolumler.flatMap((b) => b.cumleler), k.efsane ?? ""]),
  ];
  const cekmece = [...an.kanit.cekirdek, ...an.kanit.cekmece];
  const kartlar = getAtifKartlari([
    ...metinler.flatMap(findAtiflar),
    ...cekmece,
    ...an.baglar.flatMap((b) => b.bilgiler),
    ...an.ayrisan_kaynaklar.flatMap((k) => k.bilgiler),
  ]);

  // Şekiller adım sırasıyla numaralanır; görseli olmayan adım önceki şekli tutar.
  const sekiller: SahneSekli[] = [];
  const adimlar: SahneAdimi[] = an.gor.adimlar.map((a) => {
    const g = a.gorsel ? getGorsel(a.gorsel) : undefined;
    if (a.gorsel && g && !sekiller.some((x) => x.id === a.gorsel)) {
      sekiller.push({
        id: a.gorsel,
        no: `Şek. ${idx + 1}.${sekiller.length + 1}`,
        dosya: g.dosya,
        w: g.w,
        h: g.h,
        alt: g.alt,
        kunye: <Kunye g={g} />,
      });
    }
    const sekil = a.gorsel ? sekiller.findIndex((x) => x.id === a.gorsel) : -1;
    return { govde: <Metin metin={a.metin} kartlar={kartlar} />, sekil, vurgu: a.vurgu };
  });
  adimlar.forEach((a, i) => {
    if (a.sekil < 0) a.sekil = i > 0 ? adimlar[i - 1].sekil : 0;
  });

  const onceki = idx > 0 ? getAn(sira[idx - 1]) : null;
  const sonraki = idx < sira.length - 1 ? getAn(sira[idx + 1]) : null;

  return (
    <main className={s.levha}>
      <div className={s.baslik}>
        <p className={s.ust}>
          <b>Levha {levha}</b> · {durak?.ad}
        </p>
        <h1 className={s.h1}>{an.baslik}</h1>
        <p className={s.soru}>{an.soru}</p>
      </div>

      {sekiller.length > 0 ? (
        <Sahne sekiller={sekiller} adimlar={adimlar} />
      ) : (
        <section className={s.bolum}>
          {adimlar.map((a, i) => (
            <p key={i}>{a.govde}</p>
          ))}
        </section>
      )}

      <section className={s.bolum} aria-labelledby="anla">
        <h2 id="anla" className={s.bolumAd}>
          Anla
        </h2>
        <div className={s.govde}>
          {an.anla.map((b) => (
            <div key={b.baslik}>
              <h3>{b.baslik}</h3>
              {b.paragraflar.map((p, i) => (
                <p key={i}>
                  <Metin metin={p} kartlar={kartlar} />
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {an.yuzlesme.length > 0 && (
        <section className={s.bolum} aria-labelledby="yuzlesme">
          <h2 id="yuzlesme" className={s.bolumAd}>
            Yüzleşme
            <small>Yaygın bir inanç ve ölçümlerin söyledikleri</small>
          </h2>
          <div className={s.govde}>
            {an.yuzlesme.map((y) => (
              <div key={y.inanc} className={s.yuzlesme}>
                <p className={s.inanc}>“{y.inanc}”</p>
                <p className={s.olcum}>
                  <span className={s.kucukBaslik}>Ölçümler</span>
                  <Metin metin={y.cevap} kartlar={kartlar} />
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {an.baglar.length > 0 && (
        <section className={s.bolum} aria-labelledby="baglar">
          <h2 id="baglar" className={s.bolumAd}>
            Neden → sonuç
            <small>Neyi değiştirirsen ne olur</small>
          </h2>
          <div>
            {an.baglar.map((b) => (
              <div key={b.kaldirac} className={s.bag}>
                <dl>
                  <div>
                    <dt>Kaldıraç</dt>
                    <dd className={s.kaldirac}>{b.kaldirac}</dd>
                  </div>
                  <div>
                    <dt>
                      <span className={s.oku}>→</span> Mekanizma
                    </dt>
                    <dd>{b.mekanizma}</dd>
                  </div>
                  <div>
                    <dt>
                      <span className={s.oku}>→</span> Sonuç
                    </dt>
                    <dd>
                      {b.sonuc} <KanitDugmesi ids={b.bilgiler} kartlar={kartlar} />
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {an.ayrisan_kaynaklar.length > 0 && (
        <section className={s.bolum} aria-labelledby="ayrisan">
          <h2 id="ayrisan" className={s.bolumAd}>
            Kaynakların ayrıldığı yerler
          </h2>
          <div className={s.govde}>
            {an.ayrisan_kaynaklar.map((k) => (
              <p key={k.konu} className={s.bag}>
                {k.konu} <KanitDugmesi ids={k.bilgiler} kartlar={kartlar} metin="bilgilere bak" />
              </p>
            ))}
          </div>
        </section>
      )}

      {karakterler.length > 0 && (
        <section className={s.bolum} aria-labelledby="karakterler">
          <h2 id="karakterler" className={s.bolumAd}>
            Bu anın canlıları ve molekülleri
          </h2>
          <div className={s.foylar}>
            {karakterler.map((k) => (
              <Foy key={k.id} karakter={k} kartlar={kartlar} />
            ))}
          </div>
        </section>
      )}

      <section className={s.bolum} aria-labelledby="kanit">
        <h2 id="kanit" className={s.bolumAd}>
          Kanıt
          <small>Bu anın dayandığı bilgiler ve kaynakları</small>
        </h2>
        <details className={`${s.govde} ${s.cekmece}`}>
          <summary>Kanıt çekmecesi · {cekmece.length} bilgi</summary>
          <ol>
            {cekmece
              .filter((b) => kartlar[b])
              .map((b) => (
                <li key={b}>
                  {kartlar[b].metin} <KanitDugmesi ids={[b]} kartlar={kartlar} />
                </li>
              ))}
          </ol>
        </details>
      </section>

      <nav className={s.gezinti} aria-label="Levhalar arasında">
        {onceki ? (
          <Link href={`/bilim/${onceki.id}`}>
            <span className={s.levhaNo}>← Levha {String(idx).padStart(2, "0")}</span>
            <span className={s.levhaAd}>{onceki.baslik}</span>
          </Link>
        ) : (
          <Link href="/bilim">
            <span className={s.levhaNo}>←</span>
            <span className={s.levhaAd}>Levha dizini</span>
          </Link>
        )}
        {sonraki ? (
          <Link href={`/bilim/${sonraki.id}`}>
            <span className={s.levhaNo}>Levha {String(idx + 2).padStart(2, "0")} →</span>
            <span className={s.levhaAd}>{sonraki.baslik}</span>
          </Link>
        ) : (
          <Link href="/bilim">
            <span className={s.levhaNo}>→</span>
            <span className={s.levhaAd}>Levha dizini</span>
          </Link>
        )}
      </nav>

      <KaynakPaneli kartlar={kartlar} />
    </main>
  );
}
