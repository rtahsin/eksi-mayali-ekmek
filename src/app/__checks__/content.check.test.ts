import { describe, it, expect } from "vitest";
import { GRAPH } from "@/lib/knowledge/registry";
import { validateGraph } from "@/lib/knowledge/validate";
import { toContentRefs } from "@/lib/editorial";

describe("Content Graph Integrity Check", () => {
  it("validates the content knowledge graph and article refs without errors", () => {
    const refs = toContentRefs();
    const issues = validateGraph(GRAPH, refs);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });
});
