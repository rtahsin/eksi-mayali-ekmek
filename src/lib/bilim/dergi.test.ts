import { describe, expect, it } from "vitest";
import { findHealthTerms, hasBenefitVerb } from "@/lib/knowledge/lint";
import { DERGI_SAYILARI, getDergiSayi, getKomsuDergiSayilari } from "./dergi";

describe("Taş Fırın Dergisi (dergi.ts)", () => {
  it("01..05 arası 5 tam dergi sayısını eksiksiz döndürür", () => {
    expect(DERGI_SAYILARI).toHaveLength(5);
    expect(DERGI_SAYILARI.map((s) => s.kod)).toEqual(["01", "02", "03", "04", "05"]);

    expect(getDergiSayi("1")?.kod).toBe("01");
    expect(getDergiSayi("02")?.konuKodu).toBe("KONU-05");
    expect(getDergiSayi("05")?.konuKodu).toBe("SOFRA-01");
    expect(getDergiSayi("06")).toBeNull();
    expect(getDergiSayi("")).toBeNull();
    expect(getDergiSayi(null)).toBeNull();
  });

  it("komşu dergi sayılarını doğru bağlar", () => {
    const k01 = getKomsuDergiSayilari("01");
    expect(k01.onceki).toBeNull();
    expect(k01.sonraki?.kod).toBe("02");

    const k03 = getKomsuDergiSayilari("03");
    expect(k03.onceki?.kod).toBe("02");
    expect(k03.sonraki?.kod).toBe("04");

    const k05 = getKomsuDergiSayilari("05");
    expect(k05.onceki?.kod).toBe("04");
    expect(k05.sonraki).toBeNull();
  });

  it("K006 sıfır sağlık/fayda beyanı kuralını tüm metin ve Reels senaryolarında korur", () => {
    for (const sayi of DERGI_SAYILARI) {
      const tumMetinler: string[] = [
        sayi.ustEtiket,
        sayi.baslik,
        sayi.kancaSoru,
        sayi.ozet,
        ...sayi.rakamlar.flatMap((r) => [r.deger, r.birim, r.aciklama]),
        ...sayi.giris,
        ...sayi.bolumler.flatMap((b) => [b.baslik, ...b.paragraflar]),
        sayi.efsane.yanlis,
        sayi.efsane.gercek,
        ...sayi.tezgahKurallari,
        sayi.sepetOnerisi.baslik,
        sayi.sepetOnerisi.aciklama,
        sayi.reels.baslik,
        ...sayi.reels.sahneler.flatMap((s) => [s.cekim, s.metin, s.ekranYazisi]),
      ];

      for (const parca of tumMetinler) {
        expect(
          findHealthTerms(parca),
          `Sayı #${sayi.kod} içinde K006 terimi bulundu: "${parca}"`
        ).toEqual([]);
        expect(
          hasBenefitVerb(parca),
          `Sayı #${sayi.kod} içinde K006 fayda fiili bulundu: "${parca}"`
        ).toBe(false);
        expect(parca.toLowerCase()).not.toContain("sucuklu yumurta");
        expect(parca.toLowerCase()).not.toContain("evde ekmek yok");
      }
    }
  });
});
