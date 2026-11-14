import { describe, expect, it } from "vitest";
import { resolveGazeteSayi } from "./sayi";

describe("resolveGazeteSayi", () => {
  it("01 ve 1 girdilerini Sayı #01 dergi sayısına çözer", () => {
    const s01 = resolveGazeteSayi("01");
    const s1 = resolveGazeteSayi("1");

    expect(s01).not.toBeNull();
    expect(s01?.kod).toBe("01");
    expect(s01?.dergiHref).toBe("/bilim/sayi/01");
    expect(s01?.anId).toBe("eksi_mayanin_ilk_10_gunu");
    expect(s01?.baslik).toBe("Kavanozdaki Görünmez Savaş: Ekşi Mayanın İlk 10 Günü");
    expect(s1).toEqual(s01);
  });

  it("02, 03, 04 ve 05 sayılarını doğru dergi rotalarına ve levhalara eşler", () => {
    expect(resolveGazeteSayi("02")?.anId).toBe("cavdar_unu_suyla_bulusunca");
    expect(resolveGazeteSayi("2")?.dergiHref).toBe("/bilim/sayi/02");

    expect(resolveGazeteSayi("03")?.anId).toBe("ayni_sofrada");
    expect(resolveGazeteSayi("3")?.kod).toBe("03");

    const s04 = resolveGazeteSayi("04");
    expect(s04?.kod).toBe("04");
    expect(s04?.anId).toBe("yogurma_tezgahinda");
    expect(s04?.baslik).toBe("Hamur Yoğruldukça Nasıl Güçlenir?");

    const s05 = resolveGazeteSayi("5");
    expect(s05?.kod).toBe("05");
    expect(s05?.dergiHref).toBe("/bilim/sayi/05");
    expect(s05?.anId).toBe("rafta_ilk_hafta");
  });

  it("geçersiz veya boş girdilerde null döner", () => {
    expect(resolveGazeteSayi(undefined)).toBeNull();
    expect(resolveGazeteSayi(null)).toBeNull();
    expect(resolveGazeteSayi("")).toBeNull();
    expect(resolveGazeteSayi("   ")).toBeNull();
    expect(resolveGazeteSayi("0")).toBeNull();
    expect(resolveGazeteSayi("06")).toBeNull();
    expect(resolveGazeteSayi("99")).toBeNull();
    expect(resolveGazeteSayi("001")).toBeNull();
    expect(resolveGazeteSayi("abc")).toBeNull();
  });

  it("dizi (string[]) girdilerde ilk öğeyi değerlendirir", () => {
    expect(resolveGazeteSayi(["01", "02"])?.anId).toBe("eksi_mayanin_ilk_10_gunu");
    expect(resolveGazeteSayi(["4"])?.kod).toBe("04");
    expect(resolveGazeteSayi(["99"])).toBeNull();
    expect(resolveGazeteSayi([])).toBeNull();
  });
});
