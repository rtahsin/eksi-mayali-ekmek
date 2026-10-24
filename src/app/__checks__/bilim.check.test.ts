import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getAn,
  getAnKimlikleri,
  getDugum,
  getDugumKimlikleri,
  getGorseller,
  getKarakter,
  getKarakterKimlikleri,
  getKaynaklar,
  getYolculuk,
  resolveAtif,
} from "@/lib/bilim/server";
import {
  DEGIRMEN,
  DURAK_ZEMIN,
  FIRIN_DENEYI,
  GAZ,
  GECE,
  ILK_ON_GUN,
  KABUK,
  KESIK,
  KOPRU_ADAYLARI,
  RAF,
  TANE,
  YOGURMA,
  virgullu,
  findAtiflar,
  splitCumleler,
  splitHamCumleler,
  type An,
  type Karakter,
} from "@/lib/bilim";
import { findHealthTerms } from "@/lib/knowledge/lint";

// content/bilim/ bütünlüğü: bilim hattının kapısı (arastirma/bilim_isler/kontrol.py) üretirken uygular, bu test sitede korur.

const anlar = getAnKimlikleri().map(getAn);
const kartlar = getKarakterKimlikleri().map(getKarakter);

function anMetinleri(an: An): string[] {
  return [
    ...an.gor.adimlar.map((a) => a.metin),
    ...an.anla.flatMap((b) => b.paragraflar),
    ...an.yuzlesme.map((y) => y.cevap),
  ];
}

function kartMetinleri(k: Karakter): string[] {
  return [k.tek_cumle, ...k.bolumler.flatMap((b) => b.cumleler), ...(k.efsane ? [k.efsane] : [])];
}

const metinler: [string, string][] = [
  ...anlar.flatMap((a) => anMetinleri(a).map((m): [string, string] => [`an:${a.id}`, m])),
  ...kartlar.flatMap((k) => kartMetinleri(k).map((m): [string, string] => [`kart:${k.id}`, m])),
];

describe("content/bilim bütünlüğü", () => {
  it("yolculuktaki her anın dosyası var, fazladan dosya yok, durak ve başlık tutuyor", () => {
    const dosyalar = fs
      .readdirSync(path.join(process.cwd(), "content", "bilim", "anlar"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(dosyalar).toEqual([...getAnKimlikleri()].sort());
    for (const durak of getYolculuk().duraklar) {
      for (const a of durak.anlar) {
        const an = getAn(a.id);
        expect(an.durak, a.id).toBe(durak.id);
        expect(an.baslik, a.id).toBe(a.baslik);
      }
    }
  });

  it("her karakterin kartı var; anlar ve kartlar birbirini doğru gösteriyor", () => {
    const karakterler = getYolculuk().karakterler.map((k) => k.id).sort();
    expect(getKarakterKimlikleri()).toEqual(karakterler);
    const anKimlikleri = new Set(getAnKimlikleri());
    for (const an of anlar) {
      for (const k of an.karakterler) expect(karakterler, `an:${an.id}`).toContain(k);
    }
    for (const k of kartlar) {
      for (const a of k.anlar) expect(anKimlikleri.has(a), `kart:${k.id} → ${a}`).toBe(true);
    }
  });

  it("metinlerdeki her atıf bir bilgiye ya da sözlük tanımına çözülür", () => {
    const cozulmeyen = metinler.flatMap(([yer, m]) =>
      findAtiflar(m)
        .filter((id) => !resolveAtif(id))
        .map((id) => `${yer}: ${id}`)
    );
    expect(cozulmeyen).toEqual([]);
  });

  it("kanıt, bağ ve ayrışan kaynak listelerindeki her bilgi var", () => {
    const eksik = anlar.flatMap((an) =>
      [
        ...an.kanit.cekirdek,
        ...an.kanit.cekmece,
        ...an.baglar.flatMap((b) => b.bilgiler),
        ...an.ayrisan_kaynaklar.flatMap((k) => k.bilgiler),
      ]
        .filter((id) => !resolveAtif(id))
        .map((id) => `an:${an.id}: ${id}`)
    );
    expect(eksik).toEqual([]);
  });

  it("soru olmayan her uzun cümle en az bir bilgiye dayanır", () => {
    const atifsiz = metinler.flatMap(([yer, m]) =>
      splitCumleler(m)
        .filter((c) => c.atiflar.length === 0 && !c.govde.trimEnd().endsWith("?") && c.govde.split(/\s+/).length > 6)
        .map((c) => `${yer}: ${c.govde.slice(0, 70)}`)
    );
    expect(atifsiz).toEqual([]);
  });

  it("düğüm dosyaları yalnız kendi bilgilerini taşır ve her kaynak kayıtlı", () => {
    const kaynaklar = getKaynaklar();
    const gorulen = new Set<string>();
    for (const d of getDugumKimlikleri()) {
      for (const b of getDugum(d).bilgiler) {
        expect(b.id.split(".")[0], b.id).toBe(d);
        expect(gorulen.has(b.id), `yinelenen: ${b.id}`).toBe(false);
        gorulen.add(b.id);
        for (const k of b.kaynaklar) expect(kaynaklar[k.kaynak], `${b.id} → ${k.kaynak}`).toBeDefined();
      }
    }
  });

  it("her görsel kayıtlı, dosyası public/ altında; kayıtta ve klasörde kullanılmayan görsel yok", () => {
    const gorseller = getGorseller();
    const kullanilan = new Set([
      ...anlar.flatMap((a) => a.gor.adimlar.flatMap((s) => (s.gorsel ? [s.gorsel] : []))),
      ...kartlar.flatMap((k) => k.gorseller),
    ]);
    for (const id of kullanilan) expect(gorseller[id], id).toBeDefined();
    expect(Object.keys(gorseller).filter((id) => !kullanilan.has(id))).toEqual([]);
    const dosyalar = new Set(Object.values(gorseller).map((g) => g.dosya));
    for (const d of dosyalar) expect(fs.existsSync(path.join(process.cwd(), "public", d)), d).toBe(true);
    const klasor = fs.readdirSync(path.join(process.cwd(), "public", "bilim", "gorsel"));
    expect(klasor.filter((f) => !dosyalar.has(`/bilim/gorsel/${f}`))).toEqual([]);
  });

  it("her durağın zemin rengi var", () => {
    expect(getYolculuk().duraklar.filter((d) => !DURAK_ZEMIN[d.id]).map((d) => d.id)).toEqual([]);
  });

  it("ilk 10 gün sahnesinin dayandığı görseller ve cümleler yerinde", () => {
    const gorseller = getGorseller();
    const ids = [...Object.values(ILK_ON_GUN.gorseller), ...ILK_ON_GUN.serit, ...ILK_ON_GUN.durumlar.map((d) => d.gorsel)];
    expect(ids.filter((g) => !gorseller[g])).toEqual([]);
    const an = getAn(ILK_ON_GUN.an);
    // sahneler adımlara göre bölünür: 6 adım, 5. adımda en az iki cümle (sahte kabarma + devir)
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(6);
    expect(splitHamCumleler(an.gor.adimlar[4].metin).length).toBeGreaterThanOrEqual(2);
    const metin = anMetinleri(an).join(" ");
    expect(ILK_ON_GUN.durumlar.filter((d) => !metin.includes(`[[${d.bilgi}]]`)).map((d) => d.bilgi)).toEqual([]);
  });

  it("fırın sahnesinin her sayısı dayandığı bilgide geçiyor", () => {
    const B = FIRIN_DENEYI.bilgiler;
    const metin = (id: string) => resolveAtif(id)?.tur === "bilgi" ? (resolveAtif(id) as { bilgi: { metin: string } }).bilgi.metin : "";
    const eksik: string[] = [];
    for (const f of FIRIN_DENEYI.firinlar) {
      if (!metin(B.hacim).includes(`${f.c} °C'de %${f.hacim3}`)) eksik.push(`hacim ${f.c}/${f.hacim3}`);
      if (!metin(B.merkez).includes(String(f.merkez100))) eksik.push(`merkez ${f.merkez100}`);
    }
    if (!metin(B.hacim).includes("3 dakikada") || !metin(B.hacim).includes("6. dakika")) eksik.push("durma dakikaları");
    if (!metin(B.maya).includes("50 °C")) eksik.push("maya 50");
    if (!metin(B.gluten).includes("90 °C")) eksik.push("gluten 90");
    if (!metin(B.bolge).includes("100 °C")) eksik.push("bölge 100");
    expect(eksik).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(FIRIN_DENEYI.gorseller).filter((g) => !gorseller[g])).toEqual([]);
    // sahneler adımların cümlelerine göre bölünür (FirinSekizDakika: firinVerisi)
    const enAz = [2, 4, 2, 1, 4, 4, 5];
    const ad = getAn(FIRIN_DENEYI.an).gor.adimlar.map((a) => splitHamCumleler(a.metin).length);
    expect(enAz.filter((n, i) => (ad[i] ?? 0) < n)).toEqual([]);
  });

  it("kabuk sahnesinin eşikleri ve ölçümleri dayandığı bilgide geçiyor", () => {
    const B = KABUK.bilgiler;
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const beklenen: [string, string][] = [
      [B.renk, virgullu(KABUK.renkAw)],
      [B.renk, `${KABUK.renkC} °C`],
      [B.maltoz, `${KABUK.maltozC} °C`],
      [B.hmf, virgullu(KABUK.hmfAw)],
      [B.akrilamid, `${KABUK.akrilamidC} °C`],
      ...KABUK.tost.flatMap((t): [string, string][] => [
        [B.tost, `${t.firin} °C`],
        [B.tost, `${t.ic} °C`],
        [B.tost, String(t.indeks)],
      ]),
      [B.kavilca, KABUK.kavilca.kavilca],
      [B.kavilca, KABUK.kavilca.beyaz],
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    expect(getAn(KABUK.an).gor.adimlar.length).toBeGreaterThanOrEqual(6); // kabukVerisi 6 adımı sahnelere böler
    const an = anMetinleri(getAn(KABUK.an)).join(" ");
    expect(KABUK.kokular.filter((k) => !an.includes(k))).toEqual([]);
    expect(Object.values(B).filter((id) => !an.includes(`[[${id}]]`))).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(KABUK.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("raf sahnesinin sayıları bilgide, şüpheli cümleleri anın metninde", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = RAF.bilgiler;
    const beklenen: [string, string][] = [
      [B.ilk24, "24 saat"],
      [B.dsc, RAF.dscAralik.replace(" °C", "")],
      [B.yuzElli, "150"],
      ...RAF.hizlar.flatMap((h): [string, string][] => [
        [B.hiz, h.en],
        [B.hiz, h.cok],
      ]),
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(RAF.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(6); // rafVerisi 6 adımı ve 2. Anla bölümünü kullanır
    expect(an.anla.length).toBeGreaterThanOrEqual(2);
    const tum =[...an.gor.adimlar.map((a) => a.metin), ...an.anla.flatMap((b) => b.paragraflar)].flatMap(splitHamCumleler);
    const secimler = [...RAF.supheliler.flatMap((s) => [...s.lehine, ...s.ama]), RAF.karar];
    const eksik = secimler.filter((x) => tum.filter((c) => c.includes(`[[${x.bilgi}]]`)).length <= x.sira);
    expect(eksik).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(RAF.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("tane sahnesinin sayıları bilgide geçiyor", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = TANE.bilgiler;
    const beklenen: [string, string][] = [
      ...TANE.oranlar.map((o): [string, string] => [B.oran, `%${o.yazi}`]),
      [B.protein, `%${TANE.protein.tepe}`],
      [B.yuzMikron, `%${TANE.protein.pay}`],
      [B.yuzMikron, `${TANE.protein.mikron} µm`],
      [B.granul, `%${TANE.granul.alan}`],
      [B.granul, `%${TANE.granul.sayi}`],
      [B.zaman, "3–5. gün"],
      [B.zaman, "11, 15 veya 12–16"],
      [B.gluten, "10 gün"],
      [B.gluten, "20 gün"],
      [B.aleron, "21 gün"],
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(TANE.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(5); // taneVerisi 5 adımı kullanır
    const metinler = anMetinleri(an).flatMap(splitHamCumleler);
    expect(metinler.some((c) => c.includes(`[[${B.granul}]]`) && c.includes(`%${TANE.granul.alan}`))).toBe(true);
    expect(metinler.some((c) => c.includes("[[tane_yapisi.granul_olusum_zamani_parker]]"))).toBe(true);
    const gorseller = getGorseller();
    expect(Object.values(TANE.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("değirmen sahnesinin sayıları bilgide geçiyor", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = DEGIRMEN.bilgiler;
    const beklenen: [string, string][] = [
      [B.su, `%${DEGIRMEN.saglam.en} ile %${DEGIRMEN.saglam.cok}`],
      [B.su, `%${DEGIRMEN.kirik.en} ile %${DEGIRMEN.kirik.cok}`],
      [B.suKorelasyon, "0,729"],
      [B.hacim, "-0,866"],
      [B.olculu, `%${DEGIRMEN.olculu.en}–${DEGIRMEN.olculu.cok}`],
      [B.seker, `%${DEGIRMEN.sekerPay}`],
      [B.dusme, `${DEGIRMEN.dusme.en} ile ${DEGIRMEN.dusme.cok} saniye`],
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(DEGIRMEN.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(7); // degirmenVerisi 7 adımı kullanır
    const cumleler = anMetinleri(an).join(" ");
    expect(Object.values(B).filter((id) => !cumleler.includes(`[[${id}]]`))).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(DEGIRMEN.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("yoğurma sahnesinin sayıları bilgide geçiyor", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = YOGURMA.bilgiler;
    const { yuksek: y, dusuk: d } = YOGURMA;
    const beklenen: [string, string][] = [
      [B.evre, `${y.gelisme}, ${y.tepe} ve ${y.cokme}. dakikada`],
      [B.evre, `${d.gelisme}, ${d.tepe} ve ${d.cokme}. dakikada`],
      [B.evre, `${YOGURMA.asiri}. dakika aşırı yoğurma`],
      [B.uzun, `(${YOGURMA.uzunDakika} dakika)`],
      [B.cwrs, `${YOGURMA.cwrs.rafine} dakika`],
      [B.cwrs, `${YOGURMA.cwrs.tam} dakika`],
      [B.tokat, `${YOGURMA.tokat.sicaklik} °C'de ${YOGURMA.tokat.en}–${YOGURMA.tokat.cok} dakika`],
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(YOGURMA.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(5); // yogurmaVerisi 5 adımı kullanır
    const anla = an.anla.flatMap((b) => b.paragraflar).flatMap(splitHamCumleler);
    expect(anla.filter((c) => c.includes(`[[${B.evre}]]`)).length).toBe(2); // iki unun evre cümlesi
    const cumleler = anMetinleri(an).join(" ");
    expect(Object.values(B).filter((id) => !cumleler.includes(`[[${id}]]`))).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(YOGURMA.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("gaz sahnesinin sayıları ve adları bilgide geçiyor", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = GAZ.bilgiler;
    const [v, i, l] = GAZ.ehrlich;
    const beklenen: [string, string][] = [
      [B.hacim, `${GAZ.hacimKat} katına`],
      [B.sonGaz, `%${GAZ.sonGazPay}'inin üzerine`],
      [B.gpd1, `%${GAZ.gpd1.en}–${GAZ.gpd1.cok} daha düşük`],
      [B.etanol, `ilk ${GAZ.etanolDakika} dakikaya`],
      [B.ehrlich, `${v.bilesik}, ${i.bilesik} ve ${l.bilesik} sırasıyla mayanın ${v.amino}, ${i.amino} ve ${l.amino}`],
      [B.ester, `${GAZ.esterler.slice(0, 3).join(", ")} ve ${GAZ.esterler[3]}`],
      [B.baski, "glukoz ve fruktoz varlığında"],
    ];
    const bulunamayan = beklenen.filter(([id, s]) => !metin(id).toLowerCase().includes(s.toLowerCase()));
    expect(bulunamayan.map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(GAZ.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(6); // gazVerisi 6 adımı kullanır
    const cumleler = anMetinleri(an).flatMap(splitHamCumleler);
    const donusum = cumleler.find((c) => c.includes(`[[${B.donusum}]]`)) ?? "";
    expect(GAZ.urunler.filter((u) => !donusum.includes(u))).toEqual([]);
    expect(cumleler.some((c) => c.includes(`${GAZ.hacimSicaklik} °C`) && c.includes(`[[${B.hacim}]]`))).toBe(true);
    expect(cumleler.some((c) => c.startsWith("Gazın da kokunun da kaynağı aynı dönüşümdür"))).toBe(true);
    expect(Object.values(B).filter((id) => !cumleler.some((c) => c.includes(`[[${id}]]`)))).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(GAZ.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("gece sahnesinin sayıları ve adları bilgide geçiyor", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = GECE.bilgiler;
    const { soguk, sicak, yukseklik } = GECE.deney;
    const beklenen: [string, string][] = [
      [B.sicaklik, `tipik sıcaklık ${GECE.endustriyel} °C`],
      [B.sicaklik, `${GECE.mayaOptimum} °C`],
      [B.sicaklik, `${GECE.geciktirme} °C gibi düşük`],
      [B.dolap, `${GECE.dolap} °C`],
      [B.deney, `${yukseklik} cm yüksekliğe`],
      [B.deney, `${soguk.sicaklik} °C'de kilogram una ${soguk.maya} g mayayla ${soguk.saat} saatten`],
      [B.deney, `${sicak.sicaklik} °C'de ${sicak.maya} g mayayla ${sicak.dakika} dakikaya`],
      [B.ph, `${GECE.ph.once[0]} °C ve ${GECE.ph.once[1]} °C`],
      [B.ph, `${GECE.ph.dolap} °C'de ${GECE.ph.saat} saat`],
      [B.ph, `${GECE.ph.degerler[0]} ve ${GECE.ph.degerler[1]}`],
      [B.fitik, `${GECE.ph.dolap} °C'de ${GECE.ph.saat} saatlik`],
      [B.fitik, `%${GECE.fitikAzalma} azaldı`],
      [B.serin, `${GECE.serin.en}–${GECE.serin.cok} °C`],
      [B.labOptimum, `${GECE.labOptimum.en} ile ${GECE.labOptimum.cok} °C`],
      [B.ikiTur, `${GECE.khumOptimum.en}–${GECE.khumOptimum.cok} °C`],
      [B.ikiTur, `${GECE.fsanOptimum.en}–${GECE.fsanOptimum.cok} °C`],
      [B.ester, `${GECE.esterler[0]}, ${GECE.esterler[1]} ve ${GECE.esterler[2]}`],
      [B.ester, `${GECE.esterKarsi[0]} ve ${GECE.esterKarsi[1]} °C'ye göre`],
      [B.ester, `en yüksek olanı ${GECE.esterler[1]}`],
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(GECE.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(6); // geceVerisi 6 adımı kullanır
    const cumleler = anMetinleri(an).flatMap(splitHamCumleler);
    expect(Object.values(B).filter((id) => !cumleler.some((c) => c.includes(`[[${id}]]`)))).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(GECE.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("kesik sahnesinin sayıları bilgide geçiyor", () => {
    const metin = (id: string) => {
      const a = resolveAtif(id);
      return a?.tur === "bilgi" ? a.bilgi.metin : "";
    };
    const B = KESIK.bilgiler;
    const { esmerlesme: e, ideal } = KESIK;
    const beklenen: [string, string][] = [
      [B.kinetik, `${KESIK.kenar.sn} saniyede yaklaşık ${KESIK.kenar.mm} mm`],
      [B.kinetik, `${KESIK.eksen.sn} saniyede yaklaşık ${KESIK.eksen.mm} mm`],
      [B.nem, `%${KESIK.kabukNem.en}–${KESIK.kabukNem.cok}`],
      [B.nem, `${KESIK.icSicaklik} °C civarında`],
      [B.olusum, `${KESIK.icSicaklik} °C'yi aşıp`],
      [B.baslangic, `bazıları ${e.bazi} °C, bazıları ${e.digerleri.en}–${e.digerleri.cok} °C`],
      [B.baslangic, `${e.esas} °C'yi esas`],
      [B.kosul, `${KESIK.renkKosul.sicaklik} °C'nin üzerinde`],
      [B.kosul, `${KESIK.renkKosul.aw}'nın altında`],
      [B.ideal, `${ideal.acik} (L*)`],
      [B.ideal, `${ideal.en}–${ideal.cok} °C`],
      [B.sonHacim, `${KESIK.ayarlar[2]} °C`],
      [B.gaz, `%${KESIK.gazPay.en}–${KESIK.gazPay.cok} gaz`],
      [B.ozgul, `${KESIK.ozgul.en} ile ${KESIK.ozgul.cok}`],
    ];
    expect(beklenen.filter(([id, s]) => !metin(id).includes(s)).map(([id, s]) => `${id}: ${s}`)).toEqual([]);
    const an = getAn(KESIK.an);
    expect(an.gor.adimlar.length).toBeGreaterThanOrEqual(5); // kesikVerisi 5 adımı kullanır
    const cumleler = anMetinleri(an).flatMap(splitHamCumleler);
    expect(cumleler.some((c) => c.startsWith("Kesikle açılan yüzey") && c.includes(`[[${B.tanim}]]`))).toBe(true);
    expect(cumleler.some((c) => c.includes(KESIK.ayarlar.map((a) => `${a}`).join(", ").replace(/, (\d+)$/, " ve $1")))).toBe(true);
    expect(Object.values(B).filter((id) => !cumleler.some((c) => c.includes(`[[${id}]]`)))).toEqual([]);
    const gorseller = getGorseller();
    expect(Object.values(KESIK.gorseller).filter((g) => !gorseller[g])).toEqual([]);
  });

  it("metinlerde sağlık sözcüğü yok", () => {
    // "çökmesini önler", "gaz tutulumunu iyileştirir" gibi teknik kullanımlar fayda iddiası değildir;
    // genel fiil ancak yanında sağlık terimi varsa iddia olur. SAGLIK, hattın kapısıyla (kontrol.py) aynıdır.
    const GENEL_FIIL = ["önler", "korur", "iyileştir", "zayıflat"];
    const SAGLIK = /sağlık|şifa|sindirim|bağırsak|kan şekeri|glisemik|kanser|faydalı|bağışıklık|detoks/i;
    const bulunan = metinler.flatMap(([yer, m]) =>
      splitCumleler(m)
        .map((c) => c.govde)
        .filter((c) => SAGLIK.test(c) || findHealthTerms(c).some((t) => !GENEL_FIIL.includes(t)))
        .map((c) => `${yer}: ${c.slice(0, 70)}`)
    );
    expect(bulunan).toEqual([]);
  });

  it("QR köprüsünün adayları yolculukta var; ürün sayfasına giden başlık ve sorularda sağlık terimi yok", () => {
    // Ürün sayfalarında sağlık terimi hiç geçmez (AGENTS.md §7); köprü oraya anın başlığını ve sorusunu taşır.
    const kimlikler = new Set(getAnKimlikleri());
    expect(KOPRU_ADAYLARI.filter((id) => !kimlikler.has(id))).toEqual([]);
    const SAGLIK = /sağlık|şifa|sindirim|bağırsak|kan şekeri|glisemik|kanser|faydalı|bağışıklık|detoks/i;
    const bulunan = KOPRU_ADAYLARI.map(getAn)
      .flatMap((an) => [an.baslik, an.soru])
      .filter((m) => SAGLIK.test(m) || findHealthTerms(m).length > 0);
    expect(bulunan).toEqual([]);
  });
});
