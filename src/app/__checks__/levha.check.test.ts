import { describe, expect, it } from "vitest";
import { LEVHALAR } from "@/lib/bilim/levhalar";
import { grafikBilgileri, type Grafik } from "@/lib/bilim/grafik";
import { getAn, getYolculuk, resolveAtif } from "@/lib/bilim/server";
import { findHealthTerms } from "@/lib/knowledge/lint";

// Levha düzeninin sayıları: ekranda görünen her sayı bağlı bilginin metninde geçer, çizilen her değer kendi
// etiketindeki sayıdan gelir ve bağlı bilgi anın metninde atıflıdır. Yazılar sağlık terimi taşımaz.

const norm = (s: string) => s.replace(/µ/g, "μ").replace(/(\d)\.(\d)/g, "$1,$2");
const sayilar = (s: string) => [...norm(s).matchAll(/\d+(?:,\d+)?/g)].map((m) => m[0]);
const sayi = (t: string) => Number(t.replace(",", "."));
const yakin = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));

function metin(id: string): string {
  const a = resolveAtif(id);
  if (!a || a.tur !== "bilgi") throw new Error(`bilgi yok: ${id}`);
  // koşul alanı bilginin parçasıdır: ölçümün yapıldığı koşulları (sıcaklık, oran) taşır
  return `${a.bilgi.metin} ${a.bilgi.kosul}`;
}

/** Yazıdaki sayılar, bilgilerin metinlerinde de sayı olarak geçiyor mu? Eksikleri döner. */
function eksikSayilar(yazi: string, bilgiler: string[], yer: string): string[] {
  const havuz = new Set(bilgiler.flatMap((b) => sayilar(metin(b))));
  return sayilar(yazi)
    .filter((n) => !havuz.has(n))
    .map((n) => `${yer}: "${yazi}" içindeki ${n}`);
}

/** Çizilen değer etiketteki bir sayıya (ya da sayı × çarpan'a) eşit mi? */
function etikettenMi(deger: number, etiket: string, carpan = 1): boolean {
  return sayilar(etiket).some((n) => yakin(deger, sayi(n)) || yakin(deger, sayi(n) * carpan));
}

function grafikSorunlari(g: Grafik, yer: string): string[] {
  const sorun: string[] = [];
  const hepsi = grafikBilgileri(g);
  sorun.push(...eksikSayilar(`${g.baslik} ${g.not ?? ""}`, hepsi, `${yer} başlık/not`));
  const deger = (d: number, etiket: string, carpan?: number) => {
    if (!etikettenMi(d, etiket, carpan)) sorun.push(`${yer}: ${d} değeri "${etiket}" etiketinden gelmiyor`);
  };
  switch (g.tur) {
    case "sutun":
      for (const o of g.ogeler) {
        sorun.push(...eksikSayilar(`${o.ad} ${o.etiket}`, [o.bilgi ?? g.bilgi], yer));
        deger(o.deger, o.etiket);
      }
      break;
    case "olcek":
      for (const s of g.satirlar) {
        sorun.push(...eksikSayilar(s.etiket, [s.bilgi ?? g.bilgi], yer));
        sorun.push(...eksikSayilar(s.ad, [s.bilgi ?? g.bilgi, g.bilgi], `${yer} satır adı`));
        for (const d of [s.nokta, s.pay, s.kadar, s.den, s.cizgi, ...(s.aralik ?? [])]) if (d !== undefined) deger(d, s.etiket, s.carpan);
      }
      break;
    case "pay":
      for (const q of [...g.parcalar, g.toplam]) {
        sorun.push(...eksikSayilar(q.etiket, [g.bilgi], yer));
        deger(q.deger, q.etiket);
      }
      break;
    case "cizgi":
      for (const n of g.noktalar) {
        sorun.push(...eksikSayilar(`${n.etiket} ${n.xEtiket}`, [g.bilgi], yer));
        deger(n.y, n.etiket);
        deger(n.x, n.xEtiket);
      }
      break;
    case "once_sonra":
      for (const p of g.paneller)
        for (const u of [p.once, p.sonra]) {
          sorun.push(...eksikSayilar(u.etiket, [g.bilgi], yer));
          for (const d of u.deger) deger(d, u.etiket);
        }
      break;
    case "sema":
      if (!metin(g.bilgi).includes("100 °C")) sorun.push(`${yer}: şemadaki 100 °C bilgide yok`);
      break;
  }
  return sorun;
}

function yazilar(g: Grafik): string[] {
  const ek =
    g.tur === "sutun" ? g.ogeler.map((o) => o.ad) : g.tur === "olcek" ? g.satirlar.map((s) => s.ad) : g.tur === "pay" ? g.parcalar.map((q) => q.ad) : g.tur === "once_sonra" ? g.paneller.map((p) => p.ad) : [];
  return [g.baslik, g.not ?? "", ...ek];
}

describe("levha düzeni: rakamlar ve grafikler", () => {
  const anlar = getYolculuk().duraklar.flatMap((d) => d.anlar);

  it("her anın bir levhası var", () => {
    expect(Object.keys(LEVHALAR).sort()).toEqual(anlar.map((a) => a.id).sort());
  });

  it("rakamların ve grafiklerin bilgileri anın metninde atıflı", () => {
    const eksik = Object.entries(LEVHALAR).flatMap(([id, l]) => {
      const an = getAn(id);
      const govde = JSON.stringify([an.gor, an.anla, an.yuzlesme]);
      return [...l.rakamlar.map((r) => r.bilgi), ...l.grafikler.flatMap(grafikBilgileri)].filter((b) => !govde.includes(`[[${b}]]`)).map((b) => `${id}: ${b}`);
    });
    expect(eksik).toEqual([]);
  });

  it("ekrandaki her sayı bilginin metninde geçer; çizilen değer etiketinden gelir", () => {
    const sorun = Object.entries(LEVHALAR).flatMap(([id, l]) => [
      ...l.rakamlar.flatMap((r) => eksikSayilar(`${r.deger} ${r.birim} ${r.aciklama}`, [r.bilgi], `${id} rakam`)),
      ...l.grafikler.flatMap((g, i) => grafikSorunlari(g, `${id} grafik ${i + 1}`)),
    ]);
    expect(sorun).toEqual([]);
  });

  it("grafikler anın var olan bölümlerine yerleşir", () => {
    const sorun = Object.entries(LEVHALAR).flatMap(([id, l]) => {
      const an = getAn(id);
      return l.grafikler
        .filter((g) => ("bolum" in g.yer ? g.yer.bolum >= an.anla.length : g.yer.yuzlesme >= an.yuzlesme.length))
        .map((g) => `${id}: ${g.baslik}`);
    });
    expect(sorun).toEqual([]);
  });

  it("levha yazılarında sağlık terimi yok", () => {
    const SAGLIK = /sağlık|şifa|sindirim|bağırsak|kan şekeri|glisemik|kanser|faydalı|bağışıklık|detoks/i;
    const bulunan = Object.values(LEVHALAR)
      .flatMap((l) => [...l.rakamlar.map((r) => r.aciklama), ...l.grafikler.flatMap(yazilar)])
      .filter((y) => SAGLIK.test(y) || findHealthTerms(y).length > 0);
    expect(bulunan).toEqual([]);
  });
});
