import { GRAPH, type ConceptId, type ClaimId } from "./registry";
import type { KnowledgeGraph, ClaimInput, SourceInput } from "./types";

export function claimsAbout(
  conceptId: ConceptId,
  graph: KnowledgeGraph = GRAPH
): ClaimInput[] {
  return Object.values(graph.claims).filter((claim) =>
    claim.about.includes(conceptId)
  );
}

export function sourcesFor(
  claimIds: readonly ClaimId[],
  graph: KnowledgeGraph = GRAPH
): SourceInput[] {
  const result: SourceInput[] = [];
  const seen = new Set<string>();

  for (const id of claimIds) {
    const claim = graph.claims[id];
    if (!claim) continue;
    for (const ev of claim.evidence) {
      if (!seen.has(ev.source)) {
        const source = graph.sources[ev.source];
        if (source) {
          seen.add(ev.source);
          result.push(source);
        }
      }
    }
  }

  return result;
}
