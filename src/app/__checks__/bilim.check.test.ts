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
import { findAtiflar, splitCumleler, type An, type Karakter } from "@/lib/bilim";
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
