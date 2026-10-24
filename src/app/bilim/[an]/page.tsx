import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  DEGIRMEN,
  DURAK_ZEMIN,
  FIRIN_DENEYI,
  GAZ,
  GECE,
  ILK_ON_GUN,
  KABUK,
  KESIK,
  RAF,
  TANE,
  YOGURMA,
  asitlikZemini,
  findAtiflar,
  splitHamCumleler,
  type An,
  type AtifKarti,
  type Gorsel,
} from "@/lib/bilim";
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
import { KanitDugmesi } from "@/components/bilim/KanitDugmesi";
import { Sahne, type SahneAdimi, type SahneSekli } from "@/components/bilim/Sahne";
import { IlkOnGun, type Gorselli, type IlkOnGunProps } from "@/components/bilim/IlkOnGun";
import { FirinSekizDakika, type FirinSekizDakikaProps } from "@/components/bilim/FirinSekizDakika";
import { KabukKizarmasi, type KabukKizarmasiProps } from "@/components/bilim/KabukKizarmasi";
import { RaftaIlkHafta, type RaftaIlkHaftaProps } from "@/components/bilim/RaftaIlkHafta";
import { OlgunTane, type OlgunTaneProps } from "@/components/bilim/OlgunTane";
import { DegirmenTasinda, type DegirmenTasindaProps } from "@/components/bilim/DegirmenTasinda";
import { YogurmaTezgahi, type YogurmaTezgahiProps } from "@/components/bilim/YogurmaTezgahi";
import { GazVeKabarma, type GazVeKabarmaProps } from "@/components/bilim/GazVeKabarma";
import { GeceDolapta, type GeceDolaptaProps } from "@/components/bilim/GeceDolapta";
import { KesikAtilinca, type KesikAtilincaProps } from "@/components/bilim/KesikAtilinca";
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
    <>
      {g.makale ? "makale şekli" : "gerçek görüntü"} · {yazar} ·{" "}
      <a href={g.kaynak_sayfa}>{g.makale ? `${g.makale.dergi} ${g.makale.yil}` : "Wikimedia Commons"}</a> ·{" "}
      {g.lisans_url ? <a href={g.lisans_url}>{g.lisans}</a> : g.lisans}
      {g.panel && ` · panel ${g.panel}`}
      {g.renk_haritasi && " · gri tonlar renklendirildi, renk bilgi taşımaz"}
    </>
  );
}

function gorselli(id: string): Gorselli {
  const g = getGorsel(id);
  if (!g) throw new Error(`Bilim odası: görsel kaydı yok: ${id}`);
  return { src: g.dosya, alt: g.alt, kunye: <Kunye g={g} /> };
}

/** İlk 10 gün sahnesinin metinleri anın kendi cümleleridir: adımlar sahnelere bölünür, kapanış durumları bilgi kimliğiyle bulunur. */
function ilkOnGunVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<IlkOnGunProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const tum = [...ad.flat(), ...an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler))];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const G = ILK_ON_GUN.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kase: gorselli(G.kase),
      mercek: gorselli(G.mercek),
      gun1: gorselli(G.gun1),
      kabarma: gorselli(G.kabarma),
      devirSol: gorselli(G.devirSol),
      devirSag: gorselli(G.devirSag),
    },
    metin: {
      mercek: yaz(ad[0]),
      gun1a: yaz(ad[1]),
      gun1b: yaz(ad[2]),
      kabarma: yaz(ad[4].slice(0, 1)),
      devirA: yaz(ad[4].slice(1)),
      devirB: yaz(ad[3]),
      denge: yaz(ad[5]),
    },
    serit: ILK_ON_GUN.serit.map(gorselli),
    olaylar: ILK_ON_GUN.olaylar,
    durumlar: ILK_ON_GUN.durumlar.map((d) => ({
      gun: d.gun,
      ad: d.ad,
      metin: yaz(tum.filter((c) => c.includes(`[[${d.bilgi}]]`)).slice(0, 1)),
      gorsel: gorselli(d.gorsel),
    })),
  };
}

/** Fırın sahnesinin metinleri: adımların cümleleri sahnelere bölünür (sıra: kapak, tanım, bölgeler, maya, gözenek, gluten, buhar, hacim). */
function firinVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<FirinSekizDakikaProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const G = FIRIN_DENEYI.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      kesit: gorselli(G.kesit),
      maya: gorselli(G.maya),
      gluten: gorselli(G.gluten),
      nisasta: gorselli(G.nisasta),
    },
    metin: {
      isi: yaz(ad[0]),
      bolgeler: yaz(ad[1].slice(0, 3)),
      yuzey: yaz(ad[1].slice(3)),
      tanim: yaz(ad[2].slice(0, 1)),
      maya: yaz(ad[2].slice(1)),
      gozenek: yaz(ad[3]),
      gluten1: yaz(ad[4].slice(0, 3)),
      gluten2: yaz(ad[4].slice(3)),
      buhar1: yaz(ad[5].slice(0, 3)),
      buhar2: yaz(ad[5].slice(3)),
      hacim: yaz(ad[6].slice(0, 2)),
      karar: yaz(ad[6].slice(2, 3)),
      durma: yaz(ad[6].slice(3)),
    },
  };
}

/** Kabuk sahnesinin metinleri: adımlar sahnelere, kilit ve katman cümleleri bilgi kimliğiyle bulunur. */
function kabukVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<KabukKizarmasiProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const tum = [...ad.flat(), ...an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler))];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const bul = (id: string) => yaz(tum.filter((c) => c.includes(`[[${id}]]`)).slice(0, 1));
  const B = KABUK.bilgiler;
  const G = KABUK.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: { kapak: gorselli(G.kapak), sils: gorselli(G.sils), laugen: gorselli(G.laugen) },
    metin: {
      renk: yaz(ad[0]),
      maillard: yaz(ad[1]),
      karamel: yaz(ad[2]),
      koku: yaz(ad[3]),
      naoh: yaz(ad[4]),
      akrilamid: yaz(ad[5]),
    },
    kilit: { renk: bul(B.renk), maltoz: bul(B.maltoz), hmf: bul(B.hmf), akrilamid: bul(B.akrilamid) },
    katman: { dis: bul(B.disKabuk), kabukta: bul(B.kabukta), kalanSu: bul(B.kalanSu) },
    olcum: { tost: yaz(tum.filter((c) => c.includes(`[[${B.tost}]]`)).slice(0, 2)), kavilca: bul(B.kavilca) },
  };
}

/** Raf sahnesinin metinleri: şüpheli cümleleri { bilgi, sira } ile anın metninden bulunur. */
function rafVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<RaftaIlkHaftaProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const anla = an.anla.map((b) => b.paragraflar.flatMap(splitHamCumleler));
  const tum = [...ad.flat(), ...anla.flat()];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const bul = (x: { bilgi: string; sira: number }) =>
    yaz(tum.filter((c) => c.includes(`[[${x.bilgi}]]`)).slice(x.sira, x.sira + 1));
  const B = RAF.bilgiler;
  const G = RAF.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      nisasta1: gorselli(G.nisasta1),
      nisasta2: gorselli(G.nisasta2),
      panko: gorselli(G.panko),
    },
    metin: {
      basla: yaz(ad[0]),
      ilk24: bul({ bilgi: B.ilk24, sira: 0 }),
      nisasta: yaz(ad[1]),
      retro: yaz(ad[2]),
      ikiHiz: yaz(anla[1].slice(0, 3)),
      sertlesme: yaz([...ad[3], ...ad[4]]),
      hiz: bul({ bilgi: B.hiz, sira: 0 }),
      olcum: yaz(ad[5]),
    },
    supheliler: RAF.supheliler.map((sp) => ({
      ad: sp.ad,
      lehine: <>{sp.lehine.map((x, i) => <span key={i}>{bul(x)} </span>)}</>,
      ama: <>{sp.ama.map((x, i) => <span key={i}>{bul(x)} </span>)}</>,
    })),
    karar: bul(RAF.karar),
  };
}

/** Tane sahnesinin metinleri: adımlar sahnelere; iki sayım ve takvim cümleleri bilgi kimliğiyle bulunur. */
function taneVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<OlgunTaneProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const tum = [...ad.flat(), ...an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler))];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const atifli = (id: string) => tum.filter((c) => c.includes(`[[${id}]]`));
  const B = TANE.bilgiler;
  const G = TANE.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      nisasta: gorselli(G.nisasta),
      polarize: gorselli(G.polarize),
      gluten: gorselli(G.gluten),
    },
    metin: {
      kisimlar: yaz(ad[0]),
      endosperm: yaz(ad[1]),
      granul: yaz(ad[2]),
      protein: yaz(ad[3]),
      gluten: yaz(ad[4]),
      ikiSayim: yaz(atifli(B.granul).filter((c) => c.includes(`%${TANE.granul.alan}`)).slice(0, 1)),
      takvim: yaz([...atifli("tane_yapisi.granul_olusum_zamani_parker").slice(0, 1), ...atifli(B.zaman).slice(0, 2)]),
    },
  };
}

/** Değirmen sahnesinin metinleri: adımlar sahnelere; su, ilişki ve aralık cümleleri bilgi kimliğiyle bulunur. */
function degirmenVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<DegirmenTasindaProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const tum = [...ad.flat(), ...an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler))];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const ilk = (id: string) => tum.filter((c) => c.includes(`[[${id}]]`)).slice(0, 1);
  const B = DEGIRMEN.bilgiler;
  const G = DEGIRMEN.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      tavlama: gorselli(G.tavlama),
      tas: gorselli(G.tas),
      polarize: gorselli(G.polarize),
      iyot: gorselli(G.iyot),
    },
    metin: {
      tas: yaz(ad[0]),
      tavlama: yaz(ad[1]),
      kuvvet: yaz(ad[2]),
      hasar: yaz(ad[3]),
      kristal: yaz(ad[4].slice(0, 1)),
      su: yaz(ilk(B.su)),
      suKorelasyon: yaz(ilk(B.suKorelasyon)),
      olcum: yaz(ad[5]),
      seker: yaz(ad[6]),
      olculu: yaz([...ilk(B.hacim), ...ilk(B.olculu)]),
      dusme: yaz(ilk(B.dusme)),
    },
  };
}

/** Yoğurma sahnesinin metinleri: adımlar sahnelere; evre, köprü, gözenek ve süre cümleleri bilgi kimliğiyle bulunur. */
function yogurmaVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<YogurmaTezgahiProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const anla = an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler));
  const tum = [...anla, ...an.yuzlesme.flatMap((y) => splitHamCumleler(y.cevap))];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const hepsi = (id: string, cs = tum) => cs.filter((c) => c.includes(`[[${id}]]`));
  const ilk = (id: string) => hepsi(id).slice(0, 1);
  const B = YOGURMA.bilgiler;
  const G = YOGURMA.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      gluten: gorselli(G.gluten),
      nisasta: gorselli(G.nisasta),
      tepe: gorselli(G.tepe),
    },
    metin: {
      ag: yaz(ad[0]),
      aile: yaz(ad[2]),
      denge: yaz(ilk(B.denge)),
      kompozit: yaz(ad[4].slice(0, 1)),
      direnc: yaz(ad[1]),
      evre: yaz(hepsi(B.evre, anla)),
      iskelet: yaz([...ilk(B.iskelet), ...ilk(B.makro)]),
      kopma: yaz([...ad[3].slice(0, 1), ...ilk(B.uzun)]),
      gaz: yaz(ilk(B.gaz)),
      gozenek: yaz(ad[4].slice(1)),
      hacim: yaz(hepsi(B.hacim)),
      cwrs: yaz(ilk(B.cwrs)),
      tokat: yaz(ilk(B.tokat)),
    },
  };
}

/** Gaz sahnesinin metinleri: adımlar sahnelere; baskı, hacim, Ehrlich ve ester cümleleri bilgi kimliğiyle bulunur. */
function gazVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<GazVeKabarmaProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const anla = an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler));
  const tum = [...anla, ...an.yuzlesme.flatMap((y) => splitHamCumleler(y.cevap))];
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const hepsi = (id: string, cs = tum) => cs.filter((c) => c.includes(`[[${id}]]`));
  const ilk = (id: string) => hepsi(id).slice(0, 1);
  const B = GAZ.bilgiler;
  const G = GAZ.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      hucre: gorselli(G.hucre),
      tasan: gorselli(G.tasan),
      torula: gorselli(G.torula),
    },
    metin: {
      hucre: yaz(ad[0].slice(0, 2)),
      gliserol: yaz([...ad[0].slice(2), ...ilk(B.gpd1)]),
      kabarma: yaz(ad[2].slice(0, 1)),
      baski: yaz(ad[1].slice(0, 1)),
      tukenme: yaz(ad[2].slice(1)),
      maltoz: yaz(ad[1].slice(1, 2)),
      ayni: yaz(anla.filter((c) => c.startsWith("Gazın da kokunun da kaynağı aynı dönüşümdür"))),
      ag: yaz(ad[3].slice(0, 2)),
      reoloji: yaz(ad[3].slice(2)),
      hacim: yaz([...ad[4].slice(0, 1), ...hepsi(B.hacim, anla).filter((c) => c.includes(`${GAZ.hacimSicaklik} °C`))]),
      genlesme: yaz(ad[4].slice(1)),
      sonGaz: yaz(ilk(B.sonGaz)),
      ehrlich: yaz([...ilk(B.ehrlichYol), ...ilk(B.oncul)]),
      ehrlichUc: yaz(ilk(B.ehrlich)),
      etkin: yaz([...ilk(B.etkin), ...ilk(B.asetoin)]),
      tdel: yaz([...ad[5].slice(0, 1), ...ilk(B.tdelFark)]),
      ester: yaz(ad[5].slice(1)),
      pisirme: yaz([...ilk(B.esterKayip), ...ilk(B.etanol)]),
    },
  };
}

/** Gece sahnesinin metinleri: adımlar sahnelere; deney, ölçüm ve koku cümleleri bilgi kimliğiyle bulunur. */
function geceVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<GeceDolaptaProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const anla = an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler));
  const yuz = an.yuzlesme.flatMap((y) => splitHamCumleler(y.cevap));
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const hepsi = (id: string, cs = [...anla, ...yuz]) => cs.filter((c) => c.includes(`[[${id}]]`));
  const B = GECE.bilgiler;
  const G = GECE.gorseller;
  const deney = hepsi(B.deney, anla);
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      soguk: gorselli(G.soguk),
      topluluk: gorselli(G.topluluk),
    },
    metin: {
      sicaklik: yaz(hepsi(B.sicaklik, anla)),
      dolap: yaz(ad[0].slice(1)),
      deney: yaz(deney.slice(0, 1)),
      sicakVaris: yaz(deney.slice(2, 3)),
      sogukVaris: yaz([...deney.slice(1, 2), ...yuz.filter((c) => c.startsWith("Deneyde hamur iki sıcaklıkta"))]),
      ph: yaz(ad[4]),
      fitik: yaz(ad[5].slice(0, 1)),
      serin: yaz(ad[2]),
      ikiTur: yaz([...hepsi(B.ikiTur, anla), ...hepsi(B.birlikte, anla)]),
      ester: yaz([...hepsi(B.ester, anla), ...hepsi(B.esterYok, anla).slice(0, 1)]),
      durmaz: yaz(ad[5].slice(1)),
      tazelik: yaz(hepsi(B.tazelik, anla)),
      inanc: yaz([...hepsi(B.inanc, yuz), ...hepsi(B.duyusal, yuz)]),
    },
  };
}

/** Kesik sahnesinin metinleri: adımlar sahnelere; basınç, kabuk ve cetvel cümleleri bilgi kimliğiyle bulunur. */
function kesikVerisi(an: An, kartlar: Record<string, AtifKarti>, ust: string): Omit<KesikAtilincaProps, "children"> {
  const ad = an.gor.adimlar.map((a) => splitHamCumleler(a.metin));
  const anla = an.anla.flatMap((b) => b.paragraflar.flatMap(splitHamCumleler));
  const yuz = an.yuzlesme.flatMap((y) => splitHamCumleler(y.cevap));
  const yaz = (cs: string[]) => <Metin metin={cs.join(" ")} kartlar={kartlar} />;
  const hepsi = (id: string, cs = anla) => cs.filter((c) => c.includes(`[[${id}]]`));
  const B = KESIK.bilgiler;
  const G = KESIK.gorseller;
  return {
    ust,
    baslik: an.baslik,
    soru: an.soru,
    gorsel: {
      kapak: gorselli(G.kapak),
      cavdar: gorselli(G.cavdar),
      somun: gorselli(G.somun),
    },
    metin: {
      kisitli: yaz(ad[0]),
      hizli: yaz(ad[1]),
      dortOlay: yaz(hepsi(B.dortOlay)),
      acilma: yaz(hepsi(B.acilma)),
      sifir: yaz([...hepsi(B.basinc).slice(-1), ...ad[3].slice(1)]),
      kinetik: yaz(hepsi(B.kinetik)),
      kabukOlur: yaz(anla.filter((c) => c.startsWith("Kesikle açılan yüzey"))),
      cephe: yaz(ad[2]),
      ikiBolge: yaz([...hepsi(B.ikiBolge), ...ad[3].slice(0, 1)]),
      nem: yaz(hepsi(B.nem)),
      kalinlik: yaz(hepsi(B.kalinlik)),
      renk: yaz([...hepsi(B.olusum).slice(0, 1), ...hepsi(B.baslangic, yuz), ...hepsi(B.kosul, yuz), ...hepsi(B.ideal)]),
      sonHacim: yaz([...hepsi(B.hiz).slice(0, 1), ...hepsi(B.sonHacim)]),
      gaz: yaz(hepsi(B.gaz)),
      efsane: yaz([...hepsi(B.efsane, yuz).slice(-1), ...hepsi(B.ozgul, yuz)]),
    },
  };
}

export default async function AnSayfasi({ params }: PageProps) {
  const { an: id } = await params;
  const sira = getAnKimlikleri();
  const idx = sira.indexOf(id);
  if (idx < 0) notFound();

  const an = getAn(id);
  const durak = getYolculuk().duraklar.find((d) => d.id === an.durak);
  const ust = `Levha ${String(idx + 1).padStart(2, "0")} · ${durak?.ad ?? ""}`;
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

  const onceki = idx > 0 ? getAn(sira[idx - 1]) : null;
  const sonraki = idx < sira.length - 1 ? getAn(sira[idx + 1]) : null;

  const okuma = (
    <>
      <section className={s.oku} aria-labelledby="anla">
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
        <section className={s.oku} aria-labelledby="yuzlesme">
          <h2 id="yuzlesme" className={s.bolumAd}>
            Yüzleşme
            <small>Yaygın bir inanç ve ölçümlerin söyledikleri</small>
          </h2>
          <div className={s.govde}>
            {an.yuzlesme.map((y) => (
              <div key={y.inanc}>
                <p className={s.inanc}>“{y.inanc}”</p>
                <p>
                  <Metin metin={y.cevap} kartlar={kartlar} />
                </p>
              </div>
            ))}
            <Link href={`/bilim/efsaneler#${an.id}`} className={s.dosyaBag}>
              Bütün inançlar: Efsane dosyası →
            </Link>
          </div>
        </section>
      )}

      {an.baglar.length > 0 && (
        <section className={s.oku} aria-labelledby="baglar">
          <h2 id="baglar" className={s.bolumAd}>
            Neden, sonuç
            <small>Neyi değiştirirsen ne olur</small>
          </h2>
          <div className={s.govde}>
            {an.baglar.map((b) => (
              <div key={b.kaldirac} className={s.bag}>
                <dl>
                  <dt>Kaldıraç</dt>
                  <dd className={s.kaldirac}>{b.kaldirac}</dd>
                  <dt>Mekanizma</dt>
                  <dd>{b.mekanizma}</dd>
                  <dt>Sonuç</dt>
                  <dd>
                    {b.sonuc} <KanitDugmesi ids={b.bilgiler} kartlar={kartlar} />
                  </dd>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}

      {an.ayrisan_kaynaklar.length > 0 && (
        <section className={s.oku} aria-labelledby="ayrisan">
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
        <section className={s.oku} aria-labelledby="karakterler">
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

      <section className={s.oku} aria-labelledby="kanit">
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
        <Link href={onceki ? `/bilim/${onceki.id}` : "/bilim"}>
          <span className={s.levhaNo}>← {onceki ? `Levha ${String(idx).padStart(2, "0")}` : "Dizin"}</span>
          <span className={s.levhaAd}>{onceki?.baslik ?? "Ekmeğin yolculuğu"}</span>
        </Link>
        <Link href={sonraki ? `/bilim/${sonraki.id}` : "/bilim"}>
          <span className={s.levhaNo}>{sonraki ? `Levha ${String(idx + 2).padStart(2, "0")}` : "Dizin"} →</span>
          <span className={s.levhaAd}>{sonraki?.baslik ?? "Ekmeğin yolculuğu"}</span>
        </Link>
      </nav>
    </>
  );

  const bayrak = an.id === ILK_ON_GUN.an;
  let govde;
  if (bayrak) {
    govde = <IlkOnGun {...ilkOnGunVerisi(an, kartlar, ust)}>{okuma}</IlkOnGun>;
  } else if (an.id === FIRIN_DENEYI.an) {
    govde = <FirinSekizDakika {...firinVerisi(an, kartlar, ust)}>{okuma}</FirinSekizDakika>;
  } else if (an.id === KABUK.an) {
    govde = <KabukKizarmasi {...kabukVerisi(an, kartlar, ust)}>{okuma}</KabukKizarmasi>;
  } else if (an.id === RAF.an) {
    govde = <RaftaIlkHafta {...rafVerisi(an, kartlar, ust)}>{okuma}</RaftaIlkHafta>;
  } else if (an.id === TANE.an) {
    govde = <OlgunTane {...taneVerisi(an, kartlar, ust)}>{okuma}</OlgunTane>;
  } else if (an.id === DEGIRMEN.an) {
    govde = <DegirmenTasinda {...degirmenVerisi(an, kartlar, ust)}>{okuma}</DegirmenTasinda>;
  } else if (an.id === YOGURMA.an) {
    govde = <YogurmaTezgahi {...yogurmaVerisi(an, kartlar, ust)}>{okuma}</YogurmaTezgahi>;
  } else if (an.id === GAZ.an) {
    govde = <GazVeKabarma {...gazVerisi(an, kartlar, ust)}>{okuma}</GazVeKabarma>;
  } else if (an.id === GECE.an) {
    govde = <GeceDolapta {...geceVerisi(an, kartlar, ust)}>{okuma}</GeceDolapta>;
  } else if (an.id === KESIK.an) {
    govde = <KesikAtilinca {...kesikVerisi(an, kartlar, ust)}>{okuma}</KesikAtilinca>;
  } else {
    // Şekiller adım sırasıyla numaralanır; görseli olmayan adım önceki şekli tutar.
    const sekiller: SahneSekli[] = [];
    const adimlar: SahneAdimi[] = an.gor.adimlar.map((a) => {
      if (a.gorsel && !sekiller.some((x) => x.id === a.gorsel)) {
        const g = gorselli(a.gorsel);
        sekiller.push({ id: a.gorsel, no: `Şek. ${idx + 1}.${sekiller.length + 1}`, dosya: g.src, alt: g.alt, kunye: g.kunye });
      }
      const sekil = a.gorsel ? sekiller.findIndex((x) => x.id === a.gorsel) : -1;
      return { govde: <Metin metin={a.metin} kartlar={kartlar} />, sekil, vurgu: a.vurgu };
    });
    adimlar.forEach((a, i) => {
      if (a.sekil < 0) a.sekil = i > 0 ? adimlar[i - 1].sekil : 0;
    });
    govde = (
      <>
        <Sahne ust={ust} baslik={an.baslik} soru={an.soru} sekiller={sekiller} adimlar={adimlar} />
        {okuma}
      </>
    );
  }

  return (
    <div
      className={s.oda}
      data-oda
      style={{ "--zemin": bayrak ? asitlikZemini(0) : DURAK_ZEMIN[an.durak] } as CSSProperties}
    >
      {govde}
      <KaynakPaneli kartlar={kartlar} />
    </div>
  );
}
