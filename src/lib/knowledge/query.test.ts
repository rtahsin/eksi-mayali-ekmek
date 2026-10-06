import { describe, it, expect } from "vitest";
import { claimsAbout, sourcesFor } from "./query";
import { createGoodGraph } from "./__fixtures__/fixtures";
import type { ConceptId, ClaimId } from "./registry";

describe("Knowledge Queries (claimsAbout & sourcesFor)", () => {
  it("claimsAbout returns claims associated with the specified concept", () => {
    const graph = createGoodGraph();
    const results = claimsAbout("fermentasyon" as ConceptId, graph);
    expect(results.length).toBe(1);
    expect(results[0].text).toContain("Laktik asit");
  });

  it("claimsAbout returns empty array for concept with no claims", () => {
    const graph = createGoodGraph();
    const results = claimsAbout("olmayan_kavram" as ConceptId, graph);
    expect(results).toEqual([]);
  });

  it("sourcesFor returns unique sources referenced by given claims", () => {
    const graph = createGoodGraph();
    const results = sourcesFor(["claim_ph_drop" as ClaimId], graph);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Sourdough Fermentation Mechanics");
  });

  it("sourcesFor deduplicates repeated sources across multiple claims", () => {
    const graph = createGoodGraph();
    // 2. iddia aynı kaynağı referans versin
    graph.claims["claim_2"] = {
      ...graph.claims["claim_ph_drop"],
      text: "İkinci iddia",
    };
    const results = sourcesFor(
      ["claim_ph_drop" as ClaimId, "claim_2" as ClaimId],
      graph
    );
    expect(results.length).toBe(1);
  });
});
