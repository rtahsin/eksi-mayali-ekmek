import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GRAPH, type ConceptId } from "@/lib/knowledge/registry";
import { validateGraph } from "@/lib/knowledge/validate";
import { toContentRefs, articleIndex } from "@/lib/editorial";
import { generateStaticParams as generateConceptParams } from "../kavram/[slug]/page";
import { generateStaticParams as generateSourceParams } from "../kaynak/[id]/page";
import { MAIN_NAV_LINKS, FOOTER_NAV_LINKS } from "@content/nav/links";

import { MEDIA } from "@/lib/editorial/media";

describe("Content Graph Integrity Check", () => {
  it("validates the content knowledge graph, article refs, and media registry without errors", () => {
    const refs = toContentRefs();
    const issues = validateGraph(GRAPH, refs, MEDIA);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("ensures all public/atelier files are under 300 KB", () => {
    const atelierDir = path.resolve(process.cwd(), "public/atelier");
    expect(fs.existsSync(atelierDir)).toBe(true);
    const files = fs.readdirSync(atelierDir);
    expect(files.length).toBeGreaterThan(0);

    for (const f of files) {
      const stat = fs.statSync(path.join(atelierDir, f));
      const sizeKb = stat.size / 1024;
      expect(sizeKb).toBeLessThan(300);
    }
  });

  it("enforces K007 rules correctly on invalid media and product surfaces", () => {
    // 1. Alt metin eksik
    const issues1 = validateGraph(GRAPH, [], {
      bad_media: {
        url: "/test.webp",
        alt: "",
        license: "own",
      },
    });
    expect(issues1.some((i) => i.code === "K007" && i.message.includes("alt metni"))).toBe(true);

    // 2. Geçersiz lisans
    const issues2 = validateGraph(GRAPH, [], {
      bad_media: {
        url: "/test.webp",
        alt: "Güzel görsel",
        // @ts-expect-error invalid license testing
        license: "invalid-license",
      },
    });
    expect(issues2.some((i) => i.code === "K007" && i.message.includes("lisansı"))).toBe(true);

    // 3. Ürün yüzeyinde stock-licensed medya kullanımı yasak
    const issues3 = validateGraph(
      GRAPH,
      [
        {
          kind: "urun",
          id: "urun_test",
          surface: "urun",
          claimIds: [],
          conceptIds: [],
          mediaIds: ["med_stock_test"],
        },
      ],
      {
        med_stock_test: {
          url: "/stock.webp",
          alt: "Stok ekmek",
          license: "stock-licensed",
        },
      }
    );
    expect(issues3.some((i) => i.code === "K007" && i.message.includes("Ürün yüzeyinde stock-licensed"))).toBe(true);
  });

  it("enforces K010 rules: comparison claims require legalCheck, and surface: urun articles trigger warning", () => {
    // 1. K010 hata: Karşılaştırma iddiası legalCheck olmadan kullanılamaz
    const badGraph = {
      ...GRAPH,
      claims: {
        ...GRAPH.claims,
        bad_comparison: {
          text: "Karakılçık ekmeği beyaz ekmekten 3 kat daha fazla lif içerir.",
          about: ["karakilcik"],
          evidence: [{ source: "delcour_2010" }] as const,
          status: "dogrulandi" as const,
          confidence: "yuksek" as const,
          sensitivity: "karsilastirma" as const,
          legalCheck: undefined,
          review: null,
        },
      },
    };
    const issuesComp = validateGraph(badGraph, []);
    expect(issuesComp.some((i) => i.code === "K010" && i.severity === "error")).toBe(true);

    // 2. K010 uyarı: surface: urun yazıda Claim kullanımı çerçeve okuması gerektirir
    const issuesWarn = validateGraph(GRAPH, [
      {
        kind: "yazi",
        id: "yazi_urun_test",
        surface: "urun",
        claimIds: ["claim_damaged_starch"],
        conceptIds: ["nisasta"],
        mediaIds: [],
        summary: "Özet metni",
        levels: [1],
      },
    ]);
    expect(issuesWarn.some((i) => i.code === "K010" && i.severity === "warn")).toBe(true);
  });

  it("verifies published articles have fromInbox and valid source file", () => {
    const articles = articleIndex();
    const published = articles.filter((a) => a.status === "yayinda");
    expect(published.length).toBeGreaterThanOrEqual(1);

    for (const art of published) {
      expect(art.fromInbox).toBeDefined();
      expect(art.fromInbox!.length).toBeGreaterThan(0);
      const filePath = path.resolve(process.cwd(), art.fromInbox!);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it("ensures every concept with >=1 reviewed claim has a static page", () => {
    const conceptParams = generateConceptParams();
    const availableSlugs = new Set(conceptParams.map((p) => p.slug));

    // Find concepts with >= 1 reviewed claim
    const conceptsWithReviewedClaims = new Set<ConceptId>();
    for (const claim of Object.values(GRAPH.claims)) {
      if (claim.review !== null) {
        for (const cpt of claim.about) {
          conceptsWithReviewedClaims.add(cpt as ConceptId);
        }
      }
    }

    expect(conceptsWithReviewedClaims.size).toBeGreaterThanOrEqual(1);

    for (const cptId of conceptsWithReviewedClaims) {
      expect(availableSlugs.has(cptId)).toBe(true);
    }
  });

  it("verifies sources static params cover all graph sources", () => {
    const sourceParams = generateSourceParams();
    const availableIds = new Set(sourceParams.map((p) => p.id));
    const allSourceIds = Object.keys(GRAPH.sources);

    expect(availableIds.size).toBe(allSourceIds.length);
    for (const id of allSourceIds) {
      expect(availableIds.has(id)).toBe(true);
    }
  });

  it("ensures neutral navigation links include Kütüphane and Kavramlar", () => {
    expect(MAIN_NAV_LINKS.some((l) => l.href === "/kutuphane")).toBe(true);
    expect(MAIN_NAV_LINKS.some((l) => l.href === "/kavram")).toBe(true);
    expect(FOOTER_NAV_LINKS.some((l) => l.href === "/kutuphane")).toBe(true);
    expect(FOOTER_NAV_LINKS.some((l) => l.href === "/kavram")).toBe(true);
  });
});
