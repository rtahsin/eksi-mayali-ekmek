import { describe, it, expect } from "vitest";
import { validateGraph } from "../validate";
import { createGoodGraph, goodRefs } from "./fixtures";
import type { ClaimId } from "../registry";
import type { ContentRef } from "../refs";
import type { KnowledgeGraph } from "../types";

describe("Knowledge Graph Validation Rules (K-Codes)", () => {
  it("iyi örnek: geçerli graf ve referanslar 0 hata üretir", () => {
    const graph = createGoodGraph();
    const issues = validateGraph(graph, goodRefs);
    expect(issues).toEqual([]);
  });

  it("K001: yinelenen kimlik tespit edildiğinde hata verir", () => {
    const graph = createGoodGraph();
    // Sources ve Claims arasında aynı kimlik
    graph.claims["ref_smith_2024"] = {
      ...graph.claims["claim_ph_drop"],
    };
    const issues = validateGraph(graph, []);
    const k001 = issues.find((i) => i.code === "K001");
    expect(k001).toBeDefined();
    expect(k001?.severity).toBe("error");
  });

  it("K002: kopuk kaynak veya kavram referansında hata verir", () => {
    const graph = createGoodGraph();
    // Olmayan kaynak referansı
    graph.claims["claim_ph_drop"].evidence = [{ source: "olmayan_kaynak" }];
    // Olmayan kavram referansı
    graph.claims["claim_ph_drop"].about = ["olmayan_kavram"];

    const issues = validateGraph(graph, []);
    const k002Issues = issues.filter((i) => i.code === "K002");
    expect(k002Issues.length).toBeGreaterThanOrEqual(2);
    expect(k002Issues.some((i) => i.message.includes("olmayan_kaynak"))).toBe(true);
    expect(k002Issues.some((i) => i.message.includes("olmayan_kavram"))).toBe(true);
  });

  it("K003: kanıtsız iddia tespit edildiğinde hata verir", () => {
    const graph = createGoodGraph();
    // Evidence dizisi boş
    // @ts-expect-error test amaçlı boş dizi
    graph.claims["claim_ph_drop"].evidence = [];

    const issues = validateGraph(graph, []);
    const k003 = issues.find((i) => i.code === "K003");
    expect(k003).toBeDefined();
    expect(k003?.severity).toBe("error");
  });

  it("K004: geçersiz DOI veya doğrulama tarihi olmadığında hata verir", () => {
    const graph = createGoodGraph();
    graph.sources["ref_smith_2024"].doi = "gecersiz-doi-formati";
    // @ts-expect-error test amaçlı geçersiz tarih
    graph.sources["ref_smith_2024"].verified.at = "gecersiz-tarih";

    const issues = validateGraph(graph, []);
    const k004Issues = issues.filter((i) => i.code === "K004");
    expect(k004Issues.length).toBeGreaterThanOrEqual(2);
    expect(k004Issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("K005: yayındaki içerik onaysız veya geri çekilmiş iddia kullandığında hata verir", () => {
    const graph = createGoodGraph();
    graph.claims["claim_ph_drop"].review = null;

    const refs: ContentRef[] = [
      {
        kind: "yazi",
        id: "yazi-1",
        status: "yayinda",
        surface: "icerik",
        claimIds: ["claim_ph_drop"],
        conceptIds: ["fermentasyon"],
        mediaIds: [],
      },
    ];

    const issues = validateGraph(graph, refs);
    const k005 = issues.find((i) => i.code === "K005");
    expect(k005).toBeDefined();
    expect(k005?.severity).toBe("error");
  });

  it("K006: sağlık terimi içeren fayda iddiası veya ürün yüzeyinde sağlık terimi hata verir", () => {
    const graph = createGoodGraph();
    // İddia metninde sağlık ve fayda terimi ("şifa verir")
    graph.claims["claim_ph_drop"].text = "Bu ekmek sindirimi kolaylaştırır ve şifa sağlar.";
    graph.claims["claim_ph_drop"].status = "dogrulandi";

    const issues1 = validateGraph(graph, []);
    const k006Claim = issues1.find((i) => i.code === "K006");
    expect(k006Claim).toBeDefined();

    // Ürün yüzeyinde sağlık terimi kullanımı
    const urunRefs: ContentRef[] = [
      {
        kind: "urun",
        id: "urun-1",
        surface: "urun",
        claimIds: ["claim_ph_drop"],
        conceptIds: ["fermentasyon"],
        mediaIds: [],
        text: "Bağışıklık sistemini destekleyen ekşi maya",
      },
    ];
    const issues2 = validateGraph(graph, urunRefs);
    const k006Product = issues2.filter((i) => i.code === "K006");
    expect(k006Product.length).toBeGreaterThan(0);
  });

  it("K008: herhangi bir iddiaya bağlanmamış kavram uyarı verir", () => {
    const graph = createGoodGraph();
    graph.concepts["bosta_kavram"] = {
      kind: "tahil",
      name: "Siyez",
      layers: {
        usta: "Antik buğday",
        neden: "Kavuzlu yapı",
        bilim: "Triticum monococcum",
      },
    };

    const issues = validateGraph(graph, []);
    const k008 = issues.find((i) => i.code === "K008");
    expect(k008).toBeDefined();
    expect(k008?.severity).toBe("warn");
  });

  it("K011: review hash ile güncel metin uyuşmadığında hata verir", () => {
    const graph = createGoodGraph();
    // Metin değişti ama review.hash güncellenmedi
    graph.claims["claim_ph_drop"].text = "Değiştirilmiş yeni iddia metni.";

    const issues = validateGraph(graph, []);
    const k011 = issues.find((i) => i.code === "K011");
    expect(k011).toBeDefined();
    expect(k011?.severity).toBe("error");
  });

  it("K009: yazı özeti 160 karakteri aştığında veya levels boş olduğunda hata verir", () => {
    const graph = createGoodGraph();
    const badArticleRefs: ContentRef[] = [
      {
        kind: "yazi",
        id: "uzun-yazi",
        status: "taslak",
        surface: "icerik",
        claimIds: [],
        conceptIds: [],
        mediaIds: [],
        summary: "Bu çok uzun bir özet metnidir. ".repeat(10), // > 160 karakter
        levels: [], // Boş levels
      },
    ];

    const issues = validateGraph(graph, badArticleRefs);
    const k009Issues = issues.filter((i) => i.code === "K009");
    expect(k009Issues.length).toBeGreaterThanOrEqual(2);
  });

  describe("Tip Düzeyi Doğrulama (Compile-Time / Type Safety)", () => {
    it("kopuk ClaimId derleme anında yakalanır ve @ts-expect-error zorunludur", () => {
      // @ts-expect-error Kopuk ClaimId derleme anında yakalanmalıdır
      const invalidClaimId: ClaimId = "bu_kimlik_registry_icinde_yok";
      expect(invalidClaimId).toBe("bu_kimlik_registry_icinde_yok");
    });

    it("ClaimId tipi string'e genişlemez (literal union olarak korunur)", () => {
      // TypeScript seviyesinde ClaimId'nin geniş 'string' tipine eşit olmadığını kanıtla
      type IsString<T> = string extends T ? true : false;
      type ClaimIdIsWideString = IsString<ClaimId>;

      const isWide: ClaimIdIsWideString = false;
      expect(isWide).toBe(false);
    });
  });
});
