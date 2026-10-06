import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GRAPH } from "@/lib/knowledge/registry";
import { validateGraph } from "@/lib/knowledge/validate";
import { toContentRefs, articleIndex } from "@/lib/editorial";

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
});
