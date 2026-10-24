import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { splitHamCumleler } from "@/lib/bilim";
import { getAn, getAnKimlikleri, getAtifKartlari, getYolculuk } from "@/lib/bilim/server";
import { Dipnotlu, Notlar, numaralandir } from "../Dipnot";
import { EsikGrafigi, FirinKaybiGrafigi, IcKabukGrafigi, Kesit, NmrGrafigi, SogutmaGrafigi, TorbaGrafigi } from "../Grafik";
import { DERGI_AN, SOGUMA as S, tr } from "../veri";
import type { DergiIcerik } from "../tip";
import { Levha } from "../Levha";
import { Gece } from "../Gece";
import { Gazete } from "../Gazete";

// Dergi düzeni taslağı: aynı an (Soğuma anı) üç ayrı dilde. Cümleler anın kendisidir; yalnız sıraları
// dergi akışına göre dizilir. Yayına açık değildir (robots: /tasarim).

const YONLER = { levha: Levha, gece: Gece, gazete: Gazete } as const;
type Yon = keyof typeof YONLER;

export const dynamicParams = false;
export const metadata: Metadata = { title: "Dergi düzeni taslağı", robots: { index: false, follow: false } };

export function generateStaticParams() {
  return Object.keys(YONLER).map((yon) => ({ yon }));
}

const atif = (id: string) => `[[${id}]]`;

export default async function DergiTaslagi({ params }: { params: Promise<{ yon: string }> }) {
  const { yon } = await params;
  if (!(yon in YONLER)) notFound();
  const Duzen = YONLER[yon as Yon];

  const an = getAn(DERGI_AN);
  const no = getAnKimlikleri().indexOf(an.id) + 1;
  const durak = getYolculuk().duraklar.find((d) => d.id === an.durak)?.ad ?? "";
  const gor = an.gor.adimlar.map((a) => a.metin);
  const [b1, b2, b3, b4] = an.anla;

  // Akış: giriş cümlesi, dört bölüm (anla), grafiklerin bilgileri yerlerinde, sonra Yüzleşme.
  const [giris, ...b1ilk] = splitHamCumleler(b1.paragraflar[0]);
  const nmrSonu = splitHamCumleler(b3.paragraflar[2]).filter((c) => !c.includes(atif(S.nmr.bilgi)));
  const bolumMetinleri = [
    { baslik: b1.baslik, paragraflar: [b1ilk.join(" "), b1.paragraflar[1], b1.paragraflar[2]], sekilBilgileri: [S.kaynama.bilgi, S.firin.bilgi, S.esik.erken.bilgi, S.esik.gec.bilgi] },
    { baslik: b2.baslik, paragraflar: [...b2.paragraflar, gor[0]], sekilBilgileri: [S.taze.bilgi, S.sogumus.bilgi] },
    { baslik: b3.baslik, paragraflar: [b3.paragraflar[0], b3.paragraflar[1], [...nmrSonu.slice(0, -1), gor[5], nmrSonu.at(-1)].join(" ")], sekilBilgileri: [S.nmr.bilgi] },
    { baslik: b4.baslik, paragraflar: b4.paragraflar, sekilBilgileri: [S.sogutma.bilgi] },
  ];
  const sira = numaralandir([
    giris,
    ...bolumMetinleri.flatMap((b) => [...b.paragraflar, b.sekilBilgileri.map(atif).join(" ")]),
    ...an.yuzlesme.flatMap((y) => [y.cevap, atif(S.torba.bilgi)]),
  ]);
  const kartlar = getAtifKartlari(sira.keys());

  const SUP = "dn";
  const metin = (m: string) => <Dipnotlu metin={m} no={sira} sinif={SUP} />;
  const kaynak = (...ids: string[]) => (
    <sup className={SUP}>
      {ids.map((id, i) => (
        <a key={id} href={`#dn-${sira.get(id)}`}>
          {i > 0 && ","}
          {sira.get(id)}
        </a>
      ))}
    </sup>
  );
  const sek = (k: number) => `Şek. ${no}.${k}`;

  const icerik: DergiIcerik = {
    levha: `Levha ${String(no).padStart(2, "0")}`,
    durak,
    baslik: an.baslik,
    soru: an.soru,
    giris: metin(giris),
    sup: SUP,
    rakamlar: [
      { deger: tr(S.taze.ic), birim: "g su / 100 g", aciklama: "taze ekmeğin içinde", renk: "ic" },
      { deger: tr(S.taze.kabuk, 1), birim: "g su / 100 g", aciklama: "aynı ekmeğin kabuğunda", renk: "kabuk" },
      { deger: `%${tr(S.merkez.artis)}`, birim: `${S.merkez.sicaklik} °C`, aciklama: "fırında merkezin neminde varılan artış", renk: "vurgu" },
      { deger: `%${tr(S.torba.olcum[1][1])}`, birim: `${S.torba.olcum[1][0]} gün`, aciklama: "kâğıt torbada kaybedilen ağırlık", renk: "vurgu" },
    ],
    kesit: <Kesit no={sek(1)} alt={metin(gor[1])} />,
    bolumler: bolumMetinleri.map((b, i) => ({
      baslik: b.baslik,
      paragraflar: b.paragraflar.map((p, j) => <span key={j}>{metin(p)}</span>),
      sekiller: [
        [<FirinKaybiGrafigi key="f" no={sek(2)} kaynak={kaynak(S.firin.bilgi)} />, <EsikGrafigi key="e" no={sek(3)} kaynak={kaynak(S.esik.erken.bilgi, S.esik.gec.bilgi, S.kaynama.bilgi)} />],
        [<IcKabukGrafigi key="i" no={sek(4)} kaynak={kaynak(S.taze.bilgi, S.sogumus.bilgi)} />],
        [<NmrGrafigi key="n" no={sek(5)} kaynak={kaynak(S.nmr.bilgi)} />],
        [<SogutmaGrafigi key="s" no={sek(6)} kaynak={kaynak(S.sogutma.bilgi)} />],
      ][i],
    })),
    yuzlesme: an.yuzlesme.map((y, i) => ({
      inanc: y.inanc,
      cevap: metin(y.cevap),
      sekil: i === 1 ? <TorbaGrafigi no={sek(7)} kaynak={kaynak(S.torba.bilgi)} /> : undefined,
    })),
    notlar: (s) => <Notlar no={sira} kartlar={kartlar} s={s} />,
  };

  return <Duzen {...icerik} />;
}
