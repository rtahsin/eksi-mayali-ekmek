import { describe, expect, it } from "vitest";
import { cumleEtiketi, findAtiflar, splitCumleler } from "./metin";

describe("splitCumleler", () => {
  it("atıfları cümlelerine ayırır ve gövdeden çıkarır", () => {
    expect(splitCumleler("Un bakteri getirir [[kaynak.a]]. Maya ekşir [[asit.b]] [[asit.c]].")).toEqual([
      { govde: "Un bakteri getirir.", atiflar: ["kaynak.a"] },
      { govde: "Maya ekşir.", atiflar: ["asit.b", "asit.c"] },
    ]);
  });

  it("noktadan sonra gelen atfı önceki cümleye bağlar", () => {
    expect(splitCumleler("pH asitliği gösterir. [[sozluk.ph]] Asit artar [[asit.a]].")).toEqual([
      { govde: "pH asitliği gösterir.", atiflar: ["sozluk.ph"] },
      { govde: "Asit artar.", atiflar: ["asit.a"] },
    ]);
  });

  it("sıra sayılarında bölmez", () => {
    const c = splitCumleler("Topluluk 10. günde oturur [[besleme.a]].");
    expect(c).toHaveLength(1);
    expect(c[0].govde).toBe("Topluluk 10. günde oturur.");
  });

  it("soru cümlesini atıfsız bırakır", () => {
    expect(splitCumleler("Maya nereden gelir? Undan gelir [[kaynak.a]].")).toEqual([
      { govde: "Maya nereden gelir?", atiflar: [] },
      { govde: "Undan gelir.", atiflar: ["kaynak.a"] },
    ]);
  });
});

describe("cumleEtiketi", () => {
  it("çelişki her düzeyin önüne geçer", () => {
    expect(cumleEtiketi(["tek_kaynak", "tartismali", "uzlasi"])).toBe("tartismali");
  });

  it("uzlaşı tek çalışmanın, tek çalışma derlemenin önündedir", () => {
    expect(cumleEtiketi(["ikincil", "uzlasi"])).toBe("uzlasi");
    expect(cumleEtiketi(["ikincil", "tek_kaynak"])).toBe("tek_kaynak");
  });

  it("atıfsız cümlenin etiketi yoktur", () => {
    expect(cumleEtiketi([])).toBeNull();
  });
});

describe("findAtiflar", () => {
  it("yalnız biçime uyan kimlikleri bulur", () => {
    expect(findAtiflar("a [[x.y]] b [[Bozuk Kimlik]] c [[sozluk.kob]]")).toEqual(["x.y", "sozluk.kob"]);
  });
});
