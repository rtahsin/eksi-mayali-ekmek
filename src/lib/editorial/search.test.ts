import { describe, it, expect } from "vitest";
import {
  normalizeTr,
  tokenizeTr,
  buildIndex,
  searchIndex,
  getSearchIndex,
  type SearchDocument,
} from "./search";

describe("Static Search Engine (P1-07)", () => {
  describe("Turkish Normalization & Tokenization", () => {
    it("normalizes Turkish capital I, İ, and accents correctly", () => {
      expect(normalizeTr("IŞIK VE ISINMA")).toBe("isik ve isinma");
      expect(normalizeTr("İSTANBUL ÇAĞDAŞ ÖĞRENCİ")).toBe("istanbul cagdas ogrenci");
      expect(normalizeTr("ŞİFA & SAĞLIK")).toBe("sifa saglik");
      expect(normalizeTr("Çavdar Ekmeği")).toBe("cavdar ekmegi");
      expect(normalizeTr("Fructilactobacillus sanfranciscensis")).toBe("fructilactobacillus sanfranciscensis");
    });

    it("tokenizes and extracts unique tokens of length >= 2", () => {
      const tokens = tokenizeTr("Ekşi mayalı çavdar ekmeği ve ekşi maya!");
      expect(tokens).toContain("eksi");
      expect(tokens).toContain("mayali");
      expect(tokens).toContain("cavdar");
      expect(tokens).toContain("ekmegi");
      expect(tokens).toContain("maya");
      expect(tokens).not.toContain("ve"); // 2-letter tokens keep only >=2, unique tokens
      expect(new Set(tokens).size).toBe(tokens.length); // strictly unique
    });
  });

  describe("Ranking and Matching Logic", () => {
    const testDocs: SearchDocument[] = [
      {
        id: "doc1",
        kind: "yazi",
        title: "Karakılçık Buğdayı ve Otoliz",
        snippet: "Taş değirmende öğütülen ata buğdayı.",
        url: "/kutuphane/karakilcik-bugdayi",
        tags: ["karakilcik", "otoliz"],
      },
      {
        id: "doc2",
        kind: "kavram",
        title: "Gluten Ağı",
        snippet: "Glutenin ve gliadin proteinlerinin suyla birleşerek oluşturduğu ağ.",
        url: "/kavram/gluten",
        tags: ["protein", "elastikiyet"],
      },
      {
        id: "doc3",
        kind: "efsane",
        title: "Doğru Bilinen Yanlış: Havadan Maya Geçer",
        snippet: "Ekşi mayadaki bakteriler havadan değil undan gelir.",
        url: "/kavram/f_sanfranciscensis",
        tags: ["hava", "maya"],
      },
    ];

    const index = buildIndex(testDocs);

    it("matches exact Turkish query regardless of letters", () => {
      const res = searchIndex(index, "karakilcik");
      expect(res.length).toBeGreaterThanOrEqual(1);
      expect(res[0].doc.id).toBe("doc1");

      const resTr = searchIndex(index, "karakılçık");
      expect(resTr.length).toBeGreaterThanOrEqual(1);
      expect(resTr[0].doc.id).toBe("doc1");
    });

    it("ranks title matches higher than snippet matches", () => {
      const docs: SearchDocument[] = [
        {
          id: "snippet-only",
          kind: "yazi",
          title: "Fırın Teknikleri",
          snippet: "Gluten gelişimi fırında tamamlanır.",
          url: "/firin",
        },
        {
          id: "title-match",
          kind: "kavram",
          title: "Gluten ve Proteinler",
          snippet: "Hamurun iskeleti.",
          url: "/gluten",
        },
      ];
      const testIdx = buildIndex(docs);
      const res = searchIndex(testIdx, "gluten");
      expect(res[0].doc.id).toBe("title-match");
      expect(res[0].score).toBeGreaterThan(res[1].score);
    });

    it("scores multi-word matches higher than single-word matches", () => {
      const docs: SearchDocument[] = [
        {
          id: "single",
          kind: "yazi",
          title: "Ekşi Maya Bakımı",
          snippet: "Oda sıcaklığında besleme.",
          url: "/1",
        },
        {
          id: "multi",
          kind: "yazi",
          title: "Ekşi Mayalı Çavdar Ekmeği",
          snippet: "Geleneksel fermantasyon.",
          url: "/2",
        },
      ];
      const testIdx = buildIndex(docs);
      const res = searchIndex(testIdx, "eksi mayali cavdar");
      expect(res[0].doc.id).toBe("multi");
    });
  });

  describe("Real Production Search Index", () => {
    const prodIndex = getSearchIndex();

    it("contains articles, concepts, and myths from the content graph", () => {
      expect(prodIndex.docs.length).toBeGreaterThanOrEqual(40);
      const kinds = new Set(prodIndex.docs.map((d) => d.kind));
      expect(kinds.has("yazi")).toBe(true);
      expect(kinds.has("kavram")).toBe(true);
      expect(kinds.has("efsane")).toBe(true);
    });

    it("successfully searches real concepts and articles", () => {
      const resKarakilcik = searchIndex(prodIndex, "karakılçık");
      expect(resKarakilcik.length).toBeGreaterThanOrEqual(1);
      expect(resKarakilcik[0].doc.url).toContain("karakilcik");

      const resGluten = searchIndex(prodIndex, "gluten");
      expect(resGluten.length).toBeGreaterThanOrEqual(1);

      const resMaya = searchIndex(prodIndex, "sanfranciscensis");
      expect(resMaya.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Budget Test: 500 Document Fixture Size", () => {
    it("ensures serialized inverted index for 500 documents is strictly < 300 KB", () => {
      const fixtureDocs: SearchDocument[] = [];
      const sampleWords = [
        "fermantasyon", "bakteri", "laktik", "asetik", "karakilcik", "siyez",
        "cavdar", "otoliz", "protein", "gluten", "nisasta", "amilaz", "proteaz",
        "fitaz", "somun", "degirmen", "sicaklik", "derece", "kavanoz", "besleme",
        "kabuk", "gozenek", "asitlik", "gaz", "karbondioksit", "etanol", "lezzet",
      ];

      for (let i = 0; i < 500; i++) {
        const w1 = sampleWords[i % sampleWords.length];
        const w2 = sampleWords[(i * 3) % sampleWords.length];
        const w3 = sampleWords[(i * 7) % sampleWords.length];
        fixtureDocs.push({
          id: `fixture_doc_${i}`,
          kind: i % 3 === 0 ? "yazi" : i % 3 === 1 ? "kavram" : "efsane",
          title: `Makale ${i}: ${w1} ve ${w2} Üzerine Notlar`,
          snippet: `Bu yazıda ${w1}, ${w2} ve ${w3} mekanizmalarının ekmek yapımındaki rolü incelenmektedir. Hücresel seviyede fermantasyon dengesi.`,
          url: `/kutuphane/doc-${i}`,
          tags: [w1, w2, w3],
        });
      }

      const fixtureIndex = buildIndex(fixtureDocs);
      const serialized = JSON.stringify(fixtureIndex);
      const sizeBytes = Buffer.byteLength(serialized, "utf8");
      const sizeKb = sizeBytes / 1024;

      // DoD gereksinimi: 500 belgelik fixture'da indeks < 300 KB
      expect(sizeKb).toBeLessThan(300);
      console.log(`500 document fixture index size: ${Math.round(sizeKb)} KB (budget: < 300 KB)`);
    });
  });
});
