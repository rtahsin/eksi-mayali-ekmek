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
  DURAK_ZEMIN,
  FIRIN_DENEYI,
  ILK_ON_GUN,
  KABUK,
  RAF,
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
});
