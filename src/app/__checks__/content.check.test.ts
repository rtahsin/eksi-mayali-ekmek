import { describe, it, expect } from "vitest";
import { GRAPH } from "@/lib/knowledge/registry";
import { validateGraph } from "@/lib/knowledge/validate";

describe("Content Graph Integrity Check", () => {
  it("validates the content knowledge graph without errors", () => {
    const issues = validateGraph(GRAPH, []);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });
});
