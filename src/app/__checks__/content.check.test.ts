import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GRAPH, type ConceptId } from "@/lib/knowledge/registry";
import { validateGraph } from "@/lib/knowledge/validate";
import { toContentRefs, articleIndex } from "@/lib/editorial";
import { generateStaticParams as generateConceptParams } from "../kavram/[slug]/page";
import { generateStaticParams as generateSourceParams } from "../kaynak/[id]/page";
import { MAIN_NAV_LINKS, FOOTER_NAV_LINKS } from "@content/nav/links";

describe("Content Graph Integrity Check", () => {
  it("validates the content knowledge graph and article refs without errors", () => {
    const refs = toContentRefs();
    const issues = validateGraph(GRAPH, refs);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
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
